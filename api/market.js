// Vercel Serverless — lấy tín hiệu thị trường thép Việt Nam REAL-TIME
// bằng Anthropic web search tool. Cần ANTHROPIC_API_KEY.

const PROMPT = `Hôm nay là năm 2026. Hãy TÌM KIẾM WEB tin mới nhất về thị trường THÉP VIỆT NAM:
giá HRC, nhu cầu tiêu thụ, dự báo của Hiệp hội Thép VN (VSA), đầu tư công, xây dựng, thuế chống bán phá giá.
Trả về DUY NHẤT một object JSON (không markdown, không giải thích):
{
 "asOf":"MM/YYYY",
 "demandTrendPct": <số: tăng trưởng cầu thép toàn ngành dự kiến năm nay, %>,
 "priceTrendPct": <số: xu hướng giá HRC, %>,
 "byCategory": {"Thép tấm HRC": <số %>, "Cuộn HRC": <số %>, "Thép hình": <số %>, "Thép cây": <số %>, "Xà gồ C/Z": <số %>, "Thép tấm gân": <số %>},
 "summary": "<2-3 câu tiếng Việt tóm tắt tình hình & dự báo>",
 "sources": [{"title":"<tiêu đề>","url":"<link>"}]
}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "Server chưa cấu hình ANTHROPIC_API_KEY (Vercel → Settings → Environment Variables)." });
    return;
  }
  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1800,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: PROMPT }],
      }),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: (data && data.error && data.error.message) || "API " + upstream.status });
      return;
    }
    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    let t = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    let parsed = null;
    try {
      parsed = JSON.parse(t);
    } catch {
      const m = t.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
      }
    }
    if (!parsed) {
      res.status(502).json({ error: "Không đọc được dữ liệu thị trường từ web." });
      return;
    }
    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
