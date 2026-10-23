// NewsCast 360 — المذيع الافتراضي ٢: استوديو أخبار متحرك بمذيع بيتكلم وشفايفه بتتحرك مع الصوت
(function () {
  "use strict";
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const T = m => { try { toast(m); } catch (e) { } };
  const $$ = (r, s) => Array.prototype.slice.call(r.querySelectorAll(s));
  const cl = (x, a, b) => Math.min(b, Math.max(a, x));
  const st = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const FD = '"Alexandria","Readex Pro",sans-serif', FB = '"Readex Pro","Alexandria",sans-serif';
  const W = 1280, H = 720;

  const ANCHORS = [
    { id: "salma", name: "سلمى عادل", g: "f", skin: "#e2b08a", hair: "#2b1a12", hijab: "#6d2443", hijab2: "#8e3a5c", suit: "#1f3a68", shirt: "#f3efe9", lip: "#b4505a", voice: "Kore" },
    { id: "karim", name: "كريم منصور", g: "m", skin: "#c98d68", hair: "#1b1410", suit: "#23262f", shirt: "#e9eef5", tie: "#b3262e", beard: true, voice: "Charon" },
    { id: "nour", name: "نور الهدى", g: "f", skin: "#f0c6a4", hair: "#5a3220", longHair: true, suit: "#8a1c3c", shirt: "#fff7f0", lip: "#c0505e", voice: "Aoede" },
    { id: "youssef", name: "يوسف حمدي", g: "m", skin: "#a8704d", hair: "#111", suit: "#2c4a3e", shirt: "#fff", tie: "#d4a72c", glasses: true, voice: "Orus" }
  ];
  const THEMES = {
    news: { n: "النشرة", a: "#0f1f4d", b: "#2563eb", c: "#f59f00", tag: "الأخبار" },
    urgent: { n: "عاجل", a: "#3b0a0a", b: "#dc2626", c: "#fde047", tag: "عاجل" },
    sport: { n: "الرياضة", a: "#062e24", b: "#059669", c: "#fde047", tag: "رياضة" },
    econ: { n: "الاقتصاد", a: "#2a2006", b: "#b7791f", c: "#ffffff", tag: "اقتصاد" },
    culture: { n: "منوعات", a: "#2a0a45", b: "#9333ea", c: "#f0abfc", tag: "منوعات" }
  };
  const VOICES = { f: [["Kore", "رصين وواضح"], ["Aoede", "دافي وهادي"], ["Leda", "شبابي"], ["Zephyr", "مشرق"]], m: [["Charon", "رخيم ورسمي"], ["Orus", "واثق"], ["Fenrir", "حماسي"], ["Puck", "خفيف وودود"]] };

  let cfg = Object.assign({ anchor: "salma", name: "", theme: "news", dialect: "fusha", voice: "", speed: "normal", len: "80", rewrite: true, captions: true, stories: ["افتتحت كلية الإعلام بجامعة القاهرة يوم الأحد مركزاً جديداً للإنتاج الإذاعي والتلفزيوني بتكلفة 4 ملايين جنيه، يضم 40 جهاز مونتاج واستوديو بودكاست، ويخدم 1200 طالب سنوياً."] }, st("mihbara-anchor2") || {});
  const saveCfg = () => st("mihbara-anchor2", cfg);
  const anchorOf = () => cfg.anchor === "photo" ? { id: "photo", name: "مراسل نيوزكاست", g: cfg.photoG || "f", voice: "" } : (ANCHORS.find(a => a.id === cfg.anchor) || ANCHORS[0]);
  const shownName = () => (cfg.name || "").trim() || anchorOf().name;

  // ================= حالة الاستوديو =================
  const S = { phase: "idle", t0: performance.now(), mouth: 0, mTarget: 0, fakeTalk: false, blinkAt: 2, nodAt: -9, gestAt: -9, headline: "", hlAt: -9, wall: "", wallKw: [], ticker: [], caption: "", introAt: -9, outroAt: -9, photo: null, level: 0 };
  let cv, ctx, raf = 0, audio = null, ctl = null, lastPlan = null, serverTTS = null;

  // ================= الصوت =================
  function ensureAudio() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      const ac = new AC(), master = ac.createGain(), an = ac.createAnalyser(); an.fftSize = 1024;
      master.connect(an); an.connect(ac.destination);
      let dest = null; try { dest = ac.createMediaStreamDestination(); master.connect(dest); } catch (e) { }
      audio = { ac, master, an, dest, buf: new Float32Array(1024), src: null };
    }
    if (audio.ac.state === "suspended") audio.ac.resume().catch(() => { });
    return audio;
  }
  function rms() { if (!audio) return 0; audio.an.getFloatTimeDomainData(audio.buf); let s = 0; for (let i = 0; i < audio.buf.length; i++) s += audio.buf[i] * audio.buf[i]; return Math.sqrt(s / audio.buf.length); }
  function jingle(long) {
    const A = ensureAudio(); if (!A) return; const ac = A.ac, t = ac.currentTime + .05;
    const notes = long ? [[392, 0], [523.25, .18], [659.25, .36], [783.99, .54], [1046.5, .9]] : [[783.99, 0], [659.25, .16], [1046.5, .34]];
    notes.forEach(([f, d], i) => {
      [1, 2].forEach(h => {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = h === 1 ? "triangle" : "sine"; o.frequency.value = f * h;
        const st0 = t + d, dur = (i === notes.length - 1 ? 1.4 : .5);
        g.gain.setValueAtTime(0, st0); g.gain.linearRampToValueAtTime(h === 1 ? .16 : .05, st0 + .02); g.gain.exponentialRampToValueAtTime(.0008, st0 + dur);
        o.connect(g); g.connect(A.master); o.start(st0); o.stop(st0 + dur + .05);
      });
    });
    if (long) { const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * .6, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3) * .12; n.buffer = b; const f = ac.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 3000; n.connect(f); f.connect(A.master); n.start(t); }
  }
  function playBuffer(buf) {
    const A = ensureAudio();
    return new Promise(res => { const s = A.ac.createBufferSource(); s.buffer = buf; s.connect(A.master); s.onended = () => { if (A.src === s) A.src = null; res(); }; A.src = s; s.start(); });
  }
  function stopAudio() { try { audio && audio.src && audio.src.stop(); } catch (e) { } try { stopSpeech(); } catch (e) { } S.fakeTalk = false; }
  async function checkTTS() {
    if (serverTTS !== null) return serverTTS;
    if (typeof CFG === "undefined" || !CFG.server) return (serverTTS = false);
    try { const r = await fetch(CFG.server + "/status", { headers: { "x-app-token": CFG.token } }); const j = await r.json(); serverTTS = !!j.tts; } catch (e) { serverTTS = false; }
    return serverTTS;
  }
  const SPEED = { slow: "ببطء ووضوح", normal: "بسرعة متوسطة", fast: "بسرعة شوية زي النشرات السريعة" };
  async function ttsFetch(text) {
    const A = ensureAudio(); if (!A) throw new Error("noaudio");
    const style = (cfg.dialect === "masri" ? "اقرأ بلهجة مصرية طبيعية زي مذيعي التليفزيون المصري" : "اقرأ بالعربية الفصحى بنطق إذاعي سليم") + "، بصوت مذيع نشرة أخبار محترف، نبرة واثقة ودافئة، " + SPEED[cfg.speed];
    const voice = cfg.voice || anchorOf().voice || (anchorOf().g === "m" ? "Charon" : "Kore");
    const r = await fetch(CFG.server + "/tts", { method: "POST", headers: { "content-type": "application/json", "x-app-token": CFG.token }, body: JSON.stringify({ text, voice, style }) });
    if (!r.ok) throw new Error("tts " + r.status);
    const j = await r.json();
    const parts = ((((j.candidates || [])[0] || {}).content || {}).parts || []).filter(p => p.inlineData && p.inlineData.data);
    if (!parts.length) throw new Error("tts empty");
    const mime = parts[0].inlineData.mimeType || "", rate = +((mime.match(/rate=(\d+)/) || [])[1] || 24000);
    const bins = parts.map(p => { const s = atob(p.inlineData.data); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; });
    const total = bins.reduce((a, b) => a + (b.length >> 1), 0), buf = A.ac.createBuffer(1, total, rate), ch = buf.getChannelData(0);
    let o = 0; bins.forEach(u => { const dv = new DataView(u.buffer); for (let i = 0; i + 1 < u.length; i += 2) ch[o++] = dv.getInt16(i, true) / 32768; });
    return buf;
  }
  function deviceVoice() { const m = anchorOf().g === "m"; return (cfg.dialect === "masri" ? "ar-EG-" : "ar-SA-") + (m ? "ShakirNeural" : "SalmaNeural"); }

  // ================= الرسم =================
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; const f = v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k); return `rgb(${f(r)},${f(g)},${f(b)})`; }
  function wrap(text, maxW, font) { ctx.font = font; const words = String(text || "").split(/\s+/); const lines = []; let cur = ""; for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
  function txt(s, x, y, font, color, align) { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || "right"; ctx.direction = "rtl"; ctx.fillText(s, x, y); }
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);

  function drawSet(th, t) {
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(th.a, -.35)); g.addColorStop(.6, th.a); g.addColorStop(1, shade(th.a, -.6)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // إضاءات
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) { const x = 120 + i * 330 + Math.sin(t * .2 + i) * 20; g = ctx.createLinearGradient(x, 0, x + 60, 520); g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 160, 560); ctx.lineTo(x - 120, 560); ctx.fill(); }
    ctx.restore();
    // خلفية مدينة وشاشات صغيرة
    ctx.fillStyle = "rgba(255,255,255,.05)"; for (let i = 0; i < 26; i++) { const bw = 30 + (i * 37) % 40, bh = 80 + (i * 53) % 160, bx = i * 50; ctx.fillRect(bx, 470 - bh, bw, bh); }
    ctx.fillStyle = "rgba(255,255,255,.12)"; for (let i = 0; i < 70; i++) { const bx = (i * 97) % 1280, by = 330 + (i * 61) % 130; if ((Math.floor(t * .5) + i) % 7) ctx.fillRect(bx, by, 3, 4); }
    // الشاشة الكبيرة (Video wall)
    const wx = 70, wy = 92, ww = 520, wh = 300;
    ctx.save(); rr(wx - 8, wy - 8, ww + 16, wh + 16, 18); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fill();
    rr(wx, wy, ww, wh, 12); ctx.clip();
    g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh); g.addColorStop(0, th.b); g.addColorStop(1, shade(th.a, -.2)); ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
    ctx.globalAlpha = .18; ctx.fillStyle = "#fff"; for (let y = 0; y < 14; y++) for (let x = 0; x < 26; x++) { const v = Math.sin(x * .55 + y * .4 + t * .6) + Math.cos(y * .7 - x * .2); if (v > .6) { ctx.beginPath(); ctx.arc(wx + 12 + x * 20, wy + 12 + y * 21, 2.4, 0, 7); ctx.fill(); } }
    ctx.globalAlpha = 1;
    const wa = ease((t - S.hlAt) / .7);
    if (S.wall) {
      ctx.globalAlpha = wa;
      txt(th.tag, wx + ww - 24, wy + 50, `700 22px ${FD}`, th.c);
      const ls = wrap(S.wall, ww - 60, `700 40px ${FD}`).slice(0, 3); ls.forEach((l, i) => txt(l, wx + ww - 24 - (1 - wa) * 40, wy + 108 + i * 52, `700 40px ${FD}`, "#fff"));
      ctx.font = `500 20px ${FB}`; let kx = wx + ww - 24; S.wallKw.slice(0, 3).forEach(k => { const w = ctx.measureText(k).width + 28; if (kx - w < wx + 20) return; rr(kx - w, wy + wh - 58, w, 36, 18); ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fill(); txt(k, kx - 14, wy + wh - 33, `500 20px ${FB}`, "#fff"); kx -= w + 10; });
      ctx.globalAlpha = 1;
    } else { txt("NEWSCAST 360", wx + ww / 2, wy + wh / 2 + 16, `700 54px ${FD}`, "rgba(255,255,255,.9)", "center"); }
    ctx.restore();
  }
  function drawAnchor(a, t) {
    const cx = 900, sway = Math.sin(t * .7) * 4 + Math.sin(t * 1.9) * 1.2, nod = Math.max(0, 1 - (t - S.nodAt) / .6), nodY = Math.sin(nod * Math.PI) * 6, breathe = Math.sin(t * 1.6) * 1.6;
    const hx = cx + sway, hy = 268 + nodY + breathe * .4, tilt = Math.sin(t * .45) * .025 + (S.mouth * .01);
    // جسم
    ctx.save(); ctx.translate(0, breathe);
    if (a.longHair) { ctx.fillStyle = a.hair; ctx.beginPath(); ctx.moveTo(hx - 78, hy - 10); ctx.quadraticCurveTo(hx - 100, hy + 140, hx - 70, hy + 200); ctx.lineTo(hx + 70, hy + 200); ctx.quadraticCurveTo(hx + 100, hy + 140, hx + 78, hy - 10); ctx.fill(); }
    if (a.hijab) { ctx.fillStyle = a.hijab; ctx.beginPath(); ctx.moveTo(hx - 98, hy + 10); ctx.quadraticCurveTo(hx - 120, hy + 150, cx - 150, 470); ctx.lineTo(cx + 150, 470); ctx.quadraticCurveTo(hx + 120, hy + 150, hx + 98, hy + 10); ctx.fill(); }
    // كتاف وجاكيت
    let g = ctx.createLinearGradient(cx, 360, cx, 560); g.addColorStop(0, shade(a.suit, .12)); g.addColorStop(1, shade(a.suit, -.35)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cx - 60, 368); ctx.lineTo(cx - 170, 386); ctx.quadraticCurveTo(cx - 222, 396, cx - 228, 450); ctx.lineTo(cx - 236, 600); ctx.lineTo(cx + 236, 600); ctx.lineTo(cx + 228, 450); ctx.quadraticCurveTo(cx + 222, 396, cx + 170, 386); ctx.lineTo(cx + 60, 368); ctx.closePath(); ctx.fill();
    // قميص
    ctx.fillStyle = a.shirt; ctx.beginPath(); ctx.moveTo(cx - 52, 372); ctx.lineTo(cx, 470); ctx.lineTo(cx + 52, 372); ctx.closePath(); ctx.fill();
    if (a.hijab) { ctx.fillStyle = a.hijab2; ctx.beginPath(); ctx.moveTo(cx - 60, 368); ctx.lineTo(cx, 450); ctx.lineTo(cx + 60, 368); ctx.closePath(); ctx.fill(); }
    if (a.tie) { ctx.fillStyle = a.tie; ctx.beginPath(); ctx.moveTo(cx - 11, 384); ctx.lineTo(cx + 11, 384); ctx.lineTo(cx + 16, 450); ctx.lineTo(cx, 470); ctx.lineTo(cx - 16, 450); ctx.closePath(); ctx.fill(); ctx.fillStyle = shade(a.tie, -.2); ctx.beginPath(); ctx.moveTo(cx - 13, 372); ctx.lineTo(cx + 13, 372); ctx.lineTo(cx + 9, 388); ctx.lineTo(cx - 9, 388); ctx.fill(); }
    // ياقة الجاكيت
    ctx.fillStyle = shade(a.suit, -.15); [[-1], [1]].forEach(([s]) => { ctx.beginPath(); ctx.moveTo(cx + s * 52, 368); ctx.lineTo(cx + s * 8, 480); ctx.lineTo(cx + s * 34, 440); ctx.lineTo(cx + s * 80, 380); ctx.closePath(); ctx.fill(); });
    // مايك صغير
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(cx - 46, 420, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#555"; ctx.fillRect(cx - 47, 425, 2, 14);
    ctx.restore();
    // الرقبة
    ctx.fillStyle = shade(a.skin, -.12); rr(hx - 26, hy + 50, 52, 70, 18); ctx.fill();
    // الراس
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(tilt);
    if (a.hijab) { ctx.fillStyle = a.hijab; ctx.beginPath(); ctx.ellipse(0, -4, 92, 106, 0, 0, 7); ctx.fill(); }
    // ودان
    if (!a.hijab) { ctx.fillStyle = shade(a.skin, -.08); ctx.beginPath(); ctx.ellipse(-68, 6, 12, 20, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(68, 6, 12, 20, 0, 0, 7); ctx.fill(); }
    // الوش
    g = ctx.createRadialGradient(-15, -20, 10, 0, 0, 90); g.addColorStop(0, shade(a.skin, .08)); g.addColorStop(1, shade(a.skin, -.08)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, -78); ctx.bezierCurveTo(48, -78, 66, -40, 66, 0); ctx.bezierCurveTo(66, 44, 40, 82, 0, 86); ctx.bezierCurveTo(-40, 82, -66, 44, -66, 0); ctx.bezierCurveTo(-66, -40, -48, -78, 0, -78); ctx.fill();
    // الشعر/الطرحة من فوق
    if (a.hijab) { ctx.fillStyle = a.hijab2; ctx.beginPath(); ctx.moveTo(-70, -6); ctx.bezierCurveTo(-72, -70, -36, -96, 0, -96); ctx.bezierCurveTo(36, -96, 72, -70, 70, -6); ctx.bezierCurveTo(60, -50, 30, -66, 0, -66); ctx.bezierCurveTo(-30, -66, -60, -50, -70, -6); ctx.fill(); }
    else if (a.longHair) { ctx.fillStyle = a.hair; ctx.beginPath(); ctx.moveTo(-70, 20); ctx.bezierCurveTo(-82, -70, -30, -100, 10, -92); ctx.bezierCurveTo(60, -86, 82, -40, 70, 20); ctx.bezierCurveTo(60, -30, 20, -50, -10, -58); ctx.bezierCurveTo(-30, -40, -56, -20, -70, 20); ctx.fill(); }
    else { ctx.fillStyle = a.hair; ctx.beginPath(); ctx.moveTo(-68, -4); ctx.bezierCurveTo(-74, -66, -30, -96, 4, -92); ctx.bezierCurveTo(50, -90, 76, -60, 68, -4); ctx.bezierCurveTo(62, -40, 40, -52, 10, -54); ctx.bezierCurveTo(-20, -56, -50, -46, -68, -4); ctx.fill(); }
    // الحواجب
    const brow = -30 - Math.max(0, S.mouth - .55) * 10;
    ctx.strokeStyle = a.hijab || a.longHair ? shade(a.hair, -.1) : a.hair; ctx.lineWidth = 5; ctx.lineCap = "round";
    [[-1], [1]].forEach(([s]) => { ctx.beginPath(); ctx.moveTo(s * 14, brow + 2); ctx.quadraticCurveTo(s * 28, brow - 6, s * 44, brow + 1); ctx.stroke(); });
    // العينين
    const bl = t > S.blinkAt ? Math.max(0, 1 - Math.abs(t - S.blinkAt - .07) / .07) : 0; if (t > S.blinkAt + .2) S.blinkAt = t + 2.5 + Math.random() * 3;
    const look = S.phase === "live" && !S.talking ? 4 : 0;
    [[-1], [1]].forEach(([s]) => {
      const ex = s * 28, ey = -8;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ex, ey, 13, 8 * (1 - bl), 0, 0, 7); ctx.fill();
      if (bl < .7) { ctx.fillStyle = "#3b2416"; ctx.beginPath(); ctx.arc(ex, ey + look, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(ex, ey + look, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex + 2, ey - 2 + look, 1.6, 0, 7); ctx.fill(); }
      ctx.strokeStyle = shade(a.skin, -.45); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(ex, ey, 13, 8 * (1 - bl) + .5, 0, Math.PI, 0); ctx.stroke();
      if (a.g === "f") { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ex + s * 12, ey - 3); ctx.lineTo(ex + s * 17, ey - 6); ctx.stroke(); }
    });
    if (a.glasses) { ctx.strokeStyle = "#1a1a1a"; ctx.lineWidth = 3.5; ctx.beginPath(); rrPath(-48, -22, 38, 28, 8); rrPath(10, -22, 38, 28, 8); ctx.moveTo(-10, -10); ctx.lineTo(10, -10); ctx.stroke(); }
    // الأنف
    ctx.strokeStyle = shade(a.skin, -.25); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, 2); ctx.quadraticCurveTo(-6, 24, 4, 28); ctx.stroke();
    // الخدود
    if (a.g === "f") { ctx.fillStyle = "rgba(230,110,110,.18)"; ctx.beginPath(); ctx.ellipse(-38, 24, 13, 8, 0, 0, 7); ctx.ellipse(38, 24, 13, 8, 0, 0, 7); ctx.fill(); }
    if (a.beard) { ctx.fillStyle = "rgba(20,14,10,.28)"; ctx.beginPath(); ctx.moveTo(-58, 22); ctx.bezierCurveTo(-50, 70, -24, 86, 0, 86); ctx.bezierCurveTo(24, 86, 50, 70, 58, 22); ctx.bezierCurveTo(40, 54, 20, 60, 0, 60); ctx.bezierCurveTo(-20, 60, -40, 54, -58, 22); ctx.fill(); }
    // البُق
    drawMouth(a, t);
    ctx.restore();
    // إيدين وورق على الترابيزة (تحت)
  }
  function rrPath(x, y, w, h, r) { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); }
  function drawMouth(a, t) {
    const m = S.mouth, shape = .5 + .5 * Math.sin(t * 5.3 + Math.sin(t * 2.1) * 2), my = 50, w = 22 + 6 * (1 - shape) * m + 2, h = 2 + m * (12 + 8 * shape);
    const lip = a.lip || shade(a.skin, -.35);
    if (m < .06) { ctx.strokeStyle = lip; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-w, my); ctx.quadraticCurveTo(0, my + 7, w, my); ctx.stroke(); return; }
    ctx.fillStyle = "#3a1216"; ctx.beginPath(); ctx.moveTo(-w, my); ctx.quadraticCurveTo(0, my - h * .55, w, my); ctx.quadraticCurveTo(0, my + h * 1.25, -w, my); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = "#f4f1ea"; ctx.fillRect(-w, my - h, w * 2, Math.min(h * .55, 7) + h * .2);
    ctx.fillStyle = "#c55a62"; ctx.beginPath(); ctx.ellipse(0, my + h * .9, w * .6, h * .5, 0, 0, 7); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = lip; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-w, my); ctx.quadraticCurveTo(0, my - h * .55 - 2, w, my); ctx.quadraticCurveTo(0, my + h * 1.25 + 2, -w, my); ctx.stroke();
  }
  function drawPhotoAnchor(t) {
    const cx = 900, img = S.photo; const x = cx - 190, y = 120, w = 380, h = 400;
    ctx.save(); rr(x, y, w, h, 24); ctx.clip();
    if (img && img.complete && img.naturalWidth) { const k = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (1.04 + Math.sin(t * .3) * .02 + S.mouth * .01); const iw = img.naturalWidth * k, ih = img.naturalHeight * k; ctx.drawImage(img, cx - iw / 2, y + h / 2 - ih / 2 - 10, iw, ih); }
    else { ctx.fillStyle = "#333"; ctx.fillRect(x, y, w, h); }
    ctx.restore();
    ctx.lineWidth = 6 + S.mouth * 10; ctx.strokeStyle = `rgba(255,255,255,${.25 + S.mouth * .5})`; rr(x, y, w, h, 24); ctx.stroke();
  }
  function drawDesk(th, t, a) {
    let g = ctx.createLinearGradient(0, 500, 0, H); g.addColorStop(0, shade(th.a, .25)); g.addColorStop(1, shade(th.a, -.5)); ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(560, 505); ctx.lineTo(1240, 505); ctx.lineTo(1280, H); ctx.lineTo(520, H); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.b; ctx.fillRect(560, 505, 680, 8);
    ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fillRect(560, 513, 680, 3);
    txt("NEWSCAST 360", 900, 600, `700 30px ${FD}`, "rgba(255,255,255,.85)", "center");
    if (a && a.id !== "photo") {
      // ورق
      ctx.save(); ctx.translate(900, 498); ctx.rotate(-.04); ctx.fillStyle = "#f7f7f2"; ctx.fillRect(-70, -8, 140, 14); ctx.fillStyle = "#e6e6de"; ctx.fillRect(-66, -12, 136, 6); ctx.restore();
      // إيدين
      const gest = Math.max(0, Math.sin(Math.min(1, (t - S.gestAt) / 1.6) * Math.PI)) * (S.gestAt > 0 ? 1 : 0);
      const rx = 972, ry = 496 - gest * 46;
      ctx.strokeStyle = shade(a.suit, -.08); ctx.lineCap = "round"; ctx.lineWidth = 44;
      ctx.beginPath(); ctx.moveTo(900 - 205, 440); ctx.quadraticCurveTo(900 - 160, 500, 846, 497); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(900 + 205, 440); ctx.quadraticCurveTo(900 + 150 - gest * 20, 500 - gest * 30, rx + 14, ry + 2); ctx.stroke();
      ctx.fillStyle = a.shirt; ctx.beginPath(); ctx.ellipse(850, 497, 9, 16, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(rx + 8, ry + 1, 9, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = a.skin;
      ctx.beginPath(); ctx.ellipse(828, 496, 24, 14, -.2, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(rx - 10, ry); ctx.rotate(.25 - gest * .5);
      ctx.beginPath(); ctx.ellipse(0, 0, 24, 14, 0, 0, 7); ctx.fill(); ctx.restore();
    }
  }
  function drawOverlays(th, t, a) {
    // لوجو + مباشر + الساعة
    rr(W - 268, 26, 236, 50, 10); ctx.fillStyle = th.b; ctx.fill();
    txt("NEWSCAST 360", W - 48, 61, `700 26px ${FD}`, "#fff");
    const live = S.phase === "live" || S.phase === "intro";
    rr(W - 372, 32, 92, 38, 8); ctx.fillStyle = live ? "#e11d48" : "rgba(0,0,0,.5)"; ctx.fill();
    if (live && Math.floor(t * 2) % 2) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(W - 296, 51, 5, 0, 7); ctx.fill(); }
    txt("مباشر", W - 306, 58, `700 18px ${FB}`, "#fff");
    const d = new Date(); txt(d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }), 48, 61, `500 22px ${FB}`, "rgba(255,255,255,.9)", "left");
    txt("مذيع افتراضي · AI", 48, 92, `400 15px ${FB}`, "rgba(255,255,255,.6)", "left");
    // الشريط السفلي (Lower third)
    if (S.headline) {
      const p = ease((t - S.hlAt) / .55), y = 548, x0 = W - 40, w = 1000 * p;
      ctx.save(); rr(x0 - w, y, w, 64, 6); ctx.clip();
      let g = ctx.createLinearGradient(x0 - w, 0, x0, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "#f1f3f8"); ctx.fillStyle = g; ctx.fillRect(x0 - w, y, w, 64);
      ctx.fillStyle = th.b; ctx.fillRect(x0 - 14, y, 14, 64);
      const hl = wrap(S.headline, 940, `700 28px ${FD}`)[0] || ""; txt(hl.length < S.headline.length ? hl + "…" : hl, x0 - 30, y + 43, `700 28px ${FD}`, "#111827");
      ctx.restore();
      const q = ease((t - S.hlAt - .25) / .5), nw = 330 * q;
      ctx.save(); rr(x0 - nw, y + 68, nw, 38, 6); ctx.clip(); ctx.fillStyle = th.b; ctx.fillRect(x0 - nw, y + 68, nw, 38);
      txt(shownName() + " | NewsCast 360", x0 - 18, y + 94, `500 19px ${FB}`, "#fff"); ctx.restore();
    }
    // الترجمة
    if (cfg.captions && S.caption && S.phase === "live") {
      const ls = wrap(S.caption, 1000, `500 26px ${FB}`).slice(-2), y = S.headline ? 470 : 560;
      ls.forEach((l, i) => { ctx.font = `500 26px ${FB}`; const w = ctx.measureText(l).width + 30; rr(640 - w / 2, y + i * 42 - 30, w, 40, 8); ctx.fillStyle = "rgba(0,0,0,.62)"; ctx.fill(); txt(l, 640, y + i * 42, `500 26px ${FB}`, "#fff", "center"); });
    }
    // التيكر
    ctx.fillStyle = "rgba(5,8,20,.92)"; ctx.fillRect(0, H - 52, W, 52);
    ctx.fillStyle = th.c; ctx.fillRect(W - 150, H - 52, 150, 52); txt(th.tag, W - 75, H - 17, `700 22px ${FD}`, "#111", "center");
    const items = (S.ticker.length ? S.ticker : ["نيوزكاست 360: أدوات ذكية لطلاب الإعلام", "اكتب خبرك واضغط «اعمل النشرة»"]).join("   ◆   ") + "   ◆   ";
    ctx.save(); ctx.beginPath(); ctx.rect(0, H - 52, W - 150, 52); ctx.clip();
    ctx.font = `500 22px ${FB}`; const tw = ctx.measureText(items).width, off = (t * 90) % tw;
    for (let x = -tw + off; x < W; x += tw) txt(items, x + tw, H - 17, `500 22px ${FB}`, "#fff");
    ctx.restore();
  }
  function drawCard(th, t, start, outro) {
    const p = ease((t - start) / .6), q = outro ? 1 : 1 - ease((t - start - 2.3) / .4); if (q <= 0) return;
    ctx.save(); ctx.globalAlpha = q;
    let g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.b); g.addColorStop(1, th.a); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = q * .15; ctx.fillStyle = "#fff"; for (let i = 0; i < 9; i++) { const x = ((t - start) * 400 + i * 220) % (W + 400) - 200; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 120, 0); ctx.lineTo(x - 180, H); ctx.lineTo(x - 300, H); ctx.fill(); }
    ctx.globalAlpha = q;
    ctx.save(); ctx.translate(W / 2, H / 2 - 20); ctx.scale(.8 + .2 * p, .8 + .2 * p);
    txt("NEWSCAST 360", 0, 0, `700 96px ${FD}`, "#fff", "center");
    ctx.fillStyle = th.c; ctx.fillRect(-160 * p, 30, 320 * p, 6);
    txt(outro ? "شكراً لمتابعتكم" : (th.n + " · " + new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" })), 0, 90, `500 32px ${FB}`, "rgba(255,255,255,.92)", "center");
    if (outro) txt("خليك محاوط الخبر", 0, 150, `700 28px ${FD}`, th.c, "center");
    ctx.restore(); ctx.restore();
  }
  function frame() {
    if (!cv || !document.body.contains(cv)) { raf = 0; return; }
    const t = (performance.now() - S.t0) / 1000, th = THEMES[cfg.theme] || THEMES.news, a = anchorOf();
    // البُق
    if (audio && audio.src) { const l = rms(); S.mTarget = cl((l - .012) * 9, 0, 1); }
    else if (S.fakeTalk) { const syl = Math.abs(Math.sin(t * 10.5 + Math.sin(t * 2.7) * 2.2)); const gap = (Math.sin(t * 1.9) + Math.sin(t * 3.3)) > 1.25 ? 0 : 1; S.mTarget = gap * (.15 + .75 * syl); }
    else S.mTarget = 0;
    S.mouth += (S.mTarget - S.mouth) * (S.mTarget > S.mouth ? .6 : .3);
    S.talking = S.mouth > .05;
    drawSet(th, t);
    if (a.id === "photo") drawPhotoAnchor(t); else drawAnchor(a, t);
    drawDesk(th, t, a);
    drawOverlays(th, t, a);
    if (S.phase === "intro" || (t - S.introAt < 3)) drawCard(th, t, S.introAt, false);
    if (S.phase === "outro") drawCard(th, t, S.outroAt, true);
    raf = requestAnimationFrame(frame);
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(frame); }
  const now = () => (performance.now() - S.t0) / 1000;

  // ================= النص =================
  function words() { return +cfg.len || 80; }
  async function buildPlan(stories) {
    const a = anchorOf(), name = shownName(), fem = a.g === "f";
    if (!cfg.rewrite) {
      return { intro: `أهلاً بكم في نشرة نيوزكاست، ${fem ? "معكم" : "معكم"} ${name}.`, stories: stories.map(s => ({ headline: s.split(/[.،\n]/)[0].slice(0, 90), text: s, wall: s.split(/[.،\n]/)[0].slice(0, 60), keywords: [] })), outro: `وبهذا نصل إلى ختام النشرة. ${fem ? "كانت معكم" : "كان معكم"} ${name} من نيوزكاست.`, ticker: stories.map(s => s.split(/[.،\n]/)[0].slice(0, 80)) };
    }
    const dia = cfg.dialect === "masri" ? "بالعامية المصرية المهذبة زي مذيعي البرامج على التليفزيون المصري" : "بالعربية الفصحى المبسطة زي نشرات الأخبار";
    const prompt = `أنت محرر نشرات أخبار تليفزيونية. حوّل المواد التالية لنص نشرة يقرأه المذيع «${name}» (${fem ? "مذيعة" : "مذيع"}) ${dia}.
القواعد: جمل قصيرة مكتوبة للأذن، رقم واحد في الجملة، المعلومة الأهم الأول، بدون رموز أو تنسيق، وبدون أي معلومة مش موجودة في المواد. لو المادة عنوان بس، قول اللي في العنوان بس وانسبه لمصدره.
كل خبر في حدود ${words()} كلمة.

${stories.map((s, i) => `المادة ${i + 1}:\n${s}`).join("\n\n")}

رد بـ JSON بس بالشكل ده:
{"intro":"تحية افتتاحية قصيرة فيها اسم نيوزكاست واسم المذيع","stories":[{"headline":"عنوان للشريط أقل من 10 كلمات","wall":"عنوان قصير جداً للشاشة (٣-٥ كلمات)","keywords":["كلمة","كلمة"],"text":"نص الخبر"}],"outro":"ختام قصير","ticker":["عنوان قصير لكل خبر"]}`;
    const { text } = await sample(prompt);
    const a1 = text.indexOf("{"), b1 = text.lastIndexOf("}"); let j = null;
    try { j = JSON.parse(text.slice(a1, b1 + 1)); } catch (e) { try { j = JSON.parse(text.slice(a1, b1 + 1).replace(/,\s*([}\]])/g, "$1")); } catch (x) { } }
    if (!j || !Array.isArray(j.stories) || !j.stories.length) throw { code: "bad_script" };
    j.stories = j.stories.filter(s => s && s.text).map(s => ({ headline: String(s.headline || "").slice(0, 120), wall: String(s.wall || s.headline || "").slice(0, 70), keywords: (s.keywords || []).slice(0, 3).map(String), text: String(s.text) }));
    j.intro = String(j.intro || `أهلاً بكم في نيوزكاست، معكم ${name}.`); j.outro = String(j.outro || "شكراً لمتابعتكم."); j.ticker = (j.ticker || j.stories.map(s => s.headline)).map(String);
    return j;
  }
  function planText(p) { return [p.intro].concat(p.stories.map(s => "■ " + s.headline + "\n" + s.text)).concat([p.outro]).join("\n\n"); }
  function sentences(t) { return String(t).replace(/\s+/g, " ").split(/(?<=[.!؟?،:])\s+/).reduce((a, x) => { if (a.length && a[a.length - 1].length < 45) a[a.length - 1] += " " + x; else a.push(x); return a; }, []).filter(x => x.trim()); }

  // ================= العرض =================
  async function perform(plan, rec) {
    stopAudio(); const my = ctl = { stop: false };
    const useServer = await checkTTS();
    ensureAudio();
    const segs = [{ text: plan.intro, s: null }].concat(plan.stories.map(s => ({ text: s.text, s }))).concat([{ text: plan.outro, s: null }]);
    S.ticker = plan.ticker.slice(); S.headline = ""; S.wall = ""; S.caption = "";
    // التحميل المسبق للصوت
    let mode = useServer ? "server" : "device";
    const bufs = mode === "server" ? segs.map(() => null) : null;
    let chain = Promise.resolve();
    if (bufs) segs.forEach((g, i) => { bufs[i] = chain = chain.then(() => ttsFetch(g.text)); bufs[i].catch(() => { }); });
    // انترو
    S.phase = "intro"; S.introAt = now(); jingle(true); status("على الهوا", true);
    if (rec) rec.start();
    await sleep(2700);
    if (bufs) { try { await Promise.race([bufs[0], sleep(25000).then(() => { throw new Error("slow"); })]); } catch (e) { mode = "device"; note("الصوت الطبيعي مش متاح دلوقتي، المذيع هيقرا بصوت الموبايل."); } }
    S.phase = "live";
    for (let i = 0; i < segs.length && !my.stop; i++) {
      const g = segs[i];
      S.caption = "";
      if (g.s) { S.headline = g.s.headline; S.wall = g.s.wall; S.wallKw = g.s.keywords || []; S.hlAt = now(); S.gestAt = now() + .8; await sleep(500); }
      else if (i === segs.length - 1) { S.headline = ""; }
      S.nodAt = now();
      if (mode === "server") {
        let buf; try { buf = await bufs[i]; } catch (e) { mode = "device"; note("الصوت الطبيعي وقف في النص، كمّلت بصوت الموبايل."); }
        if (buf && !my.stop) {
          const ss = sentences(g.text), total = ss.reduce((a, x) => a + x.length, 0); let acc = 0; const t0 = now(), dur = buf.duration;
          const capTimer = setInterval(() => { const el = (now() - t0) / dur * total; let k = 0, c = 0; while (k < ss.length - 1 && c + ss[k].length < el) { c += ss[k].length; k++; } S.caption = ss[k]; }, 120);
          await playBuffer(buf); clearInterval(capTimer); void acc;
          await sleep(250); continue;
        }
      }
      for (const sen of sentences(g.text)) {
        if (my.stop) break; S.caption = sen; S.fakeTalk = true; S.nodAt = now();
        try { await speakOne(sen, i, deviceVoice()); } catch (e) { S.fakeTalk = false; if (e && e.code === "no_tts") { note("الموبايل محتاج صوت عربي: الإعدادات ← تحويل النص إلى كلام ← نزّل العربي."); } await sleep(Math.min(4000, sen.length * 70)); }
        S.fakeTalk = false; await sleep(120);
      }
    }
    S.caption = ""; S.headline = "";
    if (!my.stop) { S.phase = "outro"; S.outroAt = now(); jingle(false); await sleep(2400); }
    if (rec) await rec.stop();
    S.phase = "idle"; status(my.stop ? "اتوقف" : "خلصت", false);
    return mode;
  }
  function status(t, live) { const e = document.getElementById("an-status"); if (e) { e.textContent = t; e.className = "chip" + (live ? " live" : ""); } }
  function note(t) { const e = document.getElementById("an-note"); if (e) e.textContent = t; }

  // ================= التسجيل والحفظ =================
  async function saveBlob(blob, name, mime) {
    const F = window.MihbaraFile;
    if (F && F.begin) {
      const id = F.begin(name, mime); if (!id) throw new Error("save");
      const CH = 3 * 256 * 1024;
      for (let o = 0; o < blob.size; o += CH) {
        const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob.slice(o, o + CH)); });
        if (!F.append(id, b64)) throw new Error("save");
      }
      const where = F.finish(id); if (!where) throw new Error("save"); return where;
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return "التنزيلات";
  }
  function recorder() {
    if (!window.MediaRecorder || !cv.captureStream) return null;
    const A = ensureAudio(), stream = cv.captureStream(30);
    if (A && A.dest) A.dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    const types = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
    const r = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 5e6 }), parts = [];
    r.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
    return {
      mime, start() { r.start(1000); },
      stop() { return new Promise(res => { r.onstop = () => res(); try { r.stop(); } catch (e) { res(); } }); },
      blob() { return new Blob(parts, { type: mime.split(";")[0] }); }, ext: mime.indexOf("mp4") >= 0 ? "mp4" : "webm"
    };
  }

  // ================= الواجهة =================
  function buildUI() {
    const desk = document.getElementById("studioDesk"); if (!desk) return;
    desk.innerHTML = `<form class="slip an-form" id="anForm">
      <h2>المذيع الافتراضي</h2>
      <p class="lead">اكتب خبر أو أكتر، واختار المذيع وشكل الاستوديو. المذيع هيقدّم النشرة بصوته وشفايفه بتتحرك مع الكلام، ومعاه شريط أخبار وعناوين زي القنوات بالظبط. وتقدر تسجّلها فيديو.</p>
      <label>المذيع</label><div class="an-anchors" id="anAnchors"></div>
      <input type="file" id="anPhoto" accept="image/*" hidden>
      <div class="row"><div><label for="anName">الاسم على الشاشة</label><input id="anName" placeholder="${E(anchorOf().name)}" value="${E(cfg.name)}"></div>
        <div><label for="anTheme">شكل الاستوديو</label><select id="anTheme">${Object.keys(THEMES).map(k => `<option value="${k}"${cfg.theme === k ? " selected" : ""}>${THEMES[k].n}</option>`).join("")}</select></div></div>
      <label>الأخبار <small class="an-hint">(لحد ٤ أخبار)</small></label><div id="anStories"></div>
      <div class="an-row"><button type="button" class="btn ghost mini" id="anAdd">+ خبر تاني</button><button type="button" class="btn ghost mini" id="anFeed">📰 من أخبارك الآن</button></div>
      <div class="row"><div><label for="anDia">اللغة</label><select id="anDia"><option value="fusha"${cfg.dialect === "fusha" ? " selected" : ""}>فصحى (نشرة رسمية)</option><option value="masri"${cfg.dialect === "masri" ? " selected" : ""}>عامية مصرية</option></select></div>
        <div><label for="anLen">طول كل خبر</label><select id="anLen">${[["40", "قصير (~٢٠ ثانية)"], ["80", "متوسط (~٤٠ ثانية)"], ["130", "طويل (~دقيقة)"]].map(([v, l]) => `<option value="${v}"${cfg.len === v ? " selected" : ""}>${l}</option>`).join("")}</select></div></div>
      <div class="row"><div><label for="anVoice">الصوت</label><select id="anVoice"></select></div>
        <div><label for="anSpeed">السرعة</label><select id="anSpeed">${[["slow", "هادية"], ["normal", "عادية"], ["fast", "سريعة"]].map(([v, l]) => `<option value="${v}"${cfg.speed === v ? " selected" : ""}>${l}</option>`).join("")}</select></div></div>
      <label class="check"><input type="checkbox" id="anRewrite"${cfg.rewrite ? " checked" : ""}> خلّي الذكاء الاصطناعي يكتب نص النشرة</label>
      <label class="check"><input type="checkbox" id="anCap"${cfg.captions ? " checked" : ""}> اعرض الترجمة على الشاشة</label>
      <div class="actions"><button class="btn" type="submit" id="anGo">▶ ابدأ النشرة</button><button class="btn ghost" type="button" id="anRec">⏺ سجّلها فيديو</button><button class="btn ghost" type="button" id="anStop" hidden>⏹ إيقاف</button></div>
      <p class="small" id="anVoiceNote"></p>
      <div class="method"><strong>للتعلّم: الكتابة للأذن</strong>نص النشرة بيتكتب للسمع مش للقراءة: جمل قصيرة، رقم واحد في الجملة، والمعلومة الأهم في الأول وتتكرر في الآخر.</div>
    </form>
    <article class="proof">
      <div class="proof-head"><h2>الاستوديو</h2><span class="chip" id="an-status">جاهز</span></div>
      <div class="an-stage"><canvas id="anCanvas" width="${W}" height="${H}" aria-label="استوديو الأخبار"></canvas><div class="an-loading" id="anLoading" hidden><i></i><span id="anLoadT">بيجهّز…</span></div></div>
      <p class="note" id="an-note"></p><span id="st-mode" hidden></span>
      <h3 class="scr-title">نص النشرة</h3>
      <div class="script" id="anScript">النص اللي المذيع هيقوله هيظهر هنا.</div>
      <div class="actions"><button class="btn ghost mini" type="button" id="anReplay" hidden>↻ إعادة</button><button class="btn ghost mini" type="button" id="anShare" hidden>مشاركة النص</button></div>
    </article>`;
    cv = desk.querySelector("#anCanvas"); ctx = cv.getContext("2d");
    renderAnchors(); renderStories(); renderVoices();
    const f = desk.querySelector("#anForm");
    f.querySelector("#anName").oninput = e => { cfg.name = e.target.value; saveCfg(); };
    f.querySelector("#anTheme").onchange = e => { cfg.theme = e.target.value; saveCfg(); };
    f.querySelector("#anDia").onchange = e => { cfg.dialect = e.target.value; saveCfg(); };
    f.querySelector("#anLen").onchange = e => { cfg.len = e.target.value; saveCfg(); };
    f.querySelector("#anVoice").onchange = e => { cfg.voice = e.target.value; saveCfg(); };
    f.querySelector("#anSpeed").onchange = e => { cfg.speed = e.target.value; saveCfg(); };
    f.querySelector("#anRewrite").onchange = e => { cfg.rewrite = e.target.checked; saveCfg(); };
    f.querySelector("#anCap").onchange = e => { cfg.captions = e.target.checked; saveCfg(); };
    f.querySelector("#anAdd").onclick = () => { collect(); if (cfg.stories.length >= 4) { T("أقصى حاجة ٤ أخبار"); return; } cfg.stories.push(""); saveCfg(); renderStories(); };
    f.querySelector("#anFeed").onclick = () => {
      const fd = st("mihbara-feed"), items = (fd && fd.items) || [];
      if (!items.length) { T("مفيش أخبار متحمّلة لسه. افتح «أخبارك الآن» في الرئيسية الأول."); return; }
      cfg.stories = items.slice(0, 3).map(x => x.t + (x.s ? ` (المصدر: ${x.s})` : "")); cfg.rewrite = true; f.querySelector("#anRewrite").checked = true; saveCfg(); renderStories(); T("اتحطت آخر ٣ أخبار ✓");
    };
    desk.querySelector("#anPhoto").onchange = function () {
      const file = this.files && this.files[0]; if (!file) return;
      const fr = new FileReader(); fr.onload = () => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"), k = Math.min(1, 800 / Math.max(im.width, im.height)); c.width = im.width * k; c.height = im.height * k; c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); const u = c.toDataURL("image/jpeg", .88); try { localStorage.setItem("mihbara-photo", u); } catch (e) { } loadPhoto(); cfg.anchor = "photo"; saveCfg(); renderAnchors(); renderVoices(); }; im.src = fr.result; }; fr.readAsDataURL(file); this.value = "";
    };
    f.onsubmit = e => { e.preventDefault(); go(false); };
    f.querySelector("#anRec").onclick = () => go(true);
    f.querySelector("#anStop").onclick = () => { if (ctl) ctl.stop = true; stopAudio(); };
    desk.querySelector("#anReplay").onclick = () => { if (lastPlan) run(lastPlan, false); };
    desk.querySelector("#anShare").onclick = () => { if (lastPlan) try { shareText(planText(lastPlan)); } catch (e) { } };
    loadPhoto(); checkTTS().then(ok => { const n = document.getElementById("anVoiceNote"); if (n) n.textContent = ok ? "🎙️ الصوت الطبيعي شغال (ذكاء اصطناعي)." : "🔈 هيستخدم صوت الموبايل العربي. الصوت الطبيعي محتاج نت والسيرفر."; });
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(`700 40px ${FD}`), document.fonts.load(`500 20px ${FB}`)]).catch(() => { });
    startLoop();
  }
  function loadPhoto() { const u = (() => { try { return localStorage.getItem("mihbara-photo") || ""; } catch (e) { return ""; } })(); if (u) { S.photo = new Image(); S.photo.src = u; } else S.photo = null; }
  function renderAnchors() {
    const box = document.getElementById("anAnchors"); if (!box) return;
    box.innerHTML = ANCHORS.map(a => `<button type="button" class="an-pick" data-a="${a.id}" aria-pressed="${cfg.anchor === a.id}"><canvas width="120" height="120"></canvas><span>${E(a.name)}</span></button>`).join("") +
      (S.photo ? `<button type="button" class="an-pick" data-a="photo" aria-pressed="${cfg.anchor === "photo"}"><img src="${S.photo.src}" alt=""><span>صورتك</span></button>` : "") +
      `<button type="button" class="an-pick an-up" data-a="up"><b>+</b><span>${S.photo ? "غيّر صورتك" : "صورتك"}</span></button>`;
    $$(box, ".an-pick").forEach(b => {
      const c = b.querySelector("canvas");
      if (c) { const a = ANCHORS.find(x => x.id === b.dataset.a), o = ctx, oc = cv; ctx = c.getContext("2d"); ctx.save(); ctx.fillStyle = THEMES[cfg.theme].a; ctx.fillRect(0, 0, 120, 120); ctx.translate(60, 70); ctx.scale(.42, .42); ctx.translate(-900, -300); const sv = { mouth: S.mouth, blinkAt: S.blinkAt, nodAt: S.nodAt }; S.mouth = 0; S.blinkAt = 99; drawAnchor(a, 0); Object.assign(S, sv); ctx.restore(); ctx = o; void oc; }
      b.onclick = () => { if (b.dataset.a === "up") { document.getElementById("anPhoto").click(); return; } cfg.anchor = b.dataset.a; cfg.voice = ""; saveCfg(); renderAnchors(); renderVoices(); const n = document.getElementById("anName"); if (n) n.placeholder = anchorOf().name; };
    });
  }
  function renderVoices() {
    const sel = document.getElementById("anVoice"); if (!sel) return; const a = anchorOf(), g = a.g || "f";
    sel.innerHTML = VOICES.f.concat(VOICES.m).map(([v, d]) => `<option value="${v}">${VOICES.f.some(x => x[0] === v) ? "ست" : "راجل"} · ${d}</option>`).join("");
    sel.value = cfg.voice || a.voice || VOICES[g][0][0];
  }
  function renderStories() {
    const box = document.getElementById("anStories"); if (!box) return; if (!cfg.stories.length) cfg.stories = [""];
    box.innerHTML = cfg.stories.map((s, i) => `<div class="an-story"><span class="an-n">${(i + 1).toLocaleString("ar-EG")}</span><textarea data-i="${i}" rows="3" placeholder="اكتب الخبر أو الموضوع…">${E(s)}</textarea>${cfg.stories.length > 1 ? `<button type="button" class="mg-x" data-rm="${i}" aria-label="حذف">✕</button>` : ""}</div>`).join("");
    $$(box, "textarea").forEach(x => x.oninput = () => { cfg.stories[+x.dataset.i] = x.value; saveCfg(); });
    $$(box, "[data-rm]").forEach(b => b.onclick = () => { collect(); cfg.stories.splice(+b.dataset.rm, 1); saveCfg(); renderStories(); });
  }
  function collect() { $$(document, "#anStories textarea").forEach(x => cfg.stories[+x.dataset.i] = x.value); }
  let busy = false;
  async function go(record) {
    if (busy) return; collect(); saveCfg();
    const stories = cfg.stories.map(s => s.trim()).filter(Boolean); if (!stories.length) { T("اكتب خبر الأول"); return; }
    busy = true; note(""); stopAudio(); ensureAudio();
    const L = document.getElementById("anLoading"), LT = document.getElementById("anLoadT");
    btns(true);
    try { cv.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) { }
    try {
      L.hidden = false; LT.textContent = cfg.rewrite ? "بيكتب نص النشرة…" : "بيجهّز…"; status("جاري التجهيز", true);
      const plan = await buildPlan(stories); lastPlan = plan; L.hidden = true;
      document.getElementById("anScript").innerHTML = `<p>${E(plan.intro)}</p>` + plan.stories.map(s => `<p><b>${E(s.headline)}</b><br>${E(s.text)}</p>`).join("") + `<p>${E(plan.outro)}</p>`;
      document.getElementById("anShare").hidden = false;
      try { addHistory("studio", plan.stories[0].headline, planText(plan)); } catch (e) { }
      await run(plan, record);
    } catch (e) { L.hidden = true; status("جاهز", false); note((typeof ERR !== "undefined" && ERR[e && e.code]) || (e && e.code === "bad_script" ? "مقدرتش أكتب النص المرة دي. جرّب تاني أو شيل علامة «خلّي الذكاء الاصطناعي يكتب»." : "حصل خطأ. جرّب تاني.")); }
    finally { busy = false; btns(false); }
  }
  function btns(on) { const g = document.getElementById("anGo"), r = document.getElementById("anRec"), s = document.getElementById("anStop"), rp = document.getElementById("anReplay"); if (g) g.disabled = on; if (r) r.disabled = on; if (s) s.hidden = !on; if (rp) rp.hidden = on || !lastPlan; }
  async function run(plan, record) {
    let rec = null;
    if (record) {
      const ok = await checkTTS();
      if (!ok) note("ملحوظة: صوت الموبايل مش بيتسجل جوه الفيديو، فالفيديو هيطلع بالصورة والموسيقى بس. الصوت الطبيعي (السيرفر) بيتسجل.");
      rec = recorder(); if (!rec) { T("التسجيل مش مدعوم على الجهاز ده"); }
    }
    btns(true);
    try { await perform(plan, rec); } finally { btns(false); }
    if (rec) {
      status("بيحفظ الفيديو…", true);
      try { const where = await saveBlob(rec.blob(), "NewsCast360_" + Date.now() + "." + rec.ext, rec.mime.split(";")[0]); note("✓ الفيديو اتحفظ في " + where); T("الفيديو اتحفظ ✓"); }
      catch (e) { note("مقدرتش أحفظ الفيديو."); }
      status("خلصت", false);
    }
  }

  const css = `.an-anchors{display:flex;gap:8px;flex-wrap:wrap}.an-pick{display:grid;justify-items:center;gap:4px;font:inherit;font-size:12px;color:var(--ink);background:var(--surface);border:2px solid var(--line);border-radius:14px;padding:6px;cursor:pointer;width:84px}.an-pick[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft,rgba(37,99,235,.15))}
.an-pick canvas,.an-pick img{width:68px;height:68px;border-radius:50%;object-fit:cover;display:block}.an-up b{display:grid;place-items:center;width:68px;height:68px;border-radius:50%;background:var(--surface2);font-size:28px;color:var(--muted)}
.an-story{position:relative;display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}.an-story textarea{flex:1;margin:0}.an-n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:#fff;font-size:13px;margin-top:8px}.an-story .mg-x{position:absolute;top:6px;inset-inline-end:6px}
.an-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}.an-hint{color:var(--muted);font-weight:400}
.an-stage{position:relative;border-radius:16px;overflow:hidden;background:#000;box-shadow:0 18px 40px -20px rgba(0,0,0,.6)}.an-stage canvas{display:block;width:100%;height:auto;aspect-ratio:16/9}
.an-loading{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;background:rgba(0,0,0,.55);color:#fff;font-size:15px}.an-loading i{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;animation:anspin 1s linear infinite}@keyframes anspin{to{transform:rotate(360deg)}}
#anScript p{margin:0 0 10px;line-height:1.85}`;
  const se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  document.addEventListener("DOMContentLoaded", function () {
    try {
      EXTRA.studio = { name: "المذيع الافتراضي", desc: "استوديو أخبار متحرك: مذيع بيقدّم نشرتك وتسجّلها فيديو" };
      if (NEWBIES.indexOf("studio") < 0) NEWBIES.push("studio");
      try { stopSpeech(); } catch (e) { }
      buildUI(); buildHome(); filterTools();
      const prevOpen = open;
      open = function (k) { if (k !== "studio") { if (ctl) ctl.stop = true; stopAudio(); } const r = prevOpen(k); if (k === "studio") startLoop(); return r; };
      window.MihbaraAnchor = { S, perform, buildPlan, ANCHORS, THEMES };
    } catch (e) { console.error("anchor init", e); }
  });
})();
