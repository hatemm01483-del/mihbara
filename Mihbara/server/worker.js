// سيرفر مِحبرة — Cloudflare Worker
// المتغيرات (Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  (Secret)  مفتاح الذكاء الاصطناعي
//   DID_API_KEY        (Secret)  مفتاح D-ID للمذيع بالفيديو (اختياري)
//   APP_TOKEN          (Secret)  كلمة سرية، نفسها في config.js (اختياري)
//   MODEL              (Text)    اسم الموديل (اختياري، لو فاضي بيختار أحدث Sonnet لوحده)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-app-token",
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });

let cachedModel = null;
async function pickModel(env) {
  if (env.MODEL) return env.MODEL;
  if (cachedModel) return cachedModel;
  const r = await fetch("https://api.anthropic.com/v1/models?limit=100", {
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
  });
  const list = (await r.json()).data || [];
  const m = list.find((x) => /sonnet/i.test(x.id)) || list[0];
  cachedModel = m ? m.id : "claude-sonnet-4-5";
  return cachedModel;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    if (env.APP_TOKEN && req.headers.get("x-app-token") !== env.APP_TOKEN)
      return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/status")
      return json({ ai: !!env.ANTHROPIC_API_KEY, did: !!env.DID_API_KEY });

    if (url.pathname === "/ai" && req.method === "POST") {
      if (!env.ANTHROPIC_API_KEY) return json({ error: "no_ai" }, 503);
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
      const prompt = String(body.prompt || "").slice(0, 30000);
      if (!prompt.trim()) return json({ error: "bad_request" }, 400);
      const up = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: await pickModel(env),
          max_tokens: 4000,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!up.ok) { if (up.status === 404) cachedModel = null; return json({ error: "upstream", status: up.status }, up.status === 429 ? 429 : 502); }
      return new Response(up.body, { headers: { ...CORS, "content-type": "text/event-stream" } });
    }

    if (url.pathname.startsWith("/did/")) {
      if (!env.DID_API_KEY) return json({ error: "no_did" }, 404);
      const path = url.pathname.slice(4);
      const okPath = path === "/talks" || path === "/images" || /^\/talks\/[\w-]+$/.test(path);
      if (!okPath) return json({ error: "not_found" }, 404);
      const headers = { Authorization: "Basic " + env.DID_API_KEY, accept: "application/json" };
      const ct = req.headers.get("content-type");
      if (ct) headers["content-type"] = ct;
      const up = await fetch("https://api.d-id.com" + path, {
        method: req.method,
        headers,
        body: req.method === "GET" ? undefined : req.body,
      });
      return new Response(up.body, { status: up.status, headers: { ...CORS, "content-type": "application/json" } });
    }

    return json({ error: "not_found" }, 404);
  },
};
