// Cầu nối mở lại 1 báo giá (đơn hàng) trong Module 1 để xem/chỉnh sửa.
// Orders (hoặc Công nợ) yêu cầu mở -> App chuyển sang trang Báo giá ->
// Module 1 nhận đơn và nạp lại vào giao diện.
import type { Order } from "./salesStore";

export interface QuoteRequest {
  order: Order;
  preview?: boolean; // true: mở thẳng bản báo giá đã gửi; false: mở màn hình sửa mặt hàng
}

let pending: QuoteRequest | null = null;
const EVENT = "tq-load-quote";

export function requestOpenQuote(order: Order, preview = false) {
  pending = { order, preview };
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function takePendingQuote(): QuoteRequest | null {
  const p = pending;
  pending = null;
  return p;
}

export function onOpenQuote(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
