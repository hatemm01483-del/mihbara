// سيرفر NewsCast 360 — Cloudflare Worker
// المتغيرات (Settings → Variables and Secrets):
//   GEMINI_API_KEY     (Secret)  مفتاح جوجل Gemini المجاني (من aistudio.google.com) — لو موجود بيتستخدم هو
//   GEMINI_MODEL       (Text)    موديل جوجل (اختياري، السيرفر بيختار أحدث موديل flash لوحده)
//   ANTHROPIC_API_KEY  (Secret)  مفتاح Claude (لما تحب تحوّل له بعدين؛ امسح GEMINI_API_KEY)
//   DID_API_KEY        (Secret)  مفتاح D-ID للمذيع بالفيديو (اختياري)
//   APP_TOKEN          (Secret)  كلمة سرية، نفسها في config.js (اختياري)
//   MODEL              (Text)    الموديل للأدوات العادية، مثلاً claude-haiku-5-5 (الأسرع والأرخص)
//   VERIFY_MODEL       (Text)    الموديل لأداة التحقق بالبحث (اختياري، الافتراضي claude-sonnet-5-5)
//   TRUSTED_DOMAINS    (Text)    قايمة مواقع موثوقة مفصولة بفواصل (اختياري، فيه قايمة جاهزة)
// --- الاحتياطي (v3.4) ---
//   AI                 (Workers AI binding)  من Settings → Bindings → Workers AI، الاسم AI.
//                      لو Gemini وقع أو وصل للحد، السيرفر بيحوّل لوحده على موديلات Cloudflare من غير ما الطالب يحس.
//   CF_AI_MODEL        (Text)    موديل Cloudflare الاحتياطي (اختياري)
//   GEMINI_LITE_MODEL  (Text)    موديل Gemini الأخف اللي بيتجرّب قبل الاحتياطي (اختياري)
// --- الحسابات والاشتراك (v3.1) ---
//   USERS              (KV namespace binding)  مخزن الحسابات — من Settings → Bindings → KV namespace
//   AUTH_SECRET        (Secret)  اختياري: لو مش موجود السيرفر بيعمل واحد عشوائي لوحده ويحفظه في USERS
//   PAYMOB_SECRET_KEY  (Secret)  Secret key من لوحة Paymob
//   PAYMOB_PUBLIC_KEY  (Text)    Public key من لوحة Paymob
//   PAYMOB_HMAC        (Secret)  HMAC secret من لوحة Paymob
//   PAYMOB_INTEGRATIONS(Text)    أرقام الـ Integration IDs (كارت، محافظ) مفصولة بفواصل
//   PRICE_MONTH        (Text)    سعر الشهر بالجنيه (الافتراضي 229)
//   TRIAL_DAYS         (Text)    أيام التجربة المجانية (الافتراضي 1)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-app-token,authorization,x-device",
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
// ---------- الاحتياطي: لو Gemini وقع ----------
// لو Gemini رجّع 429 (الحد خلص) أو 5xx أو اتأخر، بنوقفه دقيقة ونحوّل على طول للاحتياطي عشان مفيش تأخير على الطلبات اللي بعدها
let geminiCoolUntil = 0;
const GEMINI_TIMEOUT = 25000;
const geminiCooling = () => Date.now() < geminiCoolUntil;
function geminiTrip(status) { if (status === 429 || status >= 500 || status === 0) geminiCoolUntil = Date.now() + (status === 429 ? 60000 : 20000); }
async function gfetch(url, init) {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(GEMINI_TIMEOUT) }); }
  catch (e) { return new Response(JSON.stringify({ error: "timeout" }), { status: 504 }); }
}
const CF_MODELS = (env) => [env.CF_AI_MODEL, "@cf/google/gemma-4-26b-a4b-it", "@cf/zai-org/glm-4.7-flash", "@cf/meta/llama-3.3-70b-instruct-fp8-fast"].filter(Boolean);
// بيحوّل رد Cloudflare AI (بأي شكل من الشكلين) لنفس أحداث التطبيق
function cfToEvents(upBody) {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const send = (c, o) => c.enqueue(enc.encode("data: " + JSON.stringify(o) + "\n\n"));
  let buf = "";
  const reader = upBody.getReader();
  return new ReadableStream({
    async pull(c) {
      for (;;) {
        const before = c.desiredSize;
        const { done, value } = await reader.read();
        if (done) { send(c, { type: "message_stop" }); c.enqueue(enc.encode("data: [DONE]\n\n")); c.close(); return; }
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          if (!line.startsWith("data:")) continue;
          const d = line.slice(5).trim(); if (!d || d === "[DONE]") continue;
          let ev; try { ev = JSON.parse(d); } catch { continue; }
          const t = typeof ev.response === "string" ? ev.response : (((ev.choices || [])[0] || {}).delta || {}).content;
          if (t) send(c, { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: t } });
        }
        if (c.desiredSize < before) return;
      }
    },
    cancel() { reader.cancel(); },
  });
}
async function viaCloudflare(env, prompt, maxTokens) {
  if (!env.AI) return null;
  for (const m of CF_MODELS(env)) {
    try {
      const st = await env.AI.run(m, { messages: [{ role: "user", content: prompt }], stream: true, max_tokens: maxTokens || 3000 });
      if (st && typeof st.getReader === "function") return cfToEvents(st);
    } catch (e) { /* الموديل ده مش متاح، نجرّب اللي بعده */ }
  }
  return null;
}
async function cfText(env, prompt, maxTokens) {
  if (!env.AI) return null;
  for (const m of CF_MODELS(env)) {
    try {
      const r = await env.AI.run(m, { messages: [{ role: "user", content: prompt }], max_tokens: maxTokens || 4000 });
      const t = typeof r === "string" ? r : r && (typeof r.response === "string" ? r.response : ((((r.choices || [])[0] || {}).message || {}).content));
      if (t) return t;
    } catch (e) { }
  }
  return null;
}
function b64ToBytes(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }

// بنستنى أول جزء من رد Gemini مدة محددة بس؛ لو اتأخر بنحوّل على Cloudflare بدل ما المستخدم يستنى
async function primeStream(body, ms) {
  const reader = body.getReader();
  let timer;
  const first = await Promise.race([reader.read(), new Promise((r) => { timer = setTimeout(() => r(null), ms); })]).catch(() => null);
  clearTimeout(timer);
  if (!first || first.done) { try { reader.cancel(); } catch (e) { } return null; }
  return new ReadableStream({
    start(c) { c.enqueue(first.value); },
    async pull(c) { const { done, value } = await reader.read(); if (done) c.close(); else c.enqueue(value); },
    cancel() { reader.cancel(); },
  });
}
async function viaGemini(env, prompt, search, trusted) {
  if (!env.GEMINI_API_KEY || geminiCooling()) return new Response("{}", { status: 503 });
  const model = await pickGemini(env);
  const body = {
    contents: [{ role: "user", parts: [{ text: search ? prompt + "\n\nاعتمد في البحث على المصادر الرسمية والموثوقة قدر الإمكان، مثل: " + trusted.slice(0, 15).join("، ") : prompt }] }],
    generationConfig: { maxOutputTokens: search ? 3000 : 4000, temperature: 0.7 },
  };
  if (search) body.tools = [{ google_search: {} }];
  body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  const call1 = (m, b) => gfetch(GBASE + "/models/" + m + ":streamGenerateContent?alt=sse", {
    method: "POST",
    headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
    body: JSON.stringify(b),
  });
  // من غير "تفكير" الرد بيبدأ أسرع بكتير؛ لو الموديل مش بيقبل الإعداد ده نشيله ونعيد
  const call = async (m, b) => {
    let r = await call1(m, b);
    if (r.status === 400 && b.generationConfig.thinkingConfig) { delete b.generationConfig.thinkingConfig; r = await call1(m, b); }
    return r;
  };
  let up = await call(model, body);
  if (!up.ok && search && (up.status === 400 || up.status === 429)) {
    // البحث مش متاح أو خلص الحد المجاني بتاعه: نكمل من غير بحث
    delete body.tools; up = await call(model, body);
  }
  if (!up.ok && up.status === 404 && !env.GEMINI_MODEL) {
    cachedGemini = null; up = await call("gemini-flash-latest", body);
  }
  if (!up.ok && (up.status === 429 || up.status >= 500)) {
    // الموديل الأساسي مشغول: نجرّب الموديل الأخف (حدوده أعلى) قبل الاحتياطي
    delete body.tools; up = await call(env.GEMINI_LITE_MODEL || "gemini-flash-lite-latest", body);
  }
  if (!up.ok) geminiTrip(up.status);
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

// ---------- الحسابات والاشتراكات (v3.1) ----------
// بتشتغل لما تربط KV اسمه USERS. من غيرهم السيرفر بيشتغل زي الأول من غير تسجيل دخول.
const DAY = 86400000;
const TE = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function hmacHex(alg, key, msg) {
  const k = await crypto.subtle.importKey("raw", TE.encode(key), { name: "HMAC", hash: alg }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", k, TE.encode(msg)));
}
async function pwHash(pw, salt) {
  const k = await crypto.subtle.importKey("raw", TE.encode(pw), "PBKDF2", false, ["deriveBits"]);
  return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: TE.encode(salt), iterations: 100000, hash: "SHA-256" }, k, 256));
}
function safeEq(a, b) { a = String(a || ""); b = String(b || ""); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
const authOn = (env) => !!env.USERS;
// مفتاح توقيع الجلسات: من AUTH_SECRET لو موجود، وإلا السيرفر بيعمل مفتاح عشوائي مرة واحدة ويحفظه في KV
let SECRET_CACHE = null;
async function authSecret(env) {
  if (env.AUTH_SECRET) return env.AUTH_SECRET;
  if (SECRET_CACHE) return SECRET_CACHE;
  let s = await env.USERS.get("cfg:auth-secret");
  if (!s) { s = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join(""); await env.USERS.put("cfg:auth-secret", s); }
  return (SECRET_CACHE = s);
}
const payOn = (env) => !!(env.PAYMOB_SECRET_KEY && env.PAYMOB_PUBLIC_KEY && env.PAYMOB_INTEGRATIONS && env.PAYMOB_HMAC);
// 3 خطط: مجاني (FREE_DAILY استخدام ذكي في اليوم) · طالب · محترف. التجربة المجانية = محترف.
const PLAN = (env) => {
  const pro = +(env.PRICE_PRO || env.PRICE_MONTH || 229), student = +(env.PRICE_STUDENT || 99);
  return { trialDays: +(env.TRIAL_DAYS || 1), price: pro, days: +(env.PLAN_DAYS || 30), currency: "EGP", freeDaily: +(env.FREE_DAILY || 3), prices: { student, pro } };
};
const TIERS = { free: 0, student: 1, pro: 2 };
function tierOf(u) {
  if (!u) return "free";
  const now = Date.now();
  if ((u.subEnd || 0) > now || (u.trialEnd || 0) > now) return "pro";
  if ((u.stuEnd || 0) > now) return "student";
  return "free";
}

async function makeToken(env, uid) {
  const exp = Date.now() + 365 * DAY, body = uid + "." + exp;
  return body + "." + (await hmacHex("SHA-256", await authSecret(env), body));
}
async function userFromReq(req, env) {
  const h = req.headers.get("authorization") || "", t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [uid, exp, sig] = t.split(".");
  if (!uid || !exp || !sig || +exp < Date.now()) return null;
  if (!safeEq(sig, await hmacHex("SHA-256", await authSecret(env), uid + "." + exp))) return null;
  return await env.USERS.get("u:" + uid, "json");
}
function stateOf(u, env) {
  const now = Date.now(), p = PLAN(env);
  const mode = (u.subEnd || 0) > now || (u.stuEnd || 0) > now ? "sub" : u.trialEnd > now ? "trial" : "expired";
  return { email: u.email, name: u.name || "", mode, tier: tierOf(u), active: mode !== "expired", trialEnd: u.trialEnd || 0, subEnd: u.subEnd || 0, stuEnd: u.stuEnd || 0, now, plan: p };
}
const putUser = (env, u) => env.USERS.put("u:" + u.id, JSON.stringify(u));

async function authRoutes(req, env, url) {
  const p = url.pathname;
  if (p === "/auth/register" && req.method === "POST") {
    let b; try { b = await req.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
    const email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || ""), name = String(b.name || "").trim().slice(0, 60);
    const device = String(b.device || "").replace(/[^\w-]/g, "").slice(0, 64);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return json({ error: "bad_email" }, 400);
    if (pw.length < 6 || pw.length > 128) return json({ error: "weak_password" }, 400);
    if (await env.USERS.get("e:" + email)) return json({ error: "exists" }, 409);
    const id = crypto.randomUUID(), salt = crypto.randomUUID(), now = Date.now();
    let trialEnd = now + PLAN(env).trialDays * DAY, trialUsed = false;
    if (device) { if (await env.USERS.get("d:" + device)) { trialEnd = 0; trialUsed = true; } else await env.USERS.put("d:" + device, id); }
    const u = { id, email, name, salt, pw: await pwHash(pw, salt), created: now, trialEnd, subEnd: 0, pays: [] };
    await putUser(env, u); await env.USERS.put("e:" + email, id);
    return json({ token: await makeToken(env, id), me: stateOf(u, env), trialUsed });
  }
  if (p === "/auth/login" && req.method === "POST") {
    let b; try { b = await req.json(); } catch (e) { return json({ error: "bad_request" }, 400); }
    const email = String(b.email || "").trim().toLowerCase(), pw = String(b.password || "");
    const id = await env.USERS.get("e:" + email), u = id && (await env.USERS.get("u:" + id, "json"));
    if (!u || !safeEq(await pwHash(pw, u.salt), u.pw)) return json({ error: "bad_login" }, 401);
    return json({ token: await makeToken(env, u.id), me: stateOf(u, env) });
  }
  if (p === "/auth/delete" && req.method === "POST") {
    const u = await userFromReq(req, env); if (!u) return json({ error: "login_required" }, 401);
    let b = {}; try { b = await req.json(); } catch (e) { }
    if (!safeEq(await pwHash(String(b.password || ""), u.salt), u.pw)) return json({ error: "bad_login" }, 403);
    await deleteUser(env, u);
    return json({ ok: true });
  }
  if (p === "/me") {
    const u = await userFromReq(req, env); if (!u) return json({ error: "login_required" }, 401);
    return json(stateOf(u, env));
  }
  if (p === "/pay/start" && req.method === "POST") {
    const u = await userFromReq(req, env); if (!u) return json({ error: "login_required" }, 401);
    if (!env.PAYMOB_SECRET_KEY || !env.PAYMOB_PUBLIC_KEY || !env.PAYMOB_INTEGRATIONS) return json({ error: "pay_not_ready" }, 503);
    let b = {}; try { b = await req.json(); } catch (e) { }
    const phone = String(b.phone || "").replace(/[^\d+]/g, "").slice(0, 16) || "+201000000000";
    const pl = PLAN(env), tier = b.plan === "student" ? "student" : "pro", cents = Math.round(pl.prices[tier] * 100), ref = "nc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const nm = (u.name || u.email.split("@")[0]).split(/\s+/);
    const body = {
      amount: cents, currency: "EGP",
      payment_methods: String(env.PAYMOB_INTEGRATIONS).split(",").map((x) => parseInt(x.trim(), 10)).filter(Boolean),
      items: [{ name: "NewsCast 360 - " + (tier === "student" ? "خطة الطالب" : "خطة المحترف") + " (شهر)", amount: cents, description: pl.days + " يوم", quantity: 1 }],
      billing_data: { first_name: nm[0] || "Student", last_name: nm.slice(1).join(" ") || "NewsCast", email: u.email, phone_number: phone,
        apartment: "NA", floor: "NA", street: "NA", building: "NA", city: "NA", country: "EG", state: "NA", postal_code: "NA" },
      special_reference: ref, notification_url: url.origin + "/pay/webhook", redirection_url: url.origin + "/pay/done",
    };
    const r = await fetch("https://accept.paymob.com/v1/intention/", { method: "POST", headers: { Authorization: "Token " + env.PAYMOB_SECRET_KEY, "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.client_secret) return json({ error: "pay_failed", detail: (j && (j.detail || j.message)) || r.status }, 502);
    await env.USERS.put("o:" + ref, JSON.stringify({ uid: u.id, cents, tier, status: "pending", at: Date.now(), po: j.intention_order_id || null }), { expirationTtl: 60 * DAY / 1000 });
    if (j.intention_order_id) await env.USERS.put("po:" + j.intention_order_id, ref, { expirationTtl: 60 * DAY / 1000 });
    return json({ ref, url: "https://accept.paymob.com/unifiedcheckout/?publicKey=" + encodeURIComponent(env.PAYMOB_PUBLIC_KEY) + "&clientSecret=" + encodeURIComponent(j.client_secret) });
  }
  if (p === "/pay/webhook" && req.method === "POST") {
    let b; try { b = await req.json(); } catch (e) { return json({ ok: false }, 400); }
    const o = b && b.obj; if (!o || b.type !== "TRANSACTION") return json({ ok: true });
    const g = (path) => path.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
    const ok = await paymobVerify(env, url.searchParams.get("hmac") || b.hmac, (k) => g(k === "order" ? "order.id" : k));
    if (!ok) return json({ ok: false }, 401);
    await applyPaid(env, { success: o.success, pending: o.pending, voided: o.is_voided, refunded: o.is_refunded, cents: o.amount_cents, txn: o.id, order: g("order.id"), ref: g("order.merchant_order_id") });
    return json({ ok: true });
  }
  if (p === "/pay/done") {
    const q = url.searchParams; let paid = false;
    if (q.get("hmac") && (await paymobVerify(env, q.get("hmac"), (k) => q.get(k)))) {
      const B = (k) => q.get(k) === "true";
      paid = await applyPaid(env, { success: B("success"), pending: B("pending"), voided: B("is_voided"), refunded: B("is_refunded"), cents: +q.get("amount_cents"), txn: q.get("id"), order: q.get("order"), ref: q.get("merchant_order_id") });
    }
    const okMsg = paid || q.get("success") === "true";
    return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NewsCast 360</title>
<body style="font-family:system-ui,sans-serif;background:#0e0e13;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:20px">
<div><div style="font-size:64px">${okMsg ? "✅" : "⚠️"}</div><h1 style="font-size:22px">${okMsg ? "تم الدفع والاشتراك اتفعّل" : "الدفع ماكملش"}</h1>
<p style="opacity:.8">${okMsg ? "ارجع لتطبيق NewsCast 360 دلوقتي، هتلاقي الاشتراك شغال." : "ارجع للتطبيق وجرّب تاني، ومفيش أي فلوس اتخصمت لو العملية فشلت."}</p></div></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return null;
}
const HMAC_KEYS = ["amount_cents", "created_at", "currency", "error_occured", "has_parent_transaction", "id", "integration_id", "is_3d_secure", "is_auth", "is_capture", "is_refunded", "is_standalone_payment", "is_voided", "order", "owner", "pending", "source_data.pan", "source_data.sub_type", "source_data.type", "success"];
async function paymobVerify(env, given, get) {
  if (!env.PAYMOB_HMAC || !given) return false;
  const s = HMAC_KEYS.map((k) => { const v = get(k); return v == null ? "" : String(v); }).join("");
  return safeEq((await hmacHex("SHA-512", env.PAYMOB_HMAC, s)).toLowerCase(), String(given).toLowerCase());
}
async function applyPaid(env, t) {
  if (!(t.success === true && t.pending === false && !t.voided && !t.refunded)) return false;
  let ref = t.ref && (await env.USERS.get("o:" + t.ref)) ? t.ref : null;
  if (!ref && t.order) ref = await env.USERS.get("po:" + t.order);
  if (!ref) return false;
  const ord = await env.USERS.get("o:" + ref, "json"); if (!ord) return false;
  if (ord.status === "paid") return true;
  if (+t.cents < ord.cents) return false;
  const u = await env.USERS.get("u:" + ord.uid, "json"); if (!u) return false;
  const now = Date.now(), days = PLAN(env).days;
  // كل خطة ليها مدتها: محترف = subEnd، طالب = stuEnd (والشراء التاني بيتضاف على اللي فاضل)
  const f = ord.tier === "student" ? "stuEnd" : "subEnd";
  u[f] = Math.max(now, u[f] || 0) + days * DAY;
  u.pays = (u.pays || []).concat([{ ref, txn: t.txn, cents: +t.cents, tier: ord.tier || "pro", at: now }]).slice(-24);
  await putUser(env, u);
  ord.status = "paid"; ord.txn = t.txn; ord.paidAt = now;
  await env.USERS.put("o:" + ref, JSON.stringify(ord), { expirationTtl: 365 * DAY / 1000 });
  return true;
}
// مين يستخدم إيه:
//  /media و /did (التفريغ والصوت والصورة والمذيع الافتراضي) → خطة المحترف أو التجربة
//  /ai و /tts → خطة الطالب أو أعلى، والمجاني ليه FREE_DAILY استخدام في اليوم (بالحساب أو برقم الجهاز) من غير تسجيل دخول
async function gate(req, env, path) {
  // الخطط بتتطبّق بس لما الحسابات والدفع الاتنين يكونوا متفعّلين (عشان محدش يتقفل عليه من غير ما يقدر يدفع)
  if (!authOn(env) || !payOn(env)) return null;
  const u = await userFromReq(req, env), tier = tierOf(u), pl = PLAN(env);
  const need = path === "/media" || path.startsWith("/did/") ? "pro" : "student";
  if (TIERS[tier] >= TIERS[need]) return null;
  if (need === "pro") return json({ error: "subscription_required", need, tier }, 402);
  const who = u ? "u" + u.id : "d" + String(/^Device /.test(req.headers.get("authorization") || "") ? req.headers.get("authorization").slice(7) : req.headers.get("x-device") || "").replace(/[^\w-]/g, "").slice(0, 64);
  if (who === "d") return json({ error: "subscription_required", need, tier, left: 0 }, 402);
  const key = "q:" + who + ":" + new Date().toISOString().slice(0, 10), used = +((await env.USERS.get(key)) || 0);
  if (used >= pl.freeDaily) return json({ error: "subscription_required", need, tier, left: 0 }, 402);
  await env.USERS.put(key, String(used + 1), { expirationTtl: 2 * 86400 });
  return null;
}

// ---------- صفحات عامة: سياسة الخصوصية وحذف الحساب (مطلوبين لـ Google Play) ----------
const PRIVACY_BODY = "<p class=\"upd\">آخر تحديث: 13 نوفمبر 2026</p>\n<p>توضح هذه السياسة كيف يتعامل تطبيق «NewsCast 360» مع بياناتك. التطبيق يعمل بدون حساب، والحساب اختياري.</p>\n<h3>1. البيانات التي نجمعها</h3>\n<ul>\n<li><b>الحساب (اختياري):</b> الاسم والبريد الإلكتروني وكلمة المرور. تُحفظ كلمة المرور بعد تشفيرها بطريقة لا تسمح لنا بمعرفتها.</li>\n<li><b>الاشتراك:</b> الخطة وتاريخ بدايتها ونهايتها ومرجع ومبلغ كل عملية دفع. بيانات البطاقة أو المحفظة تُكتب في صفحة الدفع الخاصة بشركة Paymob ولا تصل إلينا. رقم الهاتف (اختياري) يُرسل إلى Paymob فقط للدفع بالمحفظة.</li>\n<li><b>معرّف الجهاز:</b> رقم مميّز لجهازك (Android ID) نستخدمه فقط لحساب الاستخدامات المجانية اليومية ولمنع تكرار التجربة المجانية.</li>\n</ul>\n<h3>2. البيانات التي تُعالَج عند استخدام الأدوات</h3>\n<ul>\n<li>النصوص التي تكتبها، والتسجيلات الصوتية أو الصور التي تختار تحليلها، تُرسل إلى مزوّد خدمة ذكاء اصطناعي (Google Gemini، وCloudflare Workers AI كبديل احتياطي) لإنتاج النتيجة، ولا نحتفظ بنسخة منها على خوادمنا.</li>\n<li>عند استخدام المذيع بالفيديو تُرسل الصورة والنص إلى مزوّد توليد الفيديو (D-ID).</li>\n<li>أداة التحقق تبحث عن نص الخبر في مصادر رسمية وموثوقة.</li>\n</ul>\n<h3>3. الميكروفون والكاميرا والإشعارات</h3>\n<p>يُستخدم الميكروفون والكاميرا فقط عندما تفتح أداة تسجيل بنفسك، وتبقى التسجيلات على جهازك إلا إذا طلبت تحليلها. الإشعارات للأخبار العاجلة في اهتماماتك، ويمكنك إيقافها من الإعدادات.</p>\n<h3>4. ما يُحفظ على جهازك</h3>\n<p>سجل نتائجك، ودرجات الاختبارات واللعبة، وتفضيلاتك، وصورة المذيع التي تختارها. لا تُرفع إلى خوادمنا، ويمكنك مسحها من الإعدادات داخل التطبيق.</p>\n<h3>5. ما لا نفعله</h3>\n<ul><li>لا إعلانات، ولا أدوات تتبّع أو تحليلات.</li><li>لا نبيع بياناتك ولا نشاركها لأغراض تسويقية.</li></ul>\n<h3>6. حذف الحساب</h3>\n<p>يمكنك حذف حسابك في أي وقت من داخل التطبيق (الحساب ← حذف الحساب)، أو من صفحة <a href=\"https://mihbara.hatem-m01483.workers.dev/delete-account\">حذف الحساب</a>. يُحذف الاسم والبريد وكلمة المرور وبيانات الاشتراك فورًا. نحتفظ فقط بعلامة على الجهاز تمنع تكرار التجربة المجانية، وبسجلات الدفع للمدة التي يفرضها القانون.</p>\n<h3>7. الأطفال</h3>\n<p>التطبيق موجّه لطلاب الجامعات. لا يُنصح باستخدامه لمن هم دون 13 عامًا إلا تحت إشراف ولي الأمر أو المعلّم.</p>\n<h3>8. التعديلات والتواصل</h3>\n<p>قد نحدّث هذه السياسة، ويظهر تاريخ آخر تحديث في أعلاها. لأي استفسار: CONTACT_PLACEHOLDER</p>";
function page(title, body) {
  return new Response(`<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — NewsCast 360</title>
<style>body{margin:0;background:#F6F6F9;color:#15151C;font-family:system-ui,"Segoe UI",Tahoma,sans-serif;line-height:1.8}main{max-width:720px;margin:0 auto;padding:28px 18px 60px}h1{font-size:26px;margin:0 0 4px}h3{margin:22px 0 6px;font-size:17px}.upd{color:#6E6E7E;font-size:14px}a{color:#BE123C}form{display:grid;gap:10px;margin-top:16px;background:#fff;border:1px solid #E7E7EF;border-radius:16px;padding:18px}input{font:inherit;padding:11px 12px;border:1px solid #D6D6E0;border-radius:10px}button{font:inherit;font-weight:700;padding:12px;border:0;border-radius:12px;background:#BE123C;color:#fff;cursor:pointer}.msg{padding:12px 14px;border-radius:12px;background:#fff;border:1px solid #E7E7EF}</style>
<main><h1>NewsCast 360</h1>${body}</main></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
function privacyHtml(env) {
  const c = env.CONTACT_EMAIL ? `<a href="mailto:${String(env.CONTACT_EMAIL).replace(/[<>"']/g, "")}" dir="ltr">${String(env.CONTACT_EMAIL).replace(/[<>"']/g, "")}</a>` : "تواصل مع فريق NewsCast 360.";
  return PRIVACY_BODY.replace("CONTACT_PLACEHOLDER", c);
}
async function deleteUser(env, u) {
  await env.USERS.delete("u:" + u.id);
  if (u.email) await env.USERS.delete("e:" + u.email);
}
async function deleteAccountPage(req, env) {
  const form = `<h3>حذف الحساب</h3><p>اكتب الإيميل وكلمة السر بتوع حسابك. هيتحذف الاسم والإيميل وكلمة السر وبيانات الاشتراك فورًا، والحذف مش هينفع يترجع.</p>
<form method="post"><label>الإيميل<br><input name="email" type="email" required dir="ltr" autocomplete="email"></label><label>كلمة السر<br><input name="password" type="password" required dir="ltr" autocomplete="current-password"></label><button type="submit">احذف حسابي نهائيًا</button></form>
<p>تقدر كمان تحذفه من التطبيق: الحساب ← حذف الحساب. <a href="/privacy">سياسة الخصوصية</a></p>`;
  if (req.method !== "POST") return page("حذف الحساب", form);
  if (!authOn(env)) return page("حذف الحساب", `<p class="msg">الحسابات مش متفعّلة على السيرفر، فمفيش بيانات حساب محفوظة عندنا.</p>`);
  let f; try { f = await req.formData(); } catch (e) { return page("حذف الحساب", form); }
  const email = String(f.get("email") || "").trim().toLowerCase(), pw = String(f.get("password") || "");
  const id = await env.USERS.get("e:" + email), u = id && (await env.USERS.get("u:" + id, "json"));
  if (!u || !safeEq(await pwHash(pw, u.salt), u.pw)) return page("حذف الحساب", `<p class="msg">الإيميل أو كلمة السر غلط.</p>` + form);
  await deleteUser(env, u);
  return page("حذف الحساب", `<p class="msg">✅ اتحذف الحساب وكل بياناته.</p>`);
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);

    // صفحات عامة (من غير APP_TOKEN): سياسة الخصوصية وحذف الحساب
    if (url.pathname === "/privacy") return page("سياسة الخصوصية", `<h3 style="margin-top:8px">سياسة الخصوصية</h3>` + privacyHtml(env));
    if (url.pathname === "/delete-account") return deleteAccountPage(req, env);

    // الدفع: Paymob بيكلّم السيرفر مباشرة، فالمسارات دي قبل فحص APP_TOKEN
    if (authOn(env) && (url.pathname === "/pay/webhook" || url.pathname === "/pay/done")) {
      const r = await authRoutes(req, env, url); if (r) return r;
    }

    if (env.APP_TOKEN && req.headers.get("x-app-token") !== env.APP_TOKEN)
      return json({ error: "unauthorized" }, 401);

    if (authOn(env) && (url.pathname.startsWith("/auth/") || url.pathname === "/me" || url.pathname.startsWith("/pay/"))) {
      const r = await authRoutes(req, env, url); if (r) return r;
    }
    if (url.pathname === "/media" || url.pathname === "/tts" || url.pathname === "/ai" || url.pathname.startsWith("/did/")) {
      const g = await gate(req, env, url.pathname); if (g) return g;
    }

    if (url.pathname === "/status")
      return json({ ai: !!(env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY || env.AI), provider: env.GEMINI_API_KEY ? "gemini" : (env.ANTHROPIC_API_KEY ? "claude" : null), did: !!env.DID_API_KEY, tts: !!env.GEMINI_API_KEY, media: !!(env.GEMINI_API_KEY || env.AI), fallback: !!env.AI, auth: authOn(env), pay: payOn(env), plan: PLAN(env) });

    // ملف صوت أو صورة + تعليمات → نص (تفريغ المقابلات، ملخص المحاضرة، معمل الصوت)
    if (url.pathname === "/media" && req.method === "POST") {
      if (!env.GEMINI_API_KEY && !env.AI) return json({ error: "no_media" }, 503);
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
      const data = String(body.data || ""), mime = String(body.mime || "").toLowerCase().split(";")[0];
      const prompt = String(body.prompt || "").slice(0, 6000);
      if (!data || !prompt || !/^(audio|image|video)\/[\w.+-]+$/.test(mime)) return json({ error: "bad_request" }, 400);
      if (data.length > 17 * 1024 * 1024) return json({ error: "too_big" }, 413);
      const payload = {
        contents: [{ role: "user", parts: [{ inline_data: { mime_type: mime, data } }, { text: prompt }] }],
        generationConfig: { maxOutputTokens: 8000, temperature: 0.3 },
      };
      const call = (m) => gfetch(GBASE + "/models/" + m + ":generateContent", {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      let up = new Response("{}", { status: 503 });
      if (env.GEMINI_API_KEY && !geminiCooling()) {
        up = await call(await pickGemini(env));
        if (!up.ok && up.status === 404 && !env.GEMINI_MODEL) { cachedGemini = null; up = await call("gemini-flash-latest"); }
        if (!up.ok && (up.status === 429 || up.status >= 500)) up = await call(env.GEMINI_LITE_MODEL || "gemini-flash-lite-latest");
        if (!up.ok) geminiTrip(up.status);
      }
      if (up.ok) {
        const j = await up.json();
        const text = ((((j.candidates || [])[0] || {}).content || {}).parts || []).map((p) => p.text || "").join("");
        return json({ text, provider: "gemini" });
      }
      // الاحتياطي للصوت: Whisper يفرّغ، وبعدين موديل نصي ينفّذ المطلوب على التفريغ
      if (env.AI && mime.startsWith("audio/")) {
        try {
          const w = await env.AI.run(env.CF_WHISPER_MODEL || "@cf/openai/whisper-large-v3-turbo", { audio: data, language: "ar" });
          const transcript = (w && (w.text || (w.segments || []).map((x) => x.text).join(" "))) || "";
          if (transcript) {
            const out = await cfText(env, prompt + "\n\nده التفريغ النصي للتسجيل (اتعمل أوتوماتيك، ومفيهوش توقيتات دقيقة):\n" + transcript, 6000);
            return json({ text: out || transcript, provider: "cloudflare" });
          }
        } catch (e) { }
      }
      return json({ error: "upstream", status: up.status }, up.status === 429 ? 429 : 502);
    }

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
      if (!env.GEMINI_API_KEY && !env.ANTHROPIC_API_KEY && !env.AI) return json({ error: "no_ai" }, 503);
      let body;
      try { body = await req.json(); } catch { return json({ error: "bad_request" }, 400); }
      const prompt = String(body.prompt || "").slice(0, 30000);
      if (!prompt.trim()) return json({ error: "bad_request" }, 400);
      const search = !!body.search;
      const trusted = (env.TRUSTED_DOMAINS ? env.TRUSTED_DOMAINS.split(",") : DEFAULT_TRUSTED).map((d) => d.trim()).filter(Boolean);
      if (env.GEMINI_API_KEY || env.AI) {
        const up = await viaGemini(env, prompt, search, trusted);
        const gs = up.ok ? await primeStream(up.body, search ? 15000 : 11000) : null;
        if (gs) return new Response(geminiToEvents(gs), { headers: { ...CORS, "content-type": "text/event-stream", "x-provider": "gemini" } });
        // الاحتياطي: Cloudflare AI
        const fb = await viaCloudflare(env, prompt, search ? 3000 : 4000);
        if (fb) return new Response(fb, { headers: { ...CORS, "content-type": "text/event-stream", "x-provider": "cloudflare" } });
        if (!env.ANTHROPIC_API_KEY) return json({ error: "upstream", status: up.status }, up.status === 429 ? 429 : 502);
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
