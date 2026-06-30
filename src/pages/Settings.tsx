import { useState } from "react";
import { Sheet, CheckCircle2, Loader2, ExternalLink, Database, Trash2, Info, Warehouse, Sparkles } from "lucide-react";
import { Card, Pill } from "../components/ui";
import { getSheetUrl, setSheetUrl, testSheet } from "../lib/googleSheet";
import { getInventoryUrl, setInventoryUrl } from "../lib/inventory";
import { clearAll, useOrders } from "../lib/salesStore";

export default function Settings() {
  const [url, setUrl] = useState(getSheetUrl());
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testRes, setTestRes] = useState<null | boolean>(null);
  const [invUrl, setInvUrl] = useState(getInventoryUrl());
  const [invSaved, setInvSaved] = useState(false);
  const orders = useOrders();

  const saveInv = () => {
    setInventoryUrl(invUrl);
    setInvSaved(true);
    setTimeout(() => setInvSaved(false), 2500);
  };

  const save = () => {
    setSheetUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const doTest = async () => {
    setTesting(true);
    setTestRes(null);
    const ok = await testSheet(url);
    setTestRes(ok);
    setTesting(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">Cài đặt</h1>
        <p className="mt-1 text-sm text-slate-500">Kết nối Google Sheet để lưu trữ đơn hàng tập trung & quản lý dữ liệu.</p>
      </div>

      <Card title="Đồng bộ Google Sheet" icon={<Sheet size={16} />}
        action={getSheetUrl() ? <Pill color="green"><CheckCircle2 size={12} /> Đã kết nối</Pill> : <Pill color="slate">Chưa kết nối</Pill>}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">URL Google Apps Script (Web app)</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/..../exec"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-400 focus:outline-none"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={save} className="btn-primary">{saved ? <><CheckCircle2 size={16} /> Đã lưu</> : "Lưu cấu hình"}</button>
          <button onClick={doTest} disabled={!url || testing} className="btn-ghost">
            {testing ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />} Gửi thử
          </button>
          {testRes === true && <span className="text-sm font-semibold text-emerald-600">Đã gửi yêu cầu thử — kiểm tra dòng mới trong Sheet.</span>}
          {testRes === false && <span className="text-sm font-semibold text-rose-500">Không gửi được — kiểm tra URL/mạng.</span>}
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-semibold text-navy-950"><Info size={15} /> Cách lấy URL (làm 1 lần)</div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Tạo Google Sheet mới, đặt tên tab đầu là <b>DonHang</b>.</li>
            <li>Vào <b>Tiện ích mở rộng → Apps Script</b>, dán nội dung file <code className="rounded bg-slate-200 px-1">google-apps-script/Code.gs</code>.</li>
            <li>Bấm <b>Triển khai → Tạo triển khai mới → Ứng dụng web</b>. Chọn <i>Thực thi với tài khoản của tôi</i>, <i>Quyền truy cập: Bất kỳ ai</i>.</li>
            <li>Copy <b>URL ứng dụng web</b> dán vào ô trên rồi bấm Lưu.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-400">
            Khi chưa cấu hình, dữ liệu vẫn lưu trên trình duyệt này. Sau khi kết nối, mỗi lần chốt/sửa/xoá đơn sẽ ghi 1 dòng vào Sheet.
          </p>
        </div>
      </Card>

      <Card title="Nguồn dữ liệu Kho hàng" icon={<Warehouse size={16} />}
        action={getInventoryUrl() ? <Pill color="green"><CheckCircle2 size={12} /> Đã kết nối</Pill> : <Pill color="slate">Dùng dữ liệu mẫu</Pill>}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-500">Link Google Sheet tồn kho (CSV xuất bản, hoặc Apps Script trả JSON)</span>
          <input
            value={invUrl}
            onChange={(e) => setInvUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/e/..../pub?gid=0&single=true&output=csv"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-cyan-400 focus:outline-none"
          />
        </label>
        <div className="mt-3">
          <button onClick={saveInv} className="btn-primary">{invSaved ? <><CheckCircle2 size={16} /> Đã lưu</> : "Lưu nguồn kho"}</button>
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="mb-2 flex items-center gap-2 font-semibold text-navy-950"><Info size={15} /> Cách lấy link CSV (đơn giản & ổn định nhất)</div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Mở Google Sheet tồn kho. Hàng đầu là tiêu đề cột: <code className="rounded bg-slate-200 px-1">Tên hàng, Nhóm, Quy cách, Độ dày, Số lượng, ĐVT, Khối lượng (kg), Vị trí, Ghi chú</code>.</li>
            <li>Menu <b>Tệp → Chia sẻ → Xuất bản lên web</b>.</li>
            <li>Chọn đúng trang tính, định dạng <b>Giá trị được phân tách bằng dấu phẩy (.csv)</b> → <b>Xuất bản</b>.</li>
            <li>Copy link hiện ra, dán vào ô trên → Lưu. Vào trang <b>Kho hàng</b> bấm <b>Làm mới</b>.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-400">Hệ thống tự nhận diện cột theo tên (không phân biệt dấu/hoa thường). Chưa cấu hình thì hiển thị dữ liệu kho mẫu.</p>
        </div>
      </Card>

      <Card title="Tính năng AI (bóc tách ảnh)" icon={<Sparkles size={16} />}>
        <p className="text-sm text-slate-600">
          Nút <b>Bóc tách từ ảnh</b> (Module Báo giá & HRC) chạy qua serverless function <code className="rounded bg-slate-200 px-1">api/extract</code> trên Vercel.
          Để bật, thêm biến môi trường <code className="rounded bg-slate-200 px-1">ANTHROPIC_API_KEY</code> trong Vercel →
          Settings → Environment Variables, rồi Redeploy. (Hướng dẫn chi tiết trong README.)
        </p>
      </Card>

      <Card title="Dữ liệu" icon={<Database size={16} />}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Hiện có <b>{orders.length}</b> đơn lưu trên thiết bị ({orders.filter((o) => o.status === "won").length} đã chốt,{" "}
            {orders.filter((o) => o.status === "pending").length} chờ xử lý).
            <div className="mt-1 text-xs text-slate-400">Hệ thống tạo sẵn dữ liệu mẫu để minh hoạ dashboard. Bạn có thể xoá để bắt đầu từ dữ liệu thật.</div>
          </div>
          <button
            onClick={() => { if (confirm("Xoá toàn bộ đơn hàng trên thiết bị này?")) clearAll(); }}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
          >
            <Trash2 size={15} /> Xoá dữ liệu mẫu
          </button>
        </div>
      </Card>
    </div>
  );
}
