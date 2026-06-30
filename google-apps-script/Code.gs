/**
 * GOOGLE APPS SCRIPT — Nhận đơn hàng từ web Thép Tấn Quốc và ghi vào Google Sheet.
 *
 * CÁCH CÀI (1 lần, ~3 phút):
 * 1. Tạo 1 Google Sheet mới (trang tính). Đặt tên tab đầu tiên là "DonHang".
 * 2. Menu Extensions (Tiện ích mở rộng) -> Apps Script.
 * 3. Xoá code mẫu, dán toàn bộ file này vào.
 * 4. Bấm Deploy (Triển khai) -> New deployment -> chọn loại "Web app".
 *      - Execute as: Me (chính bạn)
 *      - Who has access: Anyone (Bất kỳ ai)
 * 5. Copy "Web app URL" (dạng https://script.google.com/macros/s/..../exec)
 * 6. Mở web Tấn Quốc -> trang "Cài đặt" -> dán URL vào ô Google Sheet -> Lưu.
 *
 * Từ đó, mỗi khi sale CHỐT ĐƠN (hoặc sửa/xoá đơn) hệ thống tự ghi 1 dòng vào Sheet.
 */

var SHEET_NAME = "DonHang";

var HEADERS = [
  "Thời điểm ghi", "Hành động", "Mã đơn", "Ngày báo giá", "Ngày chốt",
  "Khách hàng", "Công trình", "Người báo giá", "Trạng thái",
  "Nhóm hàng", "Chi tiết mặt hàng", "Tổng KL (kg)",
  "Doanh thu (đ)", "Đã thu (đ)", "Công nợ (đ)", "Ghi chú"
];

var DEBT_SHEET_NAME = "CongNo";
var DEBT_HEADERS = [
  "Thời điểm ghi", "Mã đơn", "Khách hàng", "Ngày chốt", "Hạn trả",
  "Số ngày", "Tổng tiền (đ)", "Đã thu (đ)", "Còn nợ (đ)", "Trạng thái", "Ghi chú"
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === "ping") {
      return json({ ok: true, pong: true });
    }
    if (data.action === "debt") {
      var ds = getDebtSheet();
      ds.appendRow([
        new Date(), data.id || "", data.customer || "", data.wonAt || "", data.dueDate || "",
        data.termDays || "", data.total || 0, data.paid || 0, data.debt || 0, data.status || "", data.note || ""
      ]);
      return json({ ok: true });
    }
    var sheet = getSheet();
    var row = [
      new Date(),
      data.action || "",
      data.id || "",
      data.date || "",
      data.wonAt || "",
      data.customer || "",
      data.project || "",
      data.quoter || "",
      data.status || "",
      data.products || "",
      data.itemsDetail || "",
      data.totalKL || 0,
      data.total || 0,
      data.paid || 0,
      data.debt || 0,
      data.note || ""
    ];
    sheet.appendRow(row);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// GET ?action=inventory  -> trả JSON tồn kho từ tab "TonKho"
// (Cách này thay cho việc xuất bản CSV; cần tab tên "TonKho" với hàng đầu là tiêu đề)
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  if (action === "inventory") {
    return json(readInventory());
  }
  return json({ ok: true, service: "TanQuoc Sales Sheet", time: new Date() });
}

function readInventory() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("TonKho");
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim(); });
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
      if (String(row[j]).trim() !== "") hasData = true;
    }
    if (hasData) out.push(obj);
  }
  return out;
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getDebtSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(DEBT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(DEBT_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(DEBT_HEADERS);
    sheet.getRange(1, 1, 1, DEBT_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
