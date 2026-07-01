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

// Khớp nhóm hàng tồn kho (vd "Thép hình") với nhóm hàng bán ("Thép hình I/H/U/V")
function catMatch(orderCat: string, target: string): boolean {
  const a = (orderCat || "").toLowerCase().trim();
  const b = (target || "").toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || a.startsWith(b) || b.startsWith(a);
}

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
      if (catMatch(it.category, category)) buckets[idx] += it.kl;
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

// ═══════════ NHIỀU MÔ HÌNH DỰ BÁO ═══════════
export type ModelId = "ewma" | "linear" | "ma" | "seasonal" | "market";
export interface ModelMeta { id: ModelId; name: string; desc: string; needsMarket?: boolean }
export const MODELS: ModelMeta[] = [
  { id: "ewma", name: "Làm mượt mũ (Holt)", desc: "Bám xu hướng gần đây, phản ứng nhanh với biến động." },
  { id: "linear", name: "Hồi quy tuyến tính", desc: "Đường xu hướng dài hạn, ổn định & ít nhiễu." },
  { id: "ma", name: "Trung bình trượt 4 tuần", desc: "Trung bình gần đây, dự báo phẳng — thận trọng." },
  { id: "seasonal", name: "Thời vụ (lặp chu kỳ 4 tuần)", desc: "Lặp lại mẫu gần nhất — hợp hàng có mùa vụ." },
  { id: "market", name: "Kết hợp thị trường thép VN", desc: "Nền thống kê × dự báo tăng trưởng cầu ngành (VSA/web).", needsMarket: true },
];

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

// Làm mượt nhẹ (trung bình trượt 3 điểm) cho ĐẦU VÀO mô hình — giảm nhiễu thời điểm,
// giúp mô hình dự báo tổng lượng sát hơn. Đường "thực tế" hiển thị vẫn là số thô.
function smooth(ys: number[]): number[] {
  if (ys.length < 3) return ys.slice();
  return ys.map((_, i) => {
    const a = ys[i - 1] ?? ys[i];
    const b = ys[i];
    const c = ys[i + 1] ?? ys[i];
    return (a + b + c) / 3;
  });
}

// wkGrowth = tăng trưởng cầu mỗi tuần (cho mô hình market), vd 0.0023 ~ 12%/năm
export function predictFuture(ys: number[], model: ModelId, horizon: number, wkGrowth = 0): number[] {
  const n = ys.length;
  if (n === 0) return new Array(horizon).fill(0);
  const out: number[] = [];

  if (model === "ma") {
    const m = mean(ys.slice(-4));
    for (let h = 1; h <= horizon; h++) out.push(Math.max(0, Math.round(m)));
    return out;
  }
  if (model === "linear") {
    const { a, b } = linreg(ys);
    for (let h = 1; h <= horizon; h++) out.push(Math.max(0, Math.round(a + b * (n - 1 + h))));
    return out;
  }
  if (model === "seasonal") {
    const period = 4;
    if (n < period) return predictFuture(ys, "ma", horizon, wkGrowth);
    for (let h = 1; h <= horizon; h++) out.push(Math.max(0, Math.round(ys[n - period + ((h - 1) % period)])));
    return out;
  }
  // ewma (Holt tuyến tính) — cũng là nền cho "market". Beta nhỏ để tránh ngoại suy xu hướng quá đà.
  const alpha = 0.4, beta = 0.12;
  let level = ys[0], trend = n > 1 ? (ys[n - 1] - ys[0]) / (n - 1) : 0;
  for (let i = 1; i < n; i++) {
    const prev = level;
    level = alpha * ys[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }
  for (let h = 1; h <= horizon; h++) {
    let v = level + h * trend;
    if (model === "market") v *= Math.pow(1 + wkGrowth, h);
    out.push(Math.max(0, Math.round(v)));
  }
  return out;
}

// Ước tính độ chính xác bằng backtest walk-forward. Kết hợp sai số TỔNG LƯỢNG
// (quan trọng cho đặt hàng) và sai số theo tuần (dạng SMAPE, ít nhạy với nhiễu thời điểm).
export function backtestAccuracy(ys: number[], model: ModelId, wkGrowth = 0): number | null {
  const n = ys.length;
  const total = ys.reduce((s, x) => s + x, 0);
  if (n < 6 || total <= 0) return null;
  const k = Math.min(4, Math.max(2, Math.floor(n / 3)));
  const train = ys.slice(0, n - k);
  const actual = ys.slice(n - k);
  const pred = predictFuture(smooth(train), model, k, wkGrowth);
  const aSum = actual.reduce((s, x) => s + x, 0);
  const pSum = pred.reduce((s, x) => s + x, 0);
  const volErr = aSum > 0 ? Math.abs(aSum - pSum) / aSum : pSum > 0 ? 1.5 : 0;
  const avg = aSum / k;
  let wErr = 0;
  for (let i = 0; i < k; i++) {
    const denom = Math.max(actual[i], avg, 1);
    wErr += Math.abs(actual[i] - pred[i]) / denom;
  }
  const perWeek = Math.min(1.5, wErr / k);
  // Suy giảm mũ: luôn phân hoá giữa các mô hình, không bị "kẹt sàn" đồng loạt
  const combined = 0.7 * volErr + 0.3 * perWeek;
  return Math.round(Math.max(12, Math.min(96, 100 * Math.exp(-combined))));
}

export interface ForecastSeries {
  data: { label: string; actual: number | null; forecast: number | null }[];
  rate: number; // kg/tuần dự kiến (theo mô hình)
  trendUp: boolean;
  accuracy: number | null; // % độ chính xác ước tính (backtest)
  model: ModelId;
}

export interface ForecastOpts {
  model?: ModelId;
  horizon?: number;
  weeksBack?: number;
  marketPctAnnual?: number; // tăng trưởng cầu ngành/năm (%) cho mô hình market
  now?: Date;
}

// Chuỗi lịch sử + dự báo `horizon` tuần tới (cho line chart), theo mô hình chọn
export function forecastCategory(orders: Order[], category: string, opts: ForecastOpts = {}): ForecastSeries {
  const { model = "ewma", horizon = 4, weeksBack = 12, marketPctAnnual = 0, now = new Date() } = opts;
  const wkGrowth = marketPctAnnual / 100 / 52;
  const hist = weeklyConsumption(orders, category, weeksBack, now);
  const ysRaw = hist.map((p) => p.kg);
  const ys = smooth(ysRaw); // đầu vào mô hình đã làm mượt

  const data: ForecastSeries["data"] = hist.map((p) => ({ label: p.label, actual: p.kg, forecast: null }));
  if (data.length) data[data.length - 1].forecast = data[data.length - 1].actual;

  const preds = predictFuture(ys, model, horizon, wkGrowth);
  const base = startOfWeek(now).getTime();
  preds.forEach((pred, i) => {
    const d = new Date(base + (i + 1) * WEEK_MS);
    data.push({ label: d.getDate() + "/" + (d.getMonth() + 1), actual: null, forecast: pred });
  });

  const baseline = weeklyRate(hist);
  const rate = preds[0] > 0 ? preds[0] : baseline;
  return { data, rate, trendUp: preds[preds.length - 1] >= (preds[0] || baseline), accuracy: backtestAccuracy(ysRaw, model, wkGrowth), model };
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

// ── Chi tiết dự báo cho 1 nhóm hàng (khi bấm vào dòng) ──
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmtDate = (ms: number) => {
  const d = new Date(ms);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export interface ProjPoint {
  label: string;
  demand: number;
  remaining: number;
  stockout: boolean;
}
export interface ItemDepletion {
  name: string;
  spec: string;
  location: string;
  unit: string;
  qty: number;
  weightKg: number;
  share: number; // % của nhóm
  estWeeks: number;
  estDate: string;
}
export interface CategoryDetail {
  category: string;
  status: StockStatus;
  stockKg: number;
  itemCount: number;
  rateKgWeek: number;
  trendUp: boolean;
  weeksLeft: number;
  stockoutDate: string;
  targetWeeks: number;
  reorderQty: number;
  forecast: ForecastSeries;
  history: WeekPoint[];
  projection: ProjPoint[];
  items: ItemDepletion[];
}

export function buildCategoryDetail(
  orders: Order[],
  items: InvItem[],
  category: string,
  targetWeeks = 4,
  opts: ForecastOpts = {},
): CategoryDetail {
  const { model = "ewma", marketPctAnnual = 0, now = new Date() } = opts;
  const wkGrowth = marketPctAnnual / 100 / 52;
  const list = items.filter((it) => it.category === category);
  const stockKg = list.reduce((s, it) => s + it.weightKg, 0);
  const history = weeklyConsumption(orders, category, 12, now);
  const ys = smooth(history.map((p) => p.kg));

  // Nhịp tiêu thụ theo mô hình (TB 4 tuần dự báo), fallback trung bình trọng số
  const preds16 = predictFuture(ys, model, 16, wkGrowth);
  const baseline = weeklyRate(history);
  const rate = mean(preds16.slice(0, 4)) > 0 ? mean(preds16.slice(0, 4)) : baseline;

  const weeksLeft = rate > 0 ? stockKg / rate : Infinity;
  const nowMs = now.getTime();
  const base = startOfWeek(now).getTime();

  // Dự phóng tồn kho từng tuần tới (tối đa 16 tuần hoặc đến khi hết)
  const projection: ProjPoint[] = [];
  if (rate > 0) {
    let remaining = stockKg;
    for (let h = 1; h <= 16 && remaining > 0; h++) {
      const demand = Math.max(preds16[h - 1] || 0, rate * 0.5); // tránh trôi về 0
      remaining -= demand;
      const wk = new Date(base + h * WEEK_MS);
      projection.push({
        label: wk.getDate() + "/" + (wk.getMonth() + 1),
        demand: Math.round(demand),
        remaining: Math.round(Math.max(0, remaining)),
        stockout: remaining <= 0,
      });
    }
  }

  // Ước tính từng mặt hàng (giả định bán đều giữa các quy cách trong nhóm)
  const itemRate = list.length > 0 && rate > 0 ? rate / list.length : 0;
  const itemDetails: ItemDepletion[] = list
    .map((it) => {
      const estWeeks = itemRate > 0 ? it.weightKg / itemRate : Infinity;
      return {
        name: it.name,
        spec: it.spec,
        location: it.location,
        unit: it.unit,
        qty: it.qty,
        weightKg: it.weightKg,
        share: stockKg > 0 ? (it.weightKg / stockKg) * 100 : 0,
        estWeeks,
        estDate: isFinite(estWeeks) ? fmtDate(nowMs + estWeeks * WEEK_MS) : "—",
      };
    })
    .sort((x, y) => x.estWeeks - y.estWeeks);

  let status: StockStatus = "ok";
  if (rate <= 0) status = "idle";
  else if (weeksLeft <= 1) status = "critical";
  else if (weeksLeft <= 2) status = "warn";

  return {
    category,
    status,
    stockKg,
    itemCount: list.length,
    rateKgWeek: rate,
    trendUp: preds16[3] >= (preds16[0] || rate),
    weeksLeft,
    stockoutDate: isFinite(weeksLeft) ? fmtDate(nowMs + weeksLeft * WEEK_MS) : "—",
    targetWeeks,
    reorderQty: Math.max(0, Math.round(rate * targetWeeks - stockKg)),
    forecast: forecastCategory(orders, category, { model, horizon: 6, marketPctAnnual, now }),
    history,
    projection,
    items: itemDetails,
  };
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; color: string; pill: "red" | "amber" | "green" | "slate" }> = {
  critical: { label: "Hết trong tuần", color: "#e11d2a", pill: "red" },
  warn: { label: "Cần đặt ≤ 2 tuần", color: "#f59e0b", pill: "amber" },
  ok: { label: "Ổn định", color: "#10b981", pill: "green" },
  idle: { label: "Chưa bán gần đây", color: "#94a3b8", pill: "slate" },
};
