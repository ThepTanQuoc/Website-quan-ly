// Vercel Serverless Function — cầu nối gọi Anthropic API an toàn (giữ khoá ở server).
// Frontend (Module 1 & 2) POST tới /api/extract thay vì gọi thẳng api.anthropic.com.
// Cần đặt biến môi trường ANTHROPIC_API_KEY trong Vercel → Settings → Environment Variables.

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({
      error:
        "Server chưa cấu hình ANTHROPIC_API_KEY. Vào Vercel → Settings → Environment Variables để thêm khoá.",
    });
    return;
  }

  try {
    let body = req.body;
    if (body == null || typeof body === "string") {
      const raw = typeof body === "string" ? body : await readRaw(req);
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        body = {};
      }
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: body.max_tokens || 4000,
        messages: body.messages || [],
        ...(body.system ? { system: body.system } : {}),
      }),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.send(text);
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
