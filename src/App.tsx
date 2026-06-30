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
} from "lucide-react";
import InventoryDashboard from "./pages/InventoryDashboard";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Settings from "./pages/Settings";
import PasswordGate from "./components/PasswordGate";
import { useOrders } from "./lib/salesStore";

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

type View = "inventory" | "director" | "quote" | "orders" | "hrc" | "settings";

const NAV: { key: View; label: string; sub: string; icon: typeof Warehouse; locked?: boolean }[] = [
  { key: "inventory", label: "Kho hàng", sub: "Tồn kho & kinh doanh", icon: Warehouse },
  { key: "director", label: "Báo cáo Giám đốc", sub: "Doanh thu · lợi nhuận", icon: LineChart, locked: true },
  { key: "quote", label: "Báo giá", sub: "Module 1", icon: FileText },
  { key: "orders", label: "Đơn hàng", sub: "Chờ xử lý & đã chốt", icon: ShoppingCart },
  { key: "hrc", label: "Bóc tách HRC", sub: "Module 2 · Cắt tấm", icon: Scissors },
  { key: "settings", label: "Cài đặt", sub: "Google Sheet & Kho", icon: SettingsIcon },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-xl grad-cyan shadow-glow-cyan">
        <span className="font-display text-lg font-extrabold text-white">TQ</span>
        <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse-ring rounded-full bg-brand-cyan" />
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm font-extrabold tracking-wide text-white">
          THÉP TẤN QUỐC
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.25em] text-cyan-300/80">
          Sales Platform
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("inventory");
  const [mobileOpen, setMobileOpen] = useState(false);
  const orders = useOrders();
  const pending = orders.filter((o) => o.status === "pending").length;

  const go = (v: View) => {
    setView(v);
    setMobileOpen(false);
  };

  const SideContent = (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="px-1 pb-4 pt-2">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV.map((n) => {
          const active = view === n.key;
          const Icon = n.icon;
          return (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                active
                  ? "bg-white/10 text-white ring-1 ring-cyan-400/40"
                  : "text-slate-300/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-brand-cyan shadow-glow-cyan" />
              )}
              <Icon size={19} className={active ? "text-brand-cyan" : ""} />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{n.label}</span>
                <span className="block text-[10px] uppercase tracking-wider text-slate-400/70">
                  {n.sub}
                </span>
              </span>
              {n.key === "orders" && pending > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-navy-950">
                  {pending}
                </span>
              )}
              {n.locked && <Lock size={13} className="text-slate-400/70" />}
            </button>
          );
        })}
      </nav>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-300">
          <Activity size={13} /> theptanquoc.vn
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Hệ thống quản lý phòng kinh doanh — báo giá tự động & bóc tách HRC.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex min-h-screen">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 lg:block">
        <div className="m-3 h-[calc(100vh-1.5rem)] overflow-hidden rounded-3xl bg-gradient-to-b from-navy-950 to-[#0a1640] shadow-2xl ring-1 ring-white/10">
          {SideContent}
        </div>
      </aside>

      {/* Sidebar mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-[280px] bg-gradient-to-b from-navy-950 to-[#0a1640] shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            {SideContent}
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
