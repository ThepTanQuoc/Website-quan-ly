import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Crown,
  Package,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Boxes,
  Trophy,
  CalendarRange,
} from "lucide-react";
import { Card, Pill } from "../components/ui";
import {
  useOrders,
  computeStats,
  trendSeries,
  periodRange,
  PERIODS,
  PERIOD_CURRENT,
  CATEGORY_COLORS,
  type Period,
} from "../lib/salesStore";
import { fmt, fmtShort, fmtVND } from "../lib/format";

const fmtTon = (kg: number) => (kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 });

const TREND_TITLE: Record<Period, string> = {
  day: "Doanh thu 14 ngày gần nhất",
  week: "Doanh thu 8 tuần gần nhất",
  month: "Doanh thu 6 tháng gần nhất",
  quarter: "Doanh thu 6 quý gần nhất",
  year: "Doanh thu 5 năm gần nhất",
  all: "Doanh thu 12 tháng gần nhất",
};
const TREND_ORDERS_TITLE: Record<Period, string> = {
  day: "Số đơn theo ngày",
  week: "Số đơn theo tuần",
  month: "Số đơn theo tháng",
  quarter: "Số đơn theo quý",
  year: "Số đơn theo năm",
  all: "Số đơn theo tháng",
};

const MEDALS = ["#f59e0b", "#94a3b8", "#b45309", "#06b6d4", "#1e3a8a"];

export default function Dashboard({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const orders = useOrders();
  const [period, setPeriod] = useState<Period>("month");

  const s = computeStats(orders, periodRange(period));
  const trend = trendSeries(orders, period);

  // Tăng trưởng kỳ hiện tại so với kỳ trước (2 bucket cuối của chuỗi xu hướng)
  const cur = trend[trend.length - 1]?.revenue || 0;
  const prev = trend[trend.length - 2]?.revenue || 0;
  const growth = prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

  const totalCatValue = s.byCategory.reduce((a, b) => a + b.value, 0) || 1;
  const collectedPct = s.revenue > 0 ? (s.collected / s.revenue) * 100 : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Tổng quan kinh doanh
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Phòng kinh doanh Thép Tấn Quốc · đang xem:{" "}
            <b className="text-navy">{PERIOD_CURRENT[period]}</b>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill color="green">
            <CheckCircle2 size={13} /> {s.wonCount} đơn chốt
          </Pill>
          <Pill color="amber">
            <Clock size={13} /> {s.pendingCount} đơn chờ
          </Pill>
        </div>
      </div>

      {/* Bộ lọc thời gian */}
      <div className="glass flex flex-wrap items-center gap-2 p-2.5">
        <span className="ml-1 mr-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <CalendarRange size={15} /> Xem theo:
        </span>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all ${
              period === p.key
                ? "bg-gradient-to-r from-navy to-brand-cyan text-white shadow-glow-cyan"
                : "text-slate-500 hover:bg-slate-100 hover:text-navy"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          label={`Doanh thu (${PERIOD_CURRENT[period].toLowerCase()})`}
          value={fmtShort(s.revenue) + " đ"}
          sub={`${s.wonCount} đơn · TB ${fmtShort(s.avgOrder)}đ/đơn`}
          icon={<TrendingUp size={18} />}
          tone="cyan"
          trend={growth}
          trendLabel="so kỳ trước"
        />
        <Kpi
          label="Đã thu"
          value={fmtShort(s.collected) + " đ"}
          sub={`${collectedPct.toFixed(0)}% doanh thu đã về`}
          icon={<Wallet size={18} />}
          tone="green"
          progress={collectedPct}
        />
        <Kpi
          label="Công nợ trong kỳ"
          value={fmtShort(s.debt) + " đ"}
          sub="Doanh thu − Đã thu"
          icon={<AlertCircle size={18} />}
          tone="amber"
        />
        <Kpi
          label="Sản lượng đã bán"
          value={fmtTon(s.totalKL) + " tấn"}
          sub={`${fmt(s.totalKL)} kg thép`}
          icon={<Boxes size={18} />}
          tone="navy"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue trend */}
        <Card
          className="lg:col-span-2"
          title={TREND_TITLE[period]}
          icon={<TrendingUp size={16} />}
          action={
            <span className={`flex items-center gap-1 text-xs font-bold ${growth >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(growth).toFixed(0)}%
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => fmtShort(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
              <Tooltip cursor={{ fill: "rgba(6,182,212,0.06)" }} formatter={(v: number) => [fmtVND(v), "Doanh thu"]} />
              <Bar dataKey="revenue" fill="url(#barRev)" radius={[8, 8, 0, 0]} maxBarSize={54} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Product mix pie */}
        <Card title="Cơ cấu nhóm hàng" icon={<Package size={16} />}>
          {s.byCategory.length === 0 ? (
            <NoData />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={s.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="none">
                    {s.byCategory.map((c) => (
                      <Cell key={c.name} fill={CATEGORY_COLORS[c.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n) => [fmtVND(v), n as string]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {s.byCategory.slice(0, 5).map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-xs">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: CATEGORY_COLORS[c.name] || "#94a3b8" }} />
                    <span className="flex-1 truncate text-slate-600">{c.name}</span>
                    <span className="font-semibold text-slate-700">{((c.value / totalCatValue) * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Best product + Top customers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden" title="Hàng bán chạy nhất" icon={<Crown size={16} />}>
          {s.bestProduct ? (
            <div className="relative">
              <div className="absolute -right-6 -top-2 text-yellow-400/20">
                <Trophy size={120} />
              </div>
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold text-white" style={{ background: CATEGORY_COLORS[s.bestProduct.name] || "#1e3a8a" }}>
                  <Package size={15} /> {s.bestProduct.name}
                </div>
                <div className="mt-4 kpi-value neon-text">{fmtShort(s.bestProduct.value)} đ</div>
                <p className="mt-1 text-sm text-slate-500">
                  Nhóm hàng dẫn đầu — {((s.bestProduct.value / totalCatValue) * 100).toFixed(0)}% doanh thu kỳ này.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {s.byCategory.slice(1, 5).map((c) => (
                    <div key={c.name} className="rounded-lg bg-slate-50 px-2.5 py-2">
                      <div className="truncate text-[11px] text-slate-500">{c.name}</div>
                      <div className="text-sm font-bold text-navy-950">{fmtShort(c.value)}đ</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <NoData />
          )}
        </Card>

        {/* Top 10 customers */}
        <Card
          className="lg:col-span-2"
          title={`Top 10 khách hàng · ${PERIOD_CURRENT[period].toLowerCase()}`}
          icon={<Users size={16} />}
          action={onNavigate && (
            <button onClick={() => onNavigate("orders")} className="text-xs font-semibold text-cyan-600 hover:underline">
              Xem đơn hàng →
            </button>
          )}
        >
          {s.topCustomers.length === 0 ? (
            <NoData />
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {s.topCustomers.map((c, i) => {
                const max = s.topCustomers[0].revenue || 1;
                const pct = (c.revenue / max) * 100;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white" style={{ background: MEDALS[i] || "#64748b" }}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-navy-950">{c.name}</span>
                        <span className="shrink-0 text-sm font-bold text-cyan-700">{fmtShort(c.revenue)}đ</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#1e3a8a,#06b6d4)" }} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">{c.orders} đơn</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Orders trend + recent */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title={TREND_ORDERS_TITLE[period]} icon={<TrendingUp size={16} />}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="areaOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
              <Tooltip formatter={(v: number) => [v + " đơn", "Số đơn"]} />
              <Area type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2.5} fill="url(#areaOrders)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Đơn chốt gần đây" icon={<CheckCircle2 size={16} />}>
          <div className="space-y-2">
            {orders.filter((o) => o.status === "won").slice(0, 6).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/80 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-navy-950">{o.customer}</div>
                  <div className="truncate text-[11px] text-slate-400">
                    {(o.wonAt || o.date).slice(0, 10)} · {o.items[0]?.category || "—"}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-600">{fmtShort(o.total)}đ</span>
              </div>
            ))}
            {orders.filter((o) => o.status === "won").length === 0 && <NoData />}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label, value, sub, icon, tone, trend, trendLabel, progress,
}: {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  tone: "cyan" | "green" | "amber" | "navy"; trend?: number; trendLabel?: string; progress?: number;
}) {
  const tones: Record<string, { ring: string; ic: string; bar: string }> = {
    cyan: { ring: "from-cyan-400/20 to-cyan-500/5", ic: "bg-cyan-500", bar: "bg-cyan-500" },
    green: { ring: "from-emerald-400/20 to-emerald-500/5", ic: "bg-emerald-500", bar: "bg-emerald-500" },
    amber: { ring: "from-amber-400/20 to-amber-500/5", ic: "bg-amber-500", bar: "bg-amber-500" },
    navy: { ring: "from-indigo-400/20 to-indigo-500/5", ic: "bg-navy", bar: "bg-navy" },
  };
  const t = tones[tone];
  return (
    <div className="glass relative overflow-hidden p-4 sm:p-5">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${t.ring} blur-xl`} />
      <div className="relative flex items-start justify-between">
        <span className="card-title">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${t.ic}`}>{icon}</span>
      </div>
      <div className="relative mt-2 kpi-value">{value}</div>
      {typeof progress === "number" && (
        <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
      <div className="relative mt-2 flex items-center gap-2">
        {typeof trend === "number" && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend).toFixed(0)}%
          </span>
        )}
        {sub && <span className="truncate text-[11px] text-slate-400">{trendLabel || sub}</span>}
      </div>
      {trend !== undefined && sub && <div className="relative mt-0.5 truncate text-[11px] text-slate-400">{sub}</div>}
    </div>
  );
}

function NoData() {
  return (
    <div className="grid place-items-center py-8 text-center text-sm text-slate-400">
      <Package size={28} className="mb-2 text-slate-300" />
      Chưa có đơn chốt trong kỳ này. Đổi bộ lọc hoặc lập báo giá rồi <b className="mx-1">Chốt đơn</b>.
    </div>
  );
}
