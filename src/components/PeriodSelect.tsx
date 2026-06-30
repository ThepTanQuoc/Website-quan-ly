import { CalendarRange, ChevronDown } from "lucide-react";
import { PERIODS, type Period } from "../lib/salesStore";

export default function PeriodSelect({
  value,
  onChange,
  label = "Xem theo",
}: {
  value: Period;
  onChange: (p: Period) => void;
  label?: string;
}) {
  return (
    <div className="relative inline-flex items-center">
      <CalendarRange size={15} className="pointer-events-none absolute left-3 text-cyan-600" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Period)}
        aria-label={label}
        className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white/80 py-2.5 pl-9 pr-9 text-sm font-semibold text-navy shadow-sm focus:border-cyan-400 focus:outline-none"
      >
        {PERIODS.map((p) => (
          <option key={p.key} value={p.key}>
            {label}: {p.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-400" />
    </div>
  );
}
