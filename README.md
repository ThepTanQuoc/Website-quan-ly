# Thép Tấn Quốc — Hệ thống quản lý Phòng Kinh Doanh

Website nội bộ cho phòng kinh doanh **Công ty TNHH Tấn Quốc** (theptanquoc.vn). Giao diện
hiện đại (futuristic, tông sáng + xanh navy), gồm **dashboard tổng quan** và **2 module nghiệp vụ**.

> React + Vite + TypeScript + Tailwind CSS + Recharts.

## Tính năng

### 🏠 Dashboard tổng quan (trang chủ)
Cập nhật **theo thời gian thực** từ các đơn đã chốt:
- **Doanh thu**, **Đã thu**, **Công nợ hiện tại** (= Doanh thu − Đã thu), Sản lượng (tấn).
- Biểu đồ **cột doanh thu 6 tháng**, **tròn cơ cấu nhóm hàng**, **đường số đơn theo tháng**.
- **Top 5 khách hàng** theo doanh thu (real-time), **hàng bán chạy nhất**, đơn chốt gần đây.

### 📝 Module 1 — Báo giá tự động
Toàn bộ công cụ báo giá hiện có (bóc tách từ ảnh/bản vẽ bằng AI, barem đa nguồn nhà máy,
xuất PDF/ảnh/Excel). Bổ sung panel **Ghi nhận đơn hàng**:
- **Chốt đơn** → ghi nhận ngay doanh thu, nhóm hàng, tên khách vào Dashboard + Google Sheet.
- **Lưu chờ xử lý** → đưa vào mục *Chờ xử lý*; chốt sau hoặc tự xoá nếu khách không lấy.

### 📦 Đơn hàng (vòng đời báo giá → doanh thu)
- Tab **Chờ xử lý / Đã chốt**, tìm kiếm, xem chi tiết mặt hàng.
- Chốt đơn, cập nhật **đã thu / công nợ**, xoá. Đơn chờ **quá 21 ngày tự xoá**.

### ✂️ Module 2 — Bóc tách & cắt thép tấm HRC
Mô phỏng quy trình **Cuộn HRC → (duỗi, có phế) → Tấm phẳng → (cắt CNC, có phế) → Thành phẩm**:
- Nhập danh sách chi tiết cần cắt (chữ nhật / tròn) — hoặc **bóc tách từ ảnh bản vẽ bằng AI**.
- **Xếp hình (nesting)** lên khổ tấm HRC, **sơ đồ cắt minh hoạ (SVG)**.
- Tính **số tấm cần**, **phế liệu duỗi cuộn + phế cắt CNC**, **hiệu suất (yield)**, khối lượng, **giá thành/kg**.

### ⚙️ Cài đặt — Đồng bộ Google Sheet
Mọi đơn chốt/sửa/xoá được đẩy về Google Sheet trung tâm (xem hướng dẫn bên dưới).

## Chạy dự án

```bash
npm install
npm run dev      # phát triển: http://localhost:5173
npm run build    # build production -> dist/
npm run preview  # xem thử bản build
```

## Kết nối Google Sheet (tuỳ chọn, làm 1 lần)

Web tĩnh không ghi trực tiếp Google Sheet được, nên dùng 1 **Google Apps Script Web App** làm cầu nối.

1. Tạo Google Sheet mới, đặt tên tab đầu là **`DonHang`**.
2. **Tiện ích mở rộng → Apps Script**, dán nội dung [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. **Triển khai → Tạo triển khai mới → Ứng dụng web**:
   - *Thực thi với*: Tài khoản của tôi
   - *Quyền truy cập*: Bất kỳ ai
4. Copy **URL ứng dụng web** (dạng `.../exec`).
5. Mở web → **Cài đặt** → dán URL → **Lưu cấu hình**.

Khi chưa cấu hình, dữ liệu vẫn lưu trên trình duyệt (localStorage) và app hoạt động bình thường.

## Bật tính năng AI (bóc tách từ ảnh) khi deploy

Nút **Bóc tách từ ảnh** (Module 1 & 2) gọi qua serverless function `api/extract.js` để giữ
khoá API an toàn ở server. Để bật trên Vercel:

1. Lấy API key tại **https://console.anthropic.com** (mục API Keys).
2. Vào Vercel → project → **Settings → Environment Variables**, thêm:
   - Name: `ANTHROPIC_API_KEY`
   - Value: khoá vừa lấy
3. Bấm **Save**, rồi vào **Deployments → Redeploy** để áp dụng.

Chưa thêm khoá thì các tính năng khác vẫn chạy đầy đủ, chỉ riêng nút AI báo lỗi nhắc cấu hình.

## Ghi chú kỹ thuật

- **Dashboard có bộ lọc thời gian**: Ngày / Tuần / Tháng / Quý / Năm / Tất cả — toàn bộ
  KPI, biểu đồ và Top 10 khách hàng đổi theo kỳ đang chọn.

- Dữ liệu đơn hàng lưu ở `localStorage`; có sẵn **dữ liệu mẫu** để minh hoạ dashboard
  (xoá tại **Cài đặt → Xoá dữ liệu mẫu** hoặc trang Đơn hàng).
- Tính năng AI (bóc tách ảnh ở Module 1 & 2) gọi API Anthropic; cần môi trường có
  proxy/khoá phù hợp để hoạt động — nhập tay vẫn dùng được đầy đủ.
- `window.storage` mà công cụ báo giá gốc dùng được shim sang `localStorage` (`src/lib/storage.ts`).

## Cấu trúc

```
src/
  App.tsx                 # khung + điều hướng
  pages/Dashboard.tsx     # trang chủ + biểu đồ
  pages/Orders.tsx        # quản lý đơn (chờ xử lý / đã chốt)
  pages/HrcCutting.tsx    # Module 2 — bóc tách & cắt HRC
  pages/Settings.tsx      # cấu hình Google Sheet
  modules/QuotePlatform.tsx  # Module 1 — báo giá (đã tích hợp Chốt đơn)
  lib/salesStore.ts       # kho đơn hàng + thống kê realtime
  lib/googleSheet.ts      # đồng bộ Google Sheet
  lib/hrc.ts              # thuật toán xếp hình & tính phế liệu HRC
  lib/aiExtract.ts        # bóc tách chi tiết từ ảnh bằng AI
google-apps-script/Code.gs  # backend Google Sheet
```
