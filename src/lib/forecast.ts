// ============================================================
// DỰ BÁO NHU CẦU & CẢNH BÁO HẾT HÀNG
// - Tiêu thụ lịch sử (kg/tuần theo nhóm hàng) lấy từ đơn ĐÃ CHỐT
// - Dự báo nhu cầu kỳ tới bằng hồi quy tuyến tính (least squares)
// - Dự đoán "còn mấy tuần thì hết" = tồn kho (kg) / nhu cầu TB mỗi tuần
// ============================================================
import type { Order } from "./salesStore";
import type { InvItem } from "./inventory";

const WEEK_MS = 7 * 86400000;

const startOfWeek = (d: Date) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // tuần bắt đầu Thứ 2
  return s;
};
const orderTime = (o: Order) => new Date(o.wonAt || o.date || o.createdAt).getTime();

export interface WeekPoint {
  label: string; // dd/mm
  kg: number;
}

// Tiêu thụ kg/tuần của 1 nhóm hàng trong `weeksBack` tuần gần nhất
export function weeklyConsumption(
  orders: Order[],
  category: string,
  weeksBack = 10,
  now = new Date(),
): WeekPoint[] {
  const base = startOfWeek(now).getTime();
  const buckets = new Array(weeksBack).fill(0);
  const won = orders.filter((o) => o.status === "won");
  for (const o of won) {
    const ts = orderTime(o);
    const idx = weeksBack - 1 - Math.floor((base - startOfWeek(new Date(ts)).getTime()) / WEEK_MS);
    if (idx < 0 || idx >= weeksBack) continue;
    for (const it of o.items) {
      if (it.category === category) buckets[idx] += it.kl;
    }
  }
  return buckets.map((kg, i) => {
    const d = new Date(base - (weeksBack - 1 - i) * WEEK_MS);
    return { label: d.getDate() + "/" + (d.getMonth() + 1), kg: Math.round(kg) };
  });
}

// Hồi quy tuyến tính: trả hệ số (a + b*x)
function linreg(ys: number[]): { a: number; b: number } {
  const n = ys.length;
  if (n < 2) return { a: ys[0] || 0, b: 0 };
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += ys[i];
    sxy += i * ys[i];
    sxx += i * i;
  }
  const denom = n * sxx - sx * sx;
  const b = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  return { a, b };
}

// Nhu cầu TB mỗi tuần (ưu tiên gần đây): trung bình có trọng số 4 tuần cuối
export function weeklyRate(history: WeekPoint[]): number {
  if (!history.length) return 0;
  const last = history.slice(-4);
  let wsum = 0;
  let total = 0;
  last.forEach((p, i) => {
    const w = i + 1; // tuần gần nhất trọng số cao hơn
    wsum += w;
    total += p.kg * w;
  });
  const recent = wsum > 0 ? total / wsum : 0;
  // nếu gần đây = 0 nhưng có lịch sử -> dùng trung bình tổng
  if (recent === 0) {
    const all = history.reduce((s, p) => s + p.kg, 0) / history.length;
    return all;
  }
  return recent;
}

export interface ForecastSeries {
  data: { label: string; actual: number | null; forecast: number | null }[];
  rate: number; // kg/tuần dự kiến
  trendUp: boolean;
}

// Chuỗi lịch sử + dự báo `horizon` tuần tới (cho line chart)
export function forecastCategory(
  orders: Order[],
  category: string,
  horizon = 4,
  weeksBack = 10,
  now = new Date(),
): ForecastSeries {
  const hist = weeklyConsumption(orders, category, weeksBack, now);
  const ys = hist.map((p) => p.kg);
  const { a, b } = linreg(ys);
  const n = ys.length;

  const data: ForecastSeries["data"] = hist.map((p) => ({ label: p.label, actual: p.kg, forecast: null }));
  // điểm nối: gắn forecast = actual ở tuần cuối để 2 đường liền nhau
  if (data.length) data[data.length - 1].forecast = data[data.length - 1].actual;

  const base = startOfWeek(now).getTime();
  for (let h = 1; h <= horizon; h++) {
    const x = n - 1 + h;
    const pred = Math.max(0, Math.round(a + b * x));
    const d = new Date(base + h * WEEK_MS);
    data.push({ label: d.getDate() + "/" + (d.getMonth() + 1), actual: null, forecast: pred });
  }
  return { data, rate: weeklyRate(hist), trendUp: b > 0 };
}

export type StockStatus = "critical" | "warn" | "ok" | "idle";

export interface DepletionRow {
  category: string;
  stockKg: number;
  rateKgWeek: number;
  weeksLeft: number; // Infinity nếu không tiêu thụ
  status: StockStatus;
  items: InvItem[];
}

export function depletionByCategory(items: InvItem[], orders: Order[], now = new Date()): DepletionRow[] {
  const cats = new Map<string, InvItem[]>();
  for (const it of items) {
    const arr = cats.get(it.category) || [];
    arr.push(it);
    cats.set(it.category, arr);
  }
  const rows: DepletionRow[] = [];
  for (const [category, list] of cats) {
    const stockKg = list.reduce((s, it) => s + it.weightKg, 0);
    const rate = weeklyRate(weeklyConsumption(orders, category, 10, now));
    const weeksLeft = rate > 0 ? stockKg / rate : Infinity;
    let status: StockStatus = "ok";
    if (rate <= 0) status = "idle";
    else if (weeksLeft <= 1) status = "critical";
    else if (weeksLeft <= 2) status = "warn";
    rows.push({ category, stockKg, rateKgWeek: rate, weeksLeft, status, items: list });
  }
  return rows.sort((a, b) => a.weeksLeft - b.weeksLeft);
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; color: string; pill: "red" | "amber" | "green" | "slate" }> = {
  critical: { label: "Hết trong tuần", color: "#e11d2a", pill: "red" },
  warn: { label: "Cần đặt ≤ 2 tuần", color: "#f59e0b", pill: "amber" },
  ok: { label: "Ổn định", color: "#10b981", pill: "green" },
  idle: { label: "Chưa bán gần đây", color: "#94a3b8", pill: "slate" },
};
