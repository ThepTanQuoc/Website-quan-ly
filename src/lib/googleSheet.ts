// ============================================================
// ĐỒNG BỘ GOOGLE SHEET
// Frontend tĩnh không thể ghi trực tiếp Google Sheet, nên ta gửi (POST)
// tới một Google Apps Script Web App (xem thư mục google-apps-script/).
// URL endpoint được cấu hình ở trang "Cài đặt".
// Mọi thao tác chốt/sửa/xoá đơn đều đẩy 1 bản ghi lên Sheet.
// ============================================================
import type { Order } from "./salesStore";

const URL_KEY = "tq_sheet_url";

export function getSheetUrl(): string {
  try {
    return localStorage.getItem(URL_KEY) || "";
  } catch {
    return "";
  }
}

export function setSheetUrl(url: string) {
  try {
    localStorage.setItem(URL_KEY, url.trim());
  } catch {
    /* bỏ qua */
  }
}

export type SyncAction = "pending" | "won" | "update" | "delete";

export interface SheetPayload {
  action: SyncAction;
  id: string;
  date: string;
  wonAt: string;
  customer: string;
  project: string;
  quoter: string;
  status: string;
  products: string; // danh sách nhóm hàng
  itemsDetail: string; // chi tiết mặt hàng
  totalKL: number;
  total: number;
  paid: number;
  debt: number;
  note: string;
}

function toPayload(o: Order, action: SyncAction): SheetPayload {
  const cats = Array.from(new Set(o.items.map((i) => i.category)));
  return {
    action,
    id: o.id,
    date: o.date,
    wonAt: o.wonAt || "",
    customer: o.customer,
    project: o.project || "",
    quoter: o.quoter || "",
    status: o.status,
    products: cats.join(", "),
    itemsDetail: o.items.map((i) => `${i.name} (${i.qty}) = ${Math.round(i.tien)}`).join(" | "),
    totalKL: Math.round(o.totalKL * 100) / 100,
    total: Math.round(o.total),
    paid: Math.round(o.paid),
    debt: Math.round(o.total - o.paid),
    note: o.note || "",
  };
}

// Fire-and-forget. Dùng text/plain để tránh CORS preflight với Apps Script.
export function syncOrderToSheet(o: Order, action: SyncAction) {
  const url = getSheetUrl();
  if (!url) return; // chưa cấu hình -> chỉ lưu cục bộ
  const payload = toPayload(o, action);
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
  } catch {
    /* rơi xuống fetch */
  }
  try {
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* bỏ qua — offline */
  }
}

// Kiểm tra kết nối (gửi 1 bản ghi ping). Vì no-cors không đọc được phản hồi,
// ta chỉ xác nhận đã gửi đi mà không có lỗi ném ra.
export async function testSheet(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({ action: "ping", ts: new Date().toISOString() }),
    });
    return true;
  } catch {
    return false;
  }
}
