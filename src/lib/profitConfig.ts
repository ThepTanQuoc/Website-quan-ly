// Cấu hình giá vốn & chi phí để tính lợi nhuận (chỉ Giám đốc xem).
import { useEffect, useState } from "react";
import { num } from "./format";
import type { Period } from "./salesStore";

export interface ProfitConfig {
  costRatio: number; // giá vốn = % trên doanh thu (vd 88 => giá vốn 88%, lãi gộp 12%)
  monthlyExpense: number; // chi phí vận hành (đ/tháng): lương, kho bãi, vận chuyển...
}

const KEY = "tq_profit_cfg";
const EVENT = "tq-profit-changed";
const DEFAULT: ProfitConfig = { costRatio: 88, monthlyExpense: 60000000 };

export function getProfitConfig(): ProfitConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT };
  }
}

export function setProfitConfig(cfg: ProfitConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ costRatio: num(cfg.costRatio), monthlyExpense: num(cfg.monthlyExpense) }));
  } catch {
    /* bỏ qua */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useProfitConfig(): [ProfitConfig, (c: ProfitConfig) => void] {
  const [cfg, setCfg] = useState<ProfitConfig>(getProfitConfig);
  useEffect(() => {
    const refresh = () => setCfg(getProfitConfig());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return [cfg, setProfitConfig];
}

// Hệ số quy đổi chi phí tháng -> kỳ đang xem
export function periodExpenseFactor(period: Period): number {
  switch (period) {
    case "day": return 1 / 30;
    case "week": return 7 / 30;
    case "month": return 1;
    case "quarter": return 3;
    case "year": return 12;
    default: return 12; // "all" ~ ước lượng 1 năm
  }
}

export interface ProfitResult {
  cogs: number; // giá vốn hàng bán
  grossProfit: number; // lợi nhuận gộp
  expense: number; // chi phí vận hành trong kỳ
  netProfit: number; // lợi nhuận ròng
  grossMargin: number; // %
  netMargin: number; // %
}

export function computeProfit(revenue: number, cfg: ProfitConfig, period: Period): ProfitResult {
  const cogs = revenue * (Math.min(100, Math.max(0, cfg.costRatio)) / 100);
  const grossProfit = revenue - cogs;
  const expense = cfg.monthlyExpense * periodExpenseFactor(period);
  const netProfit = grossProfit - expense;
  return {
    cogs,
    grossProfit,
    expense,
    netProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0,
  };
}
