import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  title,
  icon,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`glass p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy/5 text-navy">
                {icon}
              </span>
            )}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function Pill({
  children,
  color = "cyan",
}: {
  children: ReactNode;
  color?: "cyan" | "green" | "amber" | "red" | "navy" | "slate";
}) {
  const map: Record<string, string> = {
    cyan: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    navy: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    slate: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  };
  return <span className={`chip ${map[color]}`}>{children}</span>;
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-white/40 py-12 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="font-semibold text-slate-500">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
