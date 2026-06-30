import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie,
  LineChart, Line, LabelList, Legend,
} from "recharts";
import {
  Warehouse, Boxes, Layers, AlertTriangle, RefreshCw, Search, CheckCircle2, TrendingUp, MapPin, Package,
  Database, X, Activity, Gauge, ArrowRight, Bell,
} from "lucide-react";
import { Card, Pill, EmptyState } from "../components/ui";
import PeriodSelect from "../components/PeriodSelect";
import { useInventory, type InvItem } from "../lib/inventory";
import { useOrders, computeStats, periodRange, PERIOD_CURRENT, type Period } from "../lib/salesStore";
import { forecastCategory, depletionByCategory, STOCK_STATUS_META, type DepletionRow } from "../lib/forecast";
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

  const stats = computeStats(orders, periodRange(period));

  // Dự báo cạn kho theo nhóm
  const depletion = useMemo(() => depletionByCategory(items, orders), [items, orders]);
  const atRisk = depletion.filter((r) => r.status === "critical" || r.status === "warn");

  // Nhóm để dự báo nhu cầu (mặc định nhóm có nguy cơ cao nhất, hoặc nhóm tồn nhiều nhất)
  const fcCategory = fcCat || atRisk[0]?.category || depletion[0]?.category || "";
  const forecast = useMemo(
    () => (fcCategory ? forecastCategory(orders, fcCategory) : null),
    [orders, fcCategory],
  );

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
        action={atRisk.length > 0 && (
          <button onClick={() => setShowAlert(true)} className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:underline">
            <Bell size={13} /> {atRisk.length} nhóm cần chú ý
          </button>
        )}
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
              </tr>
            </thead>
            <tbody>
              {depletion.map((r) => {
                const meta = STOCK_STATUS_META[r.status];
                return (
                  <tr key={r.category} className="border-t border-slate-50">
                    <td className="py-2 pl-1 font-medium text-navy-950">{r.category}</td>
                    <td className="py-2 text-right text-slate-600">{ton(r.stockKg)}</td>
                    <td className="py-2 text-right text-slate-600">{r.rateKgWeek > 0 ? fmt(r.rateKgWeek) + " kg" : "—"}</td>
                    <td className="py-2 text-center font-semibold" style={{ color: meta.color }}>
                      {r.weeksLeft === Infinity ? "—" : r.weeksLeft < 0.1 ? "< 1 ngày" : `${r.weeksLeft.toFixed(1)} tuần`}
                    </td>
                    <td className="py-2 text-center"><Pill color={meta.pill}>{meta.label}</Pill></td>
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

      {showAlert && <AlertModal lowStock={lowStock} atRisk={atRisk} onClose={() => setShowAlert(false)} />}
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

function AlertModal({ lowStock, atRisk, onClose }: { lowStock: InvItem[]; atRisk: DepletionRow[]; onClose: () => void }) {
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
                <div key={r.category} className="rounded-xl px-3 py-2.5" style={{ background: meta.color + "12" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy-950">{r.category}</span>
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
