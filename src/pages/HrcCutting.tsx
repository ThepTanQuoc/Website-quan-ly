import { useMemo, useState, useRef } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Layers,
  Recycle,
  Gauge,
  Coins,
  Settings2,
  AlertTriangle,
  Square,
  Circle as CircleIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, Pill, EmptyState } from "../components/ui";
import {
  computeCutting,
  newPart,
  DEFAULT_OPTS,
  PART_COLORS,
  type Part,
  type Stock,
  type CutOptions,
} from "../lib/hrc";
import { extractPartsFromImage, toBase64 } from "../lib/aiExtract";
import { fmt, fmt2, fmtShort, num } from "../lib/format";

const fmtTon = (kg: number) => (kg / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 });

export default function HrcCutting() {
  const [stock, setStock] = useState<Stock>({ w: 1500, l: 6000, thickness: 10, pricePerKg: 16500 });
  const [opts, setOpts] = useState<CutOptions>({ ...DEFAULT_OPTS });
  const [parts, setParts] = useState<Part[]>([
    newPart({ name: "Bản mã BM1 (10ly)", shape: "rect", w: 180, l: 250, qty: 60 }),
    newPart({ name: "Sườn gia cường", shape: "rect", w: 120, l: 600, qty: 40 }),
    newPart({ name: "Mặt bích Ø320", shape: "circle", w: 320, l: 320, qty: 16 }),
  ]);
  const [plateIdx, setPlateIdx] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [showOpts, setShowOpts] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => computeCutting(stock, parts, opts), [stock, parts, opts]);

  const setPart = (id: string, f: keyof Part, v: string) =>
    setParts((ps) => ps.map((p) => (p.id === id ? { ...p, [f]: f === "name" || f === "shape" ? v : num(v) } : p)));
  const addRow = () => setParts((ps) => [...ps, newPart()]);
  const delRow = (id: string) => setParts((ps) => ps.filter((p) => p.id !== id));

  const onUpload = async (file?: File) => {
    if (!file) return;
    setAiBusy(true);
    setAiMsg("");
    try {
      const b64 = await toBase64(file);
      const extracted = await extractPartsFromImage(b64, file.type || "image/png");
      if (extracted.length) {
        setParts((ps) => [...ps.filter((p) => p.w > 0 || p.name), ...extracted]);
        setAiMsg(`✅ Bóc tách được ${extracted.length} chi tiết từ bản vẽ.`);
      } else setAiMsg("Không nhận ra chi tiết nào. Thử ảnh rõ hơn hoặc nhập tay.");
    } catch (e) {
      setAiMsg("⚠ Không gọi được AI ở môi trường này — vui lòng nhập tay danh sách chi tiết.");
    } finally {
      setAiBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const platesToShow = Math.max(1, result.platesUsed);
  const curPlate = Math.min(plateIdx, platesToShow - 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-navy-950 sm:text-3xl">
            Bóc tách & cắt thép tấm HRC
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Nhập chi tiết cần cắt từ bản vẽ kết cấu → hệ thống xếp hình lên khổ tấm HRC, tính số tấm,
            phế liệu (duỗi cuộn + cắt CNC), hiệu suất và giá thành.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onUpload(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()} disabled={aiBusy} className="btn-ghost">
            {aiBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-cyan-500" />}
            Bóc tách từ bản vẽ (AI)
          </button>
        </div>
      </div>
      {aiMsg && <div className="rounded-xl bg-cyan-50 px-4 py-2 text-sm text-cyan-800 ring-1 ring-cyan-100">{aiMsg}</div>}

      {/* Flow: Cuộn -> Tấm -> Thành phẩm */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FlowCard
          step="1"
          title="Cuộn HRC"
          weight={result.coilWeight}
          note={`Phế duỗi cuộn ${opts.uncoilScrapPct}%`}
          scrap={result.uncoilScrap}
          color="#1e3a8a"
          icon={<Layers size={20} />}
        />
        <FlowCard
          step="2"
          title="Tấm phẳng"
          weight={result.sheetWeight}
          note={`${result.platesUsed} tấm ${stock.w}×${stock.l}×${stock.thickness}`}
          scrap={result.cncScrap}
          scrapLabel="Phế cắt CNC"
          color="#0e7490"
          icon={<Square size={20} />}
        />
        <FlowCard
          step="3"
          title="Thành phẩm"
          weight={result.productWeight}
          note={`${result.pieces} chi tiết · ${result.parts.length} loại`}
          color="#06b6d4"
          icon={<Scissors size={20} />}
          final
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MiniKpi label="Số tấm HRC cần" value={String(result.platesUsed)} sub={`${fmtTon(result.sheetWeight)} tấn tấm`} icon={<Square size={16} />} tone="navy" />
        <MiniKpi label="Tổng phế liệu" value={fmtTon(result.totalScrap) + " t"} sub={`Duỗi ${fmt(result.uncoilScrap)} + cắt ${fmt(result.cncScrap)} kg`} icon={<Recycle size={16} />} tone="amber" />
        <MiniKpi label="Hiệu suất (yield)" value={(result.yield * 100).toFixed(1) + "%"} sub={`Tận dụng tấm ${(result.plateUtil * 100).toFixed(0)}%`} icon={<Gauge size={16} />} tone={result.yield >= 0.75 ? "green" : "red"} />
        <MiniKpi label="Giá thành /kg TP" value={fmtShort(result.costPerKgProduct) + "đ"} sub={`Chi phí ròng ${fmtShort(result.netCost)}đ`} icon={<Coins size={16} />} tone="cyan" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Left: inputs + parts */}
        <div className="space-y-4 xl:col-span-3">
          {/* Stock */}
          <Card title="Khổ tấm HRC & thông số" icon={<Settings2 size={16} />}
            action={
              <button onClick={() => setShowOpts((v) => !v)} className="text-xs font-semibold text-cyan-600 hover:underline">
                {showOpts ? "Ẩn tuỳ chọn" : "Tuỳ chọn nâng cao"}
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Num label="Khổ rộng (mm)" value={stock.w} onChange={(v) => setStock({ ...stock, w: v })} />
              <Num label="Chiều dài (mm)" value={stock.l} onChange={(v) => setStock({ ...stock, l: v })} />
              <Num label="Độ dày (mm)" value={stock.thickness} onChange={(v) => setStock({ ...stock, thickness: v })} />
              <Num label="Giá phôi (đ/kg)" value={stock.pricePerKg} onChange={(v) => setStock({ ...stock, pricePerKg: v })} />
            </div>
            {showOpts && (
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
                <Num label="Phế duỗi cuộn (%)" value={opts.uncoilScrapPct} onChange={(v) => setOpts({ ...opts, uncoilScrapPct: v })} />
                <Num label="Mạch cắt kerf (mm)" value={opts.kerf} onChange={(v) => setOpts({ ...opts, kerf: v })} />
                <Num label="Mép bỏ (mm)" value={opts.edgeTrim} onChange={(v) => setOpts({ ...opts, edgeTrim: v })} />
                <Num label="Giá phế (đ/kg)" value={opts.scrapPricePerKg} onChange={(v) => setOpts({ ...opts, scrapPricePerKg: v })} />
                <Num label="Phí cắt (đ/kg TP)" value={opts.cuttingCostPerKg} onChange={(v) => setOpts({ ...opts, cuttingCostPerKg: v })} />
                <label className="flex items-end gap-2 pb-1.5 text-sm text-slate-600">
                  <input type="checkbox" checked={opts.allowRotate} onChange={(e) => setOpts({ ...opts, allowRotate: e.target.checked })} className="h-4 w-4 accent-cyan-500" />
                  Cho phép xoay chi tiết
                </label>
              </div>
            )}
          </Card>

          {/* Parts */}
          <Card title="Danh sách chi tiết cần cắt" icon={<Scissors size={16} />}
            action={<button onClick={addRow} className="flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:underline"><Plus size={14} /> Thêm dòng</button>}
          >
            {parts.length === 0 ? (
              <EmptyState title="Chưa có chi tiết" hint="Thêm dòng hoặc bóc tách từ ảnh bản vẽ bằng AI." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pl-1">Tên chi tiết</th>
                      <th className="pb-2">Dạng</th>
                      <th className="pb-2 text-right">Rộng/Ø</th>
                      <th className="pb-2 text-right">Dài</th>
                      <th className="pb-2 text-right">SL</th>
                      <th className="pb-2 text-right">KL (kg)</th>
                      <th className="pb-2 text-center">Vừa tấm</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.parts.concat(parts.filter((p) => !result.parts.find((rp) => rp.id === p.id)).map((p) => ({ ...p, area1: 0, weight1: 0, perPlate: 0, fits: true }))).map((p, idx) => (
                      <tr key={p.id} className="border-t border-slate-50">
                        <td className="py-1.5 pl-1">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: PART_COLORS[idx % PART_COLORS.length] }} />
                            <input className={cell} value={p.name} onChange={(e) => setPart(p.id, "name", e.target.value)} placeholder="VD: Bản mã BM1" />
                          </div>
                        </td>
                        <td className="py-1.5">
                          <select className={cell + " cursor-pointer"} value={p.shape} onChange={(e) => setPart(p.id, "shape", e.target.value)}>
                            <option value="rect">Chữ nhật</option>
                            <option value="circle">Tròn</option>
                          </select>
                        </td>
                        <td className="py-1.5"><input className={cell + " text-right"} value={p.w || ""} onChange={(e) => setPart(p.id, "w", e.target.value)} /></td>
                        <td className="py-1.5">
                          {p.shape === "circle" ? <div className="text-right text-slate-300">—</div> : <input className={cell + " text-right"} value={p.l || ""} onChange={(e) => setPart(p.id, "l", e.target.value)} />}
                        </td>
                        <td className="py-1.5"><input className={cell + " text-right"} value={p.qty || ""} onChange={(e) => setPart(p.id, "qty", e.target.value)} /></td>
                        <td className="py-1.5 text-right text-slate-500">{p.weight1 ? fmt2(p.weight1 * p.qty) : "—"}</td>
                        <td className="py-1.5 text-center">
                          {p.fits ? <span className="text-emerald-500">●</span> : <span title="Không vừa khổ tấm" className="text-rose-500">✕</span>}
                        </td>
                        <td className="py-1.5 text-right"><button onClick={() => delRow(p.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {result.oversize.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-100">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Các chi tiết lớn hơn khổ tấm (không xếp được): <b>{result.oversize.join(", ")}</b>. Hãy tăng khổ tấm hoặc kiểm tra kích thước.</span>
              </div>
            )}
          </Card>
        </div>

        {/* Right: layout + cost */}
        <div className="space-y-4 xl:col-span-2">
          <Card
            title="Sơ đồ cắt minh hoạ"
            icon={<Layers size={16} />}
            action={
              platesToShow > 1 && (
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <button onClick={() => setPlateIdx(Math.max(0, curPlate - 1))} className="grid h-6 w-6 place-items-center rounded-md hover:bg-slate-100"><ChevronLeft size={14} /></button>
                  Tấm {curPlate + 1}/{platesToShow}
                  <button onClick={() => setPlateIdx(Math.min(platesToShow - 1, curPlate + 1))} className="grid h-6 w-6 place-items-center rounded-md hover:bg-slate-100"><ChevronRight size={14} /></button>
                </div>
              )
            }
          >
            <CuttingLayout stock={stock} result={result} plate={curPlate + 1} />
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {result.parts.map((p, idx) => (
                <span key={p.id} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PART_COLORS[idx % PART_COLORS.length] }} />
                  {p.name || "Chi tiết"}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> Phế liệu
              </span>
            </div>
          </Card>

          <Card title="Phân tích chi phí" icon={<Coins size={16} />}>
            <div className="space-y-2 text-sm">
              <CostRow label="Phôi cuộn HRC" value={result.rawCost} sub={`${fmtTon(result.coilWeight)} tấn × ${fmt(stock.pricePerKg)}đ`} />
              <CostRow label="Phí cắt CNC" value={result.cuttingCost} sub={`${fmt(result.productWeight)} kg × ${fmt(opts.cuttingCostPerKg)}đ`} />
              <CostRow label="Thu hồi phế liệu" value={-result.scrapValue} sub={`${fmt(result.totalScrap)} kg × ${fmt(opts.scrapPricePerKg)}đ`} negative />
              <div className="my-1 border-t border-dashed border-slate-200" />
              <div className="flex items-center justify-between">
                <span className="font-semibold text-navy-950">Chi phí ròng vật tư</span>
                <span className="font-display text-lg font-extrabold text-navy-950">{fmt(result.netCost)} đ</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-cyan-50 px-3 py-2">
                <span className="text-xs font-semibold text-cyan-700">Giá thành / kg thành phẩm</span>
                <span className="font-bold text-cyan-700">{fmt(result.costPerKgProduct)} đ/kg</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Pill color="green"><Gauge size={12} /> Yield {(result.yield * 100).toFixed(1)}%</Pill>
              <Pill color="amber"><Recycle size={12} /> Phế {((result.totalScrap / (result.coilWeight || 1)) * 100).toFixed(1)}%</Pill>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Sơ đồ cắt SVG ──
function CuttingLayout({ stock, result, plate }: { stock: Stock; result: ReturnType<typeof computeCutting>; plate: number }) {
  const pad = 6;
  const maxW = 360;
  const scale = (maxW - pad * 2) / stock.w;
  const W = stock.w * scale + pad * 2;
  const H = stock.l * scale + pad * 2;
  const items = result.placements.filter((p) => p.plate === plate);

  return (
    <div className="grid place-items-center rounded-xl bg-gradient-to-b from-slate-50 to-white p-2">
      <svg width={W} height={Math.min(H, 520)} viewBox={`0 0 ${W} ${H}`} style={{ maxHeight: 520 }}>
        {/* tấm */}
        <rect x={pad} y={pad} width={stock.w * scale} height={stock.l * scale} fill="#eef2f8" stroke="#94a3b8" strokeWidth={1.2} rx={3} />
        {/* hatch phế nền */}
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#cbd5e1" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={pad} y={pad} width={stock.w * scale} height={stock.l * scale} fill="url(#hatch)" opacity={0.5} rx={3} />
        {items.map((p, i) => {
          const x = pad + p.x * scale;
          const y = pad + p.y * scale;
          const w = p.w * scale;
          const h = p.l * scale;
          const color = PART_COLORS[p.colorIdx % PART_COLORS.length];
          if (p.shape === "circle") {
            return <circle key={i} cx={x + w / 2} cy={y + h / 2} r={Math.min(w, h) / 2} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={0.8} />;
          }
          return <rect key={i} x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.85} stroke="#fff" strokeWidth={0.8} rx={1} />;
        })}
      </svg>
      {items.length === 0 && <div className="py-6 text-center text-xs text-slate-400">Nhập chi tiết để xem sơ đồ cắt</div>}
    </div>
  );
}

function FlowCard({ step, title, weight, note, scrap, scrapLabel = "Phế liệu", color, icon, final }: {
  step: string; title: string; weight: number; note: string; scrap?: number; scrapLabel?: string; color: string; icon: React.ReactNode; final?: boolean;
}) {
  return (
    <div className="glass relative overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl text-white" style={{ background: color }}>{icon}</span>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Bước {step}</div>
            <div className="font-bold text-navy-950">{title}</div>
          </div>
        </div>
        {final && <span className="animate-float text-cyan-400">✦</span>}
      </div>
      <div className="mt-3 font-display text-2xl font-extrabold text-navy-950">
        {(weight / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} <span className="text-base text-slate-400">tấn</span>
      </div>
      <div className="mt-0.5 text-xs text-slate-500">{note}</div>
      {scrap !== undefined && scrap > 0 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600">
          <Recycle size={11} /> {scrapLabel}: {fmt(scrap)} kg
        </div>
      )}
    </div>
  );
}

function MiniKpi({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: "navy" | "amber" | "green" | "red" | "cyan" }) {
  const c: Record<string, string> = { navy: "bg-navy", amber: "bg-amber-500", green: "bg-emerald-500", red: "bg-rose-500", cyan: "bg-cyan-500" };
  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between">
        <span className="card-title">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg text-white ${c[tone]}`}>{icon}</span>
      </div>
      <div className="mt-2 font-display text-xl font-extrabold text-navy-950 sm:text-2xl">{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</div>
    </div>
  );
}

function CostRow({ label, value, sub, negative }: { label: string; value: number; sub?: string; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-slate-600">{label}</div>
        {sub && <div className="text-[11px] text-slate-400">{sub}</div>}
      </div>
      <span className={`font-semibold ${negative ? "text-emerald-600" : "text-slate-700"}`}>
        {negative ? "− " : ""}{fmt(Math.abs(value))} đ
      </span>
    </div>
  );
}

const cell = "w-full rounded-md border border-transparent bg-slate-50 px-2 py-1.5 text-sm hover:border-slate-200 focus:border-cyan-400 focus:bg-white focus:outline-none";
function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
      <input
        value={value || ""}
        onChange={(e) => onChange(num(e.target.value))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none"
      />
    </label>
  );
}
