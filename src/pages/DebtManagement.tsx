import { useMemo, useState } from "react";
import {
  Wallet, AlertTriangle, Users, CalendarClock, Bell, X, ChevronRight, Phone, Copy, CheckCircle2,
  TrendingDown, Clock, FileWarning, HandCoins,
} from "lucide-react";
import { Card, Pill, EmptyState } from "../components/ui";
import {
  useOrders, computeReceivables, updateOrder, orderDebt, daysUntilDue, isOverdue,
  type Order, type CustomerDebt,
} from "../lib/salesStore";
import { fmt, fmtShort } from "../lib/format";

export default function DebtManagement() {
  const orders = useOrders();
  const r = useMemo(() => computeReceivables(orders), [orders]);
  const [showAll, setShowAll] = useState(false);
  const [detailCust, setDetailCust] = useState<string | null>(null);

  const detail = detailCust ? r.byCustomer.find((c) => c.name === detailCust) : null;
  const reminders = [...r.overdueOrders, ...r.dueSoonOrders];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Quản lý công nợ
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Công nợ tự sinh khi chốt đơn. Khách chuyển đủ tiền → công nợ về 0. Theo dõi quá hạn & nhắc thu hồi.
          </p>
        </div>
        {r.overdueCustomers > 0 && (
          <Pill color="red"><AlertTriangle size={13} /> {r.overdueCustomers} khách quá hạn · {fmtShort(r.overdueDebt)}đ</Pill>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Kpi label="Tổng công nợ" value={fmtShort(r.totalDebt) + " đ"} sub={`${r.customersOwing} khách đang nợ`} icon={<Wallet size={18} />} tone="navy" onClick={() => setShowAll(true)} />
        <Kpi label="Công nợ quá hạn" value={fmtShort(r.overdueDebt) + " đ"} sub={`${r.overdueOrders.length} đơn quá hạn`} icon={<AlertTriangle size={18} />} tone={r.overdueDebt > 0 ? "red" : "green"} />
        <Kpi label="Sắp đến hạn (≤3 ngày)" value={fmtShort(r.dueSoonDebt) + " đ"} sub={`${r.dueSoonOrders.length} đơn cần nhắc`} icon={<CalendarClock size={18} />} tone="amber" />
        <Kpi label="Khách đang nợ" value={String(r.customersOwing)} sub="Bấm để xem tất cả →" icon={<Users size={18} />} tone="cyan" onClick={() => setShowAll(true)} />
      </div>

      {/* Notifications + Top debtors */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Reminders */}
        <Card title="Cần nhắc khách chuyển tiền" icon={<Bell size={16} />}
          action={<Pill color={reminders.length ? "amber" : "green"}>{reminders.length} việc</Pill>}
        >
          {reminders.length === 0 ? (
            <div className="grid place-items-center py-8 text-center text-sm text-emerald-600">
              <CheckCircle2 size={28} className="mb-2" /> Không có khoản nào tới hạn/quá hạn. Tốt!
            </div>
          ) : (
            <div className="max-h-[380px] space-y-2 overflow-auto pr-1">
              {reminders.map((o) => <ReminderRow key={o.id} order={o} />)}
            </div>
          )}
        </Card>

        {/* Top 10 debtors */}
        <Card title="Top 10 khách nợ nhiều nhất" icon={<TrendingDown size={16} />}
          action={r.byCustomer.length > 0 && (
            <button onClick={() => setShowAll(true)} className="text-xs font-semibold text-cyan-600 hover:underline">Xem tất cả khách nợ →</button>
          )}
        >
          {r.byCustomer.length === 0 ? (
            <EmptyState title="Chưa có công nợ" hint="Công nợ xuất hiện khi chốt đơn mà khách chưa thanh toán đủ." />
          ) : (
            <div className="space-y-2.5">
              {r.byCustomer.slice(0, 10).map((c, i) => {
                const max = r.byCustomer[0].debt || 1;
                return (
                  <button key={c.name} onClick={() => setDetailCust(c.name)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left hover:bg-slate-50">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white ${i < 3 ? "bg-rose-500" : "bg-navy"}`}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-navy-950">{c.name}</span>
                        <span className="shrink-0 text-sm font-bold text-navy-950">{fmtShort(c.debt)}đ</span>
                      </div>
                      <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-rose-500" style={{ width: `${(c.overdue / max) * 100}%` }} title="Quá hạn" />
                        <div className="h-full bg-cyan-400" style={{ width: `${(c.current / max) * 100}%` }} title="Trong hạn" />
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                        {c.overdue > 0 && <span className="font-semibold text-rose-500">Quá hạn {fmtShort(c.overdue)}đ</span>}
                        <span>{c.orderCount} đơn</span>
                        <ChevronRight size={12} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Overdue table */}
      <Card title="Khách hàng quá hạn công nợ" icon={<FileWarning size={16} />}>
        {r.overdueOrders.length === 0 ? (
          <div className="grid place-items-center py-8 text-center text-sm text-emerald-600">
            <CheckCircle2 size={28} className="mb-2" /> Không có khoản công nợ nào quá hạn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pl-1">Khách hàng</th>
                  <th className="pb-2">Ngày chốt</th>
                  <th className="pb-2">Hạn trả</th>
                  <th className="pb-2 text-center">Quá hạn</th>
                  <th className="pb-2 text-right">Còn nợ</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {r.overdueOrders.map((o) => {
                  const d = daysUntilDue(o);
                  return (
                    <tr key={o.id} className="border-t border-slate-50 bg-rose-50/40">
                      <td className="py-2 pl-1 font-medium text-navy-950">{o.customer}</td>
                      <td className="py-2 text-slate-500">{(o.wonAt || o.date).slice(0, 10)}</td>
                      <td className="py-2 text-slate-500">{o.dueDate || "—"}</td>
                      <td className="py-2 text-center"><Pill color="red">{d != null ? Math.abs(d) : "?"} ngày</Pill></td>
                      <td className="py-2 text-right font-bold text-rose-600">{fmt(orderDebt(o))}đ</td>
                      <td className="py-2 text-right"><button onClick={() => setDetailCust(o.customer)} className="text-xs font-semibold text-cyan-600 hover:underline">Chi tiết</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {r.noTermOrders.length > 0 && (
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-100">
          <Clock size={16} className="mt-0.5 shrink-0" />
          <span><b>{r.noTermOrders.length} đơn còn nợ chưa nhập hạn thanh toán.</b> Vào <b>Đơn hàng</b> → mở ví của đơn → nhập "Hạn (ngày)" để theo dõi quá hạn.</span>
        </div>
      )}

      {showAll && <AllDebtorsModal list={r.byCustomer} onPick={(n) => { setShowAll(false); setDetailCust(n); }} onClose={() => setShowAll(false)} />}
      {detail && <CustomerDebtModal cust={detail} onClose={() => setDetailCust(null)} />}
    </div>
  );
}

function ReminderRow({ order }: { order: Order }) {
  const over = isOverdue(order);
  const d = daysUntilDue(order);
  const debt = orderDebt(order);
  const [copied, setCopied] = useState(false);
  const msg = `Kính gửi ${order.customer}, Công ty Thép Tấn Quốc xin nhắc khoản công nợ ${fmt(debt)}đ (đơn ngày ${(order.wonAt || order.date).slice(0, 10)}), hạn thanh toán ${order.dueDate || ""}. Kính mong Quý khách sắp xếp chuyển khoản. Trân trọng cảm ơn!`;
  const copy = () => {
    navigator.clipboard?.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ${over ? "bg-rose-50" : "bg-amber-50"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-navy-950">{order.customer}</span>
        <span className={`shrink-0 text-sm font-bold ${over ? "text-rose-600" : "text-amber-600"}`}>{fmt(debt)}đ</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
        {over ? (
          <Pill color="red"><AlertTriangle size={11} /> Quá hạn {d != null ? Math.abs(d) : "?"} ngày</Pill>
        ) : (
          <Pill color="amber"><CalendarClock size={11} /> Còn {d} ngày</Pill>
        )}
        <span className="text-slate-400">Hạn {order.dueDate || "—"}</span>
        <button onClick={copy} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 font-semibold text-navy ring-1 ring-slate-200 hover:ring-cyan-300">
          {copied ? <><CheckCircle2 size={12} /> Đã chép</> : <><Copy size={12} /> Lời nhắc</>}
        </button>
        <button onClick={() => { updateOrder(order.id, { paid: order.total }); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2 py-1 font-semibold text-white hover:bg-emerald-600">
          <HandCoins size={12} /> Đã thu đủ
        </button>
      </div>
    </div>
  );
}

function AllDebtorsModal({ list, onPick, onClose }: { list: CustomerDebt[]; onPick: (n: string) => void; onClose: () => void }) {
  const total = list.reduce((s, c) => s + c.debt, 0);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass max-h-[88vh] w-full max-w-2xl overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy-950">Tất cả khách đang nợ ({list.length})</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white/90">
            <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th className="pb-2 pl-1">Khách hàng</th>
              <th className="pb-2 text-right">Quá hạn</th>
              <th className="pb-2 text-right">Trong hạn</th>
              <th className="pb-2 text-right">Tổng nợ</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.name} onClick={() => onPick(c.name)} className="cursor-pointer border-t border-slate-50 hover:bg-cyan-50/50">
                <td className="py-2 pl-1 font-medium text-navy-950">{c.name}<div className="text-[11px] text-slate-400">{c.orderCount} đơn{c.nextDue ? ` · hạn gần nhất ${c.nextDue}` : ""}</div></td>
                <td className="py-2 text-right font-semibold text-rose-600">{c.overdue > 0 ? fmt(c.overdue) + "đ" : "—"}</td>
                <td className="py-2 text-right text-slate-600">{c.current > 0 ? fmt(c.current) + "đ" : "—"}</td>
                <td className="py-2 text-right font-bold text-navy-950">{fmt(c.debt)}đ</td>
                <td className="py-2 text-right"><ChevronRight size={15} className="text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-bold text-navy-950">
              <td className="py-2 pl-1">Tổng cộng</td>
              <td colSpan={2}></td>
              <td className="py-2 text-right">{fmt(total)}đ</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CustomerDebtModal({ cust, onClose }: { cust: CustomerDebt; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="glass max-h-[88vh] w-full max-w-xl overflow-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between">
          <div>
            <h3 className="font-display text-lg font-bold text-navy-950">{cust.name}</h3>
            <p className="text-sm text-slate-500">{cust.orderCount} đơn còn nợ · tổng <b className="text-navy-950">{fmt(cust.debt)}đ</b>{cust.overdue > 0 && <> · quá hạn <b className="text-rose-600">{fmt(cust.overdue)}đ</b></>}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="mt-3 space-y-2">
          {cust.orders.map((o) => {
            const over = isOverdue(o);
            const d = daysUntilDue(o);
            return (
              <div key={o.id} className={`rounded-xl border px-3 py-2.5 ${over ? "border-rose-200 bg-rose-50/50" : "border-slate-100"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-950">{(o.wonAt || o.date).slice(0, 10)} · {o.items[0]?.category || "Đơn hàng"}</span>
                  <span className={`text-sm font-bold ${over ? "text-rose-600" : "text-navy-950"}`}>{fmt(orderDebt(o))}đ</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>Tổng {fmt(o.total)}đ · đã thu {fmt(o.paid)}đ</span>
                  {o.dueDate && (over
                    ? <Pill color="red">Quá hạn {d != null ? Math.abs(d) : "?"} ngày</Pill>
                    : <Pill color="amber">Hạn {o.dueDate}{d != null ? ` · còn ${d}n` : ""}</Pill>)}
                  <button onClick={() => updateOrder(o.id, { paid: o.total })} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 font-semibold text-white hover:bg-emerald-600">
                    <HandCoins size={12} /> Thu đủ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone, onClick }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: "navy" | "red" | "amber" | "cyan" | "green"; onClick?: () => void }) {
  const c: Record<string, string> = { navy: "bg-navy", red: "bg-rose-500", amber: "bg-amber-500", cyan: "bg-cyan-500", green: "bg-emerald-500" };
  return (
    <div onClick={onClick} className={`glass relative overflow-hidden p-4 sm:p-5 ${onClick ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-glow-cyan" : ""}`}>
      <div className="flex items-start justify-between">
        <span className="card-title">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-white ${c[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 kpi-value">{value}</div>
      <div className="mt-1 truncate text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}
