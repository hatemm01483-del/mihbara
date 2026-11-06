/* NewsCast 360 — أدوات مشتركة للتحديثات الجديدة (v3) */
(function () {
  "use strict";
  const NC = window.NC = {};
  NC.E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  NC.T = m => { try { toast(m); } catch (e) { } };
  NC.$$ = (r, s) => Array.prototype.slice.call(r.querySelectorAll(s));
  NC.st = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  NC.N = x => Number(x).toLocaleString("ar-EG");
  NC.words = s => String(s || "").trim().split(/\s+/).filter(Boolean);
  NC.plain = s => String(s || "").replace(/[#*_>`|]/g, " ").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[ \t]+/g, " ").trim();
  NC.today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  NC.dayIndex = () => { const d = new Date(); return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5) + d.getFullYear() * 400; };
  NC.html = (tag, cls, h) => { const e = document.createElement(tag); if (cls) e.className = cls; if (h != null) e.innerHTML = h; return e; };
  NC.md = t => { try { return md(t); } catch (e) { return "<p>" + NC.E(t).replace(/\n/g, "<br>") + "</p>"; } };
  NC.seg = (name, opts, val) => `<div class="sc-seg" data-seg="${name}">${opts.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${k === val}">${l}</button>`).join("")}</div>`;
  NC.bindSeg = (c, name, fn) => NC.$$(c, `[data-seg="${name}"] button`).forEach(b => b.onclick = () => { NC.$$(c, `[data-seg="${name}"] button`).forEach(x => x.setAttribute("aria-pressed", x === b)); fn(b.dataset.v); });
  NC.fmtT = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };

  // ---------- الذكاء الاصطناعي ----------
  NC.ai = async prompt => { const r = await sample(prompt); return (r && r.text) || ""; };
  NC.parseJSON = t => { t = String(t || ""); const a = t.indexOf("{"), b = t.lastIndexOf("}"), a2 = t.indexOf("["), b2 = t.lastIndexOf("]");
    const tries = []; if (a >= 0 && b > a) tries.push(t.slice(a, b + 1)); if (a2 >= 0 && b2 > a2) tries.push(t.slice(a2, b2 + 1));
    for (const x of tries) { try { return JSON.parse(x); } catch (e) { try { return JSON.parse(x.replace(/,\s*([}\]])/g, "$1")); } catch (e2) { } } } return null; };
  NC.aiJSON = async prompt => NC.parseJSON(await NC.ai(prompt));
  NC.errMsg = e => { const c = e && (e.code || e.message); return ({ need_server: "الميزة دي محتاجة السيرفر الخاص بالتطبيق.", need_update: "السيرفر محتاج يتحدّث عشان الميزة دي تشتغل (راجع ملف README).", too_big: "الملف كبير. استخدم ملف أقل من 12 ميجا.", rate_limited: "طلبات كتير ورا بعض. استنى دقيقة.", offline: "مفيش اتصال بالإنترنت." })[c] || "حصلت مشكلة. جرّب تاني."; };
  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob); });
  // ملف صوت أو صورة + تعليمات → نص (Gemini على السيرفر)
  NC.media = async (prompt, blob, mime) => {
    const C = (typeof CFG !== "undefined" && CFG) || {};
    if (!C.server) throw { code: "need_server" };
    if (blob.size > 12 * 1024 * 1024) throw { code: "too_big" };
    if (!navigator.onLine) throw { code: "offline" };
    const data = await b64(blob);
    let r;
    try { r = await fetch(C.server + "/media", { method: "POST", headers: { "content-type": "application/json", "x-app-token": C.token || "" }, body: JSON.stringify({ prompt, data, mime: mime || blob.type || "application/octet-stream" }) }); }
    catch (e) { throw { code: "offline" }; }
    if (r.status === 404) throw { code: "need_update" };
    if (r.status === 429) throw { code: "rate_limited" };
    if (!r.ok) throw { code: "upstream" };
    const j = await r.json(); return String(j.text || "");
  };

  // ---------- الحفظ والمشاركة ----------
  NC.saveBlob = async (blob, name, mime, share) => {
    const F = window.MihbaraFile;
    if (F && F.begin) {
      const id = F.begin(name, mime); if (!id) throw new Error("save");
      const CH = 3 * 256 * 1024;
      for (let o = 0; o < blob.size; o += CH) { const d = await b64(blob.slice(o, o + CH)); if (!F.append(id, d)) throw new Error("save"); }
      const where = F.finish(id); if (!where) throw new Error("save");
      if (share && F.share) F.share(id);
      return where;
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return "التنزيلات";
  };
  NC.saveTool = (key, input, text) => { try { addHistory(key, input, text); } catch (e) { } };

  // ---------- الصوت ----------
  let actx = null;
  NC.ctx = () => { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); return actx; };
  NC.decode = async blob => { const ab = await blob.arrayBuffer(); return await new Promise((res, rej) => NC.ctx().decodeAudioData(ab, res, rej)); };
  // تسجيل من الميكروفون مع مؤشر مستوى الصوت
  NC.recorder = async (onLevel) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) throw { code: "no_mic" };
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || "";
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), parts = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
    const c = NC.ctx(), src = c.createMediaStreamSource(stream), an = c.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const buf = new Float32Array(an.fftSize); let raf = 0, t0 = performance.now();
    const loop = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i]; if (onLevel) onLevel(Math.sqrt(s / buf.length), (performance.now() - t0) / 1000); raf = requestAnimationFrame(loop); };
    rec.start(250); loop();
    return {
      stop: () => new Promise(res => { rec.onstop = async () => { cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop()); try { src.disconnect(); } catch (e) { }
        const blob = new Blob(parts, { type: (mime || "audio/webm").split(";")[0] }); let ab = null; try { ab = await NC.decode(blob); } catch (e) { } res({ blob, buffer: ab, dur: (performance.now() - t0) / 1000 }); }; try { rec.stop(); } catch (e) { res(null); } }),
      cancel: () => { cancelAnimationFrame(raf); try { rec.stop(); } catch (e) { } stream.getTracks().forEach(t => t.stop()); }
    };
  };
  NC.micError = e => (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) ? "اسمح للتطبيق باستخدام الميكروفون من الإعدادات وجرّب تاني." : (e && e.code === "no_mic") ? "الجهاز ده مش بيدعم التسجيل من جوه التطبيق." : "مقدرتش أفتح الميكروفون.";

  // تحليل التسجيل: المستوى، الوقفات، والتردد (اممم) بشكل تقديري
  NC.analyze = (ab, script) => {
    const sr = ab.sampleRate, ch = ab.getChannelData(0), hop = Math.round(sr * 0.02), n = Math.floor(ch.length / hop);
    const rms = new Float32Array(n), pitch = new Float32Array(n); let peak = 0;
    for (let i = 0; i < n; i++) { let s = 0; for (let j = i * hop; j < (i + 1) * hop; j++) { const v = ch[j]; s += v * v; const a = Math.abs(v); if (a > peak) peak = a; } rms[i] = Math.sqrt(s / hop); }
    const sorted = Array.from(rms).sort((a, b) => a - b), noise = sorted[Math.floor(n * 0.1)] || 0, loud = sorted[Math.floor(n * 0.9)] || 0;
    const thr = Math.max(noise * 2.2, noise + (loud - noise) * 0.18, 0.004);
    const voiced = Array.from(rms, r => r > thr);
    // تنعيم بسيط
    for (let i = 1; i < n - 1; i++) if (!voiced[i] && voiced[i - 1] && voiced[i + 1]) voiced[i] = true;
    // تقدير درجة الصوت (autocorrelation) للإطارات الصوتية
    const win = Math.round(sr * 0.04), minL = Math.round(sr / 400), maxL = Math.round(sr / 70);
    for (let i = 0; i < n; i += 2) { if (!voiced[i]) continue; const st = i * hop; if (st + win + maxL >= ch.length) break; let best = 0, bl = 0;
      for (let L = minL; L <= maxL; L += 2) { let s = 0; for (let j = 0; j < win; j += 2) s += ch[st + j] * ch[st + j + L]; if (s > best) { best = s; bl = L; } }
      pitch[i] = pitch[i + 1] = bl ? sr / bl : 0; }
    // مقاطع الكلام والوقفات
    const segs = []; let s0 = -1;
    for (let i = 0; i <= n; i++) { const v = i < n && voiced[i]; if (v && s0 < 0) s0 = i; if (!v && s0 >= 0) { segs.push([s0, i]); s0 = -1; } }
    const fr = 0.02, pauses = [];
    for (let k = 1; k < segs.length; k++) { const g = (segs[k][0] - segs[k - 1][1]) * fr; if (g >= 0.35) pauses.push({ at: segs[k - 1][1] * fr, len: g }); }
    let speech = 0; segs.forEach(s => speech += (s[1] - s[0]) * fr);
    // "اممم" التقديرية: مقطع معزول 0.3–1.4 ثانية بنبرة ثابتة وطاقة ثابتة
    let fillers = 0; const fillerAt = [];
    segs.forEach(([a, b]) => { const d = (b - a) * fr; if (d < 0.3 || d > 1.4) return;
      const ps = [], es = []; for (let i = a; i < b; i++) { if (pitch[i]) ps.push(pitch[i]); es.push(rms[i]); }
      if (ps.length < (b - a) * 0.5) return; const m = ps.reduce((x, y) => x + y, 0) / ps.length, sd = Math.sqrt(ps.reduce((x, y) => x + (y - m) * (y - m), 0) / ps.length);
      const em = es.reduce((x, y) => x + y, 0) / es.length, esd = Math.sqrt(es.reduce((x, y) => x + (y - em) * (y - em), 0) / es.length);
      if (sd / m < 0.045 && esd / em < 0.35) { fillers++; fillerAt.push(a * fr); } });
    const dur = ch.length / sr, avg = (() => { let s = 0, c = 0; for (let i = 0; i < n; i++) if (voiced[i]) { s += rms[i] * rms[i]; c++; } return c ? Math.sqrt(s / c) : 0; })();
    const db = x => x > 0 ? 20 * Math.log10(x) : -90;
    const nw = script ? NC.words(script).length : 0;
    const pv = []; for (let i = 0; i < n; i++) if (pitch[i]) pv.push(pitch[i]);
    const pm = pv.length ? pv.reduce((a, b) => a + b, 0) / pv.length : 0, psd = pv.length ? Math.sqrt(pv.reduce((a, b) => a + (b - pm) * (b - pm), 0) / pv.length) : 0;
    return { dur, speech, pauses, longPauses: pauses.filter(p => p.len >= 1.2).length, fillers, fillerAt, levelDb: db(avg), peakDb: db(peak), clip: peak > 0.98,
      wpm: nw && speech ? Math.round(nw / (speech / 60) * (speech / dur)) : 0, words: nw, pitch: Math.round(pm), variety: pm ? Math.round(psd / pm * 100) : 0, rms, voiced, hop: 0.02 };
  };
  // رسم موجة الصوت مع الوقفات
  NC.drawWave = (cv, ab, marks) => {
    const W = cv.width = cv.clientWidth * (window.devicePixelRatio || 1), H = cv.height = 90 * (window.devicePixelRatio || 1), g = cv.getContext("2d"); g.clearRect(0, 0, W, H);
    const d = ab.getChannelData(0), step = Math.max(1, Math.floor(d.length / W)); g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent") || "#E11D48";
    for (let x = 0; x < W; x++) { let mx = 0; for (let j = x * step; j < (x + 1) * step && j < d.length; j++) { const a = Math.abs(d[j]); if (a > mx) mx = a; } const h = Math.max(1, mx * H * 0.95); g.fillRect(W - x - 1, (H - h) / 2, 1, h); }
    (marks || []).forEach(m => { const x = W - (m.at / (d.length / ab.sampleRate)) * W; g.fillStyle = m.color || "rgba(37,99,235,.35)"; g.fillRect(x - (m.w || 0) * W / (d.length / ab.sampleRate), 0, Math.max(2, (m.w || 0) * W / (d.length / ab.sampleRate)), H); });
  };
  // WAV
  NC.wav = ab => {
    const nc = Math.min(2, ab.numberOfChannels), len = ab.length, sr = ab.sampleRate, out = new DataView(new ArrayBuffer(44 + len * nc * 2));
    const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); out.setUint32(4, 36 + len * nc * 2, true); w(8, "WAVE"); w(12, "fmt "); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, nc, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * nc * 2, true); out.setUint16(32, nc * 2, true); out.setUint16(34, 16, true); w(36, "data"); out.setUint32(40, len * nc * 2, true);
    const chs = []; for (let c = 0; c < nc; c++) chs.push(ab.getChannelData(c));
    let o = 44; for (let i = 0; i < len; i++) for (let c = 0; c < nc; c++) { const v = Math.max(-1, Math.min(1, chs[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
    return new Blob([out], { type: "audio/wav" });
  };
  NC.play = ab => { const c = NC.ctx(), s = c.createBufferSource(); s.buffer = ab; s.connect(c.destination); s.start(); return s; };
  NC.speak = (text, masri) => { try { return speakOne(text, Date.now() % 1e6, masri ? "ar-EG-ShakirNeural" : "ar-SA-SalmaNeural"); } catch (e) { return Promise.resolve(); } };
  NC.speakLang = (text, lang) => { try { if (window.MihbaraTTS) { NC.stopSpeak(); window.MihbaraTTS.speak(text, lang, "nc" + Date.now(), 1, 0.9); return; } const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.9; const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.indexOf(lang.split("-")[0]) === 0); if (v) u.voice = v; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { } };
  NC.stopSpeak = () => { try { stopSpeech(); } catch (e) { } };
  NC.pickFile = accept => new Promise(res => { const i = document.createElement("input"); i.type = "file"; i.accept = accept; i.onchange = () => res(i.files && i.files[0] || null); i.click(); });

  // ---------- تسجيل الأدوات الجديدة على الشاشة الرئيسية ----------
  const Q = [];
  NC.register = def => Q.push(def);
  NC.group = (title, sub, keys, first) => Q.push({ group: true, title, sub, keys, first });
  NC.patch = (k, fn) => Q.push({ patch: k, render: fn });
  document.addEventListener("DOMContentLoaded", () => setTimeout(() => {
    try {
      const custom = {};
      Q.forEach(d => {
        if (d.group) return;
        if (d.patch) { custom[d.patch] = d.render; return; }
        if (d.icon) ICONS[d.key] = d.icon; if (d.tint) TINT[d.key] = d.tint;
        if (d.tool) { TOOLS[d.key] = d.tool; }
        else { EXTRA[d.key] = { name: d.name, desc: d.desc, off: !!d.offline }; OFF.push(d.key); custom[d.key] = d.render; }
        if (d.isNew !== false) NEWBIES.push(d.key);
      });
      const gs = Q.filter(d => d.group);
      gs.slice().reverse().forEach(g => { const ex = GROUPS.find(x => x.title === g.title); if (ex) ex.items.push(...g.keys); else if (g.first) GROUPS.unshift({ title: g.title, sub: g.sub, items: g.keys.slice() }); else GROUPS.push({ title: g.title, sub: g.sub, items: g.keys.slice() }); });
      const prev = renderOff;
      renderOff = function (k) { if (!custom[k]) { NC.cleanup(); return prev(k); } NC.cleanup(); const box = document.getElementById("offBody"); box.innerHTML = ""; custom[k](box); };
      buildHome(); filterTools();
    } catch (e) { console.error("NC init", e); }
  }, 0));
  // إيقاف أي تايمر أو تسجيل لما المستخدم يخرج من الأداة
  const cleaners = [];
  NC.onLeave = fn => cleaners.push(fn);
  NC.cleanup = () => { while (cleaners.length) { try { cleaners.pop()(); } catch (e) { } } NC.stopSpeak(); };
  document.addEventListener("DOMContentLoaded", () => {
    const o = window.open; // open() عالمي في التطبيق
    if (typeof o === "function") window.open = function (k) { if (typeof k === "string" && k.indexOf("://") < 0) NC.cleanup(); return o.apply(this, arguments); };
  });

  // ---------- ستايل مشترك ----------
  const css = `.nc-card{background:var(--surface2);border-radius:16px;padding:14px;margin:10px 0}.nc-card h4{margin:0 0 6px;font-family:var(--display);font-size:15px}
.nc-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin:12px 0}.nc-kpi{background:var(--surface2);border-radius:14px;padding:10px;text-align:center}.nc-kpi b{display:block;font-family:var(--display);font-size:22px}.nc-kpi span{font-size:12px;color:var(--muted)}
.nc-kpi.good b{color:#0c8a63}.nc-kpi.warn b{color:#d97706}.nc-kpi.bad b{color:#dc2626}
.nc-meter{height:10px;border-radius:5px;background:var(--surface2);overflow:hidden;margin:8px 0}.nc-meter i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22c55e,#eab308,#ef4444);transition:width .08s}
.nc-big{font-family:var(--display);font-size:42px;text-align:center;margin:6px 0}.nc-rec{background:#dc2626!important;color:#fff!important}
.nc-wave{width:100%;height:90px;display:block;background:var(--surface2);border-radius:12px;margin:10px 0}
.nc-chat{display:grid;gap:8px;margin:12px 0}.nc-msg{padding:10px 12px;border-radius:14px;line-height:1.75;font-size:14.5px;max-width:88%}.nc-msg.me{background:var(--accent);color:#fff;justify-self:start}.nc-msg.ai{background:var(--surface2);justify-self:end}.nc-msg small{display:block;opacity:.7;font-size:11px;margin-bottom:2px}
.nc-list{display:grid;gap:8px;margin:10px 0}.nc-row{display:flex;gap:8px;align-items:center;background:var(--surface2);border-radius:12px;padding:8px 10px}.nc-row input,.nc-row select{flex:1;min-width:0}.nc-row .mg-x{flex:none}
.nc-pill{display:inline-block;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--surface2);margin:2px}
.nc-score{display:flex;align-items:center;gap:14px;margin:12px 0}.nc-score .ring{flex:none}
.nc-flash{background:#dc2626;color:#fff;border-radius:14px;padding:12px;font-weight:700;animation:ncfl .9s ease-in-out 3}@keyframes ncfl{50%{opacity:.55}}
.nc-ifb{background:#1e3a8a;color:#fff;border-radius:14px;padding:10px 12px;font-size:14px}
.nc-stage{position:relative;background:#000;color:#fff;border-radius:16px;overflow:hidden;min-height:260px}
.nc-tags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.nc-qr{background:#fff;padding:12px;border-radius:12px;display:block;margin:10px auto;max-width:280px;width:100%;image-rendering:pixelated}
.nc-cv{width:100%;height:auto;border-radius:12px;display:block;margin:10px 0;background:var(--surface2)}
.card.new .badge-off{top:40px}
.nc-mini{font-size:12.5px;color:var(--muted);line-height:1.7}
.nc-fc{perspective:900px;margin:12px 0}.nc-fci{position:relative;min-height:190px;transition:transform .5s;transform-style:preserve-3d;cursor:pointer}.nc-fc.flip .nc-fci{transform:rotateY(180deg)}
.nc-fcf,.nc-fcb{position:absolute;inset:0;backface-visibility:hidden;border-radius:18px;padding:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:var(--surface2)}
.nc-fcb{transform:rotateY(180deg);background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff}.nc-fcf b{font-family:var(--display);font-size:24px}.nc-fcf i{color:var(--muted);margin-top:6px}`;
  const se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);
})();
