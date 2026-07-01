import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie,
  LineChart, Line, LabelList, Legend, AreaChart, Area, ReferenceLine,
} from "recharts";
import {
  Warehouse, Boxes, Layers, AlertTriangle, RefreshCw, Search, CheckCircle2, TrendingUp, MapPin, Package,
  Database, X, Activity, Gauge, ArrowRight, Bell, Calendar, ShoppingBag, ChevronRight, TrendingDown, Clock,
  BrainCircuit, Globe, ExternalLink, Loader2, Info,
} from "lucide-react";
import { Card, Pill, EmptyState } from "../components/ui";
import PeriodSelect from "../components/PeriodSelect";
import { useInventory, type InvItem } from "../lib/inventory";
import { useOrders, computeStats, periodRange, PERIOD_CURRENT, type Period } from "../lib/salesStore";
import {
  forecastCategory, depletionByCategory, buildCategoryDetail, STOCK_STATUS_META, MODELS,
  categoryAccuracies, bestModel,
  type DepletionRow, type CategoryDetail, type ModelId,
} from "../lib/forecast";
import { getMarketSignal, marketPctFor, fetchMarketSignal, type MarketSignal } from "../lib/market";
import { fmt, fmtShort } from "../lib/format";

const INV_COLORS: Record<string, string> = {
  "Thép tấm HRC": "#06b6d4",
  "Cuộn HRC": "#1e3a8a",
  "Thép tấm gân": "#0ea5e9",
  "Thép hình": "#7c3aed",
  "Thép cây": "#14b8a6",
  "Xà gồ C/Z": "#f59e0b",
  Khác: "#94a3b8",
};
const colorFor = (c: string, i = 0) =>
  INV_COLORS[c] || ["#06b6d4", "#1e3a8a", "#7c3aed", "#f59e0b", "#10b981", "#ec4899"][i % 6];

const ton = (kg: number) => (kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
const LOW_QTY = 10; // ngưỡng cảnh báo sắp hết

export default function InventoryDashboard() {
  const { items, loading, error, isSample, refresh } = useInventory();
  const orders = useOrders();
  const [period, setPeriod] = useState<Period>("month");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [showAlert, setShowAlert] = useState(false);
  const [fcCat, setFcCat] = useState("");
  const [detailCat, setDetailCat] = useState<string | null>(null);
  const [model, setModel] = useState<ModelId>("ewma");
  const [market, setMarket] = useState<MarketSignal>(() => getMarketSignal());
  const [mktLoading, setMktLoading] = useState(false);
  const [mktErr, setMktErr] = useState("");
  const [showMkt, setShowMkt] = useState(false);

  const stats = computeStats(orders, periodRange(period));

  // Dự báo cạn kho theo nhóm
  const depletion = useMemo(() => depletionByCategory(items, orders), [items, orders]);
  const atRisk = depletion.filter((r) => r.status === "critical" || r.status === "warn");

  // Nhóm để dự báo nhu cầu (mặc định nhóm tiêu thụ nhiều nhất -> biểu đồ có ý nghĩa nhất)
  const fcDefault = useMemo(() => {
    const byRate = depletion.filter((r) => r.rateKgWeek > 0).sort((a, b) => b.rateKgWeek - a.rateKgWeek);
    return byRate[0]?.category || depletion[0]?.category || "";
  }, [depletion]);
  const fcCategory = fcCat || fcDefault;
  const marketPct = (cat: string) => (model === "market" ? marketPctFor(market, cat) : 0);
  const forecast = useMemo(
    () => (fcCategory ? forecastCategory(orders, fcCategory, { model, marketPctAnnual: marketPct(fcCategory) }) : null),
    [orders, fcCategory, model, market],
  );
  const detail = useMemo(
    () => (detailCat ? buildCategoryDetail(orders, items, detailCat, 4, { model, marketPctAnnual: marketPct(detailCat) }) : null),
    [orders, items, detailCat, model, market],
  );
  // Độ chính xác của tất cả mô hình cho nhóm đang xem (để so sánh + đề xuất)
  const accById = useMemo(
    () => (fcCategory ? categoryAccuracies(orders, fcCategory, { marketPctAnnual: marketPctFor(market, fcCategory) }) : ({} as Record<ModelId, number | null>)),
    [orders, fcCategory, market],
  );
  const recommended = bestModel(accById);

  const updateMarket = () => {
    setMktLoading(true);
    setMktErr("");
    fetchMarketSignal()
      .then((m) => setMarket(m))
      .catch((e) => setMktErr(e.message || "Không cập nhật được thị trường"))
      .finally(() => setMktLoading(false));
  };

  const byCat = useMemo(() => {
    const m = new Map<string, { weight: number; qty: number; items: number }>();
    for (const it of items) {
      const cur = m.get(it.category) || { weight: 0, qty: 0, items: 0 };
      cur.weight += it.weightKg;
      cur.qty += it.qty;
      cur.items += 1;
      m.set(it.category, cur);
    }
    return [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.weight - a.weight);
  }, [items]);

  const totalWeight = items.reduce((s, it) => s + it.weightKg, 0);
  const lowStock = items.filter((it) => (it.qty > 0 && it.qty <= LOW_QTY) || /hết|sắp hết|thiếu/i.test(it.note));
  const categories = ["all", ...byCat.map((c) => c.name)];

  const filtered = items.filter((it) => {
    if (cat !== "all" && it.category !== cat) return false;
    if (q && !`${it.name} ${it.spec} ${it.location} ${it.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Kho hàng & Kinh doanh
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tồn kho theo loại hàng & tình hình bán hàng — dành cho toàn phòng kinh doanh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="btn-ghost" title="Tải lại tồn kho từ Google Sheet">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      {(isSample || error) && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700 ring-1 ring-amber-100">
          <Database size={15} />
          {error || "Đang hiển thị dữ liệu kho MẪU. Vào Cài đặt để kết nối Google Sheet tồn kho."}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Khối lượng tồn kho" value={ton(totalWeight) + " tấn"} sub={`${fmt(totalWeight)} kg`} icon={<Boxes size={18} />} tone="cyan" />
        <Kpi label="Số mặt hàng" value={String(items.length)} sub={`${byCat.length} nhóm hàng`} icon={<Package size={18} />} tone="navy" />
        <Kpi
          label="Cảnh báo tồn kho"
          value={String(lowStock.length + atRisk.length)}
          sub="Bấm để xem chi tiết →"
          icon={<Bell size={18} />}
          tone={atRisk.some((r) => r.status === "critical") || lowStock.length ? "amber" : "green"}
          onClick={() => setShowAlert(true)}
        />
        <Kpi label={`Đơn chốt · ${PERIOD_CURRENT[period].toLowerCase()}`} value={String(stats.wonCount)} sub={`${fmtShort(stats.revenue)}đ doanh thu`} icon={<CheckCircle2 size={18} />} tone="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Tồn kho theo nhóm hàng (tấn)" icon={<Warehouse size={16} />}>
          {byCat.length === 0 ? <EmptyState title="Chưa có dữ liệu kho" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCat.map((c) => ({ name: c.name, tan: +(c.weight / 1000).toFixed(2) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="invBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(v: number) => [v + " tấn", "Tồn kho"]} cursor={{ fill: "rgba(6,182,212,0.06)" }} />
                <Bar dataKey="tan" fill="url(#invBar)" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {byCat.map((c) => <Cell key={c.name} fill={colorFor(c.name)} />)}
                  <LabelList
                    dataKey="tan"
                    position="top"
                    formatter={(v: number) => `${v} t`}
                    style={{ fontSize: 12, fontWeight: 700, fill: "#1e3a8a" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Cơ cấu tồn kho" icon={<Layers size={16} />}>
          {byCat.length === 0 ? <EmptyState title="—" /> : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={byCat} dataKey="weight" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2} stroke="none">
                    {byCat.map((c, i) => <Cell key={c.name} fill={colorFor(c.name, i)} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n) => [ton(v) + " tấn", n as string]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {byCat.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(c.name, i) }} />
                    <span className="flex-1 truncate text-slate-600">{c.name}</span>
                    <span className="font-semibold text-slate-700">{ton(c.weight)}t</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Forecast demand + best selling */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          className="lg:col-span-2"
          title="Dự báo nhu cầu (kg/tuần)"
          icon={<Activity size={16} />}
          action={
            <select
              value={fcCategory}
              onChange={(e) => setFcCat(e.target.value)}
              className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy focus:border-cyan-400 focus:outline-none"
            >
              {(byCat.length ? byCat.map((c) => c.name) : ["—"]).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          }
        >
          {/* Chọn mô hình + độ chính xác từng mô hình */}
          <div className="mb-3 rounded-xl bg-slate-50 p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><BrainCircuit size={14} className="text-cyan-600" /> Mô hình:</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as ModelId)}
                className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy focus:border-cyan-400 focus:outline-none"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{accById[m.id] != null ? ` — ~${accById[m.id]}%` : ""}{m.id === recommended ? " ⭐" : ""}
                  </option>
                ))}
              </select>
              {forecast && (
                <Pill color={forecast.accuracy == null ? "slate" : forecast.accuracy >= 70 ? "green" : forecast.accuracy >= 50 ? "amber" : "red"}>
                  <Gauge size={12} /> Độ chính xác {forecast.accuracy == null ? "—" : "~" + forecast.accuracy + "%"}
                </Pill>
              )}
              {recommended && recommended !== model && (
                <button onClick={() => setModel(recommended)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100">
                  ⭐ Dùng mô hình chính xác nhất ({MODELS.find((m) => m.id === recommended)?.name} ~{accById[recommended]}%)
                </button>
              )}
              {model === "market" && (
                <button onClick={() => setShowMkt((v) => !v)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                  <Globe size={12} /> Thị trường thép VN ({market.asOf}){market.live ? " · realtime" : ""}
                </button>
              )}
            </div>
            {/* So sánh độ chính xác các mô hình */}
            <div className="mt-2.5 space-y-1">
              {MODELS.map((m) => {
                const a = accById[m.id];
                const isBest = m.id === recommended;
                return (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors ${m.id === model ? "bg-white ring-1 ring-cyan-300" : "hover:bg-white/70"}`}
                  >
                    <span className={`w-40 shrink-0 truncate text-[11px] font-semibold ${m.id === model ? "text-navy" : "text-slate-500"}`}>
                      {m.name}{isBest ? " ⭐" : ""}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <span className="block h-full rounded-full" style={{ width: `${a ?? 0}%`, background: a == null ? "#cbd5e1" : a >= 70 ? "#10b981" : a >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </span>
                    <span className="w-10 shrink-0 text-right text-[11px] font-bold text-slate-600">{a == null ? "—" : "~" + a + "%"}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">{MODELS.find((m) => m.id === model)?.desc} · Độ chính xác ước tính bằng kiểm định ngược (backtest) trên lịch sử bán thực tế.</p>
          </div>

          {model === "market" && showMkt && (
            <div className="mb-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-navy-950"><Info size={13} /> Cầu ngành thép (VSA/web) · cập nhật {market.asOf}</span>
                <button onClick={updateMarket} disabled={mktLoading} className="inline-flex items-center gap-1 rounded-lg bg-navy px-2 py-1 font-semibold text-white disabled:opacity-50">
                  {mktLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Cập nhật realtime
                </button>
              </div>
              <p className="text-slate-600">{market.summary}</p>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-500">
                <span>Cầu toàn ngành <b className="text-navy">+{market.demandTrendPct}%/năm</b></span>
                <span>Giá HRC <b className="text-navy">+{market.priceTrendPct}%</b></span>
                <span>Nhóm {fcCategory}: <b className="text-cyan-700">+{marketPctFor(market, fcCategory)}%/năm</b></span>
              </div>
              {mktErr && <p className="mt-1 text-rose-500">⚠ {mktErr} (đang dùng số liệu nghiên cứu sẵn).</p>}
              <div className="mt-1.5 flex flex-wrap gap-2">
                {market.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-600 hover:underline">
                    <ExternalLink size={11} /> {s.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {!forecast ? (
            <EmptyState title="Chưa đủ dữ liệu" hint="Cần lịch sử đơn đã chốt để dự báo." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={forecast.data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip formatter={(v: number, n) => [fmt(v) + " kg", n === "actual" ? "Thực tế" : "Dự báo"]} />
                  <Legend formatter={(v) => (v === "actual" ? "Thực tế đã bán" : "Dự báo")} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="actual" name="actual" stroke="#1e3a8a" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="forecast" name="forecast" stroke="#06b6d4" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Pill color={forecast.trendUp ? "amber" : "green"}>
                  <TrendingUp size={12} /> Nhu cầu {forecast.trendUp ? "đang tăng" : "ổn định/giảm"}
                </Pill>
                <span>Dự kiến tiêu thụ <b className="text-navy">{fmt(forecast.rate)} kg/tuần</b> nhóm {fcCategory}.</span>
              </div>
            </>
          )}
        </Card>

        <Card title={`Hàng bán chạy · ${PERIOD_CURRENT[period].toLowerCase()}`} icon={<TrendingUp size={16} />}
          action={<PeriodSelect value={period} onChange={setPeriod} />}
        >
          {stats.byCategory.length === 0 ? (
            <EmptyState title="Chưa có đơn chốt trong kỳ" />
          ) : (
            <div className="space-y-3">
              {stats.byCategory.slice(0, 6).map((c) => {
                const max = stats.byCategory[0].value || 1;
                return (
                  <div key={c.name}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-700">{c.name}</span>
                      <span className="shrink-0 text-sm font-bold text-cyan-700">{fmtShort(c.value)}đ</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${(c.value / max) * 100}%`, background: "linear-gradient(90deg,#1e3a8a,#06b6d4)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Depletion forecast table */}
      <Card title="Dự báo cạn kho theo nhóm hàng" icon={<Gauge size={16} />}
        action={<span className="text-xs text-slate-400">Bấm vào một nhóm để xem dự báo chi tiết →</span>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 pl-1">Nhóm hàng</th>
                <th className="pb-2 text-right">Tồn (tấn)</th>
                <th className="pb-2 text-right">Tiêu thụ TB/tuần</th>
                <th className="pb-2 text-center">Dự báo còn</th>
                <th className="pb-2 text-center">Trạng thái</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {depletion.map((r) => {
                const meta = STOCK_STATUS_META[r.status];
                return (
                  <tr
                    key={r.category}
                    onClick={() => setDetailCat(r.category)}
                    className="cursor-pointer border-t border-slate-50 transition-colors hover:bg-cyan-50/50"
                  >
                    <td className="py-2.5 pl-1 font-medium text-navy-950">{r.category}</td>
                    <td className="py-2.5 text-right text-slate-600">{ton(r.stockKg)}</td>
                    <td className="py-2.5 text-right text-slate-600">{r.rateKgWeek > 0 ? fmt(r.rateKgWeek) + " kg" : "—"}</td>
                    <td className="py-2.5 text-center font-semibold" style={{ color: meta.color }}>
                      {r.weeksLeft === Infinity ? "—" : r.weeksLeft < 0.15 ? "< 1 ngày" : `${r.weeksLeft.toFixed(1)} tuần`}
                    </td>
                    <td className="py-2.5 text-center"><Pill color={meta.pill}>{meta.label}</Pill></td>
                    <td className="py-2.5 pr-1 text-right"><ChevronRight size={16} className="text-slate-300" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inventory table */}
      <Card title="Danh sách tồn kho" icon={<Warehouse size={16} />}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mặt hàng, quy cách, vị trí..."
              className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-cyan-400 focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${cat === c ? "bg-navy text-white" : "bg-slate-100 text-slate-500 hover:text-navy"}`}>
                {c === "all" ? "Tất cả" : c}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="pb-2 pl-1">Mặt hàng</th>
                <th className="pb-2">Nhóm</th>
                <th className="pb-2">Quy cách</th>
                <th className="pb-2 text-right">Tồn</th>
                <th className="pb-2 text-right">KL (kg)</th>
                <th className="pb-2">Vị trí</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-2 pl-1">
                    <span className="font-medium text-navy-950">{it.name}</span>
                    {/hết|sắp hết|thiếu/i.test(it.note) && <span className="ml-2 text-[10px] font-bold text-rose-500">SẮP HẾT</span>}
                  </td>
                  <td className="py-2">
                    <span className="chip" style={{ background: colorFor(it.category) + "22", color: colorFor(it.category) }}>{it.category}</span>
                  </td>
                  <td className="py-2 text-slate-500">{it.spec || "—"}</td>
                  <td className="py-2 text-right font-semibold text-navy-950">{fmt(it.qty)} <span className="text-[11px] font-normal text-slate-400">{it.unit}</span></td>
                  <td className="py-2 text-right text-slate-600">{fmt(it.weightKg)}</td>
                  <td className="py-2"><span className="inline-flex items-center gap-1 text-slate-500"><MapPin size={12} />{it.location || "—"}</span></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Không tìm thấy mặt hàng.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAlert && <AlertModal lowStock={lowStock} atRisk={atRisk} onClose={() => setShowAlert(false)} onPick={(c) => { setShowAlert(false); setDetailCat(c); }} />}
      {detail && <CategoryDetailModal detail={detail} onClose={() => setDetailCat(null)} />}
    </div>
  );
}

function CategoryDetailModal({ detail, onClose }: { detail: CategoryDetail; onClose: () => void }) {
  const meta = STOCK_STATUS_META[detail.status];
  const ton = (kg: number) => (kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  const stockoutWeek = detail.projection.find((p) => p.stockout);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass max-h-[90vh] w-full max-w-3xl overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl font-extrabold text-navy-950">{detail.category}</h3>
              <Pill color={meta.pill}>{meta.label}</Pill>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">Dự báo tồn kho chi tiết · {detail.itemCount} mặt hàng trong nhóm</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Tồn hiện tại" value={ton(detail.stockKg) + " t"} sub={`${fmt(detail.stockKg)} kg`} icon={<Boxes size={15} />} />
          <Mini label="Tiêu thụ TB/tuần" value={detail.rateKgWeek > 0 ? fmt(detail.rateKgWeek) + " kg" : "—"} sub={detail.trendUp ? "xu hướng tăng" : "ổn định/giảm"} icon={detail.trendUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />} />
          <Mini label="Dự báo còn" value={isFinite(detail.weeksLeft) ? detail.weeksLeft.toFixed(1) + " tuần" : "—"} sub={detail.status === "idle" ? "chưa bán gần đây" : "đến khi cạn"} icon={<Clock size={15} />} color={meta.color} />
          <Mini label="Dự kiến hết hàng" value={detail.stockoutDate} sub="ngày cạn kho" icon={<Calendar size={15} />} color={meta.color} />
        </div>

        {/* Reorder suggestion */}
        {detail.reorderQty > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
            <ShoppingBag size={16} className="text-amber-600" />
            <span>Đề xuất <b>đặt thêm ~{fmt(detail.reorderQty)} kg</b> ({ton(detail.reorderQty)} tấn) để đủ dùng {detail.targetWeeks} tuần tới.</span>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircle2 size={16} /> Tồn kho đủ dùng trên {detail.targetWeeks} tuần — chưa cần đặt thêm.
          </div>
        )}

        {/* Forecast + projection charts */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nhu cầu kg/tuần (thực tế + dự báo)</span>
              <span className="text-[11px] font-semibold text-cyan-600">{MODELS.find((m) => m.id === detail.forecast.model)?.name} · {detail.forecast.accuracy == null ? "—" : "~" + detail.forecast.accuracy + "%"}</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={detail.forecast.data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={38} />
                <Tooltip formatter={(v: number, n) => [fmt(v) + " kg", n === "actual" ? "Thực tế" : "Dự báo"]} />
                <Line type="monotone" dataKey="actual" name="actual" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey="forecast" name="forecast" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tồn kho dự phóng (kg)</div>
            {detail.projection.length === 0 ? (
              <div className="grid h-[180px] place-items-center text-center text-xs text-slate-400">Nhóm chưa có tiêu thụ gần đây nên chưa dự phóng được.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={detail.projection} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={38} />
                  <Tooltip formatter={(v: number, n) => [fmt(v) + " kg", n === "remaining" ? "Tồn còn lại" : "Dự kiến dùng"]} />
                  <ReferenceLine y={0} stroke="#e11d2a" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="remaining" name="remaining" stroke={meta.color} strokeWidth={2.5} fill="url(#projFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Weekly projection table */}
        {detail.projection.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-sm font-semibold text-navy-950">Dự phóng tồn kho theo tuần</div>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-2">Tuần (từ)</th>
                    <th className="px-3 py-2 text-right">Dự kiến dùng</th>
                    <th className="px-3 py-2 text-right">Tồn còn lại</th>
                    <th className="px-3 py-2 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.projection.map((p, i) => (
                    <tr key={i} className={`border-t border-slate-50 ${p.stockout ? "bg-rose-50" : ""}`}>
                      <td className="px-3 py-2 text-slate-600">{p.label}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{fmt(p.demand)} kg</td>
                      <td className="px-3 py-2 text-right font-semibold text-navy-950">{fmt(p.remaining)} kg</td>
                      <td className="px-3 py-2 text-center">
                        {p.stockout ? <span className="text-xs font-bold text-rose-600">⚠ Hết hàng</span> : p.remaining < detail.rateKgWeek ? <span className="text-xs font-semibold text-amber-600">Sắp hết</span> : <span className="text-xs text-emerald-600">Đủ</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {stockoutWeek && <p className="mt-1.5 text-xs text-rose-500">Dự kiến cạn kho khoảng tuần {stockoutWeek.label} (≈ {detail.stockoutDate}).</p>}
          </div>
        )}

        {/* Per-item breakdown */}
        <div className="mt-5">
          <div className="mb-2 text-sm font-semibold text-navy-950">Chi tiết mặt hàng trong nhóm</div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2">Mặt hàng</th>
                  <th className="px-3 py-2">Vị trí</th>
                  <th className="px-3 py-2 text-right">Tồn</th>
                  <th className="px-3 py-2 text-right">% nhóm</th>
                  <th className="px-3 py-2 text-right">Ước tính hết</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-navy-950">{it.name}</div>
                      {it.spec && <div className="text-[11px] text-slate-400">{it.spec}</div>}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{it.location || "—"}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmt(it.qty)} {it.unit}<div className="text-[11px] text-slate-400">{fmt(it.weightKg)} kg</div></td>
                    <td className="px-3 py-2 text-right text-slate-600">{it.share.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right">
                      {isFinite(it.estWeeks) ? <><div className="font-semibold text-navy-950">{it.estWeeks.toFixed(1)} tuần</div><div className="text-[11px] text-slate-400">{it.estDate}</div></> : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">* Ước tính từng mặt hàng theo giả định tiêu thụ chia đều giữa các quy cách trong nhóm. Số liệu sẽ chính xác hơn khi có lịch sử bán theo từng quy cách.</p>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        <span style={{ color: color || "#06b6d4" }}>{icon}</span> {label}
      </div>
      <div className="mt-1 font-display text-base font-extrabold" style={{ color: color || "#0b1b4d" }}>{value}</div>
      <div className="text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone, onClick }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: "cyan" | "navy" | "amber" | "green"; onClick?: () => void }) {
  const c: Record<string, string> = { cyan: "bg-cyan-500", navy: "bg-navy", amber: "bg-amber-500", green: "bg-emerald-500" };
  return (
    <div
      onClick={onClick}
      className={`glass relative overflow-hidden p-4 sm:p-5 ${onClick ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-glow-cyan" : ""}`}
    >
      <div className="flex items-start justify-between">
        <span className="card-title">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${c[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 kpi-value">{value}</div>
      <div className="mt-1 truncate text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

function AlertModal({ lowStock, atRisk, onClose, onPick }: { lowStock: InvItem[]; atRisk: DepletionRow[]; onClose: () => void; onPick: (c: string) => void }) {
  const ton = (kg: number) => (kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass max-h-[85vh] w-full max-w-2xl overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-navy-950">
            <Bell size={18} className="text-amber-500" /> Cảnh báo tồn kho
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-600">
          <AlertTriangle size={15} /> Dự báo hết trong tuần / cần đặt hàng sớm
        </div>
        {atRisk.length === 0 ? (
          <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Không có nhóm hàng nào sắp cạn theo dự báo.</p>
        ) : (
          <div className="mb-5 space-y-2">
            {atRisk.map((r) => {
              const meta = STOCK_STATUS_META[r.status];
              return (
                <div key={r.category} onClick={() => onPick(r.category)} className="cursor-pointer rounded-xl px-3 py-2.5 transition-transform hover:translate-x-0.5" style={{ background: meta.color + "12" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 font-semibold text-navy-950">{r.category} <ChevronRight size={14} className="text-slate-400" /></span>
                    <Pill color={meta.pill}>{meta.label}</Pill>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-slate-500">
                    <span>Tồn: <b>{ton(r.stockKg)} tấn</b></span>
                    <span>Tiêu thụ: <b>{fmt(r.rateKgWeek)} kg/tuần</b></span>
                    <span style={{ color: meta.color }}>Còn ~<b>{r.weeksLeft === Infinity ? "—" : r.weeksLeft.toFixed(1)} tuần</b></span>
                    <ArrowRight size={13} className="mt-0.5" />
                    <span>Đề xuất đặt thêm <b>{fmt(Math.max(0, r.rateKgWeek * 3 - r.stockKg))} kg</b> (đủ ~3 tuần)</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600">
          <Package size={15} /> Mặt hàng sắp hết theo số lượng
        </div>
        {lowStock.length === 0 ? (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Không có mặt hàng nào dưới ngưỡng.</p>
        ) : (
          <div className="space-y-2">
            {lowStock.map((it, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-rose-50/70 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy-950">{it.name}</div>
                  <div className="truncate text-[11px] text-slate-400">{it.category}{it.location ? ` · ${it.location}` : ""}</div>
                </div>
                <Pill color="red">{fmt(it.qty)} {it.unit}</Pill>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
