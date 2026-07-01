// ============================================================
// TÍN HIỆU THỊ TRƯỜNG THÉP VIỆT NAM (cho mô hình dự báo "market")
// - Giá trị mặc định lấy từ nghiên cứu web (VSA, VietnamBiz, ASEANSC) 2026
// - Có thể cập nhật REAL-TIME qua /api/market (Anthropic web search)
// ============================================================
export interface MarketSource { title: string; url: string }
export interface MarketSignal {
  asOf: string; // MM/YYYY
  demandTrendPct: number; // tăng trưởng cầu thép toàn ngành / năm (%)
  priceTrendPct: number; // xu hướng giá HRC (%)
  byCategory: Record<string, number>; // tăng trưởng cầu theo nhóm (%)
  summary: string;
  sources: MarketSource[];
  live?: boolean; // true nếu vừa lấy realtime từ web
}

// Nền tảng từ nghiên cứu web (T6/2026): VSA dự báo tiêu thụ thép 2026 +10–13%,
// thép xây dựng +14%, HRC +25–30% nhờ đầu tư công & thuế chống bán phá giá TQ; giá HRC +4% YoY.
export const DEFAULT_MARKET: MarketSignal = {
  asOf: "06/2026",
  demandTrendPct: 12,
  priceTrendPct: 4,
  byCategory: {
    "Thép tấm HRC": 28,
    "Cuộn HRC": 28,
    "Thép tấm gân": 14,
    "Thép hình": 14,
    "Thép cây": 14,
    "Xà gồ C/Z": 12,
    "Ke / Bản mã": 12,
  },
  summary:
    "Theo VSA, tiêu thụ thép toàn ngành 2026 dự kiến tăng ~10–13%; thép xây dựng +14%, HRC tăng mạnh 25–30% nhờ đầu tư công, hạ tầng và thuế chống bán phá giá thép Trung Quốc. Giá HRC quanh 528–568 USD/tấn (+4% so cùng kỳ).",
  sources: [
    { title: "VietnamBiz — Thị trường thép Q1/2026", url: "https://vietnambiz.vn/bao-cao-thi-truong-thep-quy-i2026-tieu-thu-thep-xay-dung-tang-vot-gia-thep-phuc-hoi-20265510733562.htm" },
    { title: "VietnamBiz — HRC tăng đột biến T4/2026", url: "https://vietnambiz.vn/bao-cao-thi-truong-thep-thang-42026-tieu-thu-thep-hrc-tang-dot-bien-xuat-khau-tang-gap-doi-202662018208998.htm" },
    { title: "ASEAN Securities — Báo cáo ngành thép 2026", url: "https://www.aseansc.com.vn/bao-cao-nganh-thep-2026/" },
  ],
};

const KEY = "tq_market_v1";

export function getMarketSignal(): MarketSignal {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_MARKET, ...JSON.parse(raw) };
  } catch {
    /* bỏ qua */
  }
  return DEFAULT_MARKET;
}

export function saveMarketSignal(m: MarketSignal) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* bỏ qua */
  }
}

export function marketPctFor(m: MarketSignal, category: string): number {
  if (m.byCategory && m.byCategory[category] != null) return m.byCategory[category];
  // khớp gần đúng theo tiền tố
  const key = Object.keys(m.byCategory || {}).find(
    (k) => category.toLowerCase().startsWith(k.toLowerCase()) || k.toLowerCase().startsWith(category.toLowerCase()),
  );
  return key ? m.byCategory[key] : m.demandTrendPct;
}

const toNum = (v: unknown, d: number): number => {
  const n = Number(v);
  return isFinite(n) ? n : d;
};

// Lấy tín hiệu thị trường REAL-TIME qua serverless (Anthropic web search)
export async function fetchMarketSignal(): Promise<MarketSignal> {
  const res = await fetch("/api/market", { method: "POST" });
  if (!res.ok) {
    let e = "";
    try { e = (await res.json()).error || ""; } catch { /* ignore */ }
    throw new Error(e || "Lỗi " + res.status);
  }
  const data = await res.json();
  const m: MarketSignal = {
    asOf: String(data.asOf || new Date().toISOString().slice(0, 7)),
    demandTrendPct: toNum(data.demandTrendPct, DEFAULT_MARKET.demandTrendPct),
    priceTrendPct: toNum(data.priceTrendPct, DEFAULT_MARKET.priceTrendPct),
    byCategory:
      data.byCategory && typeof data.byCategory === "object"
        ? Object.fromEntries(Object.entries(data.byCategory).map(([k, v]) => [k, toNum(v, DEFAULT_MARKET.demandTrendPct)]))
        : DEFAULT_MARKET.byCategory,
    summary: String(data.summary || DEFAULT_MARKET.summary),
    sources: Array.isArray(data.sources)
      ? data.sources.slice(0, 6).map((s: any) => ({ title: String(s.title || s.url || "Nguồn"), url: String(s.url || "") }))
      : DEFAULT_MARKET.sources,
    live: true,
  };
  saveMarketSignal(m);
  return m;
}
