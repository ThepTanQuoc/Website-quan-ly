// Định dạng số / tiền tệ dùng chung toàn app
export const num = (v: unknown): number => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const fmt = (n: unknown): string => Math.round(num(n)).toLocaleString("vi-VN");

export const fmt2 = (n: unknown): string =>
  num(n).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Rút gọn tiền: 1.250.000.000 -> 1,25 tỷ
export const fmtShort = (n: unknown): string => {
  const v = num(n);
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 2 }) + " tỷ";
  if (a >= 1e6) return (v / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr";
  if (a >= 1e3) return (v / 1e3).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + "k";
  return fmt(v);
};

export const fmtVND = (n: unknown): string => fmt(n) + " ₫";

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const monthKey = (iso: string): string => (iso || "").slice(0, 7); // YYYY-MM

export const monthLabel = (key: string): string => {
  const [, m] = key.split("-");
  return "T" + (m ? String(parseInt(m, 10)) : "?");
};
