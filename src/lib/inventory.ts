// ============================================================
// TỒN KHO — đọc từ Google Sheet (cho dashboard nhân viên)
// Hỗ trợ 2 nguồn:
//   1) Link "Xuất bản lên web" dạng CSV (khuyên dùng, ổn định nhất)
//   2) URL Apps Script trả JSON (doGet?action=inventory)
// Khi chưa cấu hình -> dùng dữ liệu mẫu để minh hoạ.
// ============================================================
import { useEffect, useState, useCallback } from "react";
import { num } from "./format";

export interface InvItem {
  name: string;
  category: string;
  spec: string; // quy cách
  thickness: number; // độ dày mm (nếu có)
  qty: number; // số lượng (tờ/cây/cuộn...)
  unit: string; // ĐVT
  weightKg: number; // khối lượng tồn (kg)
  location: string; // vị trí kho
  note: string;
}

const URL_KEY = "tq_inv_url";

export function getInventoryUrl(): string {
  try {
    return localStorage.getItem(URL_KEY) || "";
  } catch {
    return "";
  }
}
export function setInventoryUrl(url: string) {
  try {
    localStorage.setItem(URL_KEY, url.trim());
  } catch {
    /* bỏ qua */
  }
}

// ── Parse CSV đơn giản (hỗ trợ ô có dấu ngoặc kép) ──
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur !== "" || row.length) {
    row.push(cur);
    if (row.some((x) => x.trim() !== "")) rows.push(row);
  }
  return rows;
}

const norm = (s: string) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .trim();

// Map linh hoạt theo tên cột tiếng Việt
function pick(headers: string[], row: string[], keys: string[]): string {
  for (const k of keys) {
    const idx = headers.findIndex((h) => norm(h).includes(k));
    if (idx >= 0 && row[idx] != null) return row[idx].trim();
  }
  return "";
}

function rowsToItems(rows: string[][]): InvItem[] {
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const name = pick(headers, r, ["ten hang", "ten mat hang", "ten", "san pham", "hang"]);
    return {
      name: name || "(không tên)",
      category: pick(headers, r, ["nhom", "loai", "danh muc"]) || "Khác",
      spec: pick(headers, r, ["quy cach", "kich thuoc", "spec", "khac"]),
      thickness: num(pick(headers, r, ["day", "do day", "ly"])),
      qty: num(pick(headers, r, ["so luong", "sl", "ton", "qty"])),
      unit: pick(headers, r, ["dvt", "don vi", "unit"]) || "kg",
      weightKg: num(pick(headers, r, ["khoi luong", "kl", "kg", "trong luong"])),
      location: pick(headers, r, ["vi tri", "kho", "khu"]),
      note: pick(headers, r, ["ghi chu", "note"]),
    };
  }).filter((it) => it.name && it.name !== "(không tên)");
}

export async function fetchInventory(url: string): Promise<InvItem[]> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error("Không tải được dữ liệu (" + res.status + ")");
  const text = await res.text();
  const trimmed = text.trim();
  // JSON?
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const data = JSON.parse(trimmed);
      const arr = Array.isArray(data) ? data : data.items || data.inventory || [];
      return arr.map((o: any) => ({
        name: String(o.name || o.ten || "(không tên)"),
        category: String(o.category || o.nhom || o.loai || "Khác"),
        spec: String(o.spec || o.quycach || o.kichthuoc || ""),
        thickness: num(o.thickness || o.day),
        qty: num(o.qty || o.soluong || o.sl),
        unit: String(o.unit || o.dvt || "kg"),
        weightKg: num(o.weightKg || o.kl || o.kg),
        location: String(o.location || o.vitri || o.kho || ""),
        note: String(o.note || o.ghichu || ""),
      })).filter((it: InvItem) => it.name && it.name !== "(không tên)");
    } catch {
      /* rơi xuống CSV */
    }
  }
  return rowsToItems(parseCSV(text));
}

// ── Dữ liệu mẫu (khi chưa cấu hình nguồn) ──
export const SAMPLE_INVENTORY: InvItem[] = [
  { name: "Thép tấm HRC 6ly", category: "Thép tấm HRC", spec: "1500×6000", thickness: 6, qty: 42, unit: "tờ", weightKg: 17800, location: "Kho A1", note: "" },
  { name: "Thép tấm HRC 8ly", category: "Thép tấm HRC", spec: "1500×6000", thickness: 8, qty: 30, unit: "tờ", weightKg: 16956, location: "Kho A1", note: "" },
  { name: "Thép tấm HRC 10ly", category: "Thép tấm HRC", spec: "1500×6000", thickness: 10, qty: 55, unit: "tờ", weightKg: 38858, location: "Kho A2", note: "" },
  { name: "Thép tấm HRC 12ly", category: "Thép tấm HRC", spec: "1500×6000", thickness: 12, qty: 18, unit: "tờ", weightKg: 15260, location: "Kho A2", note: "" },
  { name: "Cuộn HRC 3ly", category: "Cuộn HRC", spec: "khổ 1250", thickness: 3, qty: 6, unit: "cuộn", weightKg: 30000, location: "Bãi C", note: "" },
  { name: "Cuộn HRC 5ly", category: "Cuộn HRC", spec: "khổ 1500", thickness: 5, qty: 4, unit: "cuộn", weightKg: 24000, location: "Bãi C", note: "" },
  { name: "Thép tấm gân 5ly", category: "Thép tấm gân", spec: "1500×6000", thickness: 5, qty: 12, unit: "tờ", weightKg: 4500, location: "Kho A3", note: "" },
  { name: "Thép H200x200", category: "Thép hình", spec: "200×200×8×12", thickness: 0, qty: 40, unit: "cây", weightKg: 11976, location: "Bãi B1", note: "POSCO" },
  { name: "Thép U150 AKS", category: "Thép hình", spec: "150×75×5", thickness: 0, qty: 65, unit: "cây", weightKg: 7098, location: "Bãi B1", note: "" },
  { name: "Thép V100x100x10", category: "Thép hình", spec: "100×100×10", thickness: 0, qty: 28, unit: "cây", weightKg: 2469, location: "Bãi B2", note: "" },
  { name: "Phi Ø20 SS400", category: "Thép cây", spec: "Ø20", thickness: 0, qty: 120, unit: "cây", weightKg: 1776, location: "Kệ D", note: "" },
  { name: "Xà gồ Z200", category: "Xà gồ C/Z", spec: "Z200×2.0", thickness: 2, qty: 90, unit: "cây", weightKg: 5400, location: "Bãi B3", note: "" },
  { name: "Xà gồ C150", category: "Xà gồ C/Z", spec: "C150×1.8", thickness: 1.8, qty: 8, unit: "cây", weightKg: 360, location: "Bãi B3", note: "Sắp hết" },
];

export interface InvState {
  items: InvItem[];
  loading: boolean;
  error: string;
  isSample: boolean;
  refresh: () => void;
}

export function useInventory(): InvState {
  const [items, setItems] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSample, setIsSample] = useState(false);

  const load = useCallback(() => {
    const url = getInventoryUrl();
    if (!url) {
      setItems(SAMPLE_INVENTORY);
      setIsSample(true);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    fetchInventory(url)
      .then((data) => {
        if (data.length) {
          setItems(data);
          setIsSample(false);
        } else {
          setItems(SAMPLE_INVENTORY);
          setIsSample(true);
          setError("Nguồn không có dữ liệu — đang hiển thị dữ liệu mẫu.");
        }
      })
      .catch((e) => {
        setItems(SAMPLE_INVENTORY);
        setIsSample(true);
        setError("Không tải được kho (" + e.message + ") — hiển thị dữ liệu mẫu.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, isSample, refresh: load };
}
