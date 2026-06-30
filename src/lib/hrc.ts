// ============================================================
// MODULE 2 — BÓC TÁCH & CẮT THÉP TẤM HRC
// Quy trình: Cuộn HRC --(duỗi, có phế liệu)--> Tấm phẳng
//            Tấm --(chặt / cắt CNC theo bản vẽ, có phế liệu)--> Thành phẩm
// Thư viện này: xếp hình (nesting) theo thuật toán kệ (shelf), tính khối
// lượng phế liệu từng bước, hiệu suất, và chi phí.
// ============================================================
import { num, uid } from "./format";

export const STEEL_DENSITY = 7.85; // kg / (m² · mm)

export type Shape = "rect" | "circle";

export interface Part {
  id: string;
  name: string;
  shape: Shape;
  w: number; // rộng (mm) — với hình tròn: đường kính
  l: number; // dài (mm) — với hình tròn: = đường kính
  qty: number;
}

export interface Stock {
  w: number; // khổ rộng tấm (mm)
  l: number; // chiều dài tấm (mm)
  thickness: number; // độ dày (mm)
  pricePerKg: number; // giá phôi cuộn (đ/kg)
}

export interface CutOptions {
  uncoilScrapPct: number; // % phế khi duỗi cuộn -> tấm
  kerf: number; // bề rộng mạch cắt CNC (mm)
  edgeTrim: number; // mép bỏ quanh tấm (mm)
  scrapPricePerKg: number; // giá thu hồi phế liệu (đ/kg)
  cuttingCostPerKg: number; // phí cắt CNC (đ/kg thành phẩm)
  allowRotate: boolean;
}

export const DEFAULT_OPTS: CutOptions = {
  uncoilScrapPct: 2,
  kerf: 3,
  edgeTrim: 10,
  scrapPricePerKg: 8000,
  cuttingCostPerKg: 1500,
  allowRotate: true,
};

export function newPart(p: Partial<Part> = {}): Part {
  return { id: uid(), name: p.name || "", shape: p.shape || "rect", w: num(p.w), l: num(p.l) || num(p.w), qty: num(p.qty) || 1 };
}

export interface Placement {
  plate: number;
  x: number;
  y: number;
  w: number;
  l: number;
  name: string;
  shape: Shape;
  colorIdx: number;
}

export interface PartStat extends Part {
  area1: number; // m² 1 thành phẩm
  weight1: number; // kg 1 thành phẩm
  perPlate: number; // số lượng vừa 1 tấm (nếu cắt riêng)
  fits: boolean;
}

export interface CutResult {
  parts: PartStat[];
  placements: Placement[];
  platesUsed: number;
  pieces: number;
  oversize: string[]; // tên part không vừa khổ tấm
  // Khối lượng (kg)
  productWeight: number; // thành phẩm
  sheetWeight: number; // tấm phẳng (sau duỗi)
  coilWeight: number; // cuộn HRC cần nhập
  uncoilScrap: number; // phế duỗi cuộn
  cncScrap: number; // phế cắt CNC
  totalScrap: number;
  // Hiệu suất
  yield: number; // thành phẩm / cuộn
  plateUtil: number; // thành phẩm / tấm
  // Chi phí (đ)
  rawCost: number; // tiền phôi cuộn
  scrapValue: number; // thu hồi phế liệu
  cuttingCost: number; // phí cắt
  netCost: number; // chi phí ròng vật tư
  costPerKgProduct: number;
}

const MAX_PIECES = 6000;

function partArea(p: { shape: Shape; w: number; l: number }): number {
  if (p.shape === "circle") {
    const r = p.w / 2 / 1000;
    return Math.PI * r * r;
  }
  return (p.w / 1000) * (p.l / 1000);
}

function fitCount(usableW: number, usableL: number, w: number, l: number, kerf: number): number {
  if (w <= 0 || l <= 0) return 0;
  const nx = Math.floor((usableW + kerf) / (w + kerf));
  const ny = Math.floor((usableL + kerf) / (l + kerf));
  return Math.max(0, nx) * Math.max(0, ny);
}

// Thuật toán xếp kệ (shelf / first-fit decreasing height)
function shelfPack(
  pieces: { w: number; l: number; name: string; shape: Shape; colorIdx: number }[],
  stock: Stock,
  opts: CutOptions,
): { placements: Placement[]; plates: number } {
  const margin = opts.edgeTrim;
  const kerf = opts.kerf;
  const W = stock.w - margin * 2;
  const L = stock.l - margin * 2;
  const placements: Placement[] = [];

  // sắp xếp giảm dần theo chiều dài (l)
  const sorted = [...pieces].sort((a, b) => Math.max(b.w, b.l) - Math.max(a.w, a.l));

  let plate = 1;
  let shelfY = 0; // vị trí đầu kệ hiện tại (theo chiều dài L)
  let shelfH = 0; // chiều cao kệ hiện tại
  let cursorX = 0;

  const newPlate = () => {
    plate++;
    shelfY = 0;
    shelfH = 0;
    cursorX = 0;
  };

  for (const pc of sorted) {
    let w = pc.w;
    let l = pc.l;
    // xoay để chiều "cao kệ" nhỏ hơn nếu cho phép
    if (opts.allowRotate && pc.shape === "rect" && l > w) {
      // thử đặt nằm ngang (w lớn theo trục X) khi vừa hơn
    }
    // chọn hướng: ưu tiên l = cạnh ngắn cho chiều cao kệ
    let pw = w, pl = l;
    if (opts.allowRotate && pc.shape === "rect" && pw < pl) {
      pw = l; pl = w; // nằm ngang
    }
    if (pw > W && opts.allowRotate) { pw = w; pl = l; } // không vừa thì quay lại
    if (pw > W || pl > L) continue; // không vừa khổ -> bỏ qua (đã cảnh báo ở oversize)

    // hết hàng ngang -> kệ mới
    if (cursorX + pw > W + 0.01) {
      shelfY += shelfH + kerf;
      shelfH = 0;
      cursorX = 0;
    }
    // hết tấm -> tấm mới
    if (shelfY + pl > L + 0.01) {
      newPlate();
    }
    placements.push({
      plate,
      x: margin + cursorX,
      y: margin + shelfY,
      w: pw,
      l: pl,
      name: pc.name,
      shape: pc.shape,
      colorIdx: pc.colorIdx,
    });
    cursorX += pw + kerf;
    shelfH = Math.max(shelfH, pl);
  }
  return { placements, plates: plate };
}

export function computeCutting(stock: Stock, parts: Part[], opts: CutOptions): CutResult {
  const usableW = stock.w - opts.edgeTrim * 2;
  const usableL = stock.l - opts.edgeTrim * 2;

  const oversize: string[] = [];
  const partStats: PartStat[] = parts
    .filter((p) => p.qty > 0 && p.w > 0 && (p.shape === "circle" || p.l > 0))
    .map((p) => {
      const a1 = partArea(p);
      const w1 = a1 * stock.thickness * STEEL_DENSITY;
      const box = p.shape === "circle" ? p.w : p.l;
      const boxw = p.w;
      const fits = boxw <= usableW + 0.01 && box <= usableL + 0.01;
      const fitsRot = box <= usableW + 0.01 && boxw <= usableL + 0.01;
      const perPlate = Math.max(
        fitCount(usableW, usableL, boxw, box, opts.kerf),
        opts.allowRotate ? fitCount(usableW, usableL, box, boxw, opts.kerf) : 0,
      );
      if (!fits && !(opts.allowRotate && fitsRot)) oversize.push(p.name || "(chưa đặt tên)");
      return { ...p, area1: a1, weight1: w1, perPlate, fits: fits || (opts.allowRotate && fitsRot) };
    });

  // Tổng số mảnh
  const totalPieces = partStats.reduce((s, p) => s + p.qty, 0);

  // Xếp hình để biết số tấm thực tế
  let platesUsed = 1;
  let placements: Placement[] = [];
  if (totalPieces > 0 && totalPieces <= MAX_PIECES) {
    const pieceList: { w: number; l: number; name: string; shape: Shape; colorIdx: number }[] = [];
    partStats.forEach((p, idx) => {
      if (!p.fits) return;
      for (let i = 0; i < p.qty; i++)
        pieceList.push({ w: p.w, l: p.shape === "circle" ? p.w : p.l, name: p.name, shape: p.shape, colorIdx: idx });
    });
    const packed = shelfPack(pieceList, stock, opts);
    placements = packed.placements;
    platesUsed = Math.max(1, packed.plates);
  } else if (totalPieces > MAX_PIECES) {
    // ước lượng theo diện tích khi quá nhiều mảnh
    const usableArea = (usableW / 1000) * (usableL / 1000);
    const need = partStats.reduce((s, p) => {
      const footprint = ((p.w + opts.kerf) / 1000) * (((p.shape === "circle" ? p.w : p.l) + opts.kerf) / 1000);
      return s + p.qty * footprint;
    }, 0);
    platesUsed = Math.max(1, Math.ceil(need / (usableArea * 0.92)));
  }

  // Khối lượng
  const plateAreaM2 = (stock.w / 1000) * (stock.l / 1000);
  const plateWeight = plateAreaM2 * stock.thickness * STEEL_DENSITY;
  const productWeight = partStats.reduce((s, p) => s + p.weight1 * p.qty, 0);
  const sheetWeight = platesUsed * plateWeight;
  const uncoilFactor = 1 - Math.min(0.5, opts.uncoilScrapPct / 100);
  const coilWeight = uncoilFactor > 0 ? sheetWeight / uncoilFactor : sheetWeight;
  const uncoilScrap = coilWeight - sheetWeight;
  const cncScrap = Math.max(0, sheetWeight - productWeight);
  const totalScrap = uncoilScrap + cncScrap;

  const yieldPct = coilWeight > 0 ? productWeight / coilWeight : 0;
  const plateUtil = sheetWeight > 0 ? productWeight / sheetWeight : 0;

  const rawCost = coilWeight * stock.pricePerKg;
  const scrapValue = totalScrap * opts.scrapPricePerKg;
  const cuttingCost = productWeight * opts.cuttingCostPerKg;
  const netCost = rawCost - scrapValue + cuttingCost;
  const costPerKgProduct = productWeight > 0 ? netCost / productWeight : 0;

  return {
    parts: partStats,
    placements,
    platesUsed,
    pieces: totalPieces,
    oversize,
    productWeight,
    sheetWeight,
    coilWeight,
    uncoilScrap,
    cncScrap,
    totalScrap,
    yield: yieldPct,
    plateUtil,
    rawCost,
    scrapValue,
    cuttingCost,
    netCost,
    costPerKgProduct,
  };
}

export const PART_COLORS = [
  "#06b6d4", "#1e3a8a", "#7c3aed", "#f59e0b", "#10b981",
  "#ec4899", "#0ea5e9", "#ef4444", "#14b8a6", "#8b5cf6",
];
