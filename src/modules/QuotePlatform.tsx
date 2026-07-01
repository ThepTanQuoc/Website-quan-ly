import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Building2, Upload, FileSpreadsheet, Plus, Trash2, Loader2, ArrowLeft, ArrowRight, Save, Download, AlertTriangle, CheckCircle2, Eye, Printer, X, Lock, Image as ImageIcon, BookOpen, ClipboardPaste, ShoppingCart, Clock } from "lucide-react";
import { addOrder, updateOrder, categorize } from "../lib/salesStore";
import { takePendingQuote, onOpenQuote } from "../lib/quoteBridge";
import { fmtShort } from "../lib/format";

const RED = "#e11d2a";
const NAVY = "#1e3a8a";
const FIXED_NAME = "CÔNG TY TNHH TẤN QUỐC";
const FIXED_MST = "0400424733";
const FIXED_PHONE = "0905.408.559 / 0905.658.759 / 0393.295.305 / 0338.636.025";
const FIXED_EMAIL = "info@theptanquoc.vn";

// ============================================================
// DANH SÁCH NHÂN VIÊN — sửa tại đây (thêm/bớt 1 dòng là xong)
// Khi có người nghỉ: xoá dòng. Người mới: thêm dòng. KHÔNG cần sửa gì khác.
// ============================================================
const NHAN_VIEN = [
  "Trâm - Thép Tấn Quốc",
  "Na - Thép Tấn Quốc",
  "Vinh - Thép Tấn Quốc",
  "Quỳnh - Thép Tấn Quốc",
];
const DEFAULT_LOGO = "data:image/svg+xml," + encodeURIComponent(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g fill="#e11d2a"><rect x="6" y="12" width="40" height="3"/><rect x="6" y="18" width="40" height="3"/><rect x="6" y="24" width="40" height="3"/><rect x="54" y="12" width="40" height="3"/><rect x="54" y="18" width="40" height="3"/><rect x="54" y="24" width="40" height="3"/></g><text x="50" y="74" font-family="Arial Black,Arial,sans-serif" font-size="46" font-weight="900" font-style="italic" fill="#e11d2a" text-anchor="middle">TQ</text><rect x="6" y="88" width="88" height="3" fill="#1d3a8a"/><rect x="6" y="93" width="88" height="2" fill="#e11d2a"/></svg>`);

// ============================================================
// MÃ QR ZALO NHÂN VIÊN — hiện ở góc phải báo giá theo người báo giá/người lập
// Key = tên trước " - Thép Tấn Quốc". Thêm/sửa nhân viên: cập nhật cả đây nếu có QR.
// ============================================================
const STAFF_QR = {
  "Na": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASIAAAEiAQAAAAB1xeIbAAAB1UlEQVR42u2ZQY7bMAxFH0cGKGAW8g2Sm/Tq6U3sG0g7CbDMLpSk7Yw97bYNuTLst/r4oj5pMf5c39/4m3LKKaeccsqpf4UyERGRqUuEJhHKeHN1vQ4pMTPbCFZBK0AyM1vcXyeUiUzQJ5pIpMxQnu5yvU6pHtGqZXYlaBGtpOxKHNfEozVBJ2zvtYnWDCSD1fU6pkxEZKJriWiJZR5X39X1OvSXPCbl9l5SbW1Oyfw8fp2sJvrUtWpFK8Ng19WT1ccyMzPbAcIWNjWzqmaWk9lyGV9vr6PELrtsEOxeeUTMR93cOb9T0t+A0CZoIhJTpohnzC9mmJ2w9YkeAS0zZSYtq898Z0nhDQgbtKhWGaH84jPfKSVdtE2EqiW2ZJmUWeXb4nod93vbwxbMNrSqjVHn59V3e6EZxkR2moQGNOG+LoCLO+fw5jPbIVhTK6miOZnltFy8M51nchGZQotatTIMxuoz31lSGNtOQhGJWmZShqe9XK9P1Nh20qNW0FxE5nL183i6sxrV1VpEANI6r/LC/b5LvP9XgLQ8z5o751PGNNsAtNKSWQZ+aU2u14eMOZ7DhppVrSnf9+kX3ykcdabnttOGxTIZe9GT5pRTTjnl1P9N/QBqZQT4E3QR0gAAAABJRU5ErkJggg==",
  "Vinh": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASIAAAEiAQAAAAB1xeIbAAABw0lEQVR42u2YQa7bMAxEh5EAekfdILlJr95/E/sG4k4C5EwXtgP0J266bUPubLzVQBwOKcT7+rrgbyqooIIKKqig/hWKIiIiGesEoE+Ab39uoddLSkhyYM3oIuYFMJKc432dUBTJQBp9UvoEAP54XaHXGbVmbejWvHyeEvm3r8RuPsEIDyf/IyXkANYMKOmyWdMcep1Q3AYfAPSpW91H3y30etmPcmzKA60DAIzRj2+SVV5FRCZ0a7YUL35b4n29puQOGasOQJvSJ1gFbP7MjLnm1JVjy5hS/LrIDUtk8hMnvyB17ZL3jOkFsPkamfzEmS6QgTWnoa2LNavwgiUm33ORJO97DiWbNm1ajdXqdb6SJPkz9HryrztSz4A2dfPiBV4Q/nW+IyeO1CUD0AbYUj7Nv45OE5IDaSjZlBUA7Gi06LTveh01UsMeyVlxyBV6vczk27VTm5IVXmBfce08d/K9H7ctGbAK//G4KoRe3/xL7kAaaQDKpltThn+91yu1bfIBVgHsFvaReinZsGdMxA5zSm3XTqCLTOjFi0t5yBV6Pe3Ij2un0q1tbRY733M9XzuhDRUV/NBOCyqooIIK6v+mfgFSnhrAnwJAqAAAAABJRU5ErkJggg==",
  "Quỳnh": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASIAAAEiAQAAAAB1xeIbAAABv0lEQVR42u2YQY4bMQwEm5EA6kb9wP7/K7I/8fxAvEmA5M5h7AWy9qz3mpi8zaBODZLdlBCv6+MXflJBBRVUUEEF9a9QFBERyVgFwCiA73/OoddTSkhyYmUMEfMKGEleor8OKIpkIM1RlF4AwD+7K/Q6olbWjmHd6/spkf/6Shzm5kZ4bPJvKSEnsDKgbi77arqEXgcUd+MDgGFu7WZ959Dr6TzK/VKe6AMAYIx5fJGs8hIRKRjWbate/bxFfx0lqyvSUHJq1z4KrAF2ec/+komVV8YQo0v10yZnbJHJj5xv5cSZ5ijaAXgF7HKKTP6ckiuwRDKgfUiBNXjFFs73WCTJq1yRSM7UtWvXZmzWTpcTSZK/Q6+HebxiSU5Tu3oZ1Su8IvbXN9RSTmAUKDtsq++2v26Ttt8waSaSXdkAwO6DFpP2Va97TQDQDhjZcJcr9HqayfejT/swNniFfcRr56HzkeRMnNqxO1/014ukgDTThJJdO2J//VSvjl0uawBuLfaOeqWufZRbxkTcMMcZc7e9VQClV68u9VOu0OsrdX/tTF7Uy23M4uZ7rMfXTmhHQwPf9joJKqigggrqf6b+AE7nKmk+BxrkAAAAAElFTkSuQmCC",
  "Trâm": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASIAAAEiAQAAAAB1xeIbAAABxklEQVR42u2YQW7jMAxFH2sD0k66QXKTufrkJvENpJ0EyPmzcJxi2rjtdibUzsZbfZCf/DTx/bu88ZPnlFNOOeWUU/8KJTMzs5k1QrcIdftzdr2eUiZJg3WmW1LNkCTp6vV1QMlshmn0GFqPAPVRXa7XEbXOodFTq/n1lJj/+prUU001iepO/iVl0oB1htBCtc2arq7XAaVt8AH02FO5j76z6/W0H21PyoPWCa2S5P34zWY1r2ZmkR5JS665nhevr+eU6WYa04DQgmokFUjX13Ty1cyCBt0i3XI9LXZm8Z38iDJJA3oMDagZ0vXkO/nR5Hu7z77QuqWWCjWz+OT7/CRJN+wG0wBCCy2UpJLK6XqSJOm36/UxI99ssIYxqYVGzzVTM+5fX1CT1GfuDpaW/Gr+tXfa1mf7FlAA0t5o3mkf9drfmBqEBkkq7HK5Xk93crOZNUktqFAz6eLXzqMbjN2ANUyPpJdKrb/kme+I2q6d69wjPfZczXK6nF2vA7/fFqtpTO29wIC7hb2mfwVJ2nZMPMMcZ2RpAGtqQM81V8sPuVyvT5nv/dpJj/c288x3NPke104BoVEo6GXTiVNOOeWUU/8z9QdybQItPLqtdAAAAABJRU5ErkJggg==",
};
const staffKey = (full) => (full ? String(full).split(" - ")[0].trim() : "");
const staffQR = (full) => STAFF_QR[staffKey(full)] || "";

// ============================================================
// PROTOCOL BAREM ĐA NGUỒN
// ─────────────────────────────────────────────────────────────
// Cấu trúc mỗi dòng:
//   g    = nhóm: "H" | "I" | "U" | "V"
//   ten  = tên quy cách hiển thị (VD: "U100", "V150x150")
//   spec = kích thước chi tiết (dùng nội bộ, không hiện ra)
//   kgm  = kg/m
//   src  = nguồn nhà máy: "AKS" | "POSCO" | "DVS" | ...
//
// ĐỂ THÊM NGUỒN MỚI (VD: POSCO thép H):
//   Thêm dòng vào đúng nhóm bên dưới, điền src: "POSCO"
//   Bảng barem tự nhóm theo ten — POSCO là nguồn chuẩn cho thép I
// ============================================================

const RAW_BAREM = [
  // ── THÉP I — AKS ───────────────────────────────────────────
  { g:"I", ten:"I100",  spec:"100x55x4.5",   kgm:9.46,  src:"AKS" },
  { g:"I", ten:"I120",  spec:"120x64x4.8",   kgm:11.50, src:"AKS" },
  { g:"I", ten:"I150",  spec:"150x75x5.0",   kgm:14.00, src:"AKS" },
  { g:"I", ten:"I200",  spec:"200x100x5.2",  kgm:21.00, src:"AKS" },
  { g:"I", ten:"I250",  spec:"250x125x6.0",  kgm:29.60, src:"AKS" },
  { g:"I", ten:"I300",  spec:"300x150x6.5",  kgm:36.70, src:"AKS" },

  // ── THÉP U — AKS ───────────────────────────────────────────
  { g:"U", ten:"U65",   spec:"65x36x4.4 (Nhỏ)",  kgm:17.70, src:"AKS", isCay:true },
  { g:"U", ten:"U80",   spec:"80x40x4.5",    kgm:7.05,  src:"AKS" },
  { g:"U", ten:"U100",  spec:"100x46x4.5",   kgm:8.59,  src:"AKS" },
  { g:"U", ten:"U120",  spec:"120x52x4.9",   kgm:10.40, src:"AKS" },
  { g:"U", ten:"U140",  spec:"140x58x6.5",   kgm:12.30, src:"AKS" },
  { g:"U", ten:"U150",  spec:"150x75x5.0",   kgm:18.20, src:"AKS" },
  { g:"U", ten:"U160",  spec:"160x64x5.0",   kgm:14.20, src:"AKS" },
  { g:"U", ten:"U180",  spec:"180x70x5.1",   kgm:17.20, src:"AKS" },
  { g:"U", ten:"U200",  spec:"200x76x5.2",   kgm:18.40, src:"AKS" },
  { g:"U", ten:"U220",  spec:"220x82x5.4",   kgm:22.60, src:"AKS" },
  { g:"U", ten:"U250",  spec:"250x76x6.0",   kgm:27.50, src:"AKS" },
  { g:"U", ten:"U300",  spec:"300x90x9.0",   kgm:35.50, src:"AKS" },

  // ── THÉP V GÓC NHỎ (V25, V30, V40 mỏng) — đơn vị kg/CÂY 6m ──
  { g:"V", ten:"V25x25",  spec:"25x25x2",    kgm:4.0,   src:"AKS", day:2,   isCay:true },
  { g:"V", ten:"V25x25",  spec:"25x25x2.5",  kgm:5.0,   src:"AKS", day:2.5, isCay:true },
  { g:"V", ten:"V30x30",  spec:"30x30x2",    kgm:5.5,   src:"AKS", day:2,   isCay:true },
  { g:"V", ten:"V30x30",  spec:"30x30x2.5",  kgm:7.0,   src:"AKS", day:2.5, isCay:true },
  { g:"V", ten:"V30x30",  spec:"30x30x3",    kgm:8.0,   src:"AKS", day:3,   isCay:true },
  { g:"V", ten:"V40x40",  spec:"40x40x3",    kgm:10.5,  src:"AKS", day:3,   isCay:true },
  { g:"V", ten:"V40x40",  spec:"40x40x3.5",  kgm:13.0,  src:"AKS", day:3.5, isCay:true },

  // ── THÉP V / L GÓC ĐỀU — AKS (có độ dày) ──────────────────
  { g:"V", ten:"V40x40",  spec:"40x40x2.5",  kgm:1.5,   src:"AKS", day:2.5 },
  { g:"V", ten:"V40x40",  spec:"40x40x4",    kgm:2.33,  src:"AKS", day:4  },
  { g:"V", ten:"V40x40",  spec:"40x40x5",    kgm:2.97,  src:"AKS", day:5  },
  { g:"V", ten:"V50x50",  spec:"50x50x2.5",  kgm:2.1,   src:"AKS", day:2.5 },
  { g:"V", ten:"V50x50",  spec:"50x50x3",    kgm:2.33,  src:"AKS", day:3   },
  { g:"V", ten:"V50x50",  spec:"50x50x3.5",  kgm:2.66,  src:"AKS", day:3.5 },
  { g:"V", ten:"V50x50",  spec:"50x50x4",    kgm:3,  src:"AKS", day:4  },
  { g:"V", ten:"V50x50",  spec:"50x50x4.5",  kgm:3.33,  src:"AKS", day:4.5 },
  { g:"V", ten:"V50x50",  spec:"50x50x5",    kgm:3.67,  src:"AKS", day:5  },
  { g:"V", ten:"V50x50",  spec:"50x50x6",    kgm:4.43,  src:"AKS", day:6  },
  { g:"V", ten:"V60x60",  spec:"60x60x5",    kgm:4.57,  src:"AKS", day:5  },
  { g:"V", ten:"V60x60",  spec:"60x60x6",    kgm:5.42,  src:"AKS", day:6  },
  { g:"V", ten:"V63x63",  spec:"63x63x4",    kgm:3.83,  src:"AKS", day:4   },
  { g:"V", ten:"V63x63",  spec:"63x63x5",    kgm:4.67,  src:"AKS", day:5  },
  { g:"V", ten:"V63x63",  spec:"63x63x6",    kgm:5.5,  src:"AKS", day:6  },
  { g:"V", ten:"V65x65",  spec:"65x65x5",    kgm:4.97,  src:"AKS", day:5  },
  { g:"V", ten:"V65x65",  spec:"65x65x6",    kgm:5.91,  src:"AKS", day:6  },
  { g:"V", ten:"V65x65",  spec:"65x65x7",    kgm:6.76,  src:"AKS", day:7  },
  { g:"V", ten:"V65x65",  spec:"65x65x8",    kgm:7.73,  src:"AKS", day:8  },
  { g:"V", ten:"V70x70",  spec:"70x70x5",    kgm:5.37,  src:"AKS", day:5  },
  { g:"V", ten:"V70x70",  spec:"70x70x6",    kgm:6.38,  src:"AKS", day:6  },
  { g:"V", ten:"V70x70",  spec:"70x70x7",    kgm:7.38,  src:"AKS", day:7  },
  { g:"V", ten:"V70x70",  spec:"70x70x8",    kgm:8.2,  src:"AKS", day:8  },
  { g:"V", ten:"V75x75",  spec:"75x75x5",    kgm:5.80,  src:"AKS", day:5  },
  { g:"V", ten:"V75x75",  spec:"75x75x6",    kgm:6.7,  src:"AKS", day:6  },
  { g:"V", ten:"V75x75",  spec:"75x75x7",    kgm:7.6,  src:"AKS", day:7  },
  { g:"V", ten:"V75x75",  spec:"75x75x8",    kgm:8.83,  src:"AKS", day:8  },
  { g:"V", ten:"V80x80",  spec:"80x80x6",    kgm:7.32,  src:"AKS", day:6  },
  { g:"V", ten:"V80x80",  spec:"80x80x7",    kgm:8.3,  src:"AKS", day:7  },
  { g:"V", ten:"V80x80",  spec:"80x80x8",    kgm:9.33,  src:"AKS", day:8  },
  { g:"V", ten:"V80x80",  spec:"80x80x9",    kgm:9.7,  src:"AKS", day:9  },
  { g:"V", ten:"V90x90",  spec:"90x90x6",    kgm:8.28,  src:"AKS", day:6  },
  { g:"V", ten:"V90x90",  spec:"90x90x7",    kgm:9.61,  src:"AKS", day:7  },
  { g:"V", ten:"V90x90",  spec:"90x90x8",    kgm:10.7, src:"AKS", day:8  },
  { g:"V", ten:"V90x90",  spec:"90x90x9",    kgm:12, src:"AKS", day:9  },
  { g:"V", ten:"V90x90",  spec:"90x90x10",   kgm:12.9, src:"AKS", day:10 },
  { g:"V", ten:"V100x100",spec:"100x100x7",  kgm:10.70, src:"AKS", day:7  },
  { g:"V", ten:"V100x100",spec:"100x100x8",  kgm:12.20, src:"AKS", day:8  },
  { g:"V", ten:"V100x100",spec:"100x100x9",  kgm:13.70, src:"AKS", day:9  },
  { g:"V", ten:"V100x100",spec:"100x100x10", kgm:14.7, src:"AKS", day:10 },
  { g:"V", ten:"V100x100",spec:"100x100x12", kgm:17.80, src:"AKS", day:12 },
  { g:"V", ten:"V120x120",spec:"120x120x8",  kgm:14.70, src:"AKS", day:8  },
  { g:"V", ten:"V120x120",spec:"120x120x10", kgm:18.20, src:"AKS", day:10 },
  { g:"V", ten:"V120x120",spec:"120x120x12", kgm:21.66, src:"AKS", day:12 },
  { g:"V", ten:"V130x130",spec:"130x130x9",  kgm:17.90, src:"AKS", day:9  },
  { g:"V", ten:"V130x130",spec:"130x130x10", kgm:19.75, src:"AKS", day:10 },
  { g:"V", ten:"V130x130",spec:"130x130x12", kgm:23.40, src:"AKS", day:12 },
  { g:"V", ten:"V150x150",spec:"150x150x10", kgm:23.00, src:"AKS", day:10 },
  { g:"V", ten:"V150x150",spec:"150x150x12", kgm:27.30, src:"AKS", day:12 },
  { g:"V", ten:"V150x150",spec:"150x150x15", kgm:33.80, src:"AKS", day:15 },
  { g:"V", ten:"V175x175",spec:"175x175x12", kgm:31.80, src:"AKS", day:12 },
  { g:"V", ten:"V175x175",spec:"175x175x15", kgm:39.40, src:"AKS", day:15 },
  { g:"V", ten:"V200x200",spec:"200x200x15", kgm:45.30, src:"AKS", day:15 },
  { g:"V", ten:"V200x200",spec:"200x200x20", kgm:59.70, src:"AKS", day:20 },
  { g:"V", ten:"V200x200",spec:"200x200x25", kgm:73.60, src:"AKS", day:25 },

  // ── THÉP I — POSCO ─────────────────────────────────────────
  { g:"I", ten:"I150",  spec:"150x75x5x7",    kgm:14.0,  src:"POSCO" },
  { g:"I", ten:"I198",  spec:"198x99x4.5x7",  kgm:18.2,  src:"POSCO" },
  { g:"I", ten:"I200",  spec:"200x100x5.5x8", kgm:21.3,  src:"POSCO" },
  { g:"I", ten:"I248",  spec:"248x124x5x8",   kgm:25.7,  src:"POSCO" },
  { g:"I", ten:"I250",  spec:"250x125x6x9",   kgm:29.6,  src:"POSCO" },
  { g:"I", ten:"I298",  spec:"298x149x5.5x8", kgm:32.0,  src:"POSCO" },
  { g:"I", ten:"I300",  spec:"300x150x6.5x9", kgm:36.7,  src:"POSCO" },
  { g:"I", ten:"I346",  spec:"346x174x6x9",   kgm:41.4,  src:"POSCO" },
  { g:"I", ten:"I350",  spec:"350x175x7x11",  kgm:49.6,  src:"POSCO" },
  { g:"I", ten:"I396",  spec:"396x199x7x11",  kgm:56.6,  src:"POSCO" },
  { g:"I", ten:"I400",  spec:"400x200x8x13",  kgm:66.0,  src:"POSCO" },
  { g:"I", ten:"I450",  spec:"450x200x9x14",  kgm:76.0,  src:"POSCO" },
  { g:"I", ten:"I500",  spec:"500x200x10x16", kgm:89.6,  src:"POSCO" },
  { g:"I", ten:"I600",  spec:"600x200x11x17", kgm:106.0, src:"POSCO" },

  // ── THÉP H — POSCO ─────────────────────────────────────────
  { g:"H", ten:"H100x100", spec:"100x100x6x8",   kgm:17.2,  src:"POSCO" },
  { g:"H", ten:"H125x125", spec:"125x125x6.5x9", kgm:23.8,  src:"POSCO" },
  { g:"H", ten:"H150x150", spec:"150x150x7x10",  kgm:31.5,  src:"POSCO" },
  { g:"H", ten:"H200x200", spec:"200x200x8x12",  kgm:49.9,  src:"POSCO" },
  { g:"H", ten:"H250x250", spec:"250x250x9x14",  kgm:72.4,  src:"POSCO" },
  { g:"H", ten:"H300x300", spec:"300x300x10x15", kgm:94.0,  src:"POSCO" },
  { g:"H", ten:"H194x150", spec:"194x150x6x9",   kgm:30.6,  src:"POSCO" },
  { g:"H", ten:"H294x200", spec:"294x200x8x12",  kgm:56.8,  src:"POSCO" },
  { g:"H", ten:"H244x175", spec:"244x175x7x11",  kgm:44.1,  src:"POSCO" },

  // ── THÉP H — TRUNG QUỐC (TQ) ───────────────────────────────
  { g:"H", ten:"H350x350", spec:"350x350x12x19", kgm:137.0, src:"TQ" },
  { g:"H", ten:"H400x400", spec:"400x400x13x21", kgm:172.0, src:"TQ" },

  // ── PHI TRÒN — TỔ HỢP (TH) ────────────────────────────────
  // PHI TRÒN — đơn vị kg/CÂY (lấy giá trị LỚN NHẤT trong dải)
  // isCay:true → kgm là kg/cây, không nhân thêm chiều dài
  { g:"P", ten:"Ø10",    spec:"Ø10",          kgm:3.3,   src:"TH", isCay:true },
  { g:"P", ten:"Ø12",    spec:"Ø12",          kgm:5.5,   src:"TH", isCay:true },
  { g:"P", ten:"Ø14",    spec:"Ø14",          kgm:7.5,   src:"TH", isCay:true },
  { g:"P", ten:"Ø16",    spec:"Ø16",          kgm:9.5,   src:"TH", isCay:true },
  { g:"P", ten:"Ø18",    spec:"Ø18",          kgm:12.0,  src:"TH", isCay:true },
  { g:"P", ten:"Ø20",    spec:"Ø20",          kgm:14.8,  src:"TH", isCay:true },
  { g:"P", ten:"Ø22",    spec:"Ø22",          kgm:18.0,  src:"TH", isCay:true },
  { g:"P", ten:"Ø24",    spec:"Ø24",          kgm:21.0,  src:"TH", isCay:true },
  { g:"P", ten:"Ø25",    spec:"Ø25",          kgm:23.0,  src:"TH", isCay:true },
  { g:"P", ten:"Ø28",    spec:"Ø28",          kgm:29.0,  src:"TH", isCay:true },
  { g:"P", ten:"Ø30",    spec:"Ø30",          kgm:33.5,  src:"TH", isCay:true },
  { g:"P", ten:"Ø32",    spec:"Ø32",          kgm:38.0,  src:"TH", isCay:true },

  // ── PHI TRÒN SS400 — đơn vị kg/CÂY 6m (duplicate dải phi, mác SS400) ──
  { g:"P", ten:"Ø10",    spec:"Ø10 SS400",    kgm:3.8,   src:"SS400", isCay:true },
  { g:"P", ten:"Ø12",    spec:"Ø12 SS400",    kgm:5.5,   src:"SS400", isCay:true },
  { g:"P", ten:"Ø14",    spec:"Ø14 SS400",    kgm:7.5,   src:"SS400", isCay:true },
  { g:"P", ten:"Ø16",    spec:"Ø16 SS400",    kgm:9.5,   src:"SS400", isCay:true },
  { g:"P", ten:"Ø18",    spec:"Ø18 SS400",    kgm:12.0,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø20",    spec:"Ø20 SS400",    kgm:14.8,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø22",    spec:"Ø22 SS400",    kgm:18.0,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø25",    spec:"Ø25 SS400",    kgm:23.0,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø28",    spec:"Ø28 SS400",    kgm:29.0,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø30",    spec:"Ø30 SS400",    kgm:33.5,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø32",    spec:"Ø32 SS400",    kgm:38.0,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø36",    spec:"Ø36 SS400",    kgm:47.9,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø40",    spec:"Ø40 SS400",    kgm:59.2,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø45",    spec:"Ø45 SS400",    kgm:74.9,  src:"SS400", isCay:true },
  { g:"P", ten:"Ø50",    spec:"Ø50 SS400",    kgm:92.5,  src:"SS400", isCay:true },

  // ── PHI TRÒN S45C (thép chế tạo) — TRUNG QUỐC (TQ) ────────
  // Đơn vị kg/cây, lấy giá trị LỚN NHẤT trong dải
  { g:"P", ten:"Ø16",    spec:"Ø16 S45C",     kgm:10.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø18",    spec:"Ø18 S45C",     kgm:13.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø20",    spec:"Ø20 S45C",     kgm:15.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø22",    spec:"Ø22 S45C",     kgm:19.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø25",    spec:"Ø25 S45C",     kgm:24.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø27",    spec:"Ø27 S45C",     kgm:27.5,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø28",    spec:"Ø28 S45C",     kgm:29.5,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø30",    spec:"Ø30 S45C",     kgm:34.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø32",    spec:"Ø32 S45C",     kgm:38.5,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø38",    spec:"Ø38 S45C",     kgm:54.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø40",    spec:"Ø40 S45C",     kgm:60.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø42",    spec:"Ø42 S45C",     kgm:66.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø45",    spec:"Ø45 S45C",     kgm:77.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø50",    spec:"Ø50 S45C",     kgm:95.0,  src:"SC45", isCay:true },
  { g:"P", ten:"Ø55",    spec:"Ø55 S45C",     kgm:114.0, src:"SC45", isCay:true },
  { g:"P", ten:"Ø60",    spec:"Ø60 S45C",     kgm:134.0, src:"SC45", isCay:true },
  { g:"P", ten:"Ø65",    spec:"Ø65 S45C",     kgm:159.0, src:"SC45", isCay:true },
  { g:"P", ten:"Ø70",    spec:"Ø70 S45C",     kgm:186.0, src:"SC45", isCay:true },
  { g:"P", ten:"Ø80",    spec:"Ø80 S45C",     kgm:240.0, src:"SC45", isCay:true },
  { g:"P", ten:"Ø90",    spec:"Ø90 S45C",     kgm:303.0, src:"SC45", isCay:true },

  // ── VUÔNG ĐẶC — đơn vị kg/CÂY 6m ────────────────────────────
  // isCay:true → kgm là kg/cây trực tiếp
  { g:"Q", ten:"V10x10",  spec:"10x10",   kgm:5.0,  src:"TH", isCay:true },
  { g:"Q", ten:"V12x12",  spec:"12x12",   kgm:7.5,  src:"TH", isCay:true },
  { g:"Q", ten:"V14x14",  spec:"14x14",   kgm:9.5,  src:"TH", isCay:true },
  { g:"Q", ten:"V16x16",  spec:"16x16",   kgm:12.0, src:"TH", isCay:true },
  { g:"Q", ten:"V20x20",  spec:"20x20",   kgm:20.0, src:"TH", isCay:true },
  // Vuông đặc SS400 — duplicate dải TH, cùng kg/cây 6m, đổi nhãn SS400
  { g:"Q", ten:"V10x10",  spec:"10x10 SS400",   kgm:5.0,  src:"SS400", isCay:true },
  { g:"Q", ten:"V12x12",  spec:"12x12 SS400",   kgm:7.5,  src:"SS400", isCay:true },
  { g:"Q", ten:"V14x14",  spec:"14x14 SS400",   kgm:9.5,  src:"SS400", isCay:true },
  { g:"Q", ten:"V16x16",  spec:"16x16 SS400",   kgm:12.0, src:"SS400", isCay:true },
  { g:"Q", ten:"V20x20",  spec:"20x20 SS400",   kgm:20.0, src:"SS400", isCay:true },

  // ── THÉP RAY (ký hiệu P) — Trung Quốc (TQ), chiều dài cây đa dạng ──
  // g:"R" để phân loại nội bộ (khác phi Ø), nhưng tên hiển thị là P12, P15...
  // defLen = chiều dài cây mặc định (mm). kgCay nếu có kg/cây cố định
  { g:"R", ten:"P12", spec:"Ray P12", kgm:12.0, src:"TQ", defLen:6000,  kgCay:72.0 },
  { g:"R", ten:"P15", spec:"Ray P15", kgm:15.0, src:"TQ", defLen:6000  },
  { g:"R", ten:"P18", spec:"Ray P18", kgm:18.0, src:"TQ", defLen:6000  },
  { g:"R", ten:"P22", spec:"Ray P22", kgm:22.0, src:"TQ", defLen:8000  },
  { g:"R", ten:"P24", spec:"Ray P24", kgm:24.0, src:"TQ", defLen:8000  },
  { g:"R", ten:"P30", spec:"Ray P30", kgm:30.0, src:"TQ", defLen:12500 },
  { g:"R", ten:"P43", spec:"Ray P43", kgm:43.0, src:"TQ", defLen:12500 },

  // ── XÀ GỒ C — công thức: kg/m = bang/1000 × 7.85 × dày(li) ─
  // bang = tổng chu vi khai triển (mm) — giá trị từ bảng công ty
  // kgm để trống (= 0) vì phụ thuộc độ dày → tính động theo công thức
  { g:"C", ten:"C80",  spec:"C80",  src:"TH", bang:165, kgm:0 },
  { g:"C", ten:"C100", spec:"C100", src:"TH", bang:205, kgm:0 },
  { g:"C", ten:"C120", spec:"C120", src:"TH", bang:225, kgm:0 },
  { g:"C", ten:"C150", spec:"C150", src:"TH", bang:255, kgm:0 },
  { g:"C", ten:"C175", spec:"C175", src:"TH", bang:280, kgm:0 },
  { g:"C", ten:"C200", spec:"C200", src:"TH", bang:340, kgm:0 },
  { g:"C", ten:"C250", spec:"C250", src:"TH", bang:380, kgm:0 },
  { g:"C", ten:"C300", spec:"C300", src:"TH", bang:440, kgm:0 },
  // ── XÀ GỒ Z — cùng công thức với C: kg/m = bang/1000 × 7.85 × dày(li) ─
  // bang (mm) = khổ băng khai triển. Giá trị chuẩn theo cỡ — chỉnh lại nếu khổ của công ty khác.
  { g:"Z", ten:"Z100", spec:"Z100", src:"TH", bang:205, kgm:0 },
  { g:"Z", ten:"Z120", spec:"Z120", src:"TH", bang:225, kgm:0 },
  { g:"Z", ten:"Z150", spec:"Z150", src:"TH", bang:255, kgm:0 },
  { g:"Z", ten:"Z200", spec:"Z200", src:"TH", bang:340, kgm:0 },
  { g:"Z", ten:"Z250", spec:"Z250", src:"TH", bang:380, kgm:0 },
  { g:"Z", ten:"Z300", spec:"Z300", src:"TH", bang:440, kgm:0 },
];

// Màu + tên đầy đủ từng nguồn nhà máy
const SRC_COLOR = {
  AKS:   "#0ea5e9",
  POSCO: "#e11d2a",
  TQ:    "#d97706",
  SC45:  "#0d9488",
  TH:    "#7c3aed",
  VIC:   "#0891b2",
  DVS:   "#16a34a",
  TNGE:  "#ca8a04",
  SDH:   "#9333ea",
  SS400: "#475569",
};
const SRC_LABEL = {
  AKS:   "An Khánh (AKS)",
  POSCO: "POSCO (POS)",
  TQ:    "Trung Quốc (TQ)",
  SC45:  "SC45",
  TH:    "Tổ Hợp (TH)",
  VIC:   "Vĩnh Phúc (VIC)",
  DVS:   "Đại Việt (DVS)",
  TNGE:  "Gang Thép Thái Nguyên (TNGE)",
  SDH:   "Tuấn Cường (SDH)",
  SS400: "SS400",
};

// Nhân bản barem AKS sang các nhà máy dùng chung quy chuẩn (VIC, DVS, TNGE, SDH)
// → cùng kg/m, chỉ khác mã nhà máy
const CLONE_FROM_AKS = ["VIC", "DVS", "TNGE", "SDH"];
const CLONED_BAREM = CLONE_FROM_AKS.flatMap((newSrc) =>
  RAW_BAREM.filter((r) => r.src === "AKS").map((r) => ({ ...r, src: newSrc }))
);

// POSCO_DATA — gồm dữ liệu gốc + bản clone cho 4 nhà máy mới
const POSCO_DATA = [...RAW_BAREM, ...CLONED_BAREM];

// Nhóm loại hàng — hệ thống tự nhận, không cần dropdown
const LOAI_OPTS = [
  ["tam_phang", "Thép tấm phẳng"],
  ["ke", "Ke (tính như tấm)"],
  ["tam_tron", "Tấm tròn (Ø)"],
  ["tam_gan", "Tấm gân / chống trượt"],
  ["tam_nhan", "Thép nhấn Z/L/U (trơn)"],      // độ li × dài × tổng cạnh × 7.85
  ["tam_nhan_gan", "Thép nhấn Z/L/U (gân)"],   // + dài × tổng cạnh × 3
  ["thep_hinh", "Thép hình I/H/U/V"],
  ["thep_cay", "Thép cây khác (hộp/ống/phi/ray)"],
  ["xa_go", "Xà gồ C/Z (bán theo mét)"],
  ["gia_cong", "Gia công (cắt / đục lỗ)"],
];
const LOAI_LABEL = Object.fromEntries(LOAI_OPTS);

// ── Tra kg/m từ RAW_BAREM theo tên + nhà máy ─────────────────
// src = mã nhà máy ("POSCO","AKS","TQ","TH"...), "" = lấy dòng đầu tiên khớp tên
// Tra băng (mm) của xà gồ C/Z từ barem
function lookupBangC(tenKey) {
  const nm = tenKey.toUpperCase().replace(/\s/g,"");
  const row = POSCO_DATA.find(r => (r.g === "C" || r.g === "Z") && r.ten.toUpperCase() === nm);
  return row ? (row.bang || 0) : 0;
}
// kg/m xà gồ C/Z = bang/1000 × 7.85 × day(li)
function kgmXaGoC(bang, day) {
  return bang > 0 && day > 0 ? (bang / 1000) * 7.85 * day : 0;
}

function lookupKgM(tenKey, src = "") {
  const nm = tenKey.toUpperCase().replace(/\s/g,"");
  // Khớp: "V40" khớp với "V40x40", "V40X40" v.v.
  // Ưu tiên: khớp chính xác → khớp bắt đầu bằng nm
  const rows = POSCO_DATA.filter(r => {
    const rn = r.ten.toUpperCase().replace(/\s/g,"").replace(/X/g,"x");
    const nmn = nm.replace(/X/g,"x");
    return rn === nmn                  // V40x40 === V40x40
      || rn.startsWith(nmn + "x")     // V40x40 startsWith V40x
      || rn.startsWith(nmn + "X")
      || rn === nmn.replace(/x.*/,"") // fallback bỏ phần x sau
      || rn.startsWith(nmn);
  });
  if (!rows.length) return 0;
  if (src) {
    const match = rows.find(r => r.src === src);
    if (match) return match.kgm;
  }
  return rows[0].kgm;
}

const isPlateType = (lo) => lo === "tam_phang" || lo === "tam_gan" || lo === "tam_nhan" || lo === "tam_nhan_gan" || lo === "ke" || lo === "tam_tron";
const isSectionType = (lo) => lo === "thep_hinh" || lo === "thep_cay" || lo === "xa_go";
const giaUnitOf = (lo, dvt="") => {
  if (dvt === "kg") return "kg";
  if (dvt === "cây" && (lo === "thep_hinh" || lo === "thep_cay")) return "cay"; // bán theo cây: qty × donGia
  if (lo === "xa_go" || dvt === "m") return "m";
  if (lo === "gia_cong") return "cai";
  return "kg";
};
const dvtDefault = (lo) => (isPlateType(lo) ? "tờ" : lo === "gia_cong" ? "cái" : "cây");
const giaUnitText = (gu) => (gu === "kg" ? "đ/kg" : gu === "m" ? "đ/m" : gu === "cay" ? "đ/cây" : "đ/cái");

const EXTRACT_PROMPT = `Bạn là chuyên gia bóc tách khối lượng thép xây dựng Việt Nam. Đọc bản vẽ / tin nhắn / bảng thống kê / BÁO GIÁ CŨ, trả về DUY NHẤT một mảng JSON. Mỗi phần tử:
{"name":"tên","loai":"<mã>","src":"<mã nhà máy>","dvt":"đơn vị","day":"độ dày mm nếu tấm/bản mã","rong":"rộng mm nếu tấm","dai":"dài mm nếu tấm","soMet":"chiều dài cây mm","kgM":kg/m nếu ghi rõ,"kgCay":kg/cây nếu ghi rõ,"qty":số lượng cây/tờ,"tongMet":tổng chiều dài mét nếu bảng cho tổng mét thay vì số cây,"tongM2":tổng mét vuông (m²) nếu tấm cho theo m² thay vì số tờ,"donGia":đơn giá nếu ảnh CÓ cột đơn giá,"giaPerKg":true nếu giá tính theo kg / false nếu theo cây,"dtManual":đơn trọng nếu ảnh CÓ cột đơn trọng,"klManual":tổng KL nếu ảnh CÓ cột,"note":ghi chú nếu có,"uncertain":["danh sách field đọc KHÔNG chắc, vd name/day/rong/dai/soMet/kgM/kgCay/qty/donGia"],"warn":"lý do ngắn nếu không chắc dòng này (ô nào mờ/đoán)"}

⚠️ KHI KHÔNG CHẮC CHẮN (ảnh mờ, viết tay khó đọc, phải đoán):
- VẪN điền giá trị phán đoán tốt nhất — TUYỆT ĐỐI không bỏ trống dòng.
- NHƯNG đánh dấu: "uncertain": [tên các field không chắc] và "warn": "lý do ngắn" (vd "số lượng mờ, đoán 36").
- VD đọc được tên nhưng số lượng nhòe: {"name":"Thép V90x90x9","qty":36,"uncertain":["qty"],"warn":"số lượng nhòe, đoán 36"}

🔴 QUAN TRỌNG NHẤT — NHẬN DIỆN LOẠI ẢNH TRƯỚC KHI XỬ LÝ:

★ LOẠI A — BÁO GIÁ CŨ CỦA TẤN QUỐC (ảnh có tiêu đề "BÁO GIÁ", có logo TQ, hoặc CÓ ĐỦ các cột: Đơn trọng / Tổng KL / Đơn giá / Thành tiền):
→ ĐÂY LÀ ĐƠN ĐÃ TÍNH SẴN. ĐỌC NGUYÊN VĂN MỌI CON SỐ TRÊN ẢNH, KHÔNG TÍNH LẠI.
→ Điền ĐẦY ĐỦ: dtManual (đơn trọng từ cột Đơn trọng), klManual (từ cột Tổng KL), donGia (từ cột Đơn giá), qty (từ cột SL), note (từ cột Ghi chú).
→ ĐỌC ĐƠN VỊ GIÁ: nếu cột đơn giá ghi "/kg" → giaPerKg=true; nếu ghi "/cây" → giaPerKg=false. Mặc định báo giá thép thường là "/kg".
→ KHÔNG cần đọc cột Thành tiền (app tự tính để tránh sai số).
→ ĐỌC THÔNG TIN ĐẦU TRANG: thêm 1 object đặc biệt vào ĐẦU mảng JSON:
  {"_meta":true,"customerName":"tên sau Kính gửi:","project":"công trình nếu có","quoter":"tên sau Người báo giá:"}
  VD ảnh ghi "Kính gửi: Công Ty Hoàng Trọng Tín" và "Người báo giá: Trần Thị Băng Trâm"
  → {"_meta":true,"customerName":"Công Ty Hoàng Trọng Tín","quoter":"Trần Thị Băng Trâm"}
  KHÔNG đọc ngày (app tự dùng ngày hiện tại).
→ Giữ NGUYÊN tên mặt hàng đầy đủ kể cả phần (nhà máy): "Thép U180 (AKS)" giữ nguyên.
→ Đọc số tiền bỏ dấu chấm phân cách: "8.040.312" → ttManual=8040312, "25.970/kg" → donGia=25970
→ TUYỆT ĐỐI không bỏ sót cột nào. Mọi giá trị hiển thị trên ảnh phải được điền lại y hệt.

★ LOẠI B — ĐƠN TỪ KHÁCH (bản vẽ, tin nhắn, bảng vật tư — KHÔNG có cột đơn giá/thành tiền):
→ Chỉ bóc tách thông số cơ bản (tên, kích thước, SL). KHÔNG tự bịa đơn giá.
→ Để hệ thống tự tính đơn trọng theo công thức.

Mã loại:
- "tam_phang": tấm phẳng/tấm/bản mã/thép la → dvt=tờ. MẶC ĐỊNH cho mọi loại "Tấm" nếu KHÔNG ghi rõ "gân"
- "ke": mặt hàng tên bắt đầu "Ke" (thép ke) → dvt=tờ. Có day(li) + rong + dai; tính KHỐI LƯỢNG GIỐNG tấm phẳng.
- "tam_tron": TẤM/KE TRÒN — có Ø (hoặc "phi") + 1 đường kính + độ dày "ly" (vd "Ø500 x 30ly", "phi 320 x 20ly") → dvt=tờ, rong=ĐƯỜNG KÍNH (mm), day=độ dày. (Phi tròn ĐẶC bán theo cây KHÔNG có "ly" → là thep_cay.)
- "tam_gan": CHỈ khi khách GHI RÕ chữ "gân"/"chống trượt"/"nhám" → dvt=tờ
- "tam_nhan": thép NHẤN Z/L/U trơn (gấp từ tấm, có ghi kích thước AxBxC) → dvt=tờ, rong=TỔNG chiều rộng các cạnh (mm), dai=chiều dài
- "tam_nhan_gan": thép NHẤN Z/L/U gân → dvt=tờ, rong=TỔNG chiều rộng các cạnh, dai=chiều dài
- "thep_hinh": thép hình I/H/U/V/L → dvt=cây, soMet=6000 (mặc định 6m)
- "thep_cay": ống hộp/phi tròn(Ø)/ray/vuông đặc → dvt=cây
- "xa_go": XÀ GỒ C hoặc XÀ GỒ Z (vd "xà gồ Z200", "Z200", "C200") → dvt=cây. App tự tra băng theo cỡ.
  ⚠️ Phân biệt: "xà gồ Z200" / "Z200" (chỉ có cỡ) = xa_go; còn "Z 200x65x2" (có đủ kích thước AxBxC) = tam_nhan.
- "gia_cong": cắt/đục lỗ/khoan → dvt=lỗ/cái

⚠️ QUY LUẬT CHUNG CHO TẤM / KE (rất quan trọng):
- Số có "ly"/"li" LUÔN là ĐỘ DÀY (day), dù đứng ĐẦU ("Tấm 25ly x 330 x 202") hay CUỐI ("Tấm 400 x 400 x 14ly"). Hai số còn lại = rong × dai.
- Đơn vị chiều dài: "mét"/"m" → ×1000 (6 mét=6000, 2m=2000); "mm" giữ nguyên.
- Đơn vị số lượng: nhận "tấm", "tờ", "cái" — đều là qty.
- Ghi chú trong ngoặc "(BVE)" / "(Bản vẽ)" → đưa vào note (KHÔNG phải kích thước).
- Ngoặc đơn chứa 2 số ("-" hoặc "x", vd "(615-282)" hay "(282x170)") = HÌNH THANG 2 cạnh → rong="615-282".

⚠️ TẤM HÌNH THANG (2 cạnh rộng khác nhau):
- Nếu tấm có 2 chiều rộng khác nhau (VD: cạnh trên 485, cạnh dưới 254)
  → điền rong="485-254" (app tự tính trung bình (485+254)/2)
- dai = chiều dài tấm

⚠️ TẤM CHO THEO TỔNG MÉT VUÔNG (m²) — quan trọng:
- Nếu tấm cho theo TỔNG diện tích thay vì số tờ (VD: "Tấm 10li 1500x6000 = 81 m²", "81m2", "tổng 81 mét vuông")
  → điền tongM2 = số m² đó (VD: 81) VÀ rong/dai = khổ 1 tờ (VD: rong=1500, dai=6000)
  → tự tính qty = round(tongM2 ÷ (rong/1000 × dai/1000))   (diện tích 1 tờ tính theo m²)
  → VD: 81 m², khổ 1500x6000 = 9 m²/tờ → qty = 81 ÷ 9 = 9 tờ
  → có thể ghi note="81m2" để đối chiếu

⚠️ BẢNG CÓ CỘT DÀY / RỘNG / DÀI RIÊNG (Dày mm, Rộng mm, Dài mm):
- Bảng "DÀY | RỘNG | DÀI" → điền day, rong, dai theo ĐÚNG CỘT (KHÔNG gộp vào tên dạng 5x65x216)
- VD bảng: Dày=5, Rộng=65, Dài=216, SL=356 → {"loai":"tam_phang","day":5,"rong":65,"dai":216,"qty":356}
- VD: Dày=5, Rộng=350, Dài=1300, "thép chống trượt" → {"loai":"tam_gan","day":5,"rong":350,"dai":1300}
- ĐVT "thanh"/"tấm" → dvt="tờ"

Mã nhà máy (src):
- "POSCO": POSCO, POS, Yamato, PY Vina
- "AKS": AKS, An Khánh
- "VIC": VIC, Vĩnh Phúc
- "DVS": DVS, DV, ĐV, Đại Việt (viết tắt "(ĐV)"/"(DV)" sau tên hàng = nhà máy Đại Việt)
- "TNGE": TNGE, Gang Thép Thái Nguyên
- "SDH": SDH, Tuấn Cường
- "TQ": TQ, Trung Quốc, China, CN (thép H Trung Quốc, thép ray P12/P15…)
- "SC45": SC45, S45C (phi tròn đặc thép chế tạo)
- "SS400": SS400 (phi/vuông đặc mác SS400)
- "TH": TH, tổ hợp, phi không rõ nguồn
- "": không rõ → để trống

Quy tắc QUAN TRỌNG:
- ⚠️ SỐ LƯỢNG (qty): mỗi mặt hàng PHẢI có qty > 0. Đọc kỹ cột "số lượng" / "SL" / "数量" / "cây".
- ⚠️ NẾU bảng cho TỔNG CHIỀU DÀI (mét) thay vì số cây (thường gặp ở bảng Trung Quốc):
  → tự CHIA cho 6 và LÀM TRÒN LÊN: qty = ceil(tổng_mét / 6)
  → VÀ điền luôn tongMet = số mét gốc (để app kiểm tra lại)
  → VD cột ghi 120 → qty=20, tongMet=120
  → VD cột ghi 65.3 → qty=11 (ceil 10.88), tongMet=65.3
  → VD cột ghi 165.8 → qty=28 (ceil 27.6), tongMet=165.8
  → VD cột ghi 309 → qty=52 (ceil 51.5), tongMet=309
- V3/V4/V5 = thép góc nhỏ: V3=V30x30, V4=V40x40, V5=V50x50 — loai="thep_hinh"
- QUY TẮC ĐỘ DÀY THÉP GÓC V (rất quan trọng): khi khách ghi "VxAxBxt" thì số THỨ BA là ĐỘ DÀY (li/mm), PHẢI giữ đủ trong tên.
  → "V90x90x9" / "V90 x 90 x 9" / "V90x90x9li" đều = thép góc V90x90 dày 9li → name="Thép V90x90x9"
  → "V75x75x7" → name="Thép V75x75x7";  "V50x50x5" → name="Thép V50x50x5"
  → Nếu khách chỉ ghi "V90x90 dày 9" hoặc "V90 9li" → vẫn chuẩn hoá name="Thép V90x90x9"
  → TUYỆT ĐỐI không bỏ số li thứ ba (bỏ đi sẽ tra nhầm sang loại mỏng nhất, tính thiếu khối lượng)
- MÃ U/I CÓ NHIỀU SỐ KG (U80, U100, U120, U140, U160, U200, U250, I100, I120, I150, I200):
  → ĐỂ TRỐNG kgM và kgCay (đừng tự đoán), để nhân viên tự chọn đúng loại trên giao diện.
  → Vẫn điền name (VD "Thép U100"), loai="thep_hinh", soMet=6000, qty, src nếu có.
  → ⚠️ NHƯNG nếu khách GHI RÕ số kg kèm "k"/"kg" (vd "U120 55k", "U120x55K", "U120 55kg", "I150 80k"):
     → số đó là LOẠI kg/CÂY khách muốn mua → name="Thép U120" (BỎ phần "55k" khỏi tên), kgCay=55, loai="thep_hinh", soMet=6000.
     → ĐÂY LÀ THÔNG TIN RÕ RÀNG — KHÔNG đánh dấu uncertain/warn cho dòng này.
     → VD "U120 55k: 30 cây" → {"name":"Thép U120","loai":"thep_hinh","kgCay":55,"soMet":6000,"qty":30}
     → VD "I150 80k x 10 cây" → {"name":"Thép I150","loai":"thep_hinh","kgCay":80,"soMet":6000,"qty":10}
     (chữ "k"/"kg" sau số = kg/cây, KHÔNG phải kích thước; đừng ghi "x55K" vào tên)
- "V3 x 8kg" → name="Thép V30x30", kgCay=8, soMet=6000, loai="thep_hinh"
- Số đi kèm "8kg/cây" = kg/cây → điền vào kgCay
- Thép hình I/H/U/V: soMet mặc định 6000 (6m)
- Phi / sắt tròn / thép tròn đặc → loai="thep_cay", dùng ký hiệu Ø: "Ø20"
  "Sắt tròn 20", "thép tròn đặc 25", "tròn 20mm" → name="Ø20", "Ø25" — điền ký hiệu Ø vào tên
- ⚠️ "Tấm" KHÔNG có chữ "gân" → loai="tam_phang" (KHÔNG tự thêm "gân")
- "Tấm gân" / "3ly gân" (CÓ chữ gân) → loai="tam_gan"
- KHÔNG bao giờ tự suy diễn "Tấm 3ly" thành "Tấm gân 3ly"
- Chữ viết tay "Tấm" có thể bị nhận thành "Tẩm", "Tầm", "Tảm", "Tam" → đều là "Tấm"
- ⚠️ KHÔNG tạo dòng rỗng/không xác định. Chỉ trả về các mặt hàng CÓ THẬT trong ảnh. Bỏ qua dòng tiêu đề, dòng tổng cộng, dòng trống.
- LUÔN điền name + qty, KHÔNG để trống
- CHỈ trả về mảng JSON, không markdown

Ví dụ từ tin nhắn thực tế:
"V3 x 8kg: 200 cây" → {"name":"Thép V30x30","loai":"thep_hinh","kgCay":8,"soMet":6000,"qty":200}
"I100 AKS: 5 cây" → {"name":"Thép I100","loai":"thep_hinh","src":"AKS","soMet":6000,"qty":5}
"3ly gân 1500x3000: 20 tấm" → {"name":"Tấm gân 3ly","loai":"tam_gan","rong":1500,"dai":3000,"qty":20}
"Tấm 3ly x (485x254) x 8m = 18 tấm" → {"name":"Tấm 3ly","loai":"tam_phang","day":3,"rong":"485-254","dai":8000,"qty":18}
"Tấm 12 x 400 x 400 = 13 tấm" → {"name":"Tấm 12ly","loai":"tam_phang","day":12,"rong":400,"dai":400,"qty":13}
(Lưu ý: "Tấm 3ly" KHÔNG có chữ "gân" → tam_phang, KHÔNG phải tam_gan)
"Tấm 10li = 81 m²" (không ghi khổ) → {"name":"Tấm 10ly","loai":"tam_phang","day":10,"rong":1500,"dai":6000,"tongM2":81,"qty":9,"note":"81m2"}  ← khổ mặc định 1500x6000, qty=81÷9=9
"Thép tấm 5ly 80 mét vuông" → {"name":"Tấm 5ly","loai":"tam_phang","day":5,"rong":1500,"dai":6000,"tongM2":80,"qty":9,"note":"80m2"}
⚠️ Tấm cho theo m²: LUÔN giữ con số m² (vào tongM2 + note), điền khổ 1500x6000 nếu đơn không ghi khổ, qty=round(m²÷diện_tích_tờ).
"Thép la 20x5x6000: 50 thanh" → {"name":"Thép la 20x5","loai":"tam_phang","day":5,"rong":20,"dai":6000,"qty":50}
"La 50x6: 30 cây" → {"name":"La 50x6","loai":"tam_phang","day":6,"rong":50,"dai":6000,"qty":30}
── KE (thép ke) — tính như tấm phẳng, dvt=tờ ──
"Ke 130 x 80 x 8ly = 112 cái" → {"name":"Ke 130x80","loai":"ke","day":8,"rong":130,"dai":80,"qty":112}
"Ke 250 x 100 x 20ly = 52 tấm" → {"name":"Ke 250x100","loai":"ke","day":20,"rong":250,"dai":100,"qty":52}
── TẤM/KE TRÒN (Ø + độ dày ly) — rong=ĐƯỜNG KÍNH, dvt=tờ ──
"Tấm Ø500 x 30ly = 18 tấm" → {"name":"Tấm tròn Ø500","loai":"tam_tron","day":30,"rong":500,"qty":18}
"Tấm Ø320 x 20ly = 4 tấm" → {"name":"Tấm tròn Ø320","loai":"tam_tron","day":20,"rong":320,"qty":4}
── ĐƠN VỊ "mét/m" → ×1000, hình thang trong ngoặc, ghi chú (BVE) ──
"Tấm 4ly x (615-282) x 6 mét = 8 tấm" → {"name":"Tấm 4ly","loai":"tam_phang","day":4,"rong":"615-282","dai":6000,"qty":8}
"Tấm 3ly x (282 x170) x 2m = 8 tấm" → {"name":"Tấm 3ly","loai":"tam_phang","day":3,"rong":"282-170","dai":2000,"qty":8}
"Tấm 25ly x 330 x 202 (BVE) = 14 tấm" → {"name":"Tấm 25ly","loai":"tam_phang","day":25,"rong":330,"dai":202,"qty":14,"note":"BVE"}
── NÉT CHỮ VIẾT TAY hay đọc nhầm (suy đoán đúng): ──
  "Tấu/Tãư/Tớư" (đuôi m cong) = Tấm · "g10" = 910 (số 9 giống g) · "6ly/bly/Gly" = 6 li (6 hay bị thành b/G) · "ly/li" sau số = độ dày.

★ ĐƠN VỊ VIẾT NHỎ KIỂU MŨ sau số lượng (rất hay gặp trong giấy viết tay):
  - Số lượng kèm chữ nhỏ "T" phía trên/sau (vd "1ᵀ", "3ᵀ") = số TỜ → dvt="tờ", qty=số đó.
  - Số lượng kèm chữ nhỏ "L"/"l"/"c" (vd "2ᴸ", "15ᴸ", "15c") = số CÂY → dvt="cây", qty=số đó.
  - VD "10 li  1ᵀ" → Tấm 10li, 1 tờ. "U120 …  15ᴸ" → U120, 15 cây.

★ THÉP GÓC V — SỐ CỠ rất khó đọc (QUAN TRỌNG NHẤT):
  - Ký hiệu mở đầu giống "√", "v", "V", "L", hay nét gập = THÉP GÓC V/L.
  - Số cỡ V CHỈ thuộc tập chuẩn: 25,30,40,50,60,63,65,70,75,80,90,100,120,130,150,175,200.
  - Số "75" viết tay HAY bị nguệch thành "ʒ", "з", "3", "qs", "75" rời → nếu đọc ra "V3"/"Vз" mà KÈM độ dày 5-8li và là hàng cây dài (DVS/AKS/15 cây) thì RẤT có thể là V75. Nếu nét đúng là "30" thì mới là V30.
  - Nếu cỡ đọc ra KHÔNG thuộc tập chuẩn → chọn cỡ chuẩn gần nhất hợp lý + đánh dấu uncertain:["name"], warn="cỡ V khó đọc, đoán Vxx".
  - "V75 x 6li" / "V75 x 7li" = thép góc V75x75 dày 6 / dày 7 → name="Thép V75x75x6" (giữ đủ số li ở cuối).
  "V75 x 6li DVS 15 cây" → {"name":"Thép V75x75x6","loai":"thep_hinh","src":"DVS","soMet":6000,"qty":15}
  "V75 x 7li DVS 15 cây" → {"name":"Thép V75x75x7","loai":"thep_hinh","src":"DVS","soMet":6000,"qty":15}

★ THÉP H + POSCO: chữ "H" đầu (H150, H200…) viết tay dễ nhầm thành "7"/"4"/"71" (vd "7450" thực ra là "H150x150"). H-beam thường đi với POSCO.
  "H150x150 POSCO 2 cây" → {"name":"Thép H150x150","loai":"thep_hinh","src":"POSCO","soMet":6000,"qty":2}

★ "(CT)" = CHỐNG TRƯỢT (gân) → loai="tam_gan". VD "3 li (CT) 4 tờ" → {"name":"Tấm gân 3li","loai":"tam_gan","day":3,"qty":4}

★ U/I CÓ SỐ/KHOẢNG TRONG NGOẶC = BẬC kg/CÂY (không phải kích thước):
  - "U120 (54-55)" hoặc "U120 (55)" hoặc "U120 55k" → bậc 55 kg/cây → kgCay=55.
  - "U120 (44-45)" hoặc "U120 45k" → bậc 45 kg/cây → kgCay=45.
  - Lấy số LỚN trong khoảng làm bậc. name="Thép U120" (bỏ phần ngoặc/“55k” khỏi tên), loai="thep_hinh", soMet=6000. KHÔNG đánh uncertain.
  "U120 (54-55) 15 cây" → {"name":"Thép U120","loai":"thep_hinh","kgCay":55,"soMet":6000,"qty":15}
  "U120 (44-45) 15 cây" → {"name":"Thép U120","loai":"thep_hinh","kgCay":45,"soMet":6000,"qty":15}

★ TẤM HÌNH THANG viết tay — mẫu "Tấm ⁶ˡⁱ (910 × 600) × 6770 mm = 7 Tấm":
  - "Tấm" + số nhỏ kiểu mũ "6ly/6li" = TẤM dày 6 li (day=6).
  - Ngoặc "(910 × 600)" = 2 cạnh rộng HÌNH THANG → rong="910-600". ("g10"/"910" hay viết dính, số 9 giống g.)
  - Số sau ngoặc kèm "mm" = chiều DÀI (dai). Chỉ khi ghi "m²"/"mét vuông" mới là diện tích (tongM2).
  - Số NGAY TRƯỚC "Tấm"/"Tờ" cuối dòng = SỐ LƯỢNG (qty), đơn vị tờ.
  "Tấm 6li (910 × 600) × 6770 mm = 7 Tấm" → {"name":"Tấm 6li","loai":"tam_phang","day":6,"rong":"910-600","dai":6770,"qty":7}
  "Tấm 6li (910 × 600) × 5780 mm = 2 tờ" → {"name":"Tấm 6li","loai":"tam_phang","day":6,"rong":"910-600","dai":5780,"qty":2}
  ⚠️ PHÂN BIỆT: hai số TRONG NGOẶC "(910 × 600)" = hình thang (rong="910-600"); còn "W × L" KHÔNG ngoặc = tấm CHỮ NHẬT (số đầu=rộng, số sau=dài).
  "Tấm 6li × 665 × 9000 mm = 2 tờ" → {"name":"Tấm 6li","loai":"tam_phang","day":6,"rong":665,"dai":9000,"qty":2}
  "Tấm 6li × 665 × 7400 mm = 1 tờ" → {"name":"Tấm 6li","loai":"tam_phang","day":6,"rong":665,"dai":7400,"qty":1}

★ ⚠️ CHỮ SỐ SỐ LƯỢNG dễ đọc nhầm: "7" viết tay hay giống "2"; "1" giống "7"; "4" giống "9"; "5" giống "6".
  - Đọc kỹ số NGAY TRƯỚC "tờ/tấm/cây". Nếu nét mơ hồ → vẫn điền phán đoán NHƯNG đánh dấu uncertain:["qty"], warn="số lượng khó đọc, đoán N".

"L(125x75x8) 8 cây 6m" → {"name":"L 125x75x8","loai":"tam_nhan","rong":200,"dai":6000,"qty":8}
"Z(100x50x3) 10 cây 6m" → {"name":"Z 100x50x3","loai":"tam_nhan","rong":150,"dai":6000,"qty":10}
Bảng TQ "角钢 ∠100x63x10 | 120 | Q235-B" (120 là tổng mét):
  → {"name":"Thép góc L100x63x10","loai":"thep_hinh","soMet":6000,"qty":20,"tongMet":120}
Bảng TQ "角钢 ∠160x100x10 | 309" → {"name":"Thép góc L160x100x10","loai":"thep_hinh","soMet":6000,"qty":52,"tongMet":309}

QUAN TRỌNG — Thép nhấn L/Z/U:
- loai = "tam_nhan" (KHÔNG phải thep_hinh)
- dvt = "tờ"
- rong = TỔNG chiều rộng CÁC CẠNH (cộng lại): L(125x75) → rong=200, Z(100x50) → rong=150
- dai = chiều dài cây (mm): 6m → dai=6000
- Độ dày (li) đọc từ số thứ 3: L(125x75x8) → dày 8li (đưa vào tên)

QUAN TRỌNG — Bảng thống kê thép góc kiểu Trung Quốc (角钢 / 槽钢 / 工字钢):
- 角钢 = thép góc (L/V), 槽钢 = thép U, 工字钢 = thép I, H型钢 = thép H
- "角钢 ∠100x63x10" hoặc "Thép góc L100x63x10" → loai="thep_hinh"
- Nếu bảng có CỘT TỔNG CHIỀU DÀI (đơn vị mét) thay vì số cây:
  → ĐIỀN trường "tongMet" = số mét đó (VD: 120, 65.3, 165.8, 309)
  → tự tính qty = ceil(tongMet/6)
- soMet=6000, KHÔNG điền src (để trống mã nhà máy)
- Q235-B là mác thép → bỏ qua, không đưa vào tên`;



const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });
const toDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });

function parseItems(text) {
  let t = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const a = JSON.parse(t);
    if (Array.isArray(a)) return a;
    // Nếu là object {meta, items} → trả items, meta đọc riêng bằng parseMeta
    if (a && Array.isArray(a.items)) return a.items;
  } catch (e) {}
  const objs = []; const re = /\{[^{}]*\}/g; let m;
  while ((m = re.exec(t))) { try { objs.push(JSON.parse(m[0])); } catch (e) {} }
  // Bỏ object meta (có _meta:true) khỏi danh sách mặt hàng
  return objs.filter((o) => !o._meta);
}

// Đọc metadata báo giá cũ: khách hàng, công trình, người báo giá
function parseMeta(text) {
  let t = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const a = JSON.parse(t);
    if (a && a.meta) return a.meta;            // dạng {meta:{...}, items:[...]}
  } catch (e) {}
  // Tìm object có _meta:true trong text
  const re = /\{[^{}]*\}/g; let m;
  while ((m = re.exec(t))) {
    try { const o = JSON.parse(m[0]); if (o._meta) return o; } catch (e) {}
  }
  return null;
}

const num = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return isFinite(n) ? n : 0; };
const has = (v) => v !== "" && v != null;
const fmt = (n) => Math.round(num(n)).toLocaleString("vi-VN");
const fmt2 = (n) => num(n).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDt = (n) => num(n).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const uid = () => Math.random().toString(36).slice(2, 9);
const todayISO = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

const parseDim = (s) => {
  const str = String(s ?? "").replace(/[^0-9.,\-]/g, " ").replace(/,/g, ".").trim();
  const parts = str.split(/[-\s]+/).map((x) => parseFloat(x)).filter((n) => isFinite(n) && n > 0);
  if (!parts.length) return 0;
  if (parts.length >= 2) return (parts[0] + parts[1]) / 2;
  return parts[0];
};
// Bỏ dấu tiếng Việt để regex khớp đúng (é→e, ì→i, đ→d...)
const boDau = (s) => String(s || "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d").replace(/Đ/g, "D");

// ===== TÌM KIẾM BAREM (mạnh): bỏ dấu + gồm nguồn + đồng nghĩa + khớp theo TỪNG TỪ (AND) =====
// Tách thành DANH SÁCH TỪ (không nối liền) để tránh khớp xuyên từ
//   (vd "thep hinh" KHÔNG được tạo ra chuỗi "thephinh" chứa "phi").
const _bwords = (s) => boDau(String(s || "")).toLowerCase().replace(/ø/g, "o").split(/[^a-z0-9]+/).filter(Boolean);
const _BAREM_GROUP_WORDS = {
  I: "thep hinh i ibeam dam",
  H: "thep hinh h hbeam dam",
  U: "thep hinh u uchannel",
  V: "thep hinh v goc",
  P: "thep phi tron trondac sat",
  R: "thep ray",
  C: "thep xa go xago",
  Z: "thep xa go xago",
  Q: "thep vuong vuongdac",
};
const _BAREM_SRC_WORDS = {
  AKS: "aks ankhanh", POSCO: "posco pos", TQ: "tq trungquoc china cn",
  SC45: "sc45 s45c chetao", SS400: "ss400", TH: "th tohop",
  VIC: "vic vinhphuc", DVS: "dvs daiviet", TNGE: "tnge thainguyen gangthep",
  SDH: "sdh tuancuong",
};
// Danh sách TỪ của 1 dòng barem (mọi cách người dùng có thể gõ)
const baremWords = (e) => {
  const num = (String(e.ten).match(/\d+/) || [""])[0];
  // Ø20 → cho gõ được: phi20, o20, 20
  const phiVariants = e.g === "P" ? `phi${num} o${num} ${num}` : "";
  const dayVariants = e.day ? `${e.day}li ${e.day}ly ${e.day}mm` : "";
  return [
    e.ten, e.spec, e.src,
    SRC_LABEL[e.src] || "",
    _BAREM_GROUP_WORDS[e.g] || "",
    _BAREM_SRC_WORDS[e.src] || "",
    phiVariants, dayVariants,
  ].flatMap(_bwords);
};
// Mọi từ khóa đều phải là một phần của ÍT NHẤT MỘT từ trong dòng (không khớp xuyên từ)
const baremMatch = (e, query) => {
  const toks = _bwords(query);
  if (!toks.length) return true;
  const words = baremWords(e);
  return toks.every((t) => words.some((w) => w.includes(t)));
};

const thicknessOf = (it) => {
  if (has(it.day) && String(it.day).trim() !== "") { const d = parseDim(it.day); if (d > 0) return d; }
  const name = String(it.name || "");
  // 1) "3ly", "3li", "3mm", "dày 3"
  const m = name.match(/(?:dày|day|độ\s*l[yi]|do\s*l[yi])?\s*([\d.,]+)\s*(?:ly|li|mm)/i);
  if (m) return parseFloat(m[1].replace(",", "."));
  // 2) "dày X" không đơn vị
  const m2 = name.match(/(?:dày|day|độ\s*ly|do\s*ly)\s*([\d.,]+)/i);
  if (m2) return parseFloat(m2[1].replace(",", "."));
  // 3) Dạng AxBxC: số CUỐI là độ dày — cho tấm phẳng, bản mã, thép nhấn L/Z/U, VÀ xà gồ C
  //    VD: "400x400x20" → 20, "L125x75x8" → 8, "C120x47x15x2.4" → 2.4
  const nmLower = boDau(name).toLowerCase();
  const isPlateLike = /tờ/i.test(it.dvt || "") ||
    /ban\s*ma|^tam|tam\s|gan|chong truot|ke\s|con son|dau cot|chan cot|dau tru|noi keo|tang cung/i.test(nmLower);
  const isNhan = /^[lzu]\s*[\(]?\d+|nhan/i.test(boDau(name));
  const isXaGoC = /xa\s*go|^c\d{2,3}/i.test(nmLower); // xà gồ C
  const parts = name.match(/(\d+(?:[.,]\d+)?)/g);
  if (parts && parts.length >= 3 && (isPlateLike || isNhan || isXaGoC)) {
    const last = parseFloat(parts[parts.length - 1].replace(",", "."));
    if (last > 0 && last <= 100) return last;
  }
  return 0;
};
const loaiOf = (it) => {
  if (it.loai && LOAI_LABEL[it.loai]) return it.loai;
  const name = boDau(it.name).toLowerCase();
  const dvt  = boDau(it.dvt).toLowerCase();
  // TẤM/KE TRÒN: có Ø (hoặc "phi") + đường kính + độ dày "ly" → tấm tròn.
  //   (Phi tròn ĐẶC bán theo cây KHÔNG có "ly" → vẫn là thep_cay bên dưới.)
  if (/(?:ø|phi)\s*\d+/i.test(name) && /\d+\s*l[yi]\b/i.test(name)) return "tam_tron";
  // KE (thép ke) — tính khối lượng GIỐNG tấm phẳng, đơn vị tờ
  if (/^ke\b|^ke\s|^ke\d/i.test(name)) return "ke";
  // Thép nhấn Z/L/U gân (L nhấn gân, Z nhấn gân, xà gồ Z gân...)
  if (/nhan.*gan|gan.*nhan/i.test(name)) return "tam_nhan_gan";
  if (/xa\s*go\s*[zlu].*gan|xa\s*go.*gan/i.test(name)) return "tam_nhan_gan";
  // Thép góc L kiểu Trung Quốc — CHECK TRƯỚC tam_nhan để tránh nhầm
  if (/thep\s*goc|goc\s*l\s*\d/i.test(name)) return "thep_hinh";
  // Thép nhấn Z/L/U trơn + xà gồ Z (cùng công thức)
  if (/nhan/i.test(name)) return "tam_nhan";
  if (/^[lz]\s*[\(]?\d+\s*[x×]\s*\d+\s*[x×]\s*\d/i.test(name)) return "tam_nhan";
  if (/^thep\s*[lz]\s*[\(]?\d+\s*[x×]\s*\d+\s*[x×]\s*\d/i.test(name)) return "tam_nhan";
  if (/xa\s*go\s*z|^z\s*\d{2,3}(?:\s|$)|^thep\s*z\s*\d{2,3}(?:\s|$)/i.test(name)) return "xa_go"; // xà gồ Z (purlin) → barem Z
  if (/xa\s*go\s*[lu]/i.test(name)) return "tam_nhan"; // xà gồ L/U trơn → nhập băng tay
  // Tấm gân / chống trượt (chỉ khi khách GHI RÕ "gân"/"chống trượt"/"nhám")
  if (/gan|chong truot|nham/i.test(name)) return "tam_gan";
  // Tấm phẳng + thép la (thép dẹt flat bar): cùng công thức t×W×L×7,85
  // "thép la", "la 20x5", "la 50mm", "flat bar"
  if (/^la\s*\d|thep\s*la|flat\s*bar/i.test(name)) return "tam_phang";
  // Nhận "tấm" và các biến thể OCR/viết tay: Tẩm→tam, Tầm→tam, Tẩm→tam
  // Cũng nhận "Tem", "Tăm" nếu AI đọc sai chữ viết tay
  const isTam = /to\b|^tam|^tole|^ton|\btam\b/i.test(dvt)
    || /^tam|^tole|^ton|\btam\b/i.test(name)
    || /^t[aăâ]m\b/i.test(name);  // biến thể: tăm, tâm, tam
  if (isTam) return "tam_phang";
  // Gia công
  if (/lo|duong|cai|con/i.test(dvt)) return "gia_cong";
  // Thép hình: I/H/U/V + số, prefix "thép"/"sắt"/"thép hình"
  if (/(?:^|thep\s*(?:hinh\s*)?|sat\s*)[ihuv]\s*\d/i.test(name)) return "thep_hinh";
  // Xà gồ C (C100, C200... hoặc tên có "xà gồ")
  if (/xa\s*go|^c\s*\d{2,3}(?:\s|$)|^thep\s*c\s*\d/i.test(name)) return "xa_go";
  return "thep_cay";
};
// Nhận diện thép ray (tên có "ray" hoặc ký hiệu P12/P15/P22/P24/P30/P43)
const RAY_CODES = ["P12","P15","P18","P22","P24","P30","P43"];
const isRay = (it) => {
  const nm = boDau(it.name).toUpperCase().replace(/\s/g,"");
  if (/RAY/.test(nm)) return true;
  // P + số nhưng KHÔNG phải phi (phi có ký hiệu Ø)
  const m = nm.match(/(?:^|RAY|THEP)P(\d{2})/);
  if (m && RAY_CODES.includes("P" + m[1])) return true;
  return false;
};

const dvtOf = (it) => {
  if (it.dvt && it.dvt.trim()) return it.dvt;
  const lo = loaiOf(it);
  if (!lo || !it.name || !it.name.trim()) return "";
  return dvtDefault(lo);
};

// Số lượng hiển thị trên BÁO GIÁ GỬI KHÁCH (preview / PDF / Excel):
// LUÔN hiển thị tổng số cây/tờ của mặt hàng — kể cả khi ĐVT là kg
// (để khách biết số lượng cây/tờ thực tế, dù giá tính theo kg).
const qtyDisp = (it) => it.qty;

// Nhãn gợi ý chi tiết hiển thị dưới tên — phản ánh đúng dạng cụ thể đã nhận diện
const loaiHint = (it) => {
  const lo = loaiOf(it);
  const nm = boDau(it.name || "").toLowerCase();
  const rongParts = String(it.rong || "").match(/\d+(?:[.,]\d+)?/g) || [];
  const isHinhThang = rongParts.length >= 2 &&
    parseFloat(rongParts[0].replace(",",".")) !== parseFloat(rongParts[1].replace(",","."));
  if (lo === "tam_phang" && isHinhThang) return "Tấm hình thang (rộng = TB 2 cạnh)";
  if (lo === "tam_phang" && /thep\s*la|^la\s*\d|flat/i.test(nm)) return "Thép la (tính như tấm phẳng)";
  if (lo === "tam_phang") return "Thép tấm phẳng";
  if (lo === "ke") {
    if (isHinhThang) return "Ke hình thang (tính như tấm)";
    return "Ke (tính như tấm phẳng)";
  }
  if (lo === "tam_tron") return "Tấm tròn Ø (π·r²·dày·7,85)";
  if (lo === "tam_gan") return "Tấm gân / chống trượt";
  if (lo === "tam_nhan") {
    if (/xa\s*go/i.test(nm)) return "Xà gồ Z/L/U (= thép nhấn)";
    return "Thép nhấn Z/L/U (trơn)";
  }
  if (lo === "tam_nhan_gan") return "Thép nhấn Z/L/U (gân)";
  if (lo === "thep_hinh") {
    if (/thep\s*goc|goc\s*l/i.test(nm)) return "Thép góc L (cán nóng)";
    if (/^v\d|^thep\s*v\d/i.test(nm)) return "Thép hình V (góc đều)";
    if (/^i\d|^thep\s*i\d/i.test(nm)) return "Thép hình I";
    if (/^h\d|^thep\s*h\d/i.test(nm)) return "Thép hình H";
    if (/^u\d|^thep\s*u\d/i.test(nm)) return "Thép hình U";
    return "Thép hình I/H/U/V";
  }
  if (lo === "thep_cay") {
    if (/(?:phi|\u00D8)\d|tron/i.test(nm)) return "Phi tròn / sắt tròn đặc";
    if (/vuong/i.test(nm)) return "Vuông đặc";
    if (/^p\d|ray/i.test(nm)) return "Thép ray";
    return "Thép cây (hộp/ống/phi/ray)";
  }
  if (lo === "xa_go") return "Xà gồ C/Z (bán theo mét)";
  if (lo === "gia_cong") return "Gia công (cắt / đục lỗ)";
  return LOAI_LABEL[lo] || lo;
};

// Loại hàng nào có thể bán theo nhiều đơn vị → hiện dropdown thay vì input
const dvtOptions = (it) => {
  if (!it.name || !it.name.trim()) return null; // chưa có tên → không hiện dropdown
  const lo = loaiOf(it);
  if (lo === "thep_hinh" || lo === "thep_cay") return ["cây", "kg"];
  if (lo === "tam_phang" || lo === "tam_gan" || lo === "tam_nhan" || lo === "tam_nhan_gan" || lo === "ke" || lo === "tam_tron") return ["tờ", "kg"];
  if (lo === "xa_go") return ["cây", "m"];
  return null;
};
const nameDisp = (it) => {
  const lo = loaiOf(it);
  // Chuẩn hóa chính tả: "3ly" "3lyx" → "3li"
  const normName = it.name
    .replace(/(\d+(?:[.,]\d+)?)\s*ly[x]?\b/gi, "$1li");

  // Helper: ghép (tên nhà máy) vào cuối nếu có src và tên chưa có
  const withSrc = (base) => {
    if (!it.src || !SRC_LABEL[it.src]) return base;
    // Nếu tên đã chứa (src) hoặc tên nhà máy → không lặp
    if (base.includes(`(${it.src})`) || base.includes(SRC_LABEL[it.src])) return base;
    return `${base} (${it.src})`;
  };

  if (isPlateType(lo)) {
    const w = parseDim(it.rong), l = parseDim(it.dai), t = thicknessOf(it);
    // Phát hiện hình thang: ô Rộng chứa 2 số khác nhau (VD "485-254")
    const rongParts = String(it.rong || "").match(/\d+(?:[.,]\d+)?/g) || [];
    const isHinhThang = rongParts.length >= 2 &&
      parseFloat(rongParts[0].replace(",",".")) !== parseFloat(rongParts[1].replace(",","."));
    if (w > 0 && l > 0) {
      let textPart = normName
        .replace(/[\d.,]+\s*[xX×]\s*[\d.,]+(\s*[xX×]\s*[\d.,]+)?/g, "")
        .replace(/\d+(?:[.,]\d+)?\s*li[x]?\b/gi, "")
        .replace(/\d+(?:[.,]\d+)?\s*mm\b/gi, "")
        .replace(/hinh\s*thang/gi, "")  // bỏ "hình thang" cũ nếu có để không lặp
        .replace(/\(\s*\)/g, "")         // bỏ ngoặc rỗng () còn sót lại
        .replace(/\(\s*[xX×]\s*\)/g, "") // bỏ ngoặc chỉ còn "( x )"
        .replace(/\s+/g, " ").trim().replace(/[-–\s]+$/, "").trim();
      let label = textPart || normName;
      // Nếu là hình thang và loại tấm phẳng → đổi nhãn thành "Tấm hình thang"
      if (isHinhThang && lo === "tam_phang") {
        // Bỏ chữ "Tấm"/"Tấm phẳng" ở đầu (dùng boDau để khớp dấu) rồi gắn "Tấm hình thang"
        const labelNoDau = boDau(label).toLowerCase();
        let rest = label;
        const mTam = labelNoDau.match(/^t[aâă]m(\s+ph[aâă]ng)?\s*/);
        if (mTam) rest = label.slice(mTam[0].length).trim();
        label = ("Tấm hình thang " + rest).replace(/\s+/g, " ").trim();
      }
      const thickLabel = t > 0 ? ` ${Number.isInteger(t) ? t : t}li` : "";
      // Hình thang: hiện rõ 2 cạnh "(485 x 254 → TB 369.5 x 8000)" gọn lại "(485-254 x 8000)"
      if (isHinhThang) {
        const r1 = rongParts[0], r2 = rongParts[1];
        return `${label}${thickLabel} (${r1}-${r2} x ${l})`;
      }
      return `${label}${thickLabel} (${w} x ${l})`;
    }
    return normName;
  }
  // Thép hình, thép cây, xà gồ → ghép (src) vào cuối
  return withSrc(normName);
};
const soMetOf = (it) => {
  const v = parseDim(it.soMet);
  if (v > 0) return v;
  const m = String(it.name || "").match(/x\s*(\d+(?:[.,]\d+)?)\s*m\b/i);
  if (m) return parseFloat(m[1].replace(",", ".")) * 1000;
  // Fallback 6000 cho mọi loại cây (thép hình, thép cây, xà gồ)
  // Đây chỉ là GIÁ TRỊ MẶC ĐỊNH — nhân viên vẫn gõ đè được
  const lo = loaiOf(it);
  if (isSectionType(lo)) return 6000;
  return 0;
};
// ── Khớp ĐÚNG độ dày (li) cho thép hình I/H/U/V ──────────────
// Quy tắc ngành: khách nhắn "V90x90x9" thì số thứ 3 (9) là ĐỘ DÀY (li).
// Phải tra đúng dòng barem có day === 9, KHÔNG được lấy li mỏng nhất.
// Áp dụng chung cho V/I/H/U khi tên ghi dạng X[A]x[B]x[t] hoặc X[A]x[t].
// Trả về row barem khớp độ dày; null nếu tên không ghi li hoặc không có dòng khớp.
function findShapeRowByThickness(it) {
  const nm = boDau(it.name).toUpperCase().replace(/\s/g, "");
  // V90x90x9 | V90X9 | U100x50x5 ... → base = ký hiệu + cạnh đầu, t = số li cuối
  const m = nm.match(/([IHUV])(\d{2,3})(?:X\d{2,3})?X(\d{1,2}(?:[.,]\d+)?)(?:LI)?(?:$|[^\dX])/)
        || nm.match(/([IHUV])(\d{2,3})(?:X\d{2,3})?X(\d{1,2}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const base = (m[1] + m[2]).toUpperCase();          // "V90"
  const t = parseFloat(String(m[3]).replace(",", "."));
  if (!(t > 0)) return null;
  const rows = POSCO_DATA.filter(r => {
    const rn = r.ten.toUpperCase().replace(/\s/g, "");
    return rn === base || rn.startsWith(base);
  });
  if (!rows.length) return null;
  const cand = rows.filter(r => Number(r.day) === t);
  if (!cand.length) return null;                     // không có li này trong barem → để logic cũ xử lý
  const src = String(it.src || "");
  return (src && cand.find(r => r.src === src)) || cand[0];
}

// ── MÃ HÀNG CÓ NHIỀU SỐ KG (U/I) → BẮT USER CHỌN ────────────
// Khi gặp các mã này: khoanh đỏ ô kg/cây + hiện dropdown + nhắc chọn.
// MỖI LOẠI = 1 BẬC độ dày, lưu kg6 = kg/cây ở CÂY 6m (số chuẩn từ công ty).
//   kg/m = kg6 / 6.  kg/cây = kg/m × chiều dài cây (6m/12m chọn riêng ở cột "Dài cây").
//   → đổi 6m↔12m thì kg/cây TỰ nhân lại, không khai báo trùng.
const _kgCay6 = (kgm) => Math.round(kgm * 6 * 100) / 100; // kg/m → kg/cây 6m
const WEIGHT_OPTIONS = {
  U65:  [ {kg6:17.7}, {kg6:22.3} ],
  U80:  [ {kg6:24, code:"Mỏng"}, {kg6:27.5, code:"Vừa"}, {kg6:30, code:"Trung"}, {kg6:33, code:"Dày"} ],
  U100: [ {kg6:34}, {kg6:40}, {kg6:45}, {kg6:48}, {kg6:51} ],
  U120: [ {kg6:45}, {kg6:51}, {kg6:55}, {kg6:58} ],
  U140: [ {kg6:55}, {kg6:65}, {kg6:71} ],
  U160: [ {kg6:76}, {kg6:81} ],
  U200: [ {kg6:_kgCay6(18.2)}, {kg6:_kgCay6(24)} ],
  U250: [ {kg6:_kgCay6(23)}, {kg6:_kgCay6(25)} ],
  I100: [ {kg6:45}, {kg6:48} ],
  I120: [ {kg6:55}, {kg6:58} ],
  I150: [ {kg6:75}, {kg6:77}, {kg6:80} ],
  I200: [ {kg6:116}, {kg6:120} ],
};
// Bảng MÀU phân biệt từng số kg (nhẹ → nặng). Đủ cho tới 6 lựa chọn (I150).
const TIER_PALETTE = ["#15803d", "#0369a1", "#b45309", "#be123c", "#6d28d9", "#a21caf"];
// Hàng I150/I200… chỉ khai báo bậc độ dày (6m); chiều dài 6m/12m chọn riêng,
//   kg/cây = kg/m × chiều dài nên tự ra đúng cho cả hai.
const TIER_LADDER = {
  2: ["Mỏng", "Dày"],
  3: ["Mỏng", "Trung", "Dày"],
  4: ["Mỏng", "Vừa", "Trung", "Dày"],
  5: ["Mỏng", "Vừa", "Trung", "Dày", "Rất dày"],
  6: ["Mỏng", "Vừa", "Trung", "Dày", "Rất dày", "Siêu dày"],
};
const enrichOpts = (opts) => {
  const ladder = TIER_LADDER[opts.length];
  return opts.map((o, i) => ({
    ...o,
    kgM: Math.round((o.kg6 / 6) * 10000) / 10000, // kg/m (4 số lẻ để kg/cây nhân lại tròn đúng)
    color: o.color || TIER_PALETTE[i % TIER_PALETTE.length],
    code: o.code || (ladder ? ladder[i] : String(o.kg6)),
  }));
};
// Tra theo KEY chuẩn ("U100","I150"...) — dùng cho bảng tra barem
function weightOptionsByKey(key) {
  const m = String(key || "").toUpperCase().match(/^([UI])(\d{2,3})/);
  if (!m) return null;
  const opts = WEIGHT_OPTIONS[m[1] + m[2]];
  return opts ? enrichOpts(opts) : null;
}
// Tra theo TÊN mặt hàng (dùng cho ô kg/cây trong bảng nhập)
function weightOptionsFor(it) {
  // POSCO có barem riêng đúng sẵn → KHÔNG áp dụng cơ chế "nhiều bậc" (không bắt chọn).
  // Nhận POSCO cả khi gõ tay trong TÊN (vd "thép i150 posco"), không chỉ ở ô nguồn.
  const nmRaw = boDau(it.name || "").toUpperCase();
  if (String(it.src || "") === "POSCO" || /\bPOSCO\b|\bPOS\b/.test(nmRaw)) return null;
  let nm = nmRaw.replace(/\s/g, "");
  nm = nm.replace(/^(THEPHINH|THEP|SAT|HINH|GOC)/, "");
  const m = nm.match(/^([UI])(\d{2,3})/);
  if (!m) return null;
  return weightOptionsByKey(m[1] + m[2]);
}

// ── "U120 55k" = thép U120 loại 55 kg/CÂY (chữ k/kg = bậc kg/cây, KHÔNG phải kích thước) ──
// Lấy số kg/cây mà khách ghi sau ký tự k/kg. Chỉ áp dụng cho hàng U/I (nhiều bậc).
//   "U120 55k" / "U120x55K" / "U120 55kg/cây" → 55
const gradeHintKgCay = (name) => {
  const s = boDau(String(name || "")).toLowerCase();
  if (!/^\s*(?:thep\s*)?[ui]\s*\d/.test(s)) return 0; // chỉ U/I
  const m = s.match(/(\d{2,3})\s*k(?:g)?\b/); // số đứng ngay trước k/kg
  return m ? parseFloat(m[1]) : 0;
};
// Bỏ phần "55k"/"x55K"/"55kg/cây" khỏi tên → còn "Thép U120"
const stripGradeHint = (name) => String(name || "")
  .replace(/\s*x?\s*\d{2,3}\s*k(?:g)?(?:\s*\/\s*c[aâ]y)?\b/gi, "")
  .replace(/\s+/g, " ").trim();
// Với hàng U/I nhiều bậc + có gợi ý kg/cây → trả {kgM, soMet} của bậc khớp; null nếu không khớp bậc chuẩn
const matchGradeFromHint = (it, hintKgCay) => {
  const wopts = weightOptionsFor(it);
  if (!wopts) return null;
  const hint = hintKgCay > 0 ? hintKgCay : gradeHintKgCay(it.name);
  if (!(hint > 0)) return null;
  const opt = wopts.find((o) => Math.abs(o.kg6 - hint) < 0.6); // khớp đúng bậc kg/cây 6m
  return opt ? { kgM: String(opt.kgM) } : null;
};

const autoKgM = (it) => {
  const lo = loaiOf(it);

  // Xà gồ C/Z: tra băng từ barem + độ dày từ tên → tính kg/m
  if (lo === "xa_go") {
    const nm = boDau(it.name).toUpperCase().replace(/\s/g,"");
    const mC = nm.match(/([CZ])(\d{2,3})/);
    if (mC) {
      const bang = lookupBangC(mC[1] + mC[2]);
      const day = thicknessOf(it);
      if (bang > 0 && day > 0) return kgmXaGoC(bang, day);
    }
    return 0;
  }

  if (lo === "thep_hinh" || lo === "thep_cay") {
    const nm = boDau(it.name).toUpperCase().replace(/\s/g,"");
    const src = String(it.src || "");
    // Thép ray P12/P15/P22...: tra kg/m từ barem nhóm R
    const mRay = nm.match(/(?:^|RAY|THEP)P(\d{2})/);
    if (mRay && ["P12","P15","P18","P22","P24","P30","P43"].includes("P"+mRay[1])) {
      const key = "P" + mRay[1];
      const rows = POSCO_DATA.filter(r => r.g === "R" && r.ten.toUpperCase() === key);
      if (rows.length) { const m = src ? rows.find(r=>r.src===src) : null; return (m||rows[0]).kgm; }
    }
    // Phi / sắt tròn: tính theo kg/CÂY, không có kg/m → để kgCayCalc xử lý riêng
    if (/(?:PHI|\u00D8)\d/.test(nm) || /TRON(?:DAC)?\d/.test(nm)) return 0;
    // V ngắn thương mại: V3→V30, V4→V40, V5→V50...
    const mVshort = nm.match(/(?:^|THEP|HINH|SAT)V(\d)(?![\d])/);
    if (mVshort) {
      const r = lookupKgM("V" + mVshort[1] + "0", src);
      if (r > 0) return r;
    }
    // I, H, U, V thông thường
    // Thép góc L kiểu "L100x63x10", "Thép góc L160x100x10" (A x B x t)
    // Công thức chuẩn thép góc: kg/m = (A + B − t) × t × 0.00785
    const mLgoc = nm.match(/L(\d{2,3})X(\d{2,3})X(\d{1,2}(?:[.,]\d+)?)/);
    if (mLgoc) {
      const A = parseFloat(mLgoc[1]), B = parseFloat(mLgoc[2]), t = parseFloat(String(mLgoc[3]).replace(",","."));
      if (A > 0 && B > 0 && t > 0) {
        const kgm = (A + B - t) * t * 0.00785;
        return Math.round(kgm * 100) / 100;
      }
    }
    const mShape = nm.match(/([IHUV])(\d{2,3})/);
    if (mShape) {
      // (1) Khách ghi đủ độ dày (V90x90x9) → tra ĐÚNG li, không lấy li mỏng nhất
      const rowT = findShapeRowByThickness(it);
      if (rowT) return rowT.isCay ? 0 : rowT.kgm; // isCay → để donTrongCalc tính kg/cây
      // (2) Không ghi li → giữ hành vi cũ (khớp theo ký hiệu, lấy dòng đầu)
      // Kiểm tra barem: nếu isCay=true thì kgm là kg/cây không phải kg/m
      // → trả 0 để donTrongCalc dùng kgCayCalc thay vì kgm×len
      const rows = POSCO_DATA.filter(r => {
        const rn = r.ten.toUpperCase().replace(/\s/g,"");
        const key = (mShape[1]+mShape[2]).toUpperCase();
        return rn === key || rn.startsWith(key);
      });
      const row = src ? rows.find(r=>r.src===src) : rows[0];
      if (row && row.isCay) return 0; // kg/cây → kgCayCalc xử lý
      return lookupKgM(mShape[1] + mShape[2], src);
    }
  }
  return 0;
};

// ── Công thức ước tính kg/m khi KHÔNG có trong barem ─────────
// Trả về { kgm, estimated: true } nếu phải ước tính
// Dùng công thức thép 7.85 g/cm³ dựa vào kích thước trong tên
function estimateKgM(it) {
  const nm = String(it.name || "").toUpperCase().replace(/\s/g,"");
  // Phi tròn đặc: kg/m = D² × 0.006165 (D = đường kính mm)
  // = π/4 × D² × 7850 / 1.000.000 (D mm → m)
  const mPhi = nm.match(/(?:PHI|Ø|\u00D8)(\d{2,3})/);
  if (mPhi) {
    const d = parseFloat(mPhi[1]);
    const kgm = d * d * 0.006165;
    return { kgm: Math.round(kgm * 1000) / 1000, estimated: true };
  }
  // I/H/U/V: dùng số chiều cao H (mm) làm ước lượng tuyến tính
  // Tham chiếu: H100≈17, H200≈50, H300≈94 → kgm ≈ H * 0.31
  const mH = nm.match(/^(?:THEP\s*)?H(\d{2,3})/);
  if (mH) { const h = parseFloat(mH[1]); return { kgm: Math.round(h * 0.31 * 10)/10, estimated: true }; }
  const mI = nm.match(/^(?:THEP\s*)?I(\d{2,3})/);
  if (mI) { const h = parseFloat(mI[1]); return { kgm: Math.round(h * 0.355 * 10)/10, estimated: true }; }
  const mU = nm.match(/^(?:THEP\s*)?U(\d{2,3})/);
  if (mU) { const h = parseFloat(mU[1]); return { kgm: Math.round(h * 0.127 * 10)/10, estimated: true }; }
  const mV = nm.match(/^(?:THEP\s*)?V(\d{2,3})/);
  if (mV) { const a = parseFloat(mV[1]); return { kgm: Math.round(a * a * 0.00785 * 0.12 * 10)/10, estimated: true }; }
  return { kgm: 0, estimated: false };
}

// Tra kg/m: ưu tiên nhập tay → barem → ước tính
const autoKgMResult = (it) => {
  if (has(it.kgM)) return { kgm: num(it.kgM), estimated: false };
  const fromBarem = autoKgM(it);
  if (fromBarem > 0) return { kgm: fromBarem, estimated: false };
  return estimateKgM(it);
};
const kgMOf = (it) => autoKgMResult(it).kgm;
const isKgMEstimated = (it) => !has(it.kgM) && autoKgM(it) === 0 && estimateKgM(it).kgm > 0;

// Tra kg/cây cho vuông đặc từ barem nhóm Q
function lookupKgCayVuong(it) {
  const nm = boDau(it.name).toUpperCase().replace(/\s/g,"");
  // Nhận: "V10x10", "10x10", "vuongdac10", "VD10"
  const mV = nm.match(/(?:VUONGDAC|VD|V)?(\d{2})X(\d{2})/) || nm.match(/(\d{2})X(\d{2})/);
  if (!mV) return 0;
  const key = "V" + mV[1] + "x" + mV[2];
  const rows = POSCO_DATA.filter(r => r.g === "Q" && r.ten.toUpperCase() === key.toUpperCase());
  if (!rows.length) return 0;
  return rows[0].kgm; // kg/cây
}

// Tra kg/cây trực tiếp từ barem cho phi tròn / sắt tròn
function lookupKgCayPhi(it) {
  const nm = boDau(it.name).toUpperCase().replace(/\s/g,"");
  // Nhận: Ø20, phi20, tròn20, sắt tròn 20, thép tròn 20
  const mPhi = nm.match(/(?:PHI|\u00D8|TRON(?:DAC)?)(\d{1,3})/);
  if (!mPhi) return 0;
  const key = "\u00D8" + mPhi[1];
  // Mác đọc từ TÊN ưu tiên hơn src: SC45/S45C → SC45; SS400 → SS400
  let src = String(it.src || "");
  if (/S45C|SC45/.test(nm)) src = "SC45";
  else if (/SS400/.test(nm)) src = "SS400";
  const rows = POSCO_DATA.filter(r => r.ten.toUpperCase() === key.toUpperCase());
  if (!rows.length) return 0;
  if (src) { const m = rows.find(r => r.src === src); if (m) return m.kgm; }
  return rows[0].kgm;
}

const donTrongCalc = (it) => {
  const lo = loaiOf(it);
  if (isPlateType(lo)) {
    const t = thicknessOf(it);
    // TẤM TRÒN: khối lượng = π × (Ø/2)² × dày × 7,85 (Ø lấy từ ô Rộng, hoặc từ tên nếu trống)
    if (lo === "tam_tron") {
      let dMm = parseDim(it.rong);
      if (!(dMm > 0)) { const m = boDau(it.name || "").match(/(?:ø|phi)\s*(\d+(?:[.,]\d+)?)/i); if (m) dMm = parseFloat(m[1].replace(",", ".")); }
      const d = dMm / 1000; // đường kính (m)
      return t > 0 && d > 0 ? t * Math.PI * (d / 2) ** 2 * 7.85 : 0;
    }
    const w = parseDim(it.rong) / 1000, l = parseDim(it.dai) / 1000;
    if (t > 0 && w > 0 && l > 0) {
      if (lo === "tam_phang" || lo === "ke") return t * w * l * 7.85; // Ke tính y như tấm phẳng
      if (lo === "tam_gan")   return t * w * l * 7.85 + w * l * 3;
      // Z/L/U nhấn trơn: t × dai × tổng_cạnh × 7.85 (rong = tổng chiều rộng các cạnh)
      if (lo === "tam_nhan")     return t * l * w * 7.85;
      // Z/L/U nhấn gân: + dai × tổng_cạnh × 3
      if (lo === "tam_nhan_gan") return t * l * w * 7.85 + l * w * 3;
    }
    return 0;
  }
  if (lo === "gia_cong") return 0;
  // Hàng cây: đơn trọng 1 cây = kg/cây (ưu tiên nhập tay)
  if (has(it.kgCayManual)) return num(it.kgCayManual);
  // Hàng nhiều bậc độ dày (U/I) đã chọn kg/m → đơn trọng = kg/m × chiều dài cây.
  // (Phải đặt TRƯỚC các bước tra barem isCay để không lấy nhầm số seed cũ, vd U65 seed 17,70.)
  if (weightOptionsFor(it) && has(it.kgM)) {
    const len = soMetOf(it) / 1000;
    return num(it.kgM) * len;
  }
  // Phi tròn: lấy kg/cây trực tiếp từ barem
  const nmU = boDau(it.name).toUpperCase();
  // Phi tròn / sắt tròn / thép tròn đặc
  if (/(?:PHI|\u00D8)\d/.test(nmU) || /TRON(?:DAC)?\d/.test(nmU)) { const k = lookupKgCayPhi(it); if (k > 0) return k; }
  // Vuông đặc: kg/cây từ barem
  if (/VUONG|VUONGDAC|\d{2}X\d{2}/.test(nmU)) { const k = lookupKgCayVuong(it); if (k > 0) return k; }
  // Thép hình isCay (VD: V40x40x3, U65L): kgm là kg/cây trực tiếp
  const rowTC = findShapeRowByThickness(it);
  if (rowTC && rowTC.isCay) return rowTC.kgm; // khớp đúng li
  const mShapeC = nmU.match(/([IHUV])(\d{2,3})/);
  if (mShapeC) {
    const rows = POSCO_DATA.filter(r => {
      const rn = r.ten.toUpperCase().replace(/\s/g,"");
      const key = (mShapeC[1]+mShapeC[2]).toUpperCase();
      return rn === key || rn.startsWith(key);
    });
    const src = String(it.src || "");
    const row = src ? rows.find(r=>r.src===src) : rows[0];
    if (row && row.isCay) return row.kgm; // kg/cây trực tiếp
  }
  const kgm = kgMOf(it), len = soMetOf(it) / 1000;
  return kgm > 0 && len > 0 ? kgm * len : 0;
};
const donTrongDisp = (it) =>
  isPlateType(loaiOf(it))
    // Tấm/tờ: đơn trọng = kg/tờ nhập tay (dtManual) hoặc tính theo kích thước
    ? (has(it.dtManual) ? num(it.dtManual) : donTrongCalc(it))
    // Hàng cây: đơn trọng = kg/cây (kgCayManual / multi-kg / barem) qua donTrongCalc.
    //   KHÔNG dùng dtManual vì đó là ô của TẤM — tránh số tổng KL cũ bị kẹt làm sai đơn trọng.
    : donTrongCalc(it);
// kg/cây tự tính
const kgCayCalc = (it) => {
  const nmU = boDau(it.name).toUpperCase();
  // Phi tròn: lấy kg/cây trực tiếp từ barem (không nhân chiều dài)
  if (/(?:PHI|\u00D8)\d/.test(nmU) || /TRON(?:DAC)?\d/.test(nmU)) {
    return lookupKgCayPhi(it);
  }
  const lo = loaiOf(it);
  if (lo === "thep_hinh" || lo === "thep_cay" || lo === "xa_go") {
    const kgm = kgMOf(it), len = soMetOf(it) / 1000;
    return kgm > 0 && len > 0 ? kgm * len : 0;
  }
  return donTrongCalc(it);
};
// kg/cây hiển thị: ưu tiên nhập tay → tự tính
const kgCayDisp = (it) => (has(it.kgCayManual) ? num(it.kgCayManual) : kgCayCalc(it));
const tongKLDisp = (it) => (has(it.klManual) ? num(it.klManual) : num(it.qty) * donTrongDisp(it));
const ttBase = (it) => {
  const dvt = dvtOf(it);
  const lo = loaiOf(it);
  const gu = giaUnitOf(lo, dvt);
  const p = num(it.donGia);
  // Bán theo kg với giá đ/kg → luôn tính theo TỔNG KHỐI LƯỢNG
  // (SL là số cây/tờ, tổng KL = SL × đơn trọng)
  if (gu === "kg" || dvt === "kg") return tongKLDisp(it) * p;
  // Bán theo mét (xà gồ) → SL × chiều dài × giá/m
  if (gu === "m") return num(it.qty) * (soMetOf(it) / 1000) * p;
  // Bán theo cây/tờ/cái → SL × giá
  return num(it.qty) * p;
};
const thanhTienDisp = (it) => (has(it.ttManual) ? num(it.ttManual) : ttBase(it));
const soMetCell = (it) => {
  const v = parseDim(it.soMet);
  if (v > 0) return v;
  if (isSectionType(loaiOf(it)) && it.name && it.name.trim()) return soMetOf(it);
  return "";
};
// Hiển thị số mét cho báo giá gửi khách:
// - Thép hình/cây/xà gồ → "6m", "12m" (chiều dài cây)
// - Thép tấm → trống (kích thước đã hiện trong tên: "Tấm phẳng 3li (1500 x 6000)")
const soMetText = (it) => {
  const lo = loaiOf(it);
  if (isPlateType(lo)) return ""; // tấm không cần cột số mét riêng
  const v = soMetCell(it);
  if (v === "" || v == null) return "";
  const mm = num(v);
  if (mm <= 0) return "";
  const m = mm / 1000;
  const s = Number.isInteger(m) ? String(m) : m.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
  return s + "m";
};
const giaText = (it) => {
  const gu = giaUnitOf(loaiOf(it), dvtOf(it));
  const suffix = gu === "kg" ? "/kg" : gu === "m" ? "/m" : gu === "cay" ? "/cây" : gu === "cai" ? "/cái" : "/cây";
  return fmt(it.donGia) + suffix;
};

function QuotePreview({ company, customer, items, place, dateObj, quoter, terms, logo }) {
  const border = "1px solid #000";
  const th = { border, padding: "4px 5px", fontWeight: 700, fontSize: 12 };
  const td = (a = "center") => ({ border, padding: "3px 5px", textAlign: a, fontSize: 12 });
  const totalKL = items.reduce((s, it) => s + tongKLDisp(it), 0);
  const totalTien = items.reduce((s, it) => s + thanhTienDisp(it), 0);
  return (
    <div style={{ fontFamily: "'Times New Roman', Times, serif", color: "#000", background: "#fff", padding: "14px 18px", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid " + RED, paddingBottom: 8 }}>
        <img src={logo} alt="logo" style={{ width: 60, height: 60, objectFit: "contain", marginRight: 12 }} />
        <div style={{ flex: 1, lineHeight: 1.4 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: RED }}>{company.name}</div>
          <div style={{ fontSize: 12 }}>Địa chỉ kho: {company.addressWarehouse}</div>
          <div style={{ fontSize: 12 }}>ĐT/Zalo: {company.phone}</div>
          {company.email && <div style={{ fontSize: 12 }}>Email: {company.email}</div>}
        </div>
        {(staffQR(quoter) || staffQR(company.signer)) && (
          <div style={{ textAlign: "center", marginLeft: 12, flexShrink: 0 }}>
            <img src={staffQR(quoter) || staffQR(company.signer)} alt="Zalo QR" style={{ width: 90, height: 90, display: "block", objectFit: "contain" }} />
            <div style={{ fontSize: 9, color: "#333", marginTop: 1 }}>Zalo: {staffQR(quoter) ? staffKey(quoter) : staffKey(company.signer)}</div>
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", fontStyle: "italic", fontSize: 12, margin: "6px 0 2px" }}>{place}, ngày {dateObj.d} tháng {dateObj.m} năm {dateObj.y}</div>
      {quoter ? <div style={{ textAlign: "right", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Người báo giá: {quoter}</div> : null}
      <div style={{ textAlign: "center", fontSize: 19, fontWeight: 800, marginBottom: 4 }}>BÁO GIÁ VÀ XÁC NHẬN ĐƠN ĐẶT HÀNG</div>
      {customer.name && <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Kính gửi: {customer.name}</div>}
      {customer.project ? <div style={{ textAlign: "center", fontSize: 12, marginBottom: 6 }}>Công trình: {customer.project}</div> : <div style={{ height: 4 }} />}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#eee" }}>
          <th style={th}>STT</th><th style={{ ...th, textAlign: "left" }}>Tên Mặt Hàng - Quy cách</th><th style={th}>ĐVT</th><th style={th}>Số mét</th>
          <th style={th}>Số lượng<br /><span style={{ fontWeight: 400, fontSize: 10 }}>(Cây/Tờ)</span></th><th style={th}>Đơn trọng<br /><span style={{ fontWeight: 400, fontSize: 10 }}>(Cây/Tờ)</span></th><th style={th}>Tổng KL</th><th style={th}>Đơn giá</th><th style={th}>Thành tiền</th><th style={th}>Ghi chú</th>
        </tr></thead>
        <tbody>
          {items.map((it, i) => {
            const gc = loaiOf(it) === "gia_cong";
            return (
              <tr key={it.id}>
                <td style={td()}>{i + 1}</td>
                <td style={td("left")}>{nameDisp(it)}</td>
                <td style={td()}>{dvtOf(it)}</td>
                <td style={td()}>{soMetText(it)}</td>
                <td style={td()}>{qtyDisp(it)}</td>
                <td style={td("right")}>{gc ? "" : fmtDt(donTrongDisp(it))}</td>
                <td style={td("right")}>{gc ? "" : fmt2(tongKLDisp(it))}</td>
                <td style={td("right")}>{giaText(it)}</td>
                <td style={td("right")}>{fmt(thanhTienDisp(it))}</td>
                <td style={{ ...td(), color: RED }}>{it.note}</td>
              </tr>
            );
          })}
          <tr style={{ fontWeight: 700 }}>
            <td style={td()} colSpan={5}>TỔNG CỘNG</td>
            <td style={td()}></td>
            <td style={td("right")}>{fmt2(totalKL)}</td>
            <td style={td()}></td>
            <td style={td("right")}>{fmt(totalTien)}</td>
            <td style={td()}></td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 12, marginTop: 6, whiteSpace: "pre-wrap" }}>{terms}</div>
      <div style={{ fontSize: 12 }}>HÀNG BÁN TẠI KHO CTY TẤN QUỐC</div>
      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 3 }}>Bằng chữ: {docTien(Math.round(totalTien))}</div>
      <div style={{ textAlign: "center", fontStyle: "italic", fontSize: 12, margin: "10px 0" }}>Cảm ơn sự hợp tác của Quý công ty, mong nhận được sự phản hồi từ Quý công ty</div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginTop: 6 }}>
        <div style={{ textAlign: "center", width: "45%" }}>XÁC NHẬN CỦA KHÁCH HÀNG</div>
        <div style={{ textAlign: "center", width: "45%" }}>CÔNG TY TNHH TẤN QUỐC<br /><span style={{ fontWeight: 400, fontStyle: "italic" }}>{company.signer}</span></div>
      </div>
    </div>
  );
}

// Dropdown chọn nhân viên + option "Khác" (tự điền)
function NhanVienSelect({ value, onChange, inputCls, list = NHAN_VIEN }) {
  const isInList = list.includes(value);
  const isKhac = value !== "" && !isInList;
  const selectVal = isInList ? value : (isKhac ? "__khac__" : "");
  return (
    <div>
      <select
        value={selectVal}
        onChange={(e) => {
          if (e.target.value === "__khac__") onChange(" ");
          else onChange(e.target.value);
        }}
        className={inputCls}
      >
        <option value="">— Chọn nhân viên —</option>
        {list.map((nv) => <option key={nv} value={nv}>{nv}</option>)}
        <option value="__khac__">Khác (tự điền)…</option>
      </select>
      {(isKhac || selectVal === "__khac__") && (
        <input
          autoFocus
          value={value.trim()}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls + " mt-1"}
          placeholder="Nhập tên nhân viên…"
        />
      )}
    </div>
  );
}

// ============================================================
// CHỐT ĐƠN — ghi nhận doanh thu vào hệ thống (Dashboard + Google Sheet)
// Tạo đơn từ báo giá hiện tại: "Chờ xử lý" hoặc "Chốt đơn" ngay.
// ============================================================
function ChotDonPanel({ customer, quoter, items, totalKL, totalTien, place, terms, editingId, onSaved }) {
  const [done, setDone] = useState("");
  const valid = items.length > 0 && totalTien > 0;

  const buildOrderItems = () =>
    items
      .filter((it) => num(thanhTienDisp(it)) > 0 || num(it.qty) > 0)
      .map((it) => ({
        name: nameDisp(it),
        category: categorize(loaiOf(it), nameDisp(it)),
        qty: num(it.qty),
        kl: num(tongKLDisp(it)),
        tien: num(thanhTienDisp(it)),
      }));

  const create = (status) => {
    if (!valid) return;
    const payload = {
      customer: customer.name || "Khách lẻ",
      project: customer.project || "",
      quoter,
      items: buildOrderItems(),
      totalKL: num(totalKL),
      total: num(totalTien),
      quote: { items, place, terms }, // lưu báo giá gốc để mở lại xem/sửa
    };
    if (editingId) {
      const patch = { ...payload, status };
      if (status === "won") patch.wonAt = new Date().toISOString();
      updateOrder(editingId, patch);
    } else {
      addOrder({ ...payload, status, paid: 0 });
    }
    setDone(status);
    if (onSaved) onSaved();
    setTimeout(() => setDone(""), 4000);
  };

  return (
    <div className="mt-4 rounded-2xl border border-cyan-100 bg-gradient-to-br from-white to-cyan-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold" style={{ color: NAVY }}>
            <ShoppingCart size={16} /> {editingId ? "Cập nhật đơn hàng" : "Ghi nhận đơn hàng"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {editingId && <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">ĐANG SỬA ĐƠN</span>}
            Khách: <b>{customer.name || "(chưa nhập)"}</b> · Doanh thu:{" "}
            <b style={{ color: RED }}>{fmtShort(totalTien)} đ</b> · {items.length} mặt hàng
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => create("pending")}
            disabled={!valid}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-40"
            title="Khách chưa chốt — đưa vào mục Chờ xử lý">
            <Clock size={15} /> {editingId ? "Lưu (chờ xử lý)" : "Lưu chờ xử lý"}
          </button>
          <button
            onClick={() => create("won")}
            disabled={!valid}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg,#1e3a8a,#06b6d4)" }}
            title="Khách đã chốt — ghi nhận doanh thu ngay">
            <CheckCircle2 size={15} /> Chốt đơn
          </button>
        </div>
      </div>
      {done && (
        <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={15} />
          {editingId
            ? (done === "won" ? "Đã cập nhật & chốt đơn." : "Đã cập nhật đơn (chờ xử lý). Mở trang Đơn hàng để xem.")
            : (done === "won"
              ? "Đã chốt đơn — doanh thu được ghi nhận vào Dashboard."
              : "Đã lưu vào mục Chờ xử lý. Vào trang Đơn hàng để chốt khi khách đồng ý.")}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("company");
  const [company, setCompany] = useState({ name: FIXED_NAME, addressWarehouse: "Đường 7A, KCN Hòa Khánh, TP. Đà Nẵng", phone: FIXED_PHONE, email: FIXED_EMAIL, zalo: "", taxCode: FIXED_MST, bank: "", signer: "" });
  const [logo, setLogo] = useState(DEFAULT_LOGO);
  const [saved, setSaved] = useState(false);
  const [customer, setCustomer] = useState({ name: "", project: "" });
  const [place, setPlace] = useState("Đà Nẵng");
  const [quoteDate, setQuoteDate] = useState(todayISO());
  const [quoter, setQuoter] = useState("");
  const [terms, setTerms] = useState("GIÁ CÓ VAT , tấm bán barem dung sai +- 0,3mm , dung sai độ ly +- 0,3mm , dung sai chiều dài 1-3mm");
  const [items, setItems] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [log, setLog] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showBarem, setShowBarem] = useState(false);
  const [baremSearch, setBaremSearch] = useState("");
  const [baremLen, setBaremLen] = useState(6000);
  const [baremGroup, setBaremGroup] = useState("");
  const [baremSrc, setBaremSrc] = useState("");
  const fileRef = useRef(null);
  const logoRef = useRef(null);
  // Danh sách nhân viên — lưu trong storage, sửa được từ giao diện (không cần đụng code)
  const [nhanVienList, setNhanVienList] = useState(NHAN_VIEN);
  const [newNV, setNewNV] = useState("");
  const [editingOrderId, setEditingOrderId] = useState(null);

  // Mở lại 1 báo giá (đơn) từ trang Đơn hàng để xem/sửa
  useEffect(() => {
    const loadQuote = () => {
      const req = takePendingQuote();
      if (!req || !req.order) return;
      const o = req.order;
      setCustomer({ name: o.customer || "", project: o.project || "" });
      if (o.quoter) setQuoter(o.quoter);
      // Ưu tiên ảnh chụp báo giá gốc; nếu đơn cũ chưa có -> tái tạo từ dòng đơn giản
      const raw = (o.quote && Array.isArray(o.quote.items) && o.quote.items.length)
        ? o.quote.items
        : (o.items || []).map((it) => ({
            id: uid(), name: it.name || "", loai: it.loai || "", src: "", day: "", dvt: "",
            rong: "", dai: "", soMet: "", kgM: "", kgCayManual: "", qty: num(it.qty),
            donGia: 0, note: "", dtManual: "", klManual: it.kl || "", ttManual: it.tien || "",
          }));
      setItems(raw);
      if (o.quote && o.quote.place) setPlace(o.quote.place);
      if (o.quote && o.quote.terms) setTerms(o.quote.terms);
      setEditingOrderId(o.id);
      setScreen("quote"); // màn hình có bảng mặt hàng sửa được + nút cập nhật đơn
      if (req.preview) setShowPreview(true);
    };
    loadQuote(); // nếu yêu cầu đã đặt trước khi Module 1 mount
    return onOpenQuote(loadQuote);
  }, []);

  useEffect(() => {
    (async () => {
      try { const r = await window.storage.get("company_v2"); if (r && r.value) setCompany((c) => ({ ...c, ...JSON.parse(r.value), name: FIXED_NAME, taxCode: FIXED_MST, phone: FIXED_PHONE, email: FIXED_EMAIL })); } catch (e) {}
      try { const lg = await window.storage.get("tq_logo"); if (lg && lg.value) setLogo(lg.value); } catch (e) {}
      // Load danh sách nhân viên đã lưu (nếu có) — nếu chưa thì dùng mặc định NHAN_VIEN
      try { const nv = await window.storage.get("tq_nhanvien"); if (nv && nv.value) { const arr = JSON.parse(nv.value); if (Array.isArray(arr) && arr.length) setNhanVienList(arr); } } catch (e) {}
    })();
  }, []);

  // Lưu danh sách nhân viên vào storage
  const saveNhanVien = async (list) => {
    setNhanVienList(list);
    try { await window.storage.set("tq_nhanvien", JSON.stringify(list)); } catch (e) {}
  };
  const addNhanVien = async () => {
    const ten = newNV.trim();
    if (!ten) return;
    // Tự thêm "- Thép Tấn Quốc" nếu nhân viên chỉ gõ tên
    const full = /thép tấn quốc/i.test(ten) ? ten : `${ten} - Thép Tấn Quốc`;
    if (nhanVienList.includes(full)) { setNewNV(""); return; }
    await saveNhanVien([...nhanVienList, full]);
    setNewNV("");
  };
  const removeNhanVien = async (ten) => { await saveNhanVien(nhanVienList.filter((x) => x !== ten)); };

  const saveCompany = async () => { try { await window.storage.set("company_v2", JSON.stringify(company)); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch (e) {} };
  async function handleLogo(file) { if (!file) return; try { const u = await toDataUrl(file); setLogo(u); await window.storage.set("tq_logo", u); } catch (e) {} if (logoRef.current) logoRef.current.value = ""; }
  async function resetLogo() { setLogo(DEFAULT_LOGO); try { await window.storage.delete("tq_logo"); } catch (e) {} }

  const addLog = (msg, ok = true) => setLog((l) => [...l, { msg, ok, id: uid() }]);

  // Xử lý 1 file/blob ảnh hoặc PDF → trả về số dòng bóc tách được
  async function extractFromBlob(file, label) {
    addLog(`Đang đọc: ${label}...`);
    try {
      const b64 = await toBase64(file);
      const isPdf = file.type === "application/pdf";
      const block = isPdf
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }
        : { type: "image", source: { type: "base64", media_type: file.type || "image/png", data: b64 } };
      const res = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, messages: [{ role: "user", content: [block, { type: "text", text: EXTRACT_PROMPT }] }] }) });
      if (!res.ok) { let m = ""; try { m = (await res.json()).error || ""; } catch {} throw new Error(m || ("API lỗi " + res.status)); }
      const data = await res.json();
      const text = (data.content || []).filter((i) => i.type === "text").map((i) => i.text).join("\n");
      const parsed = parseItems(text);
      // Đọc metadata báo giá cũ: tên khách, công trình, người báo giá
      const meta = parseMeta(text);
      if (meta) {
        if (meta.customerName || meta.project) {
          setCustomer((c) => ({
            name: meta.customerName ? String(meta.customerName).trim() : c.name,
            project: meta.project ? String(meta.project).trim() : c.project,
          }));
        }
        if (meta.quoter) setQuoter(String(meta.quoter).trim());
        // Ngày: KHÔNG lấy từ ảnh — giữ ngày hiện tại (thời điểm gửi lại)
      }
      if (parsed.length) {
        const norm = parsed.map((p) => {
          const name = String(p.name || "").trim() || "(chưa rõ)";
          let dvt  = String(p.dvt || "").trim();
          // Nếu báo giá cũ tính theo kg (giaPerKg=true) → đổi ĐVT sang "kg"
          // để thành tiền = Tổng KL × giá/kg (khớp báo giá gốc)
          if (p.giaPerKg === true) dvt = "kg";
          const loai = LOAI_LABEL[p.loai] ? p.loai : "";
          let soMet = String(p.soMet ?? "").trim();
          if (!soMet) {
            const mL = name.match(/[Ll]\s*=?\s*(\d{4,5})\s*(?:mm)?/);
            if (mL) soMet = mL[1];
          }
          if (soMet === "6000" && !p.soMet) soMet = "";
          // Nhận kgCay từ AI (VD: "V3 x 8kg" → kgCay=8 = kg/cây)
          const kgCayManual = has(p.kgCay) ? String(p.kgCay) : "";
          // Số lượng: ưu tiên qty. Nếu chưa có qty nhưng có tongMet (tổng chiều dài mét)
          // → tự tính số cây = ceil(tongMet / 6) (cây 6m tiêu chuẩn)
          let qty = num(p.qty);
          if (!qty && has(p.tongMet)) {
            const tm = num(p.tongMet);
            if (tm > 0) qty = Math.ceil(tm / 6);
          }
          // Khổ tấm (rộng × dài) — có thể được mặc định bên dưới nếu đơn không ghi
          let rongStr = String(p.rong ?? "").trim();
          let daiStr = String(p.dai ?? "").trim();
          // THÉP TẤM theo TỔNG MÉT VUÔNG (m²) → số tờ = round(m² ÷ diện tích 1 tờ).
          // Lấy m² từ trường tongM2, HOẶC tự dò trong tên/ghi chú ("81m2", "81 m²", "81 mét vuông").
          if (isPlateType(loai) && !qty) {
            let m2 = has(p.tongM2) ? num(p.tongM2) : 0;
            if (!m2) {
              const txt = boDau(`${p.note ?? ""} ${p.name ?? ""}`).toLowerCase();
              const mm = txt.match(/(\d+(?:[.,]\d+)?)\s*m\s*(?:2|²|et\s*vuong)/);
              if (mm) m2 = parseFloat(mm[1].replace(",", "."));
            }
            if (m2 > 0) {
              // Khổ tờ tiêu chuẩn nếu đơn KHÔNG ghi khổ: 1,5m × 6m (1500 × 6000)
              if (!(parseDim(rongStr) > 0)) rongStr = "1500";
              if (!(parseDim(daiStr) > 0)) daiStr = "6000";
              const areaTo = (parseDim(rongStr) / 1000) * (parseDim(daiStr) / 1000); // m²/tờ
              if (areaTo > 0) qty = Math.round(m2 / areaTo);
            }
          }
          // Thép tấm KHÔNG ghi rộng/dài → mặc định khổ tiêu chuẩn 1,5m × 6m (1500 × 6000)
          if (isPlateType(loai) && loai !== "tam_nhan" && loai !== "tam_nhan_gan") {
            if (!(parseDim(rongStr) > 0)) rongStr = "1500";
            if (!(parseDim(daiStr) > 0)) daiStr = "6000";
          }
          // "U120 55k" / kgCay khách ghi cho hàng U/I nhiều bậc → tự chọn đúng bậc kg/cây,
          //   làm sạch tên ("Thép U120x55K" → "Thép U120"), bỏ cờ "không chắc".
          let finalName = name;
          let finalKgM = has(p.kgM) ? String(p.kgM) : "";
          let finalKgCayManual = kgCayManual;
          let finalSoMet = soMet;
          let gradeMatched = false;
          {
            const srcUp = String(p.src || "").trim().toUpperCase();
            const probe = { name, loai, src: srcUp };
            const hint = has(p.kgCay) ? num(p.kgCay) : gradeHintKgCay(name);
            const g = matchGradeFromHint(probe, hint);
            if (g) {
              finalName = stripGradeHint(name);
              finalKgM = g.kgM; finalKgCayManual = "";
              if (!(parseDim(finalSoMet) > 0)) finalSoMet = "6000";
              gradeMatched = true;
            }
          }
          // Nếu đã khớp bậc → bỏ cờ uncertain liên quan tên/kg (không còn "không chắc")
          const _warnRaw = typeof p.warn === "string" ? p.warn.trim() : "";
          const _uncRaw = Array.isArray(p.uncertain) ? p.uncertain.map((s) => String(s).trim()) : [];
          const _uncFinal = gradeMatched ? _uncRaw.filter((u) => !["name","kgM","kgCay","kgCayManual"].includes(u)) : _uncRaw;
          const _warnFinal = gradeMatched ? (_uncFinal.length ? _warnRaw : "") : _warnRaw;
          // ĐƠN TRỌNG đọc từ báo giá cũ: TẤM → dtManual (kg/tờ); HÀNG CÂY → kgCayManual (kg/cây).
          //   (Không nhét đơn trọng cây vào dtManual, vì donTrongDisp của hàng cây không đọc dtManual.)
          const isPlateImport = isPlateType(loai);
          let dtManualImport = "";
          if (has(p.dtManual)) {
            if (isPlateImport) dtManualImport = String(p.dtManual);
            else if (!has(finalKgCayManual)) finalKgCayManual = String(p.dtManual);
          }
          return {
            id: uid(), name: finalName, loai,
            src: String(p.src || "").trim().toUpperCase(),
            day: has(p.day) ? String(p.day) : "",   // độ dày từ cột Dày riêng
            dvt, rong: rongStr, dai: daiStr,
            soMet: finalSoMet, kgM: finalKgM, kgCayManual: finalKgCayManual,
            qty,
            // Khi đọc lại BÁO GIÁ CŨ: AI điền sẵn ĐƠN GIÁ (giá đơn vị)
            donGia: has(p.donGia) ? num(p.donGia) : 0,
            note: String(p.note ?? "").trim(),
            // Đơn trọng (tấm) + Tổng KL: dùng số AI đọc nếu có (để khớp ảnh)
            dtManual: dtManualImport,
            klManual: has(p.klManual) ? String(p.klManual) : "",
            // ⚠️ Thành tiền LUÔN để trống → app tự tính từ SL × đơn giá (tránh sai số AI đọc)
            ttManual: "",
            // 🔴 Cờ KHÔNG CHẮC từ AI: khoanh đỏ ô tương ứng + cảnh báo (xoá khi nhân viên sửa ô đó)
            _warn: _warnFinal,
            _uncertain: _uncFinal,
          };
        });
        // Lọc bỏ dòng rác: tên "(chưa rõ)"/rỗng VÀ không có kích thước/SL/giá nào
        const cleaned = norm.filter((it) => {
          const noName = !it.name || it.name === "(chưa rõ)" || !it.name.trim();
          const noData = !num(it.qty) && !it.rong && !it.dai && !num(it.donGia)
            && !it.kgM && !it.kgCayManual && !it.dtManual && !it.day;
          // Bỏ nếu vừa không tên vừa không dữ liệu
          return !(noName && noData);
        });
        setItems((prev) => [...prev, ...cleaned]);
        addLog(`✓ ${label}: ${cleaned.length} dòng`, true);
      } else addLog(`⚠ ${label}: không đọc được (thử tách trang / nhập tay)`, false);
    } catch (e) { addLog(`✗ ${label}: lỗi xử lý`, false); }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList); if (!files.length) return;
    setExtracting(true); setLog([]);
    for (const file of files) await extractFromBlob(file, file.name);
    setExtracting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Dán ảnh từ clipboard (Ctrl/Cmd+V) — chụp màn hình tin nhắn rồi dán thẳng
  async function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs = [];
    for (const it of items) {
      if (it.type && it.type.startsWith("image/")) {
        const blob = it.getAsFile();
        if (blob) imgs.push(blob);
      }
    }
    if (!imgs.length) return; // không có ảnh trong clipboard → bỏ qua
    e.preventDefault();
    setExtracting(true); setLog([]);
    let n = 1;
    for (const blob of imgs) await extractFromBlob(blob, `Ảnh dán #${n++}`);
    setExtracting(false);
  }

  // Lắng nghe paste toàn cục khi đang ở màn upload
  useEffect(() => {
    if (screen !== "upload") return;
    const onPaste = (e) => handlePaste(e);
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [screen]);

  // Khi sửa 1 ô → bỏ cờ "không chắc" của field đó (và bỏ cảnh báo nếu đã hết cờ)
  const _clearUnc = (it, f) => {
    if (!it._uncertain || !it._uncertain.length) return {};
    // map field bảng → key cờ AI (qty↔qty, kgM↔kgM, kgCayManual↔kgCay, donGia↔donGia…)
    const key = f === "kgCayManual" ? "kgCay" : f === "dtManual" ? "kgCay" : f;
    const left = it._uncertain.filter((u) => u !== key && u !== f);
    return { _uncertain: left, _warn: left.length ? it._warn : "" };
  };
  const updateItem = (id, f, v) => setItems((its) => its.map((it) => {
    if (it.id !== id) return it;
    const unc = _clearUnc(it, f);
    // Khi nhân viên sửa TÊN → xóa loai đã gán (của AI) để hệ thống tự nhận lại loại
    if (f === "name") {
      // "U120 55k" → tự chọn bậc 55 kg/cây + bỏ "55k" khỏi tên (chỉ hàng U/I nhiều bậc)
      const probe = { name: v, loai: "", src: it.src };
      const g = matchGradeFromHint(probe, 0);
      if (g) {
        return { ...it, name: stripGradeHint(v), loai: "",
          kgM: g.kgM, kgCayManual: "",
          soMet: it.soMet && parseDim(it.soMet) > 0 ? it.soMet : "6000", ...unc };
      }
      return { ...it, name: v, loai: "", ...unc };
    }
    return { ...it, [f]: v, ...unc };
  }));
  const updateItemFields = (id, fields) => setItems((its) => its.map((it) => (it.id === id ? { ...it, ...fields } : it)));
  // Ô bị AI đánh dấu "không chắc" → tô đỏ + viền đỏ
  const UNC_RED = { background: "#fef2f2", borderColor: "#dc2626", boxShadow: "inset 0 0 0 1px #dc2626" };
  const isUnc = (it, field) => {
    const u = it._uncertain || [];
    if (!u.length) return false;
    const aliases = (field === "kgCayManual" || field === "dtManual") ? ["kgCay", field] : (field === "name" ? ["name", "day"] : [field]);
    return u.some((x) => aliases.includes(x));
  };
  const setLoaiItem = (id, lo) => setItems((its) => its.map((it) => (it.id === id ? { ...it, loai: lo, dvt: dvtDefault(lo) } : it)));
  const delItem = (id) => setItems((its) => its.filter((it) => it.id !== id));
  const blank = () => ({ id: uid(), name: "", loai: "", src: "", day: "", dvt: "", rong: "", dai: "", soMet: "", kgM: "", kgCayManual: "", qty: 0, donGia: 0, note: "", dtManual: "", klManual: "", ttManual: "" });
  const addItem = () => setItems((its) => [...its, blank()]);
  const addPosco = (e) => setItems((its) => {
    // Tên hiển thị
    let name;
    if (e.g === "R") name = `Thép ray ${e.ten} (${e.src})`;
    else if (e.g === "P") name = `Thép ${e.ten} (${e.src})`;
    else if (e.g === "C" || e.g === "Z") name = `Xà gồ ${e.ten}`;
    else if (e.g === "Q") name = `Vuông đặc ${e.ten} (${e.src})`;   // nhân viên tự gõ thêm dày: "Xà gồ C200 dày 2li"
    else name = e.day ? `Thép ${e.ten} ${e.day}LI (${e.src})` : `Thép ${e.ten} (${e.src})`;

    // Chiều dài cây: ray dùng defLen riêng, còn lại để trống (placeholder 6m)
    const soMet = e.g === "R" && e.defLen ? String(e.defLen) : "";

    // kg/m và kg/cây
    let kgM = "", kgCayManual = "";
    if (e.g === "R") {
      // Ray: có kgM (kg/m). Nếu có kgCay cố định thì dùng, không thì tự tính theo defLen
      kgM = String(e.kgm);
      if (e.kgCay) kgCayManual = String(e.kgCay);
    } else if (e.isCay) {
      kgCayManual = String(e.kgm); // phi: kgm là kg/cây
    } else {
      kgM = String(e.kgm); // còn lại: kgm là kg/m
    }

    return [...its, {
      ...blank(),
      name,
      loai: (e.g === "P" || e.g === "R") ? "thep_cay" : "thep_hinh",
      src: e.src,
      dvt: "cây",
      soMet,
      kgM,
      kgCayManual,
    }];
  });
  // Thêm dòng mặt hàng nhiều bậc (U/I) với đúng bậc kg/m đã chọn + chiều dài cây đang xem ở barem.
  // kgM là kg/m của bậc; kg/cây tự tính = kg/m × chiều dài (đổi cây sau cũng tự cập nhật).
  const addBaremOption = (e, o) => setItems((its) => [...its, {
    ...blank(),
    name: e.src ? `Thép ${e.ten} (${e.src})` : `Thép ${e.ten}`,
    loai: "thep_hinh",
    src: e.src || "",
    dvt: "cây",
    soMet: String(baremLen),
    kgM: String(o.kgM),
  }]);

  const totalKL = items.reduce((s, it) => s + tongKLDisp(it), 0);
  const totalTien = items.reduce((s, it) => s + thanhTienDisp(it), 0);

  const [y, m, d] = quoteDate.split("-");
  const dateObj = { d: Number(d), m: Number(m), y: Number(y) };

  // Lọc + sắp xếp GIỮ NGUYÊN cấu trúc cũ:
  // - Mỗi khối (nhà máy + mặt hàng) giữ đúng vị trí gốc (neo theo lần xuất hiện đầu)
  // - Trong cùng khối: ĐỘ DÀY tăng dần. KHÔNG gom mặt hàng across nhà máy.
  const _origIdx = new Map(POSCO_DATA.map((e, i) => [e, i]));
  const _anchor = {};
  POSCO_DATA.forEach((e, i) => { const k = e.src + "|" + e.ten; if (_anchor[k] === undefined) _anchor[k] = i; });
  const _dayNum = (e) => {
    if (e.day != null && e.day !== "") return Number(e.day);
    const m = String(e.spec).match(/(\d+(?:[.,]\d+)?)(?!.*\d)/);
    return m ? parseFloat(String(m[1]).replace(",", ".")) : 0;
  };
  const baremFiltered = POSCO_DATA.filter((e) => {
    const q = baremSearch.trim();
    // Đang gõ tìm kiếm → tìm trên TOÀN BỘ barem (bỏ qua nút nhóm/nguồn để không chặn nhầm)
    if (q) return baremMatch(e, q);
    // Không gõ gì → lọc theo nút nhóm + nguồn đang chọn
    if (baremGroup && e.g !== baremGroup) return false;
    if (baremSrc && e.src !== baremSrc) return false;
    return true;
  }).sort((a, b) =>
    (_anchor[a.src + "|" + a.ten] - _anchor[b.src + "|" + b.ten])
    || (_dayNum(a) - _dayNum(b))
    || (_origIdx.get(a) - _origIdx.get(b))
  );
  // Mặt hàng nhiều bậc độ dày (U80/U100/…/I200): thay dòng barem cũ bằng NHIỀU dòng theo từng bậc.
  // RIÊNG POSCO: giữ nguyên dòng barem gốc (POSCO có số liệu đúng sẵn, không bắt chọn).
  // kg/cây hiển thị theo CÂY đang chọn (6m/12m) = kg/m × chiều dài.
  const baremList = baremFiltered.flatMap((e) => {
    if (e.src === "POSCO") return [e];
    const opts = weightOptionsByKey(e.ten);
    if (!opts) return [e];
    return opts.map((o) => ({ ...e, _opt: o }));
  });
  // Danh sách nguồn có trong data (động, tự cập nhật khi thêm nguồn mới)
  const allSrcs = Array.from(new Set(POSCO_DATA.map(e => e.src))).sort();

  function buildQuoteInner() {
    const bd = "1px solid #000";
    const th = `border:${bd};padding:4px 5px;font-weight:700;font-size:12px;`;
    const c = (a) => `border:${bd};padding:3px 5px;text-align:${a};font-size:12px;`;
    const rowsHtml = items.map((it, i) => {
      const gc = loaiOf(it) === "gia_cong";
      return `<tr><td style="${c("center")}">${i + 1}</td><td style="${c("left")}">${esc(nameDisp(it))}</td><td style="${c("center")}">${esc(dvtOf(it))}</td><td style="${c("center")}">${esc(soMetText(it))}</td><td style="${c("center")}">${esc(qtyDisp(it))}</td><td style="${c("right")}">${gc ? "" : fmtDt(donTrongDisp(it))}</td><td style="${c("right")}">${gc ? "" : fmt2(tongKLDisp(it))}</td><td style="${c("right")}">${esc(giaText(it))}</td><td style="${c("right")}">${fmt(thanhTienDisp(it))}</td><td style="${c("center")};color:${RED}">${esc(it.note)}</td></tr>`;
    }).join("");
    return `<div style="display:flex;align-items:center;border-bottom:2px solid ${RED};padding-bottom:8px">
<img src="${logo}" style="width:60px;height:60px;object-fit:contain;margin-right:12px"/>
<div style="flex:1;line-height:1.4"><div style="font-size:21px;font-weight:800;color:${RED}">${esc(company.name)}</div>
<div style="font-size:12px">Địa chỉ kho: ${esc(company.addressWarehouse)}</div>
<div style="font-size:12px">ĐT/Zalo: ${esc(company.phone)}</div>${company.email ? `<div style="font-size:12px">Email: ${esc(company.email)}</div>` : ""}</div>${(staffQR(quoter) || staffQR(company.signer)) ? `<div style="text-align:center;margin-left:12px;flex-shrink:0"><img src="${staffQR(quoter) || staffQR(company.signer)}" style="width:90px;height:90px;object-fit:contain;display:block"/><div style="font-size:9px;color:#333;margin-top:1px">Zalo: ${esc(staffQR(quoter) ? staffKey(quoter) : staffKey(company.signer))}</div></div>` : ""}</div>
<div style="text-align:right;font-style:italic;font-size:12px;margin:6px 0 2px">${esc(place)}, ngày ${dateObj.d} tháng ${dateObj.m} năm ${dateObj.y}</div>
${quoter ? `<div style="text-align:right;font-size:12px;font-weight:600;margin-bottom:4px">Người báo giá: ${esc(quoter)}</div>` : ""}
<div style="text-align:center;font-size:19px;font-weight:800;margin-bottom:4px">BÁO GIÁ VÀ XÁC NHẬN ĐƠN ĐẶT HÀNG</div>
${customer.name ? `<div style="text-align:center;font-size:13px;font-weight:600;margin-bottom:4px">Kính gửi: ${esc(customer.name)}</div>` : ""}
${customer.project ? `<div style="text-align:center;font-size:12px;margin-bottom:6px">Công trình: ${esc(customer.project)}</div>` : ""}
<table style="width:100%;border-collapse:collapse"><thead><tr style="background:#eee"><th style="${th}">STT</th><th style="${th};text-align:left">Tên Mặt Hàng - Quy cách</th><th style="${th}">ĐVT</th><th style="${th}">Số mét</th><th style="${th}">Số lượng<br><span style="font-weight:400;font-size:10px">(Cây/Tờ)</span></th><th style="${th}">Đơn trọng<br><span style="font-weight:400;font-size:10px">(Cây/Tờ)</span></th><th style="${th}">Tổng KL</th><th style="${th}">Đơn giá</th><th style="${th}">Thành tiền</th><th style="${th}">Ghi chú</th></tr></thead>
<tbody>${rowsHtml}<tr style="font-weight:700"><td style="${c("center")}" colspan="5">TỔNG CỘNG</td><td style="${c("center")}"></td><td style="${c("right")}">${fmt2(totalKL)}</td><td style="${c("center")}"></td><td style="${c("right")}">${fmt(totalTien)}</td><td style="${c("center")}"></td></tr></tbody></table>
<div style="font-size:12px;margin-top:6px;white-space:pre-wrap">${esc(terms)}</div>
<div style="font-size:12px">HÀNG BÁN TẠI KHO CTY TẤN QUỐC</div>
<div style="font-size:12px;font-weight:700;margin-top:3px">Bằng chữ: ${esc(docTien(Math.round(totalTien)))}</div>
<div style="text-align:center;font-style:italic;font-size:12px;margin:10px 0">Cảm ơn sự hợp tác của Quý công ty, mong nhận được sự phản hồi từ Quý công ty</div>
<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-top:6px"><div style="text-align:center;width:45%">XÁC NHẬN CỦA KHÁCH HÀNG</div><div style="text-align:center;width:45%">CÔNG TY TNHH TẤN QUỐC<br/><span style="font-weight:400;font-style:italic">${esc(company.signer)}</span></div></div>`;
  }

  function buildPdfPage() {
    const fname = `BaoGia_${customer.name ? customer.name.replace(/\s+/g, "_") : "TanQuoc"}_${quoteDate}.pdf`;
    return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Tạo PDF</title>
<style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:'Times New Roman',Times,serif;color:#000;margin:0;background:#f1f1f1}
#bar{font-family:system-ui,Arial,sans-serif;text-align:center;padding:14px;color:#333;background:#fff;border-bottom:1px solid #ddd;font-size:14px}
#quote{width:820px;background:#fff;margin:16px auto;padding:16px;box-shadow:0 1px 8px rgba(0,0,0,.15)}
@media print{#bar{display:none}#quote{box-shadow:none;margin:0}}</style></head>
<body><div id="bar">Đang tạo file PDF, vui lòng đợi giây lát...</div><div id="quote">${buildQuoteInner()}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script>window.addEventListener('load',function(){setTimeout(function(){var bar=document.getElementById('bar');
if(!window.html2canvas||!window.jspdf){bar.innerHTML='Không tải được công cụ PDF. Nhấn Ctrl+P (hoặc Cmd+P) rồi chọn Save as PDF.';return;}
window.html2canvas(document.getElementById('quote'),{scale:2,backgroundColor:'#ffffff',useCORS:true}).then(function(canvas){
var jsPDF=window.jspdf.jsPDF;var pdf=new jsPDF('p','mm','a4');var pageW=210,pageH=297,margin=8,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width;
var img=canvas.toDataURL('image/jpeg',0.92),usableH=pageH-margin*2,left=imgH,pos=margin;
pdf.addImage(img,'JPEG',margin,pos,imgW,imgH);left-=usableH;
while(left>0){pdf.addPage();pos=margin-(imgH-left);pdf.addImage(img,'JPEG',margin,pos,imgW,imgH);left-=usableH;}
pdf.save(${JSON.stringify(fname)});
bar.innerHTML='\u2713 Đã tải file PDF về máy (kiểm tra thư mục Tải xuống). Bạn có thể đóng tab này.';
}).catch(function(e){bar.innerHTML='Lỗi tạo PDF. Nhấn Ctrl+P (hoặc Cmd+P) rồi chọn Save as PDF.';});},350);});</script>
</body></html>`;
  }

  function exportPDF() {
    if (!items.length) return;
    const blob = new Blob([buildPdfPage()], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    let w = null; try { w = window.open(url, "_blank"); } catch (e) {}
    if (!w) { const a = document.createElement("a"); a.href = url; a.download = `TaoPDF_BaoGia_${quoteDate}.html`; document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function exportExcel() {
    const rows = []; const mergeRows = [];
    rows.push([company.name]); mergeRows.push(0);
    rows.push(["Địa chỉ kho: " + company.addressWarehouse]); mergeRows.push(1);
    rows.push([`ĐT/Zalo: ${company.phone}`]); mergeRows.push(2);
    if (company.email) { rows.push([`Email: ${company.email}`]); mergeRows.push(rows.length - 1); }
    rows.push([`${place}, ngày ${dateObj.d} tháng ${dateObj.m} năm ${dateObj.y}`]); mergeRows.push(rows.length - 1);
    if (quoter) { rows.push(["Người báo giá: " + quoter]); mergeRows.push(rows.length - 1); }
    rows.push([]);
    rows.push(["BÁO GIÁ VÀ XÁC NHẬN ĐƠN ĐẶT HÀNG"]); mergeRows.push(rows.length - 1);
    if (customer.name) { rows.push(["Kính gửi: " + customer.name]); mergeRows.push(rows.length - 1); }
    if (customer.project) rows.push(["Công trình: " + customer.project]);
    rows.push([]);
    const headRow = rows.length;
    rows.push(["STT", "Tên Mặt Hàng - Quy cách", "ĐVT", "Số mét", "Số lượng (Cây/Tờ)", "Đơn trọng", "Tổng KL", "Đơn giá", "ĐV giá", "Thành tiền", "Ghi chú"]);
    items.forEach((it, i) => {
      const gc = loaiOf(it) === "gia_cong", sm = soMetText(it);
      rows.push([i + 1, nameDisp(it), dvtOf(it), sm === "" ? "" : sm, num(it.qty), gc ? "" : Number(donTrongDisp(it).toFixed(2)), gc ? "" : Number(tongKLDisp(it).toFixed(2)), Math.round(num(it.donGia)), giaUnitText(giaUnitOf(loaiOf(it))), Math.round(thanhTienDisp(it)), it.note]);
    });
    rows.push(["", "TỔNG CỘNG", "", "", "", "", Number(totalKL.toFixed(2)), "", "", Math.round(totalTien), ""]);
    rows.push([]); rows.push([terms]); rows.push(["HÀNG BÁN TẠI KHO CTY TẤN QUỐC"]); rows.push(["Bằng chữ: " + docTien(Math.round(totalTien))]);
    rows.push([]); rows.push(["XÁC NHẬN CỦA KHÁCH HÀNG", "", "", "", "", "", "CÔNG TY TNHH TẤN QUỐC"]); rows.push(["", "", "", "", "", "", company.signer]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 38 }, { wch: 7 }, { wch: 9 }, { wch: 16 }, { wch: 12 }, { wch: 11 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 }];
    ws["!merges"] = mergeRows.map((r) => ({ s: { r, c: 0 }, e: { r, c: 10 } }));
    for (let r = headRow; r < rows.length; r++) {
      ["D", "E", "H", "J"].forEach((c) => { const cell = ws[c + (r + 1)]; if (cell && typeof cell.v === "number") cell.z = "#,##0"; });
      { const g = ws["F" + (r + 1)]; if (g && typeof g.v === "number") g.z = "#,##0.00"; }
      { const h = ws["G" + (r + 1)]; if (h && typeof h.v === "number") h.z = "#,##0.00"; }
    }
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Bao gia");
    XLSX.writeFile(wb, `Bao_gia_${customer.name ? customer.name.replace(/\s+/g, "_") : "TanQuoc"}_${quoteDate}.xlsx`);
  }

  const companyValid = company.name && company.phone;
  const inputCls = "w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200";
  const cellInput = "w-full px-1 py-1 rounded border border-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="bg-white border-b-4 shadow-sm" style={{ borderColor: RED }}>
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="logo" className="w-11 h-11 object-contain" />
          <div>
            <div className="font-extrabold text-lg leading-tight" style={{ color: RED }}>THÉP TẤN QUỐC</div>
            <div className="text-xs text-gray-500">Nơi uy tín tạo nên sự thịnh vượng bền vững</div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 text-sm">
          {[["company", "1. Thông tin công ty", Building2], ["upload", "2. Nhập yêu cầu", Upload], ["quote", "3. Báo giá & xuất file", FileSpreadsheet]].map(([key, label, Icon], i) => (
            <button key={key} onClick={() => setScreen(key)} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition ${screen === key ? "text-white shadow" : "bg-white text-gray-500 hover:bg-gray-100 border"}`} style={screen === key ? { background: NAVY } : {}}>
              <Icon size={16} /> <span className="hidden sm:inline">{label}</span><span className="sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-5">
        {screen === "company" && (
          <div className="bg-white rounded-xl border shadow-sm p-5 max-w-3xl">
            <h2 className="font-bold text-lg mb-1" style={{ color: NAVY }}>Thông tin công ty</h2>
            <p className="text-sm text-gray-500 mb-4">Nhập 1 lần — hệ thống tự lưu. Thông tin hiển thị ở đầu báo giá.</p>
            <div className="flex items-center gap-4 mb-5 p-3 rounded-lg border bg-gray-50">
              <div className="w-20 h-20 border rounded flex items-center justify-center bg-white overflow-hidden shrink-0"><img src={logo} alt="logo" className="w-full h-full object-contain" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <button onClick={() => logoRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm font-medium" style={{ background: NAVY }}><ImageIcon size={15} /> Đổi logo (PNG gốc)</button>
                  <button onClick={resetLogo} className="text-sm text-gray-500 hover:text-gray-800">Khôi phục mặc định</button>
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files[0])} />
                <p className="text-xs text-gray-400 mt-1">Logo mặc định đã cài sẵn & luôn hiện trên app + PDF. Tải PNG gốc lên nếu muốn nét hơn.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[["name", "Tên công ty *", true], ["taxCode", "Mã số thuế (MST)", true], ["addressWarehouse", "Địa chỉ kho"], ["phone", "Điện thoại / Zalo (4 số bán hàng)", true], ["email", "Email công ty", true], ["bank", "Số tài khoản ngân hàng"]].map(([k, label, locked]) => (
                <div key={k} className={k === "addressWarehouse" ? "sm:col-span-2" : ""}>
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">{label}{locked && <Lock size={11} className="text-gray-400" />}</label>
                  <input value={company[k]} readOnly={locked} onChange={locked ? undefined : (e) => setCompany({ ...company, [k]: e.target.value })} className={inputCls + (locked ? " bg-gray-100 text-gray-500 cursor-not-allowed" : "")} style={{ borderColor: "#ddd" }} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600">Người lập / ký báo giá</label>
                <NhanVienSelect value={company.signer} onChange={(v) => setCompany({ ...company, signer: v })} inputCls={inputCls} list={nhanVienList} />
              </div>
            </div>

            {/* QUẢN LÝ NHÂN VIÊN — thêm/bớt không cần đụng code */}
            <div className="mt-4 p-3 rounded-lg border" style={{ background: "#f8fafc", borderColor: "#e2e8f0" }}>
              <label className="text-xs font-semibold text-gray-700">👥 Danh sách nhân viên (hiện trong dropdown báo giá)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {nhanVienList.map((nv) => (
                  <span key={nv} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: "#e0e7ff", color: NAVY }}>
                    {nv}
                    <button onClick={() => removeNhanVien(nv)} className="ml-1 text-red-500 hover:text-red-700 font-bold" title="Xóa nhân viên này">×</button>
                  </span>
                ))}
                {nhanVienList.length === 0 && <span className="text-xs text-gray-400 italic">Chưa có nhân viên nào</span>}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  value={newNV}
                  onChange={(e) => setNewNV(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addNhanVien(); }}
                  className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Nhập tên nhân viên mới (VD: Hùng) rồi bấm Thêm"
                />
                <button onClick={addNhanVien} className="px-3 py-1.5 rounded-lg text-white text-sm font-medium whitespace-nowrap" style={{ background: NAVY }}>+ Thêm</button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Tự thêm "- Thép Tấn Quốc" vào sau tên. Danh sách được lưu tự động, dùng chung cho cả "Người lập" và "Người báo giá".</p>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={saveCompany} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{ background: NAVY }}><Save size={16} /> Lưu thông tin</button>
              {saved && <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle2 size={16} /> Đã lưu</span>}
              <button onClick={() => setScreen("upload")} disabled={!companyValid} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg font-medium disabled:opacity-40 text-white" style={{ background: RED }}>Tiếp tục <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {screen === "upload" && (
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h2 className="font-bold text-lg mb-1" style={{ color: NAVY }}>Upload bản vẽ / Tin nhắn hỏi giá</h2>
              <p className="text-sm text-gray-500 mb-4">PDF, JPG, PNG hoặc ảnh chụp tin nhắn hỏi giá của khách — AI tự đọc, nhận diện từng mặt hàng & số lượng, app tự tính khối lượng và ra bảng báo giá.</p>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition" style={{ borderColor: extracting ? "#ccc" : RED }}>
                {extracting ? <Loader2 className="mx-auto animate-spin" size={32} style={{ color: RED }} /> : <Upload className="mx-auto" size={32} style={{ color: RED }} />}
                <p className="mt-2 font-medium text-sm">{extracting ? "Đang bóc tách..." : "Bấm để chọn file (bản vẽ hoặc tin nhắn hỏi giá)"}</p>
                <p className="text-xs text-gray-400 mt-1">Chọn nhiều file cùng lúc</p>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf,image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

              {/* Vùng DÁN ẢNH từ clipboard */}
              <div
                tabIndex={0}
                onPaste={handlePaste}
                className="mt-3 border-2 border-dashed rounded-xl p-5 text-center transition focus:outline-none"
                style={{ borderColor: "#1e3a8a", background: "#f8faff" }}>
                <div className="flex items-center justify-center gap-2 mb-1">
                  <ClipboardPaste size={22} style={{ color: NAVY }} />
                  <span className="font-medium text-sm" style={{ color: NAVY }}>Hoặc dán ảnh chụp màn hình trực tiếp</span>
                </div>
                <p className="text-xs text-gray-500">
                  Chụp tin nhắn khách → nhấn <kbd className="px-1.5 py-0.5 bg-white border rounded text-[11px] font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border rounded text-[11px] font-mono">V</kbd>
                  <span className="text-gray-400"> (Mac: </span><kbd className="px-1.5 py-0.5 bg-white border rounded text-[11px] font-mono">Cmd</kbd> + <kbd className="px-1.5 py-0.5 bg-white border rounded text-[11px] font-mono">V</kbd><span className="text-gray-400">)</span> để dán vào đây
                </p>
                <p className="text-[11px] text-gray-400 mt-1">Không cần lưu file — dán xong AI tự bóc tách ngay</p>
              </div>
              <div className="mt-4 p-3 rounded-lg text-xs flex gap-2" style={{ background: "#fff7ed", color: "#9a3412" }}><AlertTriangle size={16} className="shrink-0 mt-0.5" /><span>Kết quả AI là <b>bản nháp</b>. Kiểm tra tên mặt hàng & số liệu ở bước 3 trước khi gửi khách. Loại hàng được nhận tự động — mọi ô đều sửa được.</span></div>
              {log.length > 0 && <div className="mt-4 space-y-1">{log.map((l) => <div key={l.id} className={`text-xs flex items-center gap-2 ${l.ok ? "text-gray-600" : "text-red-600"}`}>{l.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {l.msg}</div>)}</div>}
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <h2 className="font-bold text-lg mb-3" style={{ color: NAVY }}>Thông tin khách hàng</h2>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-gray-600">Tên khách hàng (hiện ở Kính gửi: ...)</label><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className={inputCls} placeholder="VD: DALICO" /></div>
                <div><label className="text-xs font-medium text-gray-600">Công trình / dự án</label><input value={customer.project} onChange={(e) => setCustomer({ ...customer, project: e.target.value })} className={inputCls} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-medium text-gray-600">Nơi lập</label><input value={place} onChange={(e) => setPlace(e.target.value)} className={inputCls} /></div>
                  <div><label className="text-xs font-medium text-gray-600">Ngày báo giá</label><input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={inputCls} /></div>
                </div>
                <div><label className="text-xs font-medium text-gray-600">Người báo giá</label><NhanVienSelect value={quoter} onChange={setQuoter} inputCls={inputCls} list={nhanVienList} /></div>
                <div><label className="text-xs font-medium text-gray-600">Điều kiện / dung sai (cuối báo giá)</label><textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} className={inputCls + " resize-y"} /></div>
              </div>
              <div className="mt-5 p-3 rounded-lg bg-gray-50 text-sm flex items-center justify-between">
                <span className="text-gray-600">Đã nhận diện: <b>{items.length}</b> mặt hàng</span>
                <button onClick={() => setScreen("quote")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium" style={{ background: RED }}>Xem báo giá <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {screen === "quote" && (
          <div>
            <div className="bg-white rounded-xl border shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
              <button onClick={() => setScreen("upload")} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft size={16} /> Quay lại</button>
              <div className="text-sm text-gray-500 ml-2">KH: <b className="text-gray-800">{customer.name || "—"}</b></div>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setShowBarem(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-blue-50" style={{ color: NAVY, borderColor: NAVY }}><BookOpen size={15} /> Barem chuẩn thép các loại</button>
                <button onClick={addItem} className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"><Plus size={15} /> Thêm dòng</button>
                <button onClick={() => setShowPreview(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50"><Eye size={15} /> Xem trước</button>
                <button onClick={exportExcel} disabled={!items.length} className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium disabled:opacity-40" style={{ background: "#15803d" }}><Download size={16} /> Excel</button>
                <button onClick={exportPDF} disabled={!items.length} className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium disabled:opacity-40" style={{ background: RED }}><Printer size={16} /> Lưu PDF</button>
              </div>
            </div>

            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-sm" style={{ minWidth: 1400 }}>
                  <thead>
                    <tr className="text-white text-xs" style={{ background: NAVY }}>
                      {["STT", "Tên Mặt Hàng (tự nhận loại)", "ĐVT", "Rộng", "Dài", "Dài cây", "kg/m", <span>Đơn trọng<br /><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.85 }}>(Cây/Tờ)</span></span>, <span>Số lượng<br /><span style={{ fontWeight: 400, fontSize: 10, opacity: 0.85 }}>(Cây/Tờ)</span></span>, "Tổng KL", "Đơn giá", "Thành tiền", "Ghi chú", ""].map((h, i) => <th key={i} className="px-2 py-2 whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && <tr><td colSpan={17} className="text-center text-gray-400 py-10 text-sm">Chưa có dòng nào. Upload bản vẽ / ảnh tin nhắn hỏi giá, bấm "Thêm dòng", hoặc "Barem Thép Hình".</td></tr>}
                    {items.map((it, i) => {
                      const lo = loaiOf(it), gc = lo === "gia_cong", gu = giaUnitOf(lo, dvtOf(it));
                      const loLabel = LOAI_LABEL[lo] || lo;
                      return (
                        <tr key={it.id} className="border-b hover:bg-amber-50/40 align-top">
                          <td className="px-2 py-1 text-center text-gray-500">{i + 1}</td>
                          <td className="px-1 py-1" style={{ minWidth: 200 }}>
                            <input value={it.name} onChange={(e) => updateItem(it.id, "name", e.target.value)} className={cellInput} style={isUnc(it, "name") ? UNC_RED : {}} />
                            <div className="flex items-center gap-1 mt-0.5 px-1 flex-wrap">
                              {it.name && it.name.trim() && <span className="text-[10px] text-blue-500">{loaiHint(it)}</span>}
                              {it.src && (
                                <span className="text-[10px] font-bold px-1 rounded text-white" style={{ background: SRC_COLOR[it.src] || "#6b7280" }}>{SRC_LABEL[it.src] || it.src}</span>
                              )}
                              {isKgMEstimated(it) && (
                                <span className="text-[10px] font-bold px-1 rounded text-white bg-orange-400" title="kg/m được ước tính bằng công thức — chưa có trong barem. Nhân viên cần kiểm tra lại!">⚠ Ước tính</span>
                              )}
                            </div>
                            {it._warn && (
                              <div className="mt-0.5 px-1.5 py-1 rounded text-[10px] font-semibold leading-tight" style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }} title="AI bóc tách không chắc chắn — kiểm tra lại các ô đỏ">
                                ⚠ AI không chắc: {it._warn}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-1" style={{ width: 64 }}>
                            {(() => {
                              const opts = dvtOptions(it);
                              const cur = dvtOf(it);
                              if (opts) return (
                                <select
                                  value={cur}
                                  onChange={(e) => updateItem(it.id, "dvt", e.target.value)}
                                  className="w-full px-1 py-1 rounded border border-gray-200 bg-white focus:border-blue-400 focus:outline-none text-xs text-center"
                                  style={!cur ? { color: "#9ca3af" } : {}}>
                                  {!cur && <option value="">-- chọn</option>}
                                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              );
                              return <input value={cur} onChange={(e) => updateItem(it.id, "dvt", e.target.value)} className={cellInput + " text-center"} />;
                            })()}
                          </td>
                          <td className="px-1 py-1" style={{ width: 70 }}><input value={it.rong} onChange={(e) => updateItem(it.id, "rong", e.target.value)} className={cellInput + " text-center"} style={isUnc(it, "rong") ? UNC_RED : {}} /></td>
                          <td className="px-1 py-1" style={{ width: 66 }}><input value={it.dai} onChange={(e) => updateItem(it.id, "dai", e.target.value)} className={cellInput + " text-center"} style={isUnc(it, "dai") ? UNC_RED : {}} /></td>
                          <td className="px-1 py-1" style={{ width: 80 }}>
                            {isRay(it) ? (
                              // Thép ray: nhập theo MÉT, lưu mm bên trong (6m → 6000)
                              <div className="flex items-center gap-0.5">
                                <input
                                  value={it.soMet ? String(num(it.soMet) / 1000) : ""}
                                  placeholder="6"
                                  onChange={(e) => {
                                    const m = e.target.value.replace(",", ".");
                                    const mm = m === "" ? "" : String(Math.round(parseFloat(m) * 1000));
                                    updateItem(it.id, "soMet", isFinite(parseFloat(m)) ? mm : "");
                                  }}
                                  className={cellInput + " text-center"}
                                  title="Thép ray nhiều chiều dài — nhập theo mét (VD: 6, 8, 12.5)"
                                />
                                <span className="text-[10px] text-gray-400">m</span>
                              </div>
                            ) : isSectionType(lo) && it.name && it.name.trim() ? (
                              (() => {
                                const std = ["6000", "12000"];
                                const cur = it.soMet && parseDim(it.soMet) > 0 ? String(parseDim(it.soMet)) : "6000";
                                const opts = std.includes(cur) ? std : [cur, ...std];
                                return (
                                  <select
                                    value={cur}
                                    onChange={(e) => updateItem(it.id, "soMet", e.target.value)}
                                    className="w-full px-1 py-1 rounded border border-gray-200 bg-white focus:border-blue-400 focus:outline-none text-xs text-center">
                                    {opts.map(v => (
                                      <option key={v} value={v}>{(num(v) / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}m</option>
                                    ))}
                                  </select>
                                );
                              })()
                            ) : (
                              <input
                                value={it.soMet}
                                placeholder=""
                                onChange={(e) => updateItem(it.id, "soMet", e.target.value)}
                                className={cellInput + " text-center"}
                              />
                            )}
                          </td>
                          <td className="px-1 py-1" style={{ width: 62 }}>
                            {weightOptionsFor(it) && has(it.kgM) ? (
                              <div className="text-center text-xs py-1.5 font-medium text-gray-700" title="kg/m của bậc đã chọn — đổi bằng dropdown ở cột kg/cây">{fmt2(num(it.kgM))}</div>
                            ) : (
                              <input
                                value={it.kgM}
                                placeholder={autoKgMResult(it).kgm ? String(autoKgMResult(it).kgm) : ""}
                                onChange={(e) => updateItem(it.id, "kgM", e.target.value)}
                                className={cellInput + " text-center"}
                                style={isUnc(it, "kgM") ? UNC_RED : (!has(it.kgM) && isKgMEstimated(it) ? { background: "#fef3c7", borderColor: "#f59e0b" } : {})}
                                title={isKgMEstimated(it) && !has(it.kgM) ? "⚠ Ước tính công thức — chưa có trong barem. Kiểm tra lại!" : ""}
                              />
                            )}
                          </td>
                          <td className="px-1 py-1" style={{ width: 118, minWidth: 118 }}>
                            {(() => {
                              const wopts = weightOptionsFor(it);
                              if (wopts) {
                                // Mã hàng nhiều bậc độ dày → chọn bậc, HOẶC "Khác" để tự nhập kg/cây.
                                const lenM = (parseDim(it.soMet) || 6000) / 1000; // chiều dài cây hiện tại (m)
                                const isCustom = has(it.kgCayManual);            // đang ở chế độ "Khác" (tự nhập)
                                const chosen = !isCustom && has(it.kgM)
                                  ? wopts.findIndex(o => Math.abs(o.kgM - num(it.kgM)) < 1e-2)
                                  : -1;
                                const need = !isCustom && chosen < 0;
                                const oc = chosen >= 0 ? wopts[chosen] : null;
                                const selVal = isCustom ? "khac" : String(chosen);
                                return (
                                  <div>
                                    <select
                                      value={selVal}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === "khac") {
                                          // Bật chế độ tự nhập: xoá bậc, đặt kgCayManual = " " (chờ gõ)
                                          updateItemFields(it.id, { kgM: "", kgCayManual: " ", soMet: it.soMet && parseDim(it.soMet) > 0 ? it.soMet : "6000" });
                                          return;
                                        }
                                        const idx = parseInt(v, 10);
                                        if (idx < 0) { updateItemFields(it.id, { kgM: "", kgCayManual: "" }); return; }
                                        const o = wopts[idx];
                                        // set kg/m của bậc; xoá kgCayManual để kg/cây tự tính theo chiều dài; mặc định 6m nếu chưa có
                                        updateItemFields(it.id, { kgM: String(o.kgM), kgCayManual: "", soMet: it.soMet && parseDim(it.soMet) > 0 ? it.soMet : "6000" });
                                      }}
                                      className="w-full py-1 rounded text-xs bg-white focus:outline-none"
                                      style={{
                                        paddingLeft: 6, paddingRight: 22,
                                        ...(need
                                          ? { border: "2px solid #dc2626", background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }
                                          : isCustom
                                          ? { border: "1px solid #d1d5db", borderLeft: "6px solid #6b7280", color: "#374151", fontWeight: 700 }
                                          : { border: "1px solid #d1d5db", borderLeft: `6px solid ${oc.color}`, color: oc.color, fontWeight: 700 })
                                      }}
                                      title="Chọn loại kg/cây, hoặc 'Khác' để tự nhập">
                                      <option value="-1">⚠ Chọn kg/cây…</option>
                                      {wopts.map((o, idx) => (
                                        <option key={idx} value={String(idx)} style={{ color: o.color, fontWeight: 700 }}>{fmt2(o.kgM * lenM)} kg/cây</option>
                                      ))}
                                      <option value="khac">Khác (tự nhập)…</option>
                                    </select>
                                    {isCustom ? (
                                      <input
                                        autoFocus
                                        value={String(it.kgCayManual).trim()}
                                        placeholder="Nhập kg/cây"
                                        onChange={(e) => updateItem(it.id, "kgCayManual", e.target.value)}
                                        className="w-full mt-0.5 px-1 py-1 rounded border border-gray-300 focus:border-blue-400 focus:outline-none text-right text-xs"
                                        title="Tự nhập đơn trọng kg/cây (khi không có trong danh sách)"
                                      />
                                    ) : need ? (
                                      <div className="text-[9px] text-red-600 font-semibold mt-0.5 leading-tight">⚠ Bắt buộc chọn loại</div>
                                    ) : (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: oc.color }} />
                                        <span className="text-[9px] font-bold leading-tight" style={{ color: oc.color }}>{oc.code} · cây {lenM}m</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              if (gc) return <div className="text-center text-gray-300 text-xs py-1">–</div>;
                              // Hàng tấm/tờ: đơn trọng = kg/tờ (tính theo kích thước, gõ đè được)
                              if (isPlateType(lo)) return (
                                <input
                                  value={it.dtManual}
                                  placeholder={fmtDt(donTrongCalc(it))}
                                  onChange={(e) => updateItem(it.id, "dtManual", e.target.value)}
                                  className={cellInput + " text-right"}
                                  style={isUnc(it, "dtManual") ? UNC_RED : {}}
                                  title="Đơn trọng (kg/tờ) — tự tính theo kích thước, gõ đè được"
                                />
                              );
                              // Hàng cây: đơn trọng = kg/cây
                              return (
                                <input
                                  value={it.kgCayManual}
                                  placeholder={kgCayCalc(it) > 0 ? fmt2(kgCayCalc(it)) : ""}
                                  onChange={(e) => updateItem(it.id, "kgCayManual", e.target.value)}
                                  className={cellInput + " text-right"}
                                  style={isUnc(it, "kgCayManual") ? UNC_RED : {}}
                                  title="Đơn trọng (kg/cây) = kg/m × dài cây (gõ đè được, xoá thì về tự tính)"
                                />
                              );
                            })()}
                          </td>
                          <td className="px-1 py-1" style={{ width: 50 }}>
                            <input
                              value={it.qty}
                              onChange={(e) => updateItem(it.id, "qty", e.target.value)}
                              className={cellInput + " text-center"}
                              style={isUnc(it, "qty") ? UNC_RED : ((!num(it.qty) && donTrongCalc(it) > 0) ? { background: "#fef3c7", borderColor: "#f59e0b" } : {})}
                              title={(!num(it.qty) && donTrongCalc(it) > 0) ? "⚠ Chưa có số lượng — nhập SL để tính tổng KL" : ""}
                            />
                          </td>
                          <td className="px-1 py-1" style={{ width: 90 }}>{gc ? <div className="text-center text-gray-300">–</div> : <input value={it.klManual} placeholder={fmt2(num(it.qty) * donTrongDisp(it))} onChange={(e) => updateItem(it.id, "klManual", e.target.value)} className={cellInput + " text-right"} />}</td>
                          <td className="px-1 py-1" style={{ width: 112 }}><div className="flex items-center gap-1"><input value={it.donGia} onChange={(e) => updateItem(it.id, "donGia", e.target.value)} className="w-full px-1 py-1 rounded border bg-yellow-50 hover:border-gray-300 focus:border-blue-400 focus:outline-none text-right" placeholder="0" style={isUnc(it, "donGia") ? UNC_RED : {}} /><span className="text-[10px] text-gray-400 whitespace-nowrap">{giaUnitText(gu)}</span></div></td>
                          <td className="px-1 py-1" style={{ width: 105 }}><input value={it.ttManual} placeholder={fmt(ttBase(it))} onChange={(e) => updateItem(it.id, "ttManual", e.target.value)} className={cellInput + " text-right font-medium"} /></td>
                          <td className="px-1 py-1" style={{ width: 80 }}><input value={it.note} onChange={(e) => updateItem(it.id, "note", e.target.value)} className={cellInput + " text-center"} /></td>
                          <td className="px-1 py-1 text-center"><button onClick={() => delItem(it.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-gray-50 p-4 flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8 w-full max-w-xs justify-between"><span className="text-gray-500">Tổng khối lượng</span><span className="font-medium">{fmt2(totalKL)} kg</span></div>
                <div className="flex gap-8 w-full max-w-xs justify-between text-base font-bold pt-1 mt-1 border-t" style={{ color: RED }}><span>TỔNG CỘNG</span><span>{fmt(totalTien)} đ</span></div>
                <div className="text-xs text-gray-400 mt-1">Đã gồm VAT trong đơn giá</div>
              </div>
            </div>
            <ChotDonPanel customer={customer} quoter={quoter} items={items} totalKL={totalKL} totalTien={totalTien} place={place} terms={terms} editingId={editingOrderId} onSaved={() => {}} />
            <p className="text-xs text-gray-400 mt-3"><b>Mọi ô đều sửa được.</b> Với thép nhấn Z/L/U: ô <b>Rộng</b> = tổng chiều rộng các cạnh (mm). Ví dụ: L100x50x3 → Rộng=150.  Số mờ = app tự tính (gõ đè được, xoá thì về tự tính). <b>Loại hàng</b> được nhận tự động từ tên mặt hàng (hiển thị màu xanh). <b>kg/m</b> tra bảng barem thống nhất (POSCO + AKS/DVS). Bấm <b>Barem</b> để thêm nhanh thép hình.</p>
          </div>
        )}
      </div>

      {showBarem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-4">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-bold" style={{ color: NAVY }}>Tra barem các loại thép</span>
              <button onClick={() => setShowBarem(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <input value={baremSearch} onChange={(e) => setBaremSearch(e.target.value)} placeholder="Tìm: H200x200, I300, U250, V200..." className="flex-1 min-w-[180px] px-3 py-2 border rounded-lg text-sm" />

                {/* Dropdown Mã nhà máy */}
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-0.5">Mã nhà máy</label>
                  <select
                    value={baremSrc}
                    onChange={(e) => setBaremSrc(e.target.value)}
                    className="px-2.5 py-1.5 rounded border text-xs font-medium bg-white focus:outline-none focus:border-blue-400"
                    style={{ borderColor: baremSrc ? SRC_COLOR[baremSrc] || "#6b7280" : "#d1d5db", color: baremSrc ? SRC_COLOR[baremSrc] || "#374151" : "#374151", minWidth: 150 }}>
                    <option value="">Tất cả nhà máy</option>
                    {allSrcs.map(s => (
                      <option key={s} value={s}>{SRC_LABEL[s] || s}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-0.5">Nhóm</label>
                  <div className="flex items-center gap-1">
                    {[
                      { key: "", label: "Tất cả" },
                      { key: "H", label: "H — Thép H" },
                      { key: "I", label: "I — Thép I" },
                      { key: "U", label: "U — Thép U" },
                      { key: "V", label: "V — Thép V/L" },
                      { key: "P", label: "Ø — Phi tròn" },
                      { key: "R", label: "P — Thép ray" },
                      { key: "C", label: "C — Xà gồ C" },
                      { key: "Z", label: "Z — Xà gồ Z" },
                      { key: "Q", label: "□ — Vuông đặc" },
                    ].map(({ key, label }) => (
                      <button key={key} onClick={() => setBaremGroup(key)}
                        title={label}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium border ${baremGroup === key ? "text-white" : "bg-white text-gray-600"}`}
                        style={baremGroup === key ? { background: NAVY, borderColor: NAVY } : {}}>
                        {key === "P" ? "Ø" : key || "Tất cả"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-0.5">Cây</label>
                  <div className="flex items-center gap-1">
                    {[6000, 12000].map((L) => (
                      <button key={L} onClick={() => setBaremLen(L)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium border ${baremLen === L ? "text-white" : "bg-white text-gray-600"}`}
                        style={baremLen === L ? { background: RED, borderColor: RED } : {}}>
                        {L / 1000}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Badge mô tả nhóm đang xem */}
              {baremGroup && (
                <div className="mb-2 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-2" style={{ background: "#f0f4ff", color: NAVY }}>
                  {baremGroup === "H" && "🔷 Thép H (H Beam) — Wide Flange — JIS G3192 · Tiêu chuẩn: H×B×t₁×t₂ (mm)"}
                  {baremGroup === "I" && "🔹 Thép I (I Beam) — Standard Beam — JIS A5526 · Tiêu chuẩn: H×B×t₁×t₂ (mm)"}
                  {baremGroup === "U" && "🟦 Thép U (Channel) — JIS G3192 · Tiêu chuẩn: H×B×t₁×t₂ (mm)"}
                  {baremGroup === "V" && "🔺 Thép V/L (Angle) — JIS G3192 · Tiêu chuẩn: A×B×t (mm)"}
                  {baremGroup === "P" && "Ø Thép phi tròn đặc — đơn vị kg/CÂY (kg/m = kg/cây ÷ chiều dài cây)"}
                  {baremGroup === "R" && "🛤 Thép ray (ký hiệu P) — chiều dài cây đa dạng (6m / 8m / 12,5m), số mét sửa được"}
                  {baremGroup === "C" && "🔩 Xà gồ C — kg/m = băng(mm)/1000 × 7,85 × độ dày(li). Bấm Thêm rồi nhập độ dày vào ô kg/m tự tính."}
                  {baremGroup === "Z" && "🔩 Xà gồ Z — kg/m = băng(mm)/1000 × 7,85 × độ dày(li). Bấm Thêm rồi nhập độ dày vào ô kg/m tự tính."}
                  {baremGroup === "Q" && "□ Vuông đặc — đơn vị kg/CÂY 6m trực tiếp (isCay)"}
                </div>
              )}

              <div className="overflow-auto border rounded-lg" style={{ maxHeight: 360 }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: "#eef" }}>
                    <tr className="text-xs text-gray-600">
                      <th className="px-2 py-2 text-left w-40">Quy cách</th>
                      <th className="px-2 py-2 text-center w-16">Độ dày</th>
                      <th className="px-2 py-2 text-right">kg/m</th>
                      <th className="px-2 py-2 text-right">kg/cây {baremLen / 1000}m</th>
                      <th className="px-2 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {baremList.map((e, idx) => {
                      const groupColor = { H: "#dbeafe", I: "#e0e7ff", U: "#d1fae5", V: "#fef3c7", P: "#fce7f3", R: "#fed7aa", C: "#dcfce7", Q: "#f1f5f9" }[e.g] || "#f9fafb";
                      const srcColor = SRC_COLOR[e.src] || "#6b7280";
                      const opt = e._opt; // dòng mặt hàng nhiều kg (U/I)
                      return (
                        <tr key={idx} className="border-t hover:bg-amber-50/50" style={opt ? { borderLeft: `4px solid ${opt.color}`, background: `${opt.color}0d` } : {}}>
                          <td className="px-2 py-1.5 font-semibold whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded text-xs mr-1 font-bold" style={{ background: groupColor, color: "#374151" }}>{e.g}</span>
                            {e.ten}
                            <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: srcColor }}>{e.src}</span>
                            {opt && <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: opt.color }}>{opt.code}</span>}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {opt
                              ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: `${opt.color}1a`, color: opt.color }}>{opt.code}</span>
                              : e.g === "R" && e.defLen
                              ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#fff7ed", color: "#c2410c" }}>{(e.defLen/1000).toLocaleString("vi-VN")}m</span>
                              : (e.g === "C" || e.g === "Z") && e.bang
                              ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#dcfce7", color: "#15803d" }}>băng {e.bang}mm</span>
                              : e.day
                              ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#f0f4ff", color: NAVY }}>{e.day}LI</span>
                              : <span className="text-gray-300 text-xs">—</span>
                            }
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums font-medium">
                            {opt
                              ? fmt2(opt.kgM)
                              : (e.g === "C" || e.g === "Z")
                              ? <span className="text-gray-400 text-xs italic">băng/1000×7,85×li</span>
                              : e.g === "R" ? fmt2(e.kgm)
                              : e.isCay ? fmt2(e.kgm / (baremLen / 1000)) : fmt2(e.kgm)}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
                            {opt
                              ? <span style={{ color: opt.color, fontWeight: 700 }}>{fmt2(opt.kgM * baremLen / 1000)} <span className="text-[10px] text-gray-400 font-normal">({baremLen / 1000}m)</span></span>
                              : (e.g === "C" || e.g === "Z")
                              ? <span className="text-gray-400 text-xs italic">nhập độ li → tự tính</span>
                              : e.g === "R"
                              ? fmt2(e.kgCay || (e.kgm * (e.defLen || 6000) / 1000))
                              : e.isCay ? fmt2(e.kgm) : fmt2(e.kgm * baremLen / 1000)}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <button onClick={() => opt ? addBaremOption(e, opt) : addPosco(e)} className="px-2.5 py-1 rounded text-white text-xs" style={{ background: NAVY }}>+ Thêm</button>
                          </td>
                        </tr>
                      );
                    })}
                    {baremList.length === 0 && (
                      <tr><td colSpan={6} className="text-center text-gray-400 py-8 text-sm">
                        Chưa có dữ liệu{baremGroup ? ` nhóm ${baremGroup}` : ""}. Anh sẽ bổ sung từ PDF catalog.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">Barem chuẩn từ catalog — chọn cây 6m/12m rồi bấm "+ Thêm" để thêm dòng vào báo giá. App tự nhận loại H / I / U / V từ tên mặt hàng.</p>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-4">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="font-medium text-sm">Xem trước báo giá (bản gửi khách)</span>
              <div className="flex items-center gap-2">

                {/* Nút TẢI ẢNH — chụp preview thành PNG để gửi qua Zalo/Messenger */}
                <button id="copyImgBtn" onClick={async () => {
                  const btn = document.getElementById("copyImgBtn");
                  const el = document.getElementById("quotePreviewContent");
                  if (!el || !btn) return;
                  btn.textContent = "⏳ Đang chụp...";
                  btn.disabled = true;
                  try {
                    // Load html2canvas nếu chưa có
                    if (!window.html2canvas) {
                      await new Promise((res, rej) => {
                        const s = document.createElement("script");
                        s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
                        s.onload = res; s.onerror = rej;
                        document.head.appendChild(s);
                      });
                    }
                    const canvas = await window.html2canvas(el, {
                      scale: 2,
                      backgroundColor: "#ffffff",
                      useCORS: true,
                      logging: false,
                      allowTaint: true,
                    });
                    // Thử copy vào clipboard trước
                    let copied = false;
                    try {
                      await new Promise((res, rej) => canvas.toBlob(async (blob) => {
                        try {
                          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                          copied = true; res();
                        } catch { rej(); }
                      }, "image/png"));
                    } catch {}

                    if (copied) {
                      btn.textContent = "✅ Đã copy! Paste vào Zalo";
                    } else {
                      // Fallback: tải file PNG về — kéo vào Zalo là xong
                      const a = document.createElement("a");
                      a.href = canvas.toDataURL("image/png");
                      a.download = `BaoGia_${customer.name ? customer.name.replace(/\s+/g,"_") : "TanQuoc"}_${quoteDate}.png`;
                      a.click();
                      btn.textContent = "✅ Đã tải ảnh về!";
                    }
                  } catch (err) {
                    btn.textContent = "❌ Lỗi — thử lại";
                  } finally {
                    setTimeout(() => { if (btn) { btn.textContent = "📸 Tải ảnh báo giá"; btn.disabled = false; } }, 3000);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-white text-sm font-medium"
                style={{ background: "#0891b2" }}>📸 Tải ảnh báo giá</button>

                <button onClick={exportPDF} className="flex items-center gap-1 px-3 py-1.5 rounded text-white text-sm" style={{ background: RED }}><Download size={14} /> Lưu PDF</button>
                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
              </div>
            </div>
            <div id="quotePreviewContent" className="p-2">
              <QuotePreview company={company} customer={customer} items={items} place={place} dateObj={dateObj} quoter={quoter} terms={terms} logo={logo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function docTien(n) {
  if (!n || n <= 0) return "Không đồng";
  const d = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const doc3 = (num3, full) => {
    let tr = Math.floor(num3 / 100), ch = Math.floor((num3 % 100) / 10), dv = num3 % 10, s = "";
    if (full || tr > 0) s += d[tr] + " trăm";
    if (ch > 1) { s += " " + d[ch] + " mươi"; if (dv === 1) s += " mốt"; else if (dv === 5) s += " lăm"; else if (dv > 0) s += " " + d[dv]; }
    else if (ch === 1) { s += " mười"; if (dv === 5) s += " lăm"; else if (dv > 0) s += " " + d[dv]; }
    else if (dv > 0) { if (full || tr > 0) s += " lẻ"; s += " " + d[dv]; }
    return s.trim();
  };
  const units = ["", " nghìn", " triệu", " tỷ"];
  let parts = []; while (n > 0) { parts.push(n % 1000); n = Math.floor(n / 1000); }
  let res = "";
  for (let j = parts.length - 1; j >= 0; j--) if (parts[j] > 0) res += doc3(parts[j], j !== parts.length - 1) + units[j] + " ";
  res = res.trim();
  return res.charAt(0).toUpperCase() + res.slice(1) + " đồng";
}
