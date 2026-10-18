// سيرفر أثير — Cloudflare Worker
// المتغيرات (Settings → Variables and Secrets):
//   GEMINI_API_KEY     (Secret)  مفتاح جوجل Gemini المجاني (من aistudio.google.com) — لو موجود بيتستخدم هو
//   GEMINI_MODEL       (Text)    موديل جوجل (اختياري، السيرفر بيختار أحدث موديل flash لوحده)
//   ANTHROPIC_API_KEY  (Secret)  مفتاح Claude (لما تحب تحوّل له بعدين؛ امسح GEMINI_API_KEY)
//   DID_API_KEY        (Secret)  مفتاح D-ID للمذيع بالفيديو (اختياري)
//   APP_TOKEN          (Secret)  كلمة سرية، نفسها في config.js (اختياري)
//   MODEL              (Text)    الموديل للأدوات العادية، مثلاً claude-haiku-5-5 (الأسرع والأرخص)
//   VERIFY_MODEL       (Text)    الموديل لأداة التحقق بالبحث (اختياري، الافتراضي claude-sonnet-5-5)
//   TRUSTED_DOMAINS    (Text)    قايمة مواقع موثوقة مفصولة بفواصل (اختياري، فيه قايمة جاهزة)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-app-token",
};
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json" } });

// المصادر الموثوقة اللي أداة التحقق مسموح لها تبحث فيها بس
const DEFAULT_TRUSTED = [
  // جهات رسمية مصرية
  "cabinet.gov.eg", "sis.gov.eg", "presidency.eg", "egypt.gov.eg", "mohp.gov.eg", "moe.gov.eg", "mohesr.gov.eg",
  // وكالات وصحف
  "mena.org.eg", "ahram.org.eg", "youm7.com", "almasryalyoum.com", "shorouknews.com",
  "reuters.com", "apnews.com", "afp.com", "bbc.com", "skynewsarabia.com", "aljazeera.net", "cnn.com", "france24.com",
  // منصات تدقيق المعلومات
  "misbar.com", "fatabyyano.net",
  // منظمات دولية
  "who.int", "un.org",
];

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


// ---------- Gemini (جوجل) ----------
const GBASE = "https://generativelanguage.googleapis.com/v1beta";
let cachedGemini = null;
async function pickGemini(env) {
  if (env.GEMINI_MODEL) return env.GEMINI_MODEL.replace(/^models\//, "");
  if (cachedGemini) return cachedGemini;
  try {
    const r = await fetch(GBASE + "/models?pageSize=200", { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
    const list = ((await r.json()).models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /^gemini-[\d.]+-flash$/.test(n));
    const ver = (n) => parseFloat(n.split("-")[1]) || 0;
    list.sort((a, b) => ver(b) - ver(a));
    cachedGemini = list[0] || "gemini-flash-latest";
  } catch (e) { cachedGemini = "gemini-flash-latest"; }
  return cachedGemini;
}
// بيحوّل رد جوجل لنفس شكل الأحداث اللي التطبيق بيفهمها
function geminiToEvents(upBody) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const send = (c, o) => c.enqueue(enc.encode("data: " + JSON.stringify(o) + "\n\n"));
  let buf = "", sentResults = false;
  const reader = upBody.getReader();
  return new ReadableStream({
    async pull(c) {
      for (;;) {
      const before = c.desiredSize;
      const { done, value } = await reader.read();
      if (done) {
        send(c, { type: "message_stop" });
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
        return;
      }
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let ev; try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }
        if (ev.error) { send(c, { type: "error" }); continue; }
        const cand = (ev.candidates || [])[0] || {};
        for (const p of (cand.content && cand.content.parts) || []) {
          if (p.text && !p.thought) send(c, { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: p.text } });
        }
        const gm = cand.groundingMetadata;
        if (gm && !sentResults) {
          const items = (gm.groundingChunks || []).filter((x) => x.web && x.web.uri).map((x) => ({ type: "web_search_result", url: x.web.uri, title: x.web.title || x.web.uri }));
          if (items.length) {
            sentResults = true;
            send(c, { type: "content_block_start", index: 1, content_block: { type: "server_tool_use", name: "web_search" } });
            send(c, { type: "content_block_start", index: 2, content_block: { type: "web_search_tool_result", content: items } });
          }
        }
      }
      if (c.desiredSize < before) return; // اتبعت حاجة، نستنى الطلب الجاي
      }
    },
    cancel() { reader.cancel(); },
  });
}
async function viaGemini(env, prompt, search, trusted) {
  const model = await pickGemini(env);
  const body = {
    contents: [{ role: "user", parts: [{ text: search ? prompt + "\n\nاعتمد في البحث على المصادر الرسمية والموثوقة قدر الإمكان، مثل: " + trusted.slice(0, 15).join("، ") : prompt }] }],
    generationConfig: { maxOutputTokens: search ? 3000 : 4000, temperature: 0.7 },
  };
  if (search) body.tools = [{ google_search: {} }];
  const call = (m, b) => fetch(GBASE + "/models/" + m + ":streamGenerateContent?alt=sse", {
    method: "POST",
    headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify(b),
  });
  let up = await call(model, body);
  if (!up.ok && search && (up.status === 400 || up.status === 429)) {
    // البحث مش متاح أو خلص الحد المجاني بتاعه: نكمل من غير بحث
    delete body.tools; up = await call(model, body);
  }
  if (!up.ok && up.status === 404 && !env.GEMINI_MODEL) {
    cachedGemini = null; up = await call("gemini-flash-latest", body);
  }
  return up;
}

// ---------- صوت المذيع (Gemini TTS) ----------
let cachedTts = null;
async function pickTts(env) {
  if (env.TTS_MODEL) return env.TTS_MODEL.replace(/^models\//, "");
  if (cachedTts) return cachedTts;
  try {
    const r = await fetch(GBASE + "/models?pageSize=200", { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
    const list = ((await r.json()).models || []).map((m) => m.name.replace(/^models\//, "")).filter((n) => /tts/i.test(n) && /flash/i.test(n));
    const ver = (n) => parseFloat((n.match(/gemini-([\d.]+)/) || [])[1]) || 0;
    list.sort((a, b) => ver(b) - ver(a) || (/preview/.test(a) ? 1 : 0) - (/preview/.test(b) ? 1 : 0));
    cachedTts = list[0] || "gemini-2.5-flash-preview-tts";
  } catch { cachedTts = "gemini-2.5-flash-preview-tts"; }
  return cachedTts;
}
const VOICE_OK = /^[A-Z][a-z]+$/;

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    if (env.APP_TOKEN && req.headers.get("x-app-token") !== env.APP_TOKEN)
      return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/status")
      return json({ ai: !!(env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY), provider: env.GEMINI_API_KEY ? "gemini" : (env.ANTHROPIC_API_KEY ? "claude" : null), did: !!env.DID_API_KEY, tts: !!env.GEMINI_API_KEY });

    if (url.pathname === "/tts" && req.method === "POST") {
      if (!env.GEMINI_API_KEY) return json({ error: "no_tts" }, 503);
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
      const text = String(body.text || "").slice(0, 2500).trim();
      if (!text) return json({ error: "bad_request" }, 400);
      const voice = VOICE_OK.test(String(body.voice || "")) ? body.voice : "Kore";
      const style = String(body.style || "اقرأ بصوت مذيع نشرة أخبار محترف").slice(0, 300);
      const payload = {
        contents: [{ role: "user", parts: [{ text: style + ":\n" + text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      };
      const call = (m) => fetch(GBASE + "/models/" + m + ":generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      let up = await call(await pickTts(env));
      if (!up.ok && up.status === 404 && !env.TTS_MODEL) { cachedTts = null; up = await call("gemini-2.5-flash-preview-tts"); }
      if (!up.ok) return json({ error: "upstream", status: up.status }, up.status === 429 ? 429 : 502);
      // بنعدّي الرد زي ما هو (من غير ما نفكّه) عشان نوفّر وقت المعالجة في السيرفر
      return new Response(up.body, { headers: { ...CORS, "content-type": "application/json" } });
    }

    if (url.pathname === "/ai" && req.method === "POST") {
      if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY) return json({ error: "no_ai" }, 503);
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
      const prompt = String(body.prompt || "").slice(0, 30000);
      if (!prompt.trim()) return json({ error: "bad_request" }, 400);
      const search = !!body.search;
      const trusted = (env.TRUSTED_DOMAINS ? env.TRUSTED_DOMAINS.split(",") : DEFAULT_TRUSTED).map((d) => d.trim()).filter(Boolean);
      if (env.GEMINI_API_KEY) {
        const up = await viaGemini(env, prompt, search, trusted);
        if (!up.ok) return json({ error: "upstream", status: up.status }, up.status === 429 ? 429 : 502);
        return new Response(geminiToEvents(up.body), { headers: { ...CORS, "content-type": "text/event-stream" } });
      }
      const payload = {
        model: search ? (env.VERIFY_MODEL || "claude-sonnet-5-5") : await pickModel(env),
        max_tokens: search ? 3000 : 4000,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      };
      if (search) {
        payload.tools = [{
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4,
          allowed_domains: trusted,
          user_location: { type: "approximate", country: "EG", timezone: "Africa/Cairo" },
        }];
      }
      const call = (pl) => fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify(pl),
      });
      let up = await call(payload);
      if (!up.ok && search && up.status === 400) {
        // البحث مش متاح للحساب/الموديل: نكمل من غير بحث بدل ما نفشل
        delete payload.tools;
        up = await call(payload);
      }
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
