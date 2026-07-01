import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  Trash2,
  ShoppingCart,
  Search,
  Plus,
  X,
  Wallet,
  ChevronDown,
  Database,
  CalendarClock,
  AlertTriangle,
  FileText,
  Pencil,
} from "lucide-react";
import { Card, Pill, EmptyState } from "../components/ui";
import {
  useOrders,
  confirmOrder,
  setPaymentTerm,
  removeOrder,
  updateOrder,
  addOrder,
  clearAll,
  categorize,
  daysUntilDue,
  isOverdue,
  type Order,
} from "../lib/salesStore";
import { fmt, fmtShort, num } from "../lib/format";

type Tab = "all" | "pending" | "won";

export default function Orders({ onOpenQuote }: { onOpenQuote?: (o: Order, preview?: boolean) => void }) {
  const orders = useOrders();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const filtered = orders.filter((o) => {
    if (tab !== "all" && o.status !== tab) return false;
    if (q && !`${o.customer} ${o.project} ${o.quoter}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const wonCount = orders.filter((o) => o.status === "won").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Đơn <b>Chờ xử lý</b> chưa tính doanh thu. Bấm <b>Chốt đơn</b> để ghi nhận. Đơn chờ quá 21 ngày sẽ tự xoá.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus size={16} /> Tạo đơn nhanh
        </button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {([
              ["all", `Tất cả (${orders.length})`],
              ["pending", `Chờ xử lý (${pendingCount})`],
              ["won", `Đã chốt (${wonCount})`],
            ] as [Tab, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                  tab === k ? "bg-white text-navy shadow-sm" : "text-slate-500 hover:text-navy"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm khách hàng, công trình..."
              className="w-64 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={36} />}
              title="Chưa có đơn hàng"
              hint="Lập báo giá ở Module 1 rồi bấm “Chốt đơn” hoặc “Lưu chờ xử lý”, đơn sẽ hiện ở đây."
            />
          ) : (
            filtered.map((o) => (
              <OrderRow
                key={o.id}
                order={o}
                expanded={expanded === o.id}
                onToggle={() => setExpanded(expanded === o.id ? null : o.id)}
                onOpenQuote={onOpenQuote}
              />
            ))
          )}
        </div>
      </Card>

      <DangerZone hasOrders={orders.length > 0} />

      {showNew && <NewOrderModal onClose={() => setShowNew(false)} />}
    </div>
  );
}

function OrderRow({ order, expanded, onToggle, onOpenQuote }: { order: Order; expanded: boolean; onToggle: () => void; onOpenQuote?: (o: Order, preview?: boolean) => void }) {
  const debt = order.total - order.paid;
  const [payOpen, setPayOpen] = useState(false);
  const [pay, setPay] = useState(String(order.paid || ""));
  const [chotOpen, setChotOpen] = useState(false);
  const [term, setTerm] = useState("15");
  const [termEdit, setTermEdit] = useState(String(order.paymentTermDays || ""));

  const dleft = order.status === "won" && debt > 0 ? daysUntilDue(order) : null;
  const overdue = isOverdue(order);

  return (
    <div className={`rounded-2xl border bg-white/80 transition-all ${overdue ? "border-rose-200 ring-1 ring-rose-100" : order.status === "won" ? "border-emerald-100" : "border-amber-100"}`}>
      <div className="flex items-center gap-3 p-3 sm:p-4">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            order.status === "won" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {order.status === "won" ? <CheckCircle2 size={20} /> : <Clock size={20} />}
        </span>
        <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-navy-950">{order.customer}</span>
            {order.status === "won" ? <Pill color="green">Đã chốt</Pill> : <Pill color="amber">Chờ xử lý</Pill>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span>{(order.wonAt || order.date).slice(0, 10)}</span>
            <span>·</span>
            <span className="truncate">{order.items.map((i) => i.category).filter((v, idx, a) => a.indexOf(v) === idx).join(", ") || "—"}</span>
            {order.status === "won" && debt > 0 && order.dueDate && (
              overdue ? (
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><AlertTriangle size={11} /> Quá hạn {dleft != null ? Math.abs(dleft) : ""} ngày (hạn {order.dueDate})</span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-cyan-600"><CalendarClock size={11} /> Hạn {order.dueDate}{dleft != null ? ` · còn ${dleft} ngày` : ""}</span>
              )
            )}
            <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-navy-950">{fmtShort(order.total)}đ</div>
          {order.status === "won" && debt > 0 && (
            <div className={`text-[11px] font-semibold ${overdue ? "text-rose-600" : "text-amber-600"}`}>Nợ {fmtShort(debt)}đ</div>
          )}
          {order.status === "won" && debt <= 0 && (
            <div className="text-[11px] font-semibold text-emerald-600">Đã thu đủ</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {order.status === "pending" && (
            <button
              onClick={() => setChotOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-navy to-brand-cyan px-2.5 py-1.5 text-xs font-bold text-white"
              title="Chốt đơn — nhập hạn thanh toán & ghi nhận doanh thu"
            >
              <CheckCircle2 size={14} /> Chốt
            </button>
          )}
          {order.status === "won" && (
            <button
              onClick={() => setPayOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-lg text-cyan-600 hover:bg-cyan-50"
              title="Cập nhật đã thu / công nợ"
            >
              <Wallet size={16} />
            </button>
          )}
          {onOpenQuote && (
            <button
              onClick={() => onOpenQuote(order, false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-cyan-50 hover:text-cyan-600"
              title="Mở báo giá để xem / sửa mặt hàng"
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`Xoá đơn của "${order.customer}"?`)) removeOrder(order.id);
            }}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-rose-50 hover:text-rose-500"
            title="Xoá đơn"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {chotOpen && order.status === "pending" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-cyan-50/40 px-4 py-3">
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-600"><CalendarClock size={13} /> Hạn khách chuyển tiền:</span>
          <div className="flex items-center gap-1">
            {[7, 10, 15, 25, 30].map((d) => (
              <button key={d} onClick={() => setTerm(String(d))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${term === String(d) ? "bg-navy text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
                {d}n
              </button>
            ))}
          </div>
          <input value={term} onChange={(e) => setTerm(e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-cyan-400 focus:outline-none" />
          <span className="text-xs text-slate-400">ngày</span>
          <button
            onClick={() => { confirmOrder(order.id, num(term) || 0); setChotOpen(false); }}
            className="rounded-lg bg-gradient-to-r from-navy to-brand-cyan px-3 py-1.5 text-xs font-bold text-white"
          >
            <CheckCircle2 size={13} className="mr-1 inline" /> Chốt & tạo công nợ
          </button>
        </div>
      )}

      {payOpen && order.status === "won" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
          <span className="text-xs font-semibold text-slate-500">Đã thu (đ):</span>
          <input
            value={pay}
            onChange={(e) => setPay(e.target.value)}
            className="w-40 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-cyan-400 focus:outline-none"
            placeholder="0"
          />
          <button
            onClick={() => {
              updateOrder(order.id, { paid: Math.min(num(pay), order.total) });
              setPayOpen(false);
            }}
            className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
          >
            Lưu
          </button>
          <button
            onClick={() => {
              updateOrder(order.id, { paid: order.total });
              setPay(String(order.total));
              setPayOpen(false);
            }}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
          >
            Thu đủ
          </button>
          <span className="text-xs text-slate-400">Tổng {fmt(order.total)}đ</span>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><CalendarClock size={13} /> Hạn (ngày):</span>
          <input
            value={termEdit}
            onChange={(e) => setTermEdit(e.target.value)}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm focus:border-cyan-400 focus:outline-none"
            placeholder="—"
          />
          <button
            onClick={() => setPaymentTerm(order.id, num(termEdit) || 0)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-navy"
          >
            Lưu hạn
          </button>
          {order.dueDate && <span className="text-xs text-slate-400">→ {order.dueDate}</span>}
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          {onOpenQuote && (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => onOpenQuote(order, true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy hover:border-cyan-300 hover:bg-cyan-50"
              >
                <FileText size={14} /> Xem báo giá đã gửi
              </button>
              <button
                onClick={() => onOpenQuote(order, false)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-navy to-brand-cyan px-3 py-2 text-xs font-semibold text-white"
              >
                <Pencil size={14} /> Sửa / thêm mặt hàng
              </button>
            </div>
          )}
          {order.project && <div className="mb-1 text-xs text-slate-500">Công trình: <b>{order.project}</b></div>}
          {order.quoter && <div className="mb-2 text-xs text-slate-500">Người báo giá: <b>{order.quoter}</b></div>}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-1">Mặt hàng</th>
                <th className="py-1 text-center">SL</th>
                <th className="py-1 text-right">KL (kg)</th>
                <th className="py-1 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-1.5">
                    <span className="font-medium text-slate-700">{it.name}</span>
                    <span className="ml-1 text-[10px] text-cyan-600">· {it.category}</span>
                  </td>
                  <td className="py-1.5 text-center text-slate-600">{it.qty}</td>
                  <td className="py-1.5 text-right text-slate-600">{fmt(it.kl)}</td>
                  <td className="py-1.5 text-right font-semibold text-navy-950">{fmt(it.tien)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DangerZone({ hasOrders }: { hasOrders: boolean }) {
  if (!hasOrders) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/50 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Database size={16} /> Dữ liệu lưu trên trình duyệt này (và Google Sheet nếu đã cấu hình).
      </div>
      <button
        onClick={() => {
          if (confirm("Xoá TẤT CẢ đơn hàng (gồm dữ liệu mẫu)? Không thể hoàn tác.")) clearAll();
        }}
        className="text-xs font-semibold text-rose-500 hover:underline"
      >
        Xoá toàn bộ dữ liệu
      </button>
    </div>
  );
}

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const [customer, setCustomer] = useState("");
  const [project, setProject] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [kl, setKl] = useState("");
  const [tien, setTien] = useState("");
  const [status, setStatus] = useState<"pending" | "won">("won");

  const save = () => {
    if (!customer.trim() || num(tien) <= 0) return;
    addOrder({
      customer,
      project,
      items: [{ name: name || "Mặt hàng", category: categorize("", name), qty: num(qty), kl: num(kl), tien: num(tien) }],
      totalKL: num(kl),
      total: num(tien),
      status,
      paid: status === "won" ? num(tien) : 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/50 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-navy-950">Tạo đơn nhanh</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Khách hàng *" full><input className={inp} value={customer} onChange={(e) => setCustomer(e.target.value)} /></Field>
          <Field label="Công trình" full><input className={inp} value={project} onChange={(e) => setProject(e.target.value)} /></Field>
          <Field label="Mặt hàng" full><input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Tấm 10ly HRC" /></Field>
          <Field label="Số lượng"><input className={inp} value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Field label="Khối lượng (kg)"><input className={inp} value={kl} onChange={(e) => setKl(e.target.value)} /></Field>
          <Field label="Thành tiền (đ) *" full><input className={inp} value={tien} onChange={(e) => setTien(e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button onClick={() => setStatus("won")} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${status === "won" ? "border-cyan-400 bg-cyan-50 text-cyan-700" : "border-slate-200 text-slate-500"}`}>Chốt luôn</button>
          <button onClick={() => setStatus("pending")} className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold ${status === "pending" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"}`}>Chờ xử lý</button>
        </div>
        <button onClick={save} className="btn-primary mt-4 w-full">Lưu đơn</button>
      </div>
    </div>
  );
}

const inp = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none";
function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      {children}
    </label>
  );
}
