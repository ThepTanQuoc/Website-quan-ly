import { useState, lazy, Suspense } from "react";
import {
  Warehouse,
  LineChart,
  FileText,
  ShoppingCart,
  Scissors,
  Settings as SettingsIcon,
  Menu,
  X,
  Activity,
  Loader2,
  Lock,
  HandCoins,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import InventoryDashboard from "./pages/InventoryDashboard";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import DebtManagement from "./pages/DebtManagement";
import Settings from "./pages/Settings";
import PasswordGate from "./components/PasswordGate";
import { useOrders, computeReceivables } from "./lib/salesStore";

// Tách bundle: Module 1 (kéo theo xlsx) và Module 2 chỉ tải khi mở.
const QuotePlatform = lazy(() => import("./modules/QuotePlatform"));
const HrcCutting = lazy(() => import("./pages/HrcCutting"));

function Loading() {
  return (
    <div className="grid place-items-center py-32 text-slate-400">
      <Loader2 size={32} className="animate-spin text-cyan-500" />
    </div>
  );
}

type View = "inventory" | "director" | "quote" | "orders" | "debt" | "hrc" | "settings";

const NAV: { key: View; label: string; sub: string; icon: typeof Warehouse; locked?: boolean }[] = [
  { key: "inventory", label: "Kho hàng", sub: "Tồn kho & kinh doanh", icon: Warehouse },
  { key: "director", label: "Báo cáo Giám đốc", sub: "Doanh thu · lợi nhuận", icon: LineChart, locked: true },
  { key: "quote", label: "Báo giá", sub: "Module 1", icon: FileText },
  { key: "orders", label: "Đơn hàng", sub: "Chờ xử lý & đã chốt", icon: ShoppingCart },
  { key: "debt", label: "Công nợ", sub: "Thu hồi & quá hạn", icon: HandCoins },
  { key: "hrc", label: "Bóc tách HRC", sub: "Module 2 · Cắt tấm", icon: Scissors },
  { key: "settings", label: "Cài đặt", sub: "Google Sheet & Kho", icon: SettingsIcon },
];

function Logo({ mini = false }: { mini?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl grad-cyan shadow-glow-cyan">
        <span className="font-display text-lg font-extrabold text-white">TQ</span>
        <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse-ring rounded-full bg-brand-cyan" />
      </div>
      {!mini && (
        <div className="leading-tight">
          <div className="font-display text-sm font-extrabold tracking-wide text-white">
            THÉP TẤN QUỐC
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-300/80">
            Sales Platform
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("inventory");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("tq_nav_collapsed") === "1"; } catch { return false; }
  });
  const orders = useOrders();
  const pending = orders.filter((o) => o.status === "pending").length;
  const overdue = computeReceivables(orders).overdueCustomers;

  const go = (v: View) => {
    setView(v);
    setMobileOpen(false);
  };
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem("tq_nav_collapsed", next ? "1" : "0"); } catch { /* bỏ qua */ }
      return next;
    });
  };

  const Side = (mini: boolean) => (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className={`flex items-center pb-3 pt-2 ${mini ? "flex-col gap-2" : "justify-between px-1"}`}>
        <Logo mini={mini} />
        <button
          onClick={toggleCollapsed}
          title={mini ? "Mở rộng menu" : "Thu gọn menu"}
          className="hidden h-8 w-8 place-items-center rounded-lg text-slate-300/70 transition-colors hover:bg-white/10 hover:text-white lg:grid"
        >
          {mini ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV.map((n) => {
          const active = view === n.key;
          const Icon = n.icon;
          const badge =
            n.key === "orders" && pending > 0 ? { v: pending, cls: "bg-amber-400 text-navy-950" }
            : n.key === "debt" && overdue > 0 ? { v: overdue, cls: "bg-rose-500 text-white" }
            : null;
          return (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              title={mini ? n.label : undefined}
              className={`group relative flex items-center rounded-xl transition-all ${
                mini ? "justify-center px-0 py-3" : "gap-3 px-3 py-3 text-left"
              } ${active ? "bg-white/10 text-white ring-1 ring-cyan-400/40" : "text-slate-300/80 hover:bg-white/5 hover:text-white"}`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-brand-cyan shadow-glow-cyan" />
              )}
              <span className="relative">
                <Icon size={19} className={active ? "text-brand-cyan" : ""} />
                {mini && badge && (
                  <span className={`absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${badge.cls}`}>
                    {badge.v}
                  </span>
                )}
                {mini && n.locked && (
                  <Lock size={10} className="absolute -bottom-1.5 -right-1.5 text-slate-400" />
                )}
              </span>
              {!mini && (
                <>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{n.label}</span>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-400/70">{n.sub}</span>
                  </span>
                  {badge && (
                    <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${badge.cls}`}>
                      {badge.v}
                    </span>
                  )}
                  {n.locked && <Lock size={13} className="text-slate-400/70" />}
                </>
              )}
            </button>
          );
        })}
      </nav>
      {!mini && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-300">
            <Activity size={13} /> theptanquoc.vn
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Hệ thống quản lý phòng kinh doanh — báo giá tự động & bóc tách HRC.
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className={`sticky top-0 hidden h-screen shrink-0 transition-[width] duration-300 lg:block ${collapsed ? "w-[88px]" : "w-[264px]"}`}>
        <div className="m-3 h-[calc(100vh-1.5rem)] overflow-hidden rounded-3xl bg-gradient-to-b from-navy-950 to-[#0a1640] shadow-2xl ring-1 ring-white/10">
          {Side(collapsed)}
        </div>
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[280px] bg-gradient-to-b from-navy-950 to-[#0a1640] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 z-10 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            {Side(false)}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/40 bg-white/60 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden">
          <button onClick={() => setMobileOpen(true)} className="text-navy">
            <Menu size={22} />
          </button>
          <Logo />
        </header>

        <div className="mx-auto max-w-[1320px] p-4 sm:p-6">
          {view === "inventory" && <InventoryDashboard />}
          {view === "director" && (
            <PasswordGate>
              <Dashboard onNavigate={(v) => go(v as View)} />
            </PasswordGate>
          )}
          {view === "orders" && <Orders />}
          {view === "debt" && <DebtManagement />}
          {view === "hrc" && (
            <Suspense fallback={<Loading />}>
              <HrcCutting />
            </Suspense>
          )}
          {view === "settings" && <Settings />}
          {view === "quote" && (
            <div className="-m-4 sm:-m-6">
              <Suspense fallback={<Loading />}>
                <QuotePlatform />
              </Suspense>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
