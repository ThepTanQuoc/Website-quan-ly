// Bóc tách danh sách chi tiết thép tấm từ ảnh bản vẽ / bảng thống kê bằng AI.
// Dùng chung cơ chế gọi API như Module 1 (môi trường có proxy Anthropic).
import { newPart, type Part } from "./hrc";
import { num } from "./format";

const PROMPT = `Bạn là kỹ sư bóc tách kết cấu thép. Đọc ảnh bản vẽ / bảng thống kê chi tiết thép TẤM (HRC) cần cắt và trả về DUY NHẤT một mảng JSON.
Mỗi phần tử là 1 loại chi tiết tấm phẳng cần cắt ra:
{"name":"tên/ký hiệu chi tiết","shape":"rect|circle","w":rộng_mm,"l":dài_mm,"qty":số_lượng}
Quy tắc:
- Chi tiết CHỮ NHẬT: shape="rect", w=cạnh ngắn (rộng), l=cạnh dài (dài), đơn vị mm. "1 mét"=1000mm.
- Chi tiết TRÒN (bích, mặt bích, tấm tròn Ø): shape="circle", w=l=đường kính (mm).
- Số có "ly"/"li"/"mm dày" là ĐỘ DÀY tấm — KHÔNG đưa vào w/l, có thể ghi vào name (vd "Bản mã 10ly").
- qty = số lượng chi tiết (cột SL / số tấm / số cái). Nếu không rõ để 1.
- Bỏ qua dòng tiêu đề, dòng tổng cộng, dòng không phải chi tiết tấm.
- CHỈ trả về mảng JSON, không markdown, không giải thích.
Ví dụ: "Bản mã BM1 250x180 dày 10ly, 24 cái" -> {"name":"BM1 (10ly)","shape":"rect","w":180,"l":250,"qty":24}
"Mặt bích Ø320 dày 16, 8 cái" -> {"name":"Mặt bích Ø320","shape":"circle","w":320,"l":320,"qty":8}`;

function parseParts(text: string): Part[] {
  let t = (text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
  let arr: any[] = [];
  try {
    const a = JSON.parse(t);
    if (Array.isArray(a)) arr = a;
    else if (a && Array.isArray(a.items)) arr = a.items;
  } catch {
    const re = /\{[^{}]*\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      try {
        arr.push(JSON.parse(m[0]));
      } catch {
        /* skip */
      }
    }
  }
  return arr
    .filter((o) => o && (o.w || o.l))
    .map((o) =>
      newPart({
        name: String(o.name || "Chi tiết"),
        shape: o.shape === "circle" ? "circle" : "rect",
        w: num(o.w) || num(o.l),
        l: num(o.l) || num(o.w),
        qty: num(o.qty) || 1,
      }),
    );
}

export async function extractPartsFromImage(base64: string, mediaType: string): Promise<Part[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("API lỗi " + res.status);
  const data = await res.json();
  const text = data?.content?.[0]?.text || "";
  return parseParts(text);
}

export const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
