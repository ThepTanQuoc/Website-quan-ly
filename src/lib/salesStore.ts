// ============================================================
// KHO DỮ LIỆU ĐƠN HÀNG (Sales store)
// - Lưu localStorage, phát sự kiện realtime cho Dashboard
// - Vòng đời: "pending" (Chờ xử lý) -> "won" (Đã chốt / ghi nhận doanh thu)
// - Đơn pending quá hạn sẽ tự xoá (khách không chốt)
// - Mỗi thay đổi đồng bộ lên Google Sheet (nếu đã cấu hình)
// ============================================================
import { useEffect, useState } from "react";
import { num, uid } from "./format";
import { syncOrderToSheet } from "./googleSheet";

export type OrderStatus = "pending" | "won";

export interface OrderItem {
  name: string;
  category: string; // nhóm hàng (Thép tấm HRC, Thép hình, ...)
  qty: number;
  kl: number; // khối lượng (kg)
  tien: number; // thành tiền (đ)
}

export interface Order {
  id: string;
  createdAt: string; // ISO datetime tạo đơn
  date: string; // ISO date (ngày báo giá)
  customer: string;
  project?: string;
  quoter?: string;
  items: OrderItem[];
  totalKL: number;
  total: number; // doanh thu (đ)
  status: OrderStatus;
  wonAt?: string; // thời điểm chốt đơn
  paid: number; // số tiền đã thu (đ) -> công nợ = total - paid
  note?: string;
}

const KEY = "tq_orders_v1";
const SEED_FLAG = "tq_seeded_v1";
const EVENT = "tq-orders-changed";
const ABANDON_DAYS = 21; // đơn chờ quá 21 ngày mà chưa chốt -> tự xoá

// ── Phân loại nhóm hàng từ mã loại của Module 1 (hoặc theo tên) ──
const CAT_BY_LOAI: Record<string, string> = {
  tam_phang: "Thép tấm HRC",
  tam_tron: "Thép tấm HRC",
  tam_nhan: "Thép tấm HRC",
  ke: "Ke / Bản mã",
  tam_gan: "Thép tấm gân",
  tam_nhan_gan: "Thép tấm gân",
  thep_hinh: "Thép hình I/H/U/V",
  thep_cay: "Thép cây (phi/hộp/ray)",
  xa_go: "Xà gồ C/Z",
  gia_cong: "Gia công",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Thép tấm HRC": "#06b6d4",
  "Thép tấm gân": "#0ea5e9",
  "Thép hình I/H/U/V": "#1e3a8a",
  "Thép cây (phi/hộp/ray)": "#7c3aed",
  "Xà gồ C/Z": "#f59e0b",
  "Ke / Bản mã": "#14b8a6",
  "Gia công": "#e11d2a",
  Khác: "#94a3b8",
};

export function categorize(loai?: string, name?: string): string {
  if (loai && CAT_BY_LOAI[loai]) return CAT_BY_LOAI[loai];
  const n = (name || "").toLowerCase();
  if (/tấm gân|chống trượt|gân/.test(n)) return "Thép tấm gân";
  if (/tấm|bản mã|thép la|^la /.test(n)) return "Thép tấm HRC";
  if (/^ke /.test(n)) return "Ke / Bản mã";
  if (/xà gồ|^c\d|^z\d/.test(n)) return "Xà gồ C/Z";
  if (/[ihuv]\d|thép hình|thép góc/.test(n)) return "Thép hình I/H/U/V";
  if (/ø|phi|ray|hộp|ống|vuông/.test(n)) return "Thép cây (phi/hộp/ray)";
  if (/cắt|đục|khoan|gia công/.test(n)) return "Gia công";
  return "Khác";
}

// ── Đọc / ghi ──
function read(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(orders: Order[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(orders));
  } catch {
    /* bỏ qua */
  }
  emit();
}

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT));
}

// ── Tự dọn đơn chờ quá hạn ──
function prune(orders: Order[]): Order[] {
  const cutoff = Date.now() - ABANDON_DAYS * 86400000;
  return orders.filter(
    (o) => o.status === "won" || new Date(o.createdAt).getTime() >= cutoff,
  );
}

// ── API ──
export function getOrders(): Order[] {
  const pruned = prune(read());
  return [...pruned].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addOrder(o: Partial<Order>): Order {
  const now = new Date().toISOString();
  const order: Order = {
    id: o.id || uid(),
    createdAt: o.createdAt || now,
    date: o.date || now.slice(0, 10),
    customer: (o.customer || "Khách lẻ").trim(),
    project: o.project || "",
    quoter: o.quoter || "",
    items: o.items || [],
    totalKL: num(o.totalKL),
    total: num(o.total),
    status: o.status || "pending",
    wonAt: o.status === "won" ? o.wonAt || now : o.wonAt,
    paid: num(o.paid),
    note: o.note || "",
  };
  const all = prune(read());
  all.push(order);
  write(all);
  syncOrderToSheet(order, order.status === "won" ? "won" : "pending");
  return order;
}

export function updateOrder(id: string, patch: Partial<Order>) {
  const all = prune(read()).map((o) => (o.id === id ? { ...o, ...patch } : o));
  write(all);
  const updated = all.find((o) => o.id === id);
  if (updated) syncOrderToSheet(updated, "update");
}

export function confirmOrder(id: string) {
  const now = new Date().toISOString();
  const all = prune(read()).map((o) =>
    o.id === id ? { ...o, status: "won" as OrderStatus, wonAt: now } : o,
  );
  write(all);
  const won = all.find((o) => o.id === id);
  if (won) syncOrderToSheet(won, "won");
}

export function removeOrder(id: string) {
  const target = read().find((o) => o.id === id);
  write(prune(read()).filter((o) => o.id !== id));
  if (target) syncOrderToSheet(target, "delete");
}

export function clearAll() {
  write([]);
}

// ── Kỳ lọc thời gian ──
export type Period = "day" | "week" | "month" | "quarter" | "year" | "all";

export const PERIODS: { key: Period; label: string }[] = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "quarter", label: "Quý" },
  { key: "year", label: "Năm" },
  { key: "all", label: "Tất cả" },
];

export const PERIOD_CURRENT: Record<Period, string> = {
  day: "Hôm nay",
  week: "Tuần này",
  month: "Tháng này",
  quarter: "Quý này",
  year: "Năm nay",
  all: "Toàn bộ",
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // tuần bắt đầu Thứ 2
  return s;
};
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

const orderTime = (o: Order) => new Date(o.wonAt || o.date || o.createdAt).getTime();

export interface Range {
  from: number;
  to: number;
}

// Khoảng thời gian của "kỳ hiện tại"
export function periodRange(period: Period, now = new Date()): Range {
  const to = now.getTime() + 1;
  switch (period) {
    case "day": return { from: startOfDay(now).getTime(), to };
    case "week": return { from: startOfWeek(now).getTime(), to };
    case "month": return { from: startOfMonth(now).getTime(), to };
    case "quarter": return { from: startOfQuarter(now).getTime(), to };
    case "year": return { from: startOfYear(now).getTime(), to };
    default: return { from: 0, to };
  }
}

// Chuỗi bucket cho biểu đồ xu hướng theo kỳ
export function trendSeries(
  orders: Order[],
  period: Period,
  now = new Date(),
): { label: string; revenue: number; orders: number }[] {
  const won = orders.filter((o) => o.status === "won");
  const buckets: { from: number; to: number; label: string }[] = [];
  const push = (f: Date, t: Date, label: string) =>
    buckets.push({ from: f.getTime(), to: t.getTime(), label });

  if (period === "day") {
    const base = startOfDay(now);
    for (let i = 13; i >= 0; i--) {
      const f = new Date(base); f.setDate(f.getDate() - i);
      const t = new Date(f); t.setDate(t.getDate() + 1);
      push(f, t, f.getDate() + "/" + (f.getMonth() + 1));
    }
  } else if (period === "week") {
    const base = startOfWeek(now);
    for (let i = 7; i >= 0; i--) {
      const f = new Date(base); f.setDate(f.getDate() - i * 7);
      const t = new Date(f); t.setDate(t.getDate() + 7);
      push(f, t, f.getDate() + "/" + (f.getMonth() + 1));
    }
  } else if (period === "quarter") {
    const base = startOfQuarter(now);
    for (let i = 5; i >= 0; i--) {
      const f = new Date(base.getFullYear(), base.getMonth() - i * 3, 1);
      const t = new Date(f.getFullYear(), f.getMonth() + 3, 1);
      push(f, t, "Q" + (Math.floor(f.getMonth() / 3) + 1) + "/" + String(f.getFullYear()).slice(2));
    }
  } else if (period === "year") {
    const base = startOfYear(now);
    for (let i = 4; i >= 0; i--) {
      const f = new Date(base.getFullYear() - i, 0, 1);
      const t = new Date(f.getFullYear() + 1, 0, 1);
      push(f, t, String(f.getFullYear()));
    }
  } else {
    const n = period === "all" ? 12 : 6;
    const base = startOfMonth(now);
    for (let i = n - 1; i >= 0; i--) {
      const f = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const t = new Date(f.getFullYear(), f.getMonth() + 1, 1);
      push(f, t, "Th" + (f.getMonth() + 1));
    }
  }

  return buckets.map((b) => {
    let revenue = 0;
    let cnt = 0;
    for (const o of won) {
      const ts = orderTime(o);
      if (ts >= b.from && ts < b.to) { revenue += o.total; cnt += 1; }
    }
    return { label: b.label, revenue, orders: cnt };
  });
}

// ── Thống kê cho Dashboard (lọc theo kỳ nếu truyền range) ──
export interface Stats {
  revenue: number; // doanh thu (đơn đã chốt trong kỳ)
  debt: number; // công nợ hiện tại
  collected: number; // đã thu = doanh thu - công nợ
  totalKL: number;
  wonCount: number;
  pendingCount: number;
  pendingValue: number;
  byCategory: { name: string; value: number; kl: number }[];
  topCustomers: { name: string; revenue: number; orders: number }[];
  bestProduct: { name: string; value: number } | null;
  avgOrder: number;
}

export function computeStats(orders: Order[], range?: Range): Stats {
  const inRange = (o: Order) => {
    if (!range) return true;
    const t = orderTime(o);
    return t >= range.from && t < range.to;
  };
  const won = orders.filter((o) => o.status === "won" && inRange(o));
  const pending = orders.filter((o) => o.status === "pending");
  const revenue = won.reduce((s, o) => s + o.total, 0);
  const collected = won.reduce((s, o) => s + Math.min(o.paid, o.total), 0);
  const debt = revenue - collected;
  const totalKL = won.reduce((s, o) => s + o.totalKL, 0);

  // Theo nhóm hàng
  const catMap = new Map<string, { value: number; kl: number }>();
  for (const o of won) {
    for (const it of o.items) {
      const cur = catMap.get(it.category) || { value: 0, kl: 0 };
      cur.value += it.tien;
      cur.kl += it.kl;
      catMap.set(it.category, cur);
    }
  }
  const byCategory = [...catMap.entries()]
    .map(([name, v]) => ({ name, value: v.value, kl: v.kl }))
    .sort((a, b) => b.value - a.value);

  // Top khách hàng (10)
  const custMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of won) {
    const cur = custMap.get(o.customer) || { revenue: 0, orders: 0 };
    cur.revenue += o.total;
    cur.orders += 1;
    custMap.set(o.customer, cur);
  }
  const topCustomers = [...custMap.entries()]
    .map(([name, v]) => ({ name, revenue: v.revenue, orders: v.orders }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const bestProduct = byCategory.length
    ? { name: byCategory[0].name, value: byCategory[0].value }
    : null;

  return {
    revenue,
    debt,
    collected,
    totalKL,
    wonCount: won.length,
    pendingCount: pending.length,
    pendingValue: pending.reduce((s, o) => s + o.total, 0),
    byCategory,
    topCustomers,
    bestProduct,
    avgOrder: won.length ? revenue / won.length : 0,
  };
}

// ── React hook realtime ──
export function useOrders(): Order[] {
  const [orders, setOrders] = useState<Order[]>(() => {
    maybeSeed();
    return getOrders();
  });
  useEffect(() => {
    const refresh = () => setOrders(getOrders());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return orders;
}

// ── Dữ liệu mẫu (chỉ tạo lần đầu, có thể xoá ở trang Đơn hàng) ──
export function maybeSeed() {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    if (read().length > 0) {
      localStorage.setItem(SEED_FLAG, "1");
      return;
    }
    const seeded = buildSeed();
    localStorage.setItem(KEY, JSON.stringify(seeded));
    localStorage.setItem(SEED_FLAG, "1");
    emit();
  } catch {
    /* bỏ qua */
  }
}

export function isSeeded(): boolean {
  return localStorage.getItem(SEED_FLAG) === "1" && read().length > 0;
}

function buildSeed(): Order[] {
  const customers = [
    "Cơ Khí Hoàng Trọng Tín",
    "Kết Cấu Thép Đại Dũng",
    "Xây Dựng Phú Mỹ",
    "Cơ Khí Thành Đạt",
    "Nhà Thép Tiền Chế An Phát",
    "Cơ Khí Minh Long",
    "Kết Cấu Thép Hòa Phát Miền Trung",
    "Xưởng Cơ Khí Tân Tiến",
  ];
  const cats: [string, string][] = [
    ["Thép tấm HRC", "Tấm 10ly 1500x6000"],
    ["Thép tấm HRC", "Tấm 12ly 1500x6000"],
    ["Thép tấm gân", "Tấm gân 5ly 1500x6000"],
    ["Thép hình I/H/U/V", "Thép H200x200 POSCO"],
    ["Thép hình I/H/U/V", "Thép U150 AKS"],
    ["Thép cây (phi/hộp/ray)", "Phi Ø20 SS400"],
    ["Xà gồ C/Z", "Xà gồ Z200"],
    ["Ke / Bản mã", "Ke 250x100x20ly"],
  ];
  const orders: Order[] = [];
  const now = new Date();
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let m = 5; m >= 0; m--) {
    const count = 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < count; k++) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 2 + Math.floor(rnd() * 25));
      const iso = d.toISOString();
      const nItems = 1 + Math.floor(rnd() * 3);
      const items: OrderItem[] = [];
      for (let i = 0; i < nItems; i++) {
        const [category, name] = cats[Math.floor(rnd() * cats.length)];
        const kl = Math.round((500 + rnd() * 6000) * 10) / 10;
        const price = 16000 + Math.floor(rnd() * 9000);
        items.push({ name, category, qty: 1 + Math.floor(rnd() * 30), kl, tien: Math.round(kl * price) });
      }
      const total = items.reduce((s, it) => s + it.tien, 0);
      const totalKL = items.reduce((s, it) => s + it.kl, 0);
      const customer = customers[Math.floor(rnd() * customers.length)];
      // 80% đã chốt, 20% còn chờ (chỉ ở 2 tháng gần đây)
      const won = m > 1 ? true : rnd() > 0.35;
      const paidRatio = won ? (rnd() > 0.5 ? 1 : 0.4 + rnd() * 0.5) : 0;
      orders.push({
        id: uid(),
        createdAt: iso,
        date: iso.slice(0, 10),
        customer,
        project: "",
        quoter: ["Trâm", "Na", "Vinh", "Quỳnh"][Math.floor(rnd() * 4)] + " - Thép Tấn Quốc",
        items,
        totalKL,
        total,
        status: won ? "won" : "pending",
        wonAt: won ? iso : undefined,
        paid: Math.round(total * paidRatio),
        note: "",
      });
    }
  }
  return orders;
}
