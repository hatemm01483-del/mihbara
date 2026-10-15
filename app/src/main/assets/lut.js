// صَدى — ستوديو الألوان السينمائي: LUTs مستوحاة من الأفلام بالذكاء الاصطناعي
(function () {
  "use strict";
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const T = m => { try { toast(m); } catch (e) { } };
  const $$ = (r, s) => Array.prototype.slice.call(r.querySelectorAll(s));
  const cl = (x, a, b) => Math.min(b, Math.max(a, x));
  const num = (x, d) => { x = parseFloat(x); return isFinite(x) ? x : d; };
  const st = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const N = 33;

  // ================= نموذج اللوك =================
  const BANDS = [["red", "الأحمر", 0], ["orange", "البرتقالي/البشرة", 30], ["yellow", "الأصفر", 60], ["green", "الأخضر", 120], ["aqua", "السماوي", 180], ["blue", "الأزرق", 225], ["magenta", "البنفسجي", 295]];
  function base() {
    const hsl = {}; BANDS.forEach(b => hsl[b[0]] = [0, 0, 0]);
    return { exposure: 0, temperature: 0, tint: 0, contrast: 1, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], saturation: 1, vibrance: 0, shadowTint: "#808080", shadowAmt: 0, highTint: "#808080", highAmt: 0, fade: 0, fadeColor: "#808080", rolloff: 0, bleach: 0, hsl, amount: 1 };
  }
  function hex2(h) { h = String(h || "").replace("#", ""); if (h.length === 3) h = h.split("").map(x => x + x).join(""); const n = parseInt(h, 16); return isFinite(n) && h.length === 6 ? [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255] : [.5, .5, .5]; }
  function toHex(c) { return "#" + c.map(x => Math.round(cl(x, 0, 1) * 255).toString(16).padStart(2, "0")).join(""); }
  function sanitize(p) {
    const b = base(); p = p || {};
    const a3 = (v, d, lo, hi) => Array.isArray(v) && v.length === 3 ? v.map(x => cl(num(x, d), lo, hi)) : [d, d, d];
    const hx = v => /^#?[0-9a-f]{6}$/i.test(String(v || "")) ? "#" + String(v).replace("#", "") : "#808080";
    const o = {
      exposure: cl(num(p.exposure, 0), -1, 1), temperature: cl(num(p.temperature, 0), -1, 1), tint: cl(num(p.tint, 0), -1, 1),
      contrast: cl(num(p.contrast, 1), .6, 1.7), lift: a3(p.lift, 0, -.12, .12), gamma: a3(p.gamma, 1, .7, 1.4), gain: a3(p.gain, 1, .75, 1.25),
      saturation: cl(num(p.saturation, 1), 0, 1.7), vibrance: cl(num(p.vibrance, 0), -1, 1),
      shadowTint: hx(p.shadowTint), shadowAmt: cl(num(p.shadowAmt, 0), 0, .8), highTint: hx(p.highTint), highAmt: cl(num(p.highAmt, 0), 0, .8),
      fade: cl(num(p.fade, 0), 0, .2), fadeColor: hx(p.fadeColor), rolloff: cl(num(p.rolloff, 0), 0, 1), bleach: cl(num(p.bleach, 0), 0, 1),
      hsl: {}, amount: cl(num(p.amount, 1), 0, 1)
    };
    BANDS.forEach(([k]) => { const v = p.hsl && p.hsl[k]; o.hsl[k] = Array.isArray(v) ? [cl(num(v[0], 0), -40, 40), cl(num(v[1], 0), -1, 1), cl(num(v[2], 0), -.5, .5)] : b.hsl[k]; });
    return o;
  }
  const luma = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  const sstep = (a, b, x) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function rgb2hsv(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0; if (d > 1e-6) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; } return [h, mx ? d / mx : 0, mx]; }
  function hsv2rgb(h, s, v) { h = ((h % 360) + 360) % 360; const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0; if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x]; return [r + m, g + m, b + m]; }
  // يحوّل لون واحد حسب اللوك (sRGB / Rec.709 من 0 لـ 1)
  function compile(P) {
    const st2 = hex2(P.shadowTint), hi = hex2(P.highTint), fc = hex2(P.fadeColor);
    const stC = st2.map(x => x - luma(st2)), hiC = hi.map(x => x - luma(hi));
    const ex = Math.pow(2, P.exposure), wb = [1 + .09 * P.temperature, 1 - .06 * P.tint, 1 - .09 * P.temperature];
    const piv = .435, k = P.contrast;
    const hb = BANDS.map(([key, , c]) => [c, P.hsl[key]]).filter(x => x[1][0] || x[1][1] || x[1][2]);
    return function (r, g, b) {
      const o = [r, g, b]; let c = [r, g, b];
      if (P.exposure) c = c.map(x => Math.pow(Math.pow(x, 2.2) * ex, 1 / 2.2));
      c = c.map((x, i) => x * wb[i]);
      c = c.map((x, i) => { x = x + P.lift[i] * (1 - x); x = x * P.gain[i]; return Math.pow(Math.max(0, x), 1 / P.gamma[i]); });
      if (k !== 1) c = c.map(x => { x = cl(x, 0, 1); return x < piv ? piv * Math.pow(x / piv, k) : 1 - (1 - piv) * Math.pow((1 - x) / (1 - piv), k); });
      if (hb.length) {
        let [h, s, v] = rgb2hsv(cl(c[0], 0, 1), cl(c[1], 0, 1), cl(c[2], 0, 1)); let dh = 0, ds = 0, dl = 0;
        for (const [cen, a] of hb) { let d = Math.abs(h - cen); if (d > 180) d = 360 - d; const w = d < 45 ? (1 - d / 45) * (1 - d / 45) * (3 - 2 * (1 - d / 45)) / 1 : 0; if (w) { dh += a[0] * w; ds += a[1] * w; dl += a[2] * w; } }
        const sw = sstep(0, .25, s); s = cl(s * (1 + ds), 0, 1); v = cl(v * (1 + dl * sw * .6), 0, 1); c = hsv2rgb(h + dh * sw, s, v);
      }
      const L = luma(c);
      if (P.shadowAmt) { const w = (1 - sstep(0, .6, L)) * P.shadowAmt; c = c.map((x, i) => x + stC[i] * w); }
      if (P.highAmt) { const w = sstep(.4, 1, L) * P.highAmt; c = c.map((x, i) => x + hiC[i] * w); }
      { const L2 = luma(c), sat = Math.max(...c) - Math.min(...c), vb = 1 + P.vibrance * (1 - cl(sat * 2, 0, 1)); c = c.map(x => L2 + (x - L2) * P.saturation * vb); }
      if (P.bleach) { const L3 = luma(c); let bp = c.map(x => L3 < .5 ? 2 * x * L3 : 1 - 2 * (1 - x) * (1 - L3)); const lb = luma(bp); bp = bp.map(x => lb + (x - lb) * .45); c = c.map((x, i) => x + (bp[i] - x) * P.bleach); }
      if (P.rolloff) c = c.map(x => x > .72 ? .72 + (x - .72) * (1 - P.rolloff * .55) : x);
      if (P.fade) c = c.map((x, i) => x * (1 - P.fade) + P.fade * fc[i] * 1.0);
      return c.map((x, i) => cl(o[i] + (x - o[i]) * P.amount, 0, 1));
    };
  }
  function buildLUT(P) {
    const f = compile(P), d = new Float32Array(N * N * N * 3); let i = 0;
    for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) { const o = f(r / (N - 1), g / (N - 1), b / (N - 1)); d[i++] = o[0]; d[i++] = o[1]; d[i++] = o[2]; }
    return d;
  }
  function cubeText(P, title) {
    const d = buildLUT(P), out = [`TITLE "${String(title || "Sada Look").replace(/"/g, "'")}"`, "# Made with Sada app - Rec.709 / sRGB input", `LUT_3D_SIZE ${N}`, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0"];
    for (let i = 0; i < d.length; i += 3) out.push(d[i].toFixed(6) + " " + d[i + 1].toFixed(6) + " " + d[i + 2].toFixed(6));
    return out.join("\n") + "\n";
  }

  // ================= مكتبة جاهزة (بدون نت) =================
  const H = (o) => Object.assign({}, o);
  const PRESETS = [
    { id: "br2049", t: "Blade Runner 2049", ar: "برتقالي ضبابي وسماوي بارد", pal: ["#2b1a10", "#a3541c", "#e39a3b", "#f0c27b", "#3d6b7a"], p: H({ temperature: .55, contrast: 1.12, saturation: .9, shadowTint: "#2e5d6b", shadowAmt: .35, highTint: "#f0a040", highAmt: .45, fade: .04, fadeColor: "#3a2a20", rolloff: .5, hsl: { orange: [4, .2, 0], yellow: [-10, .1, 0], blue: [-15, -.3, -.1], green: [-25, -.5, 0], aqua: [0, -.1, 0] } }) },
    { id: "matrix", t: "The Matrix", ar: "أخضر رقمي بارد", pal: ["#0a140c", "#1f3b24", "#4f7a4a", "#a7c49a", "#dfe8d5"], p: H({ tint: -.6, contrast: 1.2, saturation: .75, shadowTint: "#1d4a26", shadowAmt: .45, highTint: "#c8e6b4", highAmt: .3, lift: [-.02, .01, -.02], gain: [.95, 1.04, .94], hsl: { orange: [10, -.3, 0], red: [20, -.4, 0], blue: [-40, -.6, -.1], green: [5, .2, 0] } }) },
    { id: "madmax", t: "Mad Max: Fury Road", ar: "تيل وبرتقالي مشبع جداً", pal: ["#0f2a33", "#1e6f80", "#d9641e", "#f2a03d", "#f7d9a0"], p: H({ temperature: .35, contrast: 1.35, saturation: 1.35, vibrance: .3, shadowTint: "#1a6b7d", shadowAmt: .5, highTint: "#ff9a3c", highAmt: .4, hsl: { orange: [-3, .35, .05], yellow: [-12, .3, 0], blue: [-12, .35, -.1], aqua: [10, .3, 0] } }) },
    { id: "amelie", t: "Amélie", ar: "أخضر وأحمر دافيين حالمين", pal: ["#2a3312", "#6e7a25", "#c0a238", "#c13a2a", "#f1d9a5"], p: H({ temperature: .4, tint: -.25, contrast: 1.12, saturation: 1.2, shadowTint: "#3b5a1e", shadowAmt: .35, highTint: "#ffcf70", highAmt: .4, hsl: { green: [-20, .35, 0], red: [0, .35, 0], blue: [30, -.5, -.1], yellow: [-8, .25, 0] } }) },
    { id: "joker", t: "Joker (2019)", ar: "أخضر/تيل كئيب مع أصفر مريض", pal: ["#16211f", "#2f4a45", "#7c8a5b", "#c5a855", "#e4cf95"], p: H({ temperature: .2, tint: -.3, contrast: 1.15, saturation: .85, shadowTint: "#235048", shadowAmt: .45, highTint: "#e6c76a", highAmt: .35, fade: .05, fadeColor: "#24302c", rolloff: .3, hsl: { red: [5, .1, -.05], orange: [5, -.1, 0], blue: [-20, -.4, 0] } }) },
    { id: "dune", t: "Dune (2021)", ar: "رملي باهت ونعومة ضبابية", pal: ["#2e2620", "#6b5643", "#a68a6a", "#d6c0a0", "#efe3cf"], p: H({ temperature: .3, contrast: .92, saturation: .7, shadowTint: "#4a3b30", shadowAmt: .3, highTint: "#f2d9b0", highAmt: .3, fade: .07, fadeColor: "#4a4038", rolloff: .7, hsl: { blue: [-10, -.6, .1], green: [-20, -.6, 0], orange: [0, -.1, .05] } }) },
    { id: "her", t: "Her (2013)", ar: "دافي باستيل ومريح", pal: ["#4a2a24", "#c25a3c", "#e8916b", "#f2c3a0", "#f6e3cf"], p: H({ temperature: .6, tint: .2, contrast: .95, saturation: 1, shadowTint: "#7a3a30", shadowAmt: .25, highTint: "#ffd2b0", highAmt: .4, fade: .06, fadeColor: "#5a3a34", rolloff: .6, hsl: { red: [5, .2, .05], blue: [-30, -.5, .1], green: [-30, -.4, 0] } }) },
    { id: "moonlight", t: "Moonlight", ar: "سماوي وبنفسجي مشبع لبشرة غنية", pal: ["#0e1a2e", "#1f4f7a", "#2fa3b3", "#8a4fa0", "#d99a6c"], p: H({ temperature: -.25, contrast: 1.2, saturation: 1.25, vibrance: .25, shadowTint: "#1d3f7a", shadowAmt: .4, highTint: "#ffc28a", highAmt: .2, hsl: { aqua: [0, .4, 0], blue: [0, .3, 0], magenta: [0, .4, 0], orange: [0, .1, .03] } }) },
    { id: "budapest", t: "The Grand Budapest Hotel", ar: "باستيل وردي ناعم", pal: ["#5a2a3a", "#c95b7a", "#f0a6b8", "#f6d2a2", "#a7c7d9"], p: H({ temperature: .15, tint: .35, contrast: .95, saturation: 1.15, highTint: "#ffd6e0", highAmt: .35, shadowTint: "#5a2a4a", shadowAmt: .2, fade: .06, fadeColor: "#6a4a5a", hsl: { red: [10, .1, .1], magenta: [-15, .3, .1], blue: [-10, -.2, .15] } }) },
    { id: "ryan", t: "Saving Private Ryan", ar: "Bleach Bypass قاسي ومطفي", pal: ["#1a1c1a", "#4a4d47", "#7b7d72", "#b3b0a0", "#dcd8c8"], p: H({ temperature: -.1, contrast: 1.3, saturation: .5, bleach: .65, shadowTint: "#3c4a48", shadowAmt: .25, highTint: "#e8e0c8", highAmt: .15, hsl: { red: [0, -.3, 0], green: [-10, -.3, 0] } }) },
    { id: "lalaland", t: "La La Land", ar: "ألوان مسرحية: أزرق ليلي وأصفر وماجنتا", pal: ["#141a3a", "#2a3f9e", "#7a3da0", "#f2c230", "#f39ab0"], p: H({ temperature: -.15, tint: .25, contrast: 1.15, saturation: 1.35, vibrance: .35, shadowTint: "#2a2f8a", shadowAmt: .4, highTint: "#ffe0a0", highAmt: .2, hsl: { blue: [0, .35, 0], magenta: [0, .45, .05], yellow: [-5, .35, 0] } }) },
    { id: "sicario", t: "Sicario", ar: "صحراوي دافي وظلال قاسية", pal: ["#120f0b", "#4a3a24", "#9a7b4c", "#d9b77a", "#5a6b7a"], p: H({ temperature: .45, contrast: 1.3, saturation: .85, shadowTint: "#20262c", shadowAmt: .25, highTint: "#f5c27a", highAmt: .35, rolloff: .35, hsl: { blue: [-10, -.4, -.1], green: [-25, -.5, 0], orange: [-3, .1, 0] } }) },
    { id: "noir", t: "فيلم نوار (أبيض وأسود)", ar: "أبيض وأسود بتباين عالي", pal: ["#050505", "#2e2e2e", "#6b6b6b", "#b5b5b5", "#f2f2f2"], p: H({ contrast: 1.45, saturation: 0, rolloff: .2, shadowTint: "#202830", shadowAmt: .05 }) },
    { id: "kodak", t: "فيلم خام دافي (Kodak style)", ar: "دافي، بشرة حلوة، وأسود ناعم", pal: ["#2a2018", "#7a4a2a", "#c98a50", "#f0c890", "#5a7a8a"], p: H({ temperature: .3, contrast: 1.08, saturation: 1.05, shadowTint: "#2e4a54", shadowAmt: .2, highTint: "#ffd8a0", highAmt: .3, fade: .05, fadeColor: "#3a3028", rolloff: .55, hsl: { orange: [-2, .1, .04], green: [-15, -.2, 0], blue: [-8, -.15, 0] } }) }
  ];
  function presetLook(x) { const P = sanitize(Object.assign(base(), x.p)); return { title: x.t, sub: x.ar, palette: x.pal, params: P, kind: "preset" }; }

  // ================= عرض مباشر بـ WebGL =================
  const VS = "attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
  const FS = "precision mediump float;varying vec2 uv;uniform sampler2D img,lut;uniform float split,N;uniform float showLine;" +
    "vec3 look(vec3 c){c=clamp(c,0.,1.);float b=c.b*(N-1.);float b0=floor(b);float b1=min(b0+1.,N-1.);float f=b-b0;" +
    "float x=(c.r*(N-1.)+.5)/(N*N);float y=(c.g*(N-1.)+.5)/N;" +
    "return mix(texture2D(lut,vec2(x+b0/N,y)).rgb,texture2D(lut,vec2(x+b1/N,y)).rgb,f);}" +
    "void main(){vec2 t=vec2(uv.x,1.-uv.y);vec3 c=texture2D(img,t).rgb;vec3 o=uv.x<split?c:look(c);" +
    "if(showLine>.5&&abs(uv.x-split)<.002)o=vec3(1.);gl_FragColor=vec4(o,1.);}";
  function Renderer(canvas) {
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false }) || canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
    if (!gl) return null;
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const mk = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(w => gl.texParameteri(gl.TEXTURE_2D, w, gl.CLAMP_TO_EDGE)); [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(w => gl.texParameteri(gl.TEXTURE_2D, w, gl.LINEAR)); return t; };
    const tImg = mk(0), tLut = mk(1);
    gl.uniform1i(gl.getUniformLocation(pr, "img"), 0); gl.uniform1i(gl.getUniformLocation(pr, "lut"), 1); gl.uniform1f(gl.getUniformLocation(pr, "N"), N);
    const uSplit = gl.getUniformLocation(pr, "split"), uLine = gl.getUniformLocation(pr, "showLine");
    return {
      setLUT(d) { const px = new Uint8Array(N * N * N * 4); for (let b = 0; b < N; b++) for (let g = 0; g < N; g++) for (let r = 0; r < N; r++) { const s = ((b * N + g) * N + r) * 3, o = (g * N * N + b * N + r) * 4; px[o] = Math.round(d[s] * 255); px[o + 1] = Math.round(d[s + 1] * 255); px[o + 2] = Math.round(d[s + 2] * 255); px[o + 3] = 255; } gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tLut); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N * N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, px); },
      draw(src, split, line) { gl.viewport(0, 0, canvas.width, canvas.height); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tImg); try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); } catch (e) { return false; } gl.uniform1f(uSplit, split); gl.uniform1f(uLine, line ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return true; }
    };
  }
  // صورة تجريبية (مشهد غروب + درجات بشرة)
  function sampleScene() {
    const c = document.createElement("canvas"); c.width = 960; c.height = 540; const x = c.getContext("2d");
    let g = x.createLinearGradient(0, 0, 0, 330); g.addColorStop(0, "#3b6fb0"); g.addColorStop(.55, "#9fc3e0"); g.addColorStop(1, "#f3c48a"); x.fillStyle = g; x.fillRect(0, 0, 960, 330);
    x.fillStyle = "#fff4d6"; x.beginPath(); x.arc(720, 300, 44, 0, 7); x.fill();
    g = x.createLinearGradient(0, 330, 0, 420); g.addColorStop(0, "#2f8a94"); g.addColorStop(1, "#1d5560"); x.fillStyle = g; x.fillRect(0, 330, 960, 90);
    g = x.createLinearGradient(0, 420, 0, 540); g.addColorStop(0, "#d9b98a"); g.addColorStop(1, "#a9875e"); x.fillStyle = g; x.fillRect(0, 420, 960, 120);
    x.fillStyle = "#3f7d3a"; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse(40 + i * 34, 330 - (i % 3) * 12, 40, 70 - (i % 2) * 18, 0, 0, 7); x.fill(); }
    x.fillStyle = "#2c5a2a"; x.fillRect(150, 330, 14, 60);
    // شخص بسيط
    x.fillStyle = "#2a2a35"; x.beginPath(); x.ellipse(480, 470, 70, 95, 0, Math.PI, 0); x.fill(); x.fillRect(410, 470, 140, 70);
    x.fillStyle = "#c98d68"; x.beginPath(); x.ellipse(480, 345, 46, 56, 0, 0, 7); x.fill();
    x.fillStyle = "#1b1410"; x.beginPath(); x.ellipse(480, 312, 50, 30, 0, Math.PI, 0); x.fill();
    x.fillStyle = "#b5333a"; x.fillRect(452, 395, 56, 22);
    // درجات بشرة + رمادي
    ["#f3d2bd", "#e2b394", "#c98d68", "#a26a48", "#7a4b31", "#4f2f1f"].forEach((h, i) => { x.fillStyle = h; x.fillRect(620 + i * 54, 460, 50, 30); });
    for (let i = 0; i < 11; i++) { const v = Math.round(i / 10 * 255); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(620 + i * 30, 498, 30, 30); }
    return c;
  }

  // ================= تحليل صورة مرجعية (مطابقة اللوك) =================
  function analyzeImage(src) {
    const c = document.createElement("canvas"), w = 160, h = Math.max(1, Math.round(w * (src.videoHeight || src.naturalHeight || src.height) / (src.videoWidth || src.naturalWidth || src.width)));
    c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(src, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, px = [], Ls = [];
    for (let i = 0; i < d.length; i += 4) { const p = [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]; px.push(p); Ls.push(luma(p)); }
    const sorted = Ls.slice().sort((a, b) => a - b), q = f => sorted[Math.floor(f * (sorted.length - 1))];
    const acc = (lo, hi) => { let s = [0, 0, 0], n = 0; px.forEach((p, i) => { if (Ls[i] >= lo && Ls[i] < hi) { const L = Ls[i]; s[0] += p[0] - L; s[1] += p[1] - L; s[2] += p[2] - L; n++; } }); return n ? s.map(v => v / n) : [0, 0, 0]; };
    const sh = acc(0, .33), hl = acc(.62, 1.01), sat = px.reduce((a, p) => a + Math.max(...p) - Math.min(...p), 0) / px.length;
    const tintOf = ch => { const m = Math.max(1e-4, ...ch.map(Math.abs)); return [toHex(ch.map(v => .5 + v / m * .5)), cl(Math.hypot(...ch) * 4, 0, .6)]; };
    const [sT, sA] = tintOf(sh), [hT, hA] = tintOf(hl), p2 = q(.02), p98 = q(.98);
    // ألوان الباليت (k-means مبسط)
    let cent = [.1, .3, .5, .7, .9].map(f => px[Math.floor(f * px.length)].slice());
    for (let it = 0; it < 6; it++) { const s = cent.map(() => [0, 0, 0, 0]); px.forEach(p => { let bi = 0, bd = 9; cent.forEach((c2, j) => { const dd = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2; if (dd < bd) { bd = dd; bi = j; } }); s[bi][0] += p[0]; s[bi][1] += p[1]; s[bi][2] += p[2]; s[bi][3]++; }); cent = s.map((v, j) => v[3] ? [v[0] / v[3], v[1] / v[3], v[2] / v[3]] : cent[j]); }
    cent.sort((a, b) => luma(a) - luma(b));
    const p = sanitize({ contrast: cl(1 + ((p98 - p2) - .85) * 1.3, .75, 1.45), saturation: cl(sat / .27, .35, 1.45), shadowTint: sT, shadowAmt: sA, highTint: hT, highAmt: hA, fade: cl(p2 - .03, 0, .12), fadeColor: sT, rolloff: p98 < .9 ? cl((.95 - p98) * 4, 0, .8) : 0 });
    return { params: p, palette: cent.map(toHex), stats: { sat, p2, p98, sh, hl } };
  }

  // ================= حفظ الملفات =================
  async function saveBlob(blob, name, mime, share) {
    const F = window.MihbaraFile;
    if (F && F.begin) {
      const id = F.begin(name, mime); if (!id) throw new Error("save");
      const CH = 3 * 256 * 1024;
      for (let o = 0; o < blob.size; o += CH) {
        const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob.slice(o, o + CH)); });
        if (!F.append(id, b64)) throw new Error("save");
      }
      const where = F.finish(id); if (!where) throw new Error("save");
      if (share && F.share) F.share(id);
      return where;
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    return "التنزيلات";
  }
  const slug = s => (String(s || "look").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 40) || "look");

  // ================= الواجهة =================
  let S = { tab: "ai", look: null, media: null, mediaKind: null, split: .5, compare: true, busy: false };
  let R = null, canvas = null, raf = 0, lutData = null;
  const mine = () => st("mihbara-luts") || [];
  function offLut(box) {
    stopLoop();
    const head = document.createElement("div"); head.className = "slip lt-head";
    head.innerHTML = `<h2>ستوديو الألوان السينمائي</h2><p class="lead">اكتب اسم فيلم، والذكاء الاصطناعي يدوّر ويحلل الـ Color Grading والإضاءة والألوان بتاعته، ويعملك LUT سينمائي مستوحى منه. جرّبه على صورتك أو الفيديو بتاعك، ونزّله ملف ‎.cube لأي برنامج مونتاج.</p>
      <div class="seg2 lt-tabs">${[["ai", "🎬 من فيلم"], ["lib", "📚 مكتبة جاهزة"], ["match", "🖼️ طابق من صورة"], ["mine", "⭐ لوكاتي"]].map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${S.tab === k}">${l}</button>`).join("")}</div>`;
    box.append(head);
    $$(head, "[data-t]").forEach(b => b.onclick = () => { S.tab = b.dataset.t; renderOff("lut"); });
    const pick = document.createElement("div"); pick.className = "proof"; box.append(pick);
    ({ ai: tabAI, lib: tabLib, match: tabMatch, mine: tabMine })[S.tab](pick);
    const studio = document.createElement("div"); studio.className = "proof lt-studio"; studio.id = "ltStudio"; box.append(studio);
    renderStudio(studio);
  }
  function tabAI(c) {
    const last = st("mihbara-lut-q") || "";
    c.innerHTML = `<label for="ltFilm">اسم الفيلم أو المسلسل</label><input id="ltFilm" value="${E(last)}" placeholder="مثلاً: Blade Runner 2049 / الفيل الأزرق / Oppenheimer">
      <label for="ltScene">مشهد معيّن أو إحساس عايزه؟ (اختياري)</label><input id="ltScene" placeholder="مثلاً: مشاهد الصحرا الليلية / لقطات الداخلي الدافية">
      <div class="lv-chips lt-sugs">${["Oppenheimer", "Dune: Part Two", "The Batman", "Drive", "In the Mood for Love", "Parasite", "Interstellar", "الفيل الأزرق"].map(s => `<button type="button" class="lv-chip" data-s="${E(s)}">${E(s)}</button>`).join("")}</div>
      <div class="actions"><button class="btn" type="button" id="ltGo">حلّل الفيلم واعمل الـ LUT</button></div><div id="ltAI"></div>`;
    $$(c, "[data-s]").forEach(b => b.onclick = () => { c.querySelector("#ltFilm").value = b.dataset.s; });
    c.querySelector("#ltFilm").onkeydown = e => { if (e.key === "Enter") c.querySelector("#ltGo").click(); };
    c.querySelector("#ltGo").onclick = () => runAI(c);
  }
  function aiPrompt(film, scene) {
    return `إنت كولوريست (Colorist) محترف ومحلل سينمائي. ابحث عن الفيلم/المسلسل «${film}»${scene ? ` مع التركيز على: ${scene}` : ""}: مدير التصوير، طريقة الإضاءة، الـ Color Grading، الباليت اللونية، الكاميرا والخام لو معروفين، والإحساس العام.
بعدين حوّل اللوك ده لإعدادات تصحيح ألوان لفيديو Rec.709 عادي.

ارجع JSON بس (من غير أي كلام قبله أو بعده) بالشكل ده بالظبط:
{"film":"الاسم بالعربي","film_en":"English title","year":2017,"director":"","dop":"مدير التصوير","summary":"جملتين بالعامية المصرية عن اللوك","palette":["#hex","#hex","#hex","#hex","#hex"],"lighting":"وصف الإضاءة","grading":"وصف التلوين","mood":"الإحساس","tips":["نصيحة تصوير ١","نصيحة ٢","نصيحة ٣"],
"params":{"exposure":0,"temperature":0,"tint":0,"contrast":1,"lift":[0,0,0],"gamma":[1,1,1],"gain":[1,1,1],"saturation":1,"vibrance":0,"shadowTint":"#808080","shadowAmt":0,"highTint":"#808080","highAmt":0,"fade":0,"fadeColor":"#808080","rolloff":0,"bleach":0,"hsl":{"red":[0,0,0],"orange":[0,0,0],"yellow":[0,0,0],"green":[0,0,0],"aqua":[0,0,0],"blue":[0,0,0],"magenta":[0,0,0]}}}

معاني ومدى القيم:
exposure من -1 لـ 1 (ستوبات) · temperature من -1 (أزرق بارد) لـ 1 (برتقالي دافي) · tint من -1 (أخضر) لـ 1 (ماجنتا) · contrast من 0.6 لـ 1.7 (1 = طبيعي) · lift إضافة للظلال لكل قناة RGB من -0.12 لـ 0.12 · gamma للدرجات الوسطى من 0.7 لـ 1.4 · gain للإضاءات من 0.75 لـ 1.25 · saturation من 0 (أبيض وأسود) لـ 1.7 · vibrance من -1 لـ 1 · shadowTint/highTint لون بيتحط على الظلال/الإضاءات وقوته shadowAmt/highAmt من 0 لـ 0.8 · fade رفع الأسود (لوك الفيلم الباهت) من 0 لـ 0.2 ولونه fadeColor · rolloff نعومة الإضاءات العالية من 0 لـ 1 · bleach لوك Bleach Bypass من 0 لـ 1 · hsl لكل لون [إزاحة الهيو بالدرجات من -40 لـ 40، تغيير التشبع من -1 لـ 1، تغيير الإضاءة من -0.5 لـ 0.5].
خلّي القيم معتدلة وواقعية عشان الـ LUT يشتغل على أغلب اللقطات، وحافظ على البشرة طبيعية. palette تكون ٥ ألوان من الأغمق للأفتح. لو مش متأكد من معلومة اكتب "غير مؤكد" بدل ما تخمّن.`;
  }
  function parseJSON(t) { const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1")); } catch (x) { return null; } } }
  function runAI(c) {
    if (S.busy) return;
    const film = c.querySelector("#ltFilm").value.trim(), scene = c.querySelector("#ltScene").value.trim(); if (!film) { T("اكتب اسم الفيلم"); return; }
    st("mihbara-lut-q", film);
    const out = c.querySelector("#ltAI"); S.busy = true;
    const steps = ["بيدوّر على معلومات الفيلم…", "بيحلل الإضاءة والألوان…", "بيحوّل اللوك لأرقام…", "بيبني الـ LUT…"]; let si = 0;
    out.innerHTML = `<div class="livesearch"><i></i><span>${steps[0]}</span></div>`;
    const tick = setInterval(() => { si = Math.min(si + 1, steps.length - 1); const s = out.querySelector(".livesearch span"); if (s) s.textContent = steps[si]; }, 3500);
    const done = (j) => {
      clearInterval(tick); S.busy = false;
      if (!j || !j.params) { out.innerHTML = `<p class="lv-err">مقدرتش أطلّع اللوك المرة دي. جرّب تاني أو اكتب الاسم بالإنجليزي.</p>`; return; }
      const look = { kind: "ai", title: j.film_en || j.film || film, sub: [j.film, j.year].filter(Boolean).join(" · "), palette: (j.palette || []).filter(h => /^#[0-9a-f]{6}$/i.test(h)).slice(0, 6), info: j, params: sanitize(j.params) };
      out.innerHTML = ""; setLook(look);
      try { addHistory("lut", "LUT: " + look.title, infoText(look)); } catch (e) { }
    };
    const call = (search) => sample(aiPrompt(film, scene), { search }).then(r => parseJSON(r.text));
    call(true).then(j => j && j.params ? j : call(false)).then(done).catch(() => call(false).then(done).catch(e => { clearInterval(tick); S.busy = false; out.innerHTML = `<p class="lv-err">${E((typeof ERR !== "undefined" && ERR[e && e.code]) || "مقدرتش أوصل للذكاء الاصطناعي دلوقتي.")}</p><p class="small">جرّب «المكتبة الجاهزة»، بتشتغل من غير نت.</p>`; }));
  }
  function tabLib(c) {
    c.innerHTML = `<p class="small">لوكات جاهزة مستوحاة من أفلام مشهورة، بتشتغل من غير نت.</p><div class="lt-grid">${PRESETS.map(p => `<button type="button" class="lt-card${S.look && S.look.kind === "preset" && S.look.title === p.t ? " on" : ""}" data-id="${p.id}"><span class="lt-sw">${p.pal.map(h => `<i style="background:${h}"></i>`).join("")}</span><b>${E(p.t)}</b><small>${E(p.ar)}</small></button>`).join("")}</div>`;
    $$(c, ".lt-card").forEach(b => b.onclick = () => { setLook(presetLook(PRESETS.find(p => p.id === b.dataset.id))); $$(c, ".lt-card").forEach(x => x.classList.toggle("on", x === b)); });
  }
  function tabMatch(c) {
    c.innerHTML = `<p class="small">عندك لقطة (Screenshot) من فيلم عاجبك لونه؟ ارفعها، والتطبيق يحلل ألوان الظلال والإضاءات والتباين والتشبع، ويعمل LUT يقرّب شغلك منها.</p>
      <label class="btn ghost lt-file">🖼️ اختار لقطة من الفيلم<input type="file" accept="image/*" id="ltRef" hidden></label><div id="ltRefOut"></div>`;
    c.querySelector("#ltRef").onchange = function () {
      const f = this.files && this.files[0]; if (!f) return;
      const img = new Image(); img.onload = () => {
        const a = analyzeImage(img), o = c.querySelector("#ltRefOut");
        o.innerHTML = `<div class="lt-ref"><img src="${img.src}" alt="اللقطة المرجعية"><div><b>اللقطة المرجعية</b><span class="lt-sw big">${a.palette.map(h => `<i style="background:${h}"></i>`).join("")}</span><small>تشبع ${Math.round(a.stats.sat * 100)}٪ · أسود عند ${Math.round(a.stats.p2 * 100)}٪ · أبيض عند ${Math.round(a.stats.p98 * 100)}٪</small></div></div>`;
        setLook({ kind: "match", title: "Match: " + (f.name || "reference").replace(/\.[^.]+$/, ""), sub: "متطابق من لقطة", palette: a.palette, params: a.params });
      }; img.src = URL.createObjectURL(f);
    };
  }
  function tabMine(c) {
    const L = mine();
    c.innerHTML = L.length ? `<div class="lt-grid">${L.map((l, i) => `<div class="lt-card mine"><button type="button" data-i="${i}" class="lt-open"><span class="lt-sw">${(l.palette || []).map(h => `<i style="background:${h}"></i>`).join("")}</span><b>${E(l.title)}</b><small>${E(l.sub || "")}</small></button><button type="button" class="mg-x" data-rm="${i}" aria-label="حذف">✕</button></div>`).join("")}</div>` : `<p class="small">لسه مفيش لوكات محفوظة. اعمل لوك ودوس «احفظ في لوكاتي».</p>`;
    $$(c, ".lt-open").forEach(b => b.onclick = () => { const l = mine()[+b.dataset.i]; setLook(Object.assign({}, l, { params: sanitize(l.params) })); });
    $$(c, "[data-rm]").forEach(b => b.onclick = () => { const L2 = mine(); L2.splice(+b.dataset.rm, 1); st("mihbara-luts", L2); renderOff("lut"); });
  }
  function infoText(l) {
    const j = l.info || {};
    return [l.title + (l.sub ? " — " + l.sub : ""), j.dop ? "مدير التصوير: " + j.dop : "", j.summary || "", j.lighting ? "الإضاءة: " + j.lighting : "", j.grading ? "التلوين: " + j.grading : "", j.mood ? "الإحساس: " + j.mood : "", (j.tips || []).length ? "نصايح:\n- " + j.tips.join("\n- ") : "", l.palette && l.palette.length ? "الباليت: " + l.palette.join(" ") : ""].filter(Boolean).join("\n");
  }
  function setLook(l) {
    if (!l.orig) l.orig = JSON.parse(JSON.stringify(l.params));
    S.look = l; lutData = buildLUT(l.params);
    const s = document.getElementById("ltStudio"); if (s) { renderStudio(s); s.scrollIntoView({ behavior: "smooth", block: "start" }); }
  }

  // ---------- الاستوديو ----------
  const SLIDERS = [["amount", "قوة اللوك", 0, 1, .01], ["exposure", "الإضاءة (Exposure)", -1, 1, .02], ["temperature", "الحرارة", -1, 1, .02], ["tint", "أخضر ↔ ماجنتا", -1, 1, .02], ["contrast", "التباين", .6, 1.7, .01], ["saturation", "التشبع", 0, 1.7, .01], ["shadowAmt", "لون الظلال", 0, .8, .01], ["highAmt", "لون الإضاءات", 0, .8, .01], ["fade", "Fade (أسود باهت)", 0, .2, .005], ["rolloff", "نعومة الإضاءات", 0, 1, .01], ["bleach", "Bleach Bypass", 0, 1, .01]];
  function renderStudio(s) {
    stopLoop();
    const l = S.look, j = (l && l.info) || {};
    s.innerHTML = `<h3 class="nf-sec">جرّب على شغلك</h3>
      <div class="lt-view"><canvas id="ltCanvas"></canvas>${S.compare ? `<span class="lt-lab a">قبل</span><span class="lt-lab b">بعد</span>` : ""}<div class="lt-play" id="ltPlay" hidden>▶</div></div>
      <div class="lt-row"><label class="btn ghost mini lt-file">📷 صورة<input type="file" accept="image/*" id="ltImg" hidden></label><label class="btn ghost mini lt-file">🎞️ فيديو<input type="file" accept="video/*" id="ltVid" hidden></label><button type="button" class="btn ghost mini" id="ltCmp" aria-pressed="${S.compare}">${S.compare ? "قبل/بعد ✓" : "قبل/بعد"}</button><button type="button" class="btn ghost mini" id="ltSample">المشهد التجريبي</button></div>
      ${S.compare ? `<input type="range" id="ltSplit" min="0" max="1" step=".01" value="${S.split}" aria-label="مكان الفاصل">` : ""}
      ${l ? `<div class="lt-look"><div class="lt-lt"><b>${E(l.title)}</b><small>${E(l.sub || "")}</small></div>${l.palette && l.palette.length ? `<span class="lt-sw big">${l.palette.map(h => `<i style="background:${h}" title="${h}"></i>`).join("")}</span>` : ""}</div>
        ${l.info ? `<div class="lt-info">${j.summary ? `<p>${E(j.summary)}</p>` : ""}<dl>${j.dop ? `<dt>🎥 مدير التصوير</dt><dd>${E(j.dop)}</dd>` : ""}${j.director ? `<dt>🎬 الإخراج</dt><dd>${E(j.director)}</dd>` : ""}${j.lighting ? `<dt>💡 الإضاءة</dt><dd>${E(j.lighting)}</dd>` : ""}${j.grading ? `<dt>🎨 التلوين</dt><dd>${E(j.grading)}</dd>` : ""}${j.mood ? `<dt>🌫️ الإحساس</dt><dd>${E(j.mood)}</dd>` : ""}</dl>${(j.tips || []).length ? `<p class="small"><b>عشان توصل للّوك وإنت بتصوّر:</b></p><ul class="lt-tips">${j.tips.map(t => `<li>${E(t)}</li>`).join("")}</ul>` : ""}</div>` : ""}
        <details class="lt-tune"><summary>🎚️ ظبط اللوك بإيدك</summary><div class="lt-sl">${SLIDERS.map(([k, lab, mn, mx, sp]) => `<label><span>${lab}</span><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="${sp}" value="${l.params[k]}"><em>${fmt(k, l.params[k])}</em></label>`).join("")}
          <label><span>لون الظلال</span><input type="color" data-c="shadowTint" value="${l.params.shadowTint}"></label><label><span>لون الإضاءات</span><input type="color" data-c="highTint" value="${l.params.highTint}"></label></div>
          <div class="actions"><button type="button" class="btn ghost mini" id="ltReset">رجّع الأصلي</button></div></details>
        <div class="actions lt-exp"><button class="btn" type="button" id="ltCube">⬇️ نزّل LUT ‎(.cube)</button><button class="btn ghost" type="button" id="ltSave">⭐ احفظ في لوكاتي</button></div>
        <div class="actions lt-exp"><button class="btn ghost" type="button" id="ltPhoto" ${S.mediaKind === "image" ? "" : "hidden"}>🖼️ احفظ الصورة بعد اللوك</button><button class="btn ghost" type="button" id="ltVideo" ${S.mediaKind === "video" ? "" : "hidden"}>🎞️ صدّر الفيديو باللوك</button><button class="btn ghost" type="button" id="ltShare">مشاركة التحليل</button></div>
        <div id="ltProg"></div>
        <details class="lt-how"><summary>إزاي أستخدم ملف الـ LUT؟</summary><ul>
          <li><b>CapCut (كمبيوتر):</b> Adjustment ← LUT ← Import، واختار الملف.</li>
          <li><b>Premiere Pro:</b> Lumetri Color ← Creative ← Look ← Browse.</li>
          <li><b>DaVinci Resolve:</b> صفحة Color ← كليك يمين على الـ Node ← LUTs، أو حطه في فولدر الـ LUTs واعمل Refresh.</li>
          <li><b>Final Cut Pro:</b> تأثير Custom LUT ← Choose Custom LUT.</li>
          <li><b>على الموبايل:</b> VN و LumaFusion وأغلب برامج المونتاج اللي بتدعم استيراد LUT ‎.cube.</li>
          <li>💡 الـ LUT معمول لفيديو عادي (Rec.709). لو بتصوّر Log، حوّله لـ Rec.709 الأول وبعدين حط الـ LUT. ولو اللوك قوي، قلّل الـ Opacity أو «قوة اللوك».</li></ul></details>`
      : `<p class="small lt-empty">اختار لوك من فوق (فيلم، مكتبة، أو لقطة مرجعية) وهتشوفه هنا على الصورة.</p>`}`;
    canvas = s.querySelector("#ltCanvas");
    R = Renderer(canvas);
    if (!R) { s.querySelector(".lt-view").innerHTML = `<p class="lv-err">الجهاز ده مش بيدعم المعاينة (WebGL). تقدر برضه تنزّل ملف الـ LUT.</p>`; }
    if (!S.media) { S.media = sampleScene(); S.mediaKind = "sample"; }
    if (R) { R.setLUT(lutData || buildLUT(base())); sizeCanvas(); draw(); if (S.mediaKind === "video") startLoop(); }
    s.querySelector("#ltImg").onchange = function () { const f = this.files && this.files[0]; if (!f) return; const img = new Image(); img.onload = () => { S.media = img; S.mediaKind = "image"; S.mediaName = f.name; renderStudio(s); }; img.onerror = () => T("مقدرتش أفتح الصورة"); img.src = URL.createObjectURL(f); };
    s.querySelector("#ltVid").onchange = function () { const f = this.files && this.files[0]; if (!f) return; const v = document.createElement("video"); v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("playsinline", ""); v.preload = "auto"; v.src = URL.createObjectURL(f); v.onloadeddata = () => { S.media = v; S.mediaKind = "video"; S.mediaName = f.name; S.mediaFile = f; renderStudio(s); v.play().catch(() => { }); }; v.onerror = () => T("الفيديو ده مش مدعوم على الجهاز"); };
    s.querySelector("#ltSample").onclick = () => { S.media = sampleScene(); S.mediaKind = "sample"; renderStudio(s); };
    s.querySelector("#ltCmp").onclick = () => { S.compare = !S.compare; renderStudio(s); };
    const sp = s.querySelector("#ltSplit"); if (sp) sp.oninput = () => { S.split = +sp.value; draw(); };
    if (canvas) canvas.onclick = (e) => { if (S.mediaKind === "video") { const v = S.media; v.paused ? v.play() : v.pause(); s.querySelector("#ltPlay").hidden = !v.paused; } else if (S.compare) { const r = canvas.getBoundingClientRect(); S.split = cl((e.clientX - r.left) / r.width, 0, 1); if (sp) sp.value = S.split; draw(); } };
    if (!l) return;
    let rebuild = 0;
    const apply = () => { clearTimeout(rebuild); rebuild = setTimeout(() => { lutData = buildLUT(l.params); if (R) { R.setLUT(lutData); draw(); } }, 60); };
    $$(s, "input[data-k]").forEach(x => x.oninput = () => { l.params[x.dataset.k] = +x.value; x.nextElementSibling.textContent = fmt(x.dataset.k, +x.value); apply(); });
    $$(s, "input[data-c]").forEach(x => x.oninput = () => { l.params[x.dataset.c] = x.value; if (x.dataset.c === "shadowTint" && !l.params.shadowAmt) l.params.shadowAmt = .2; if (x.dataset.c === "highTint" && !l.params.highAmt) l.params.highAmt = .2; apply(); });
    s.querySelector("#ltReset").onclick = () => { l.params = sanitize(JSON.parse(JSON.stringify(l.orig))); setLook(l); };
    s.querySelector("#ltCube").onclick = async () => {
      const b = s.querySelector("#ltCube"); b.disabled = true; b.textContent = "بيجهّز…";
      try { const txt = cubeText(l.params, l.title + " - Sada"); const where = await saveBlob(new Blob([txt], { type: "application/octet-stream" }), "Sada_" + slug(l.title) + ".cube", "application/octet-stream", true); T("اتحفظ في " + where + " ✓"); }
      catch (e) { T("مقدرتش أحفظ الملف"); }
      b.disabled = false; b.textContent = "⬇️ نزّل LUT ‎(.cube)";
    };
    s.querySelector("#ltSave").onclick = () => { const L = mine(); L.unshift({ title: l.title, sub: l.sub, palette: l.palette, params: l.params, info: l.info ? { summary: l.info.summary, dop: l.info.dop, lighting: l.info.lighting, grading: l.info.grading, mood: l.info.mood, tips: l.info.tips, params: l.info.params } : null, orig: l.orig || l.params, at: Date.now() }); st("mihbara-luts", L.slice(0, 30)); T("اتحفظ في لوكاتي ⭐"); };
    s.querySelector("#ltShare").onclick = () => { try { shareText(infoText(l)); } catch (e) { } };
    s.querySelector("#ltPhoto").onclick = () => exportPhoto(l);
    s.querySelector("#ltVideo").onclick = () => exportVideo(l, s.querySelector("#ltProg"));
  }
  function fmt(k, v) { return k === "amount" ? Math.round(v * 100) + "٪" : (+v).toFixed(2); }
  function mediaSize(m) { return m ? [m.videoWidth || m.naturalWidth || m.width, m.videoHeight || m.naturalHeight || m.height] : [16, 9]; }
  function sizeCanvas() { const [w, h] = mediaSize(S.media), W = Math.min(1080, w || 960); canvas.width = W; canvas.height = Math.max(1, Math.round(W * (h || 540) / (w || 960))); }
  function draw() { if (R && S.media) R.draw(S.media, S.compare ? S.split : 0, S.compare); }
  function startLoop() { stopLoop(); const loop = () => { if (!canvas || !document.body.contains(canvas)) return stopLoop(); if (S.media && S.media.readyState >= 2) draw(); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function exportPhoto(l) {
    const [w, h] = mediaSize(S.media), sc = Math.min(1, 4096 / Math.max(w, h)), c = document.createElement("canvas"); c.width = Math.round(w * sc); c.height = Math.round(h * sc);
    const r = Renderer(c); if (!r) { T("مش مدعوم على الجهاز"); return; }
    r.setLUT(buildLUT(l.params)); r.draw(S.media, 0, false);
    c.toBlob(async b => { try { const where = await saveBlob(b, "Sada_" + slug(l.title) + "_" + Date.now() + ".jpg", "image/jpeg", false); T("اتحفظت في " + where + " ✓"); } catch (e) { T("مقدرتش أحفظ الصورة"); } }, "image/jpeg", .95);
  }
  async function exportVideo(l, prog) {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { T("تصدير الفيديو مش مدعوم على الجهاز ده. نزّل الـ LUT وحطه في برنامج المونتاج."); return; }
    const src = S.mediaFile; if (!src) return;
    const v = document.createElement("video"); v.src = URL.createObjectURL(src); v.playsInline = true; v.preload = "auto";
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; }).catch(() => null);
    if (!v.duration) { T("مقدرتش أقرا الفيديو"); return; }
    if (v.duration > 180) { T("التصدير متاح لحد ٣ دقايق. للفيديوهات الأطول استخدم ملف الـ LUT في برنامج المونتاج."); return; }
    const sc = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight)), c = document.createElement("canvas"); c.width = Math.round(v.videoWidth * sc / 2) * 2; c.height = Math.round(v.videoHeight * sc / 2) * 2;
    const r = Renderer(c); if (!r) { T("مش مدعوم على الجهاز"); return; }
    r.setLUT(buildLUT(l.params));
    const stream = c.captureStream(30);
    let actx = null;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); const srcN = actx.createMediaElementSource(v), dst = actx.createMediaStreamDestination(); srcN.connect(dst); if (actx.state === "suspended") actx.resume().catch(() => { }); dst.stream.getAudioTracks().forEach(t => stream.addTrack(t)); } catch (e) { v.muted = true; }
    const types = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || "video/webm";
    const ext = mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6e6 }), parts = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
    let cancel = false, raf2 = 0;
    prog.innerHTML = `<div class="lt-prog"><span>بيصدّر الفيديو باللوك… <b id="ltPct">٠٪</b></span><div class="mg-bar"><i id="ltBar" style="width:0"></i></div><button type="button" class="btn ghost mini" id="ltCancel">إلغاء</button></div><p class="small">سيب التطبيق مفتوح لحد ما يخلص. التصدير بياخد نفس وقت الفيديو.</p>`;
    prog.querySelector("#ltCancel").onclick = () => { cancel = true; try { v.pause(); rec.stop(); } catch (e) { } };
    const loop = () => { if (v.readyState >= 2) r.draw(v, 0, false); const p = v.currentTime / v.duration; const b = prog.querySelector("#ltBar"); if (b) { b.style.width = (p * 100) + "%"; prog.querySelector("#ltPct").textContent = Math.round(p * 100).toLocaleString("ar-EG") + "٪"; } if (!v.ended && !cancel) raf2 = requestAnimationFrame(loop); };
    const finished = new Promise(res => { rec.onstop = res; });
    v.onended = () => { setTimeout(() => { try { rec.stop(); } catch (e) { } }, 150); };
    rec.start(1000);
    try { await v.play(); } catch (e) { T("مقدرتش أشغّل الفيديو"); try { rec.stop(); } catch (x) { } }
    loop();
    await finished; cancelAnimationFrame(raf2); try { actx && actx.close(); } catch (e) { }
    if (cancel) { prog.innerHTML = ""; T("اتلغى"); return; }
    prog.innerHTML = `<div class="livesearch"><i></i><span>بيحفظ الفيديو…</span></div>`;
    try { const where = await saveBlob(new Blob(parts, { type: mime.split(";")[0] }), "Sada_" + slug(l.title) + "_" + Date.now() + "." + ext, mime.split(";")[0], false); prog.innerHTML = `<p class="mg-ok">✓ الفيديو اتحفظ في ${E(where)}</p>`; }
    catch (e) { prog.innerHTML = `<p class="lv-err">مقدرتش أحفظ الفيديو.</p>`; }
  }

  // ---------- CSS ----------
  const css = `.lt-tabs{flex-wrap:wrap;margin-top:8px}.lt-sugs{margin:8px 0}
.lt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.lt-card{display:grid;gap:4px;text-align:start;font:inherit;color:var(--ink);background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:8px;cursor:pointer;position:relative}.lt-card.on{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft,rgba(37,99,235,.15))}.lt-card b{font-size:13.5px}.lt-card small{color:var(--muted);font-size:11.5px;line-height:1.5}
.lt-card.mine{padding:0}.lt-card.mine .lt-open{display:grid;gap:4px;text-align:start;font:inherit;color:inherit;background:none;border:0;padding:8px;cursor:pointer}.lt-card.mine .mg-x{position:absolute;top:6px;inset-inline-end:6px}
.lt-sw{display:flex;height:22px;border-radius:8px;overflow:hidden}.lt-sw i{flex:1}.lt-sw.big{height:30px;min-width:150px}
.lt-view{position:relative;border-radius:14px;overflow:hidden;background:#000;margin-bottom:8px}.lt-view canvas{display:block;width:100%;height:auto}.lt-lab{position:absolute;top:8px;font-size:11px;color:#fff;background:rgba(0,0,0,.55);padding:2px 8px;border-radius:999px;pointer-events:none}.lt-lab.a{left:8px}.lt-lab.b{right:8px}
.lt-play{position:absolute;inset:0;display:grid;place-items:center;font-size:42px;color:#fff;text-shadow:0 2px 10px #000;pointer-events:none}
.lt-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}.lt-file{cursor:pointer}#ltSplit{width:100%;direction:ltr}
.lt-look{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:12px 0 6px}.lt-lt b{display:block;font-size:17px}.lt-lt small{color:var(--muted)}
.lt-info{background:var(--surface2);border-radius:14px;padding:10px 12px;margin:8px 0;line-height:1.75;font-size:14px}.lt-info dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:6px 0}.lt-info dt{font-weight:700;white-space:nowrap}.lt-info dd{margin:0}.lt-tips{margin:4px 0;padding-inline-start:18px}
.lt-tune,.lt-how{border:1px solid var(--line);border-radius:14px;padding:6px 12px;margin:10px 0}.lt-tune summary,.lt-how summary{cursor:pointer;font-weight:700;padding:4px 0}.lt-how ul{padding-inline-start:18px;line-height:1.8;font-size:13.5px}
.lt-sl{display:grid;gap:6px;margin-top:6px}.lt-sl label{display:grid;grid-template-columns:118px 1fr 46px;gap:8px;align-items:center;font-size:13px;margin:0}.lt-sl input[type=range]{direction:ltr;width:100%;margin:0}.lt-sl input[type=color]{width:46px;height:28px;padding:0;border:0;background:none}.lt-sl em{font-style:normal;font-size:12px;color:var(--muted);text-align:center}
.lt-exp{flex-wrap:wrap}.lt-prog{display:grid;gap:6px}.lt-ref{display:flex;gap:10px;align-items:center;margin-top:10px}.lt-ref img{width:120px;border-radius:10px}.lt-ref div{display:grid;gap:6px}.lt-ref small{color:var(--muted)}.lt-empty{text-align:center;margin:10px 0 0}`;
  const se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  document.addEventListener("DOMContentLoaded", function () {
    try {
      ICONS.lut = '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18"/><circle cx="8.5" cy="9" r="1.3"/><circle cx="8" cy="14" r="1.3"/><circle cx="12" cy="17" r="1.3"/>';
      TINT.lut = "#d9480f";
      EXTRA.lut = { name: "LUTs سينمائية بالذكاء الاصطناعي", desc: "لوك ألوان مستوحى من أي فيلم، تجرّبه على صورك وفيديوهاتك وتنزّله ‎.cube" };
      OFF.push("lut"); NEWBIES.push("lut");
      const g = GROUPS.find(x => x.items.indexOf("studio") >= 0);
      if (g) g.items.unshift("lut"); else GROUPS.push({ title: "الاستوديو", items: ["lut"] });
      const prevOff = renderOff;
      renderOff = function (k) { if (k !== "lut") { stopLoop(); return prevOff(k); } const box = document.getElementById("offBody"); box.innerHTML = ""; offLut(box); };
      const prevOpen = open;
      open = function (k) { if (k !== "lut") { stopLoop(); try { S.media && S.media.pause && S.media.pause(); } catch (e) { } } return prevOpen(k); };
      buildHome(); filterTools();
      window.MihbaraLUT = { compile, buildLUT, cubeText, sanitize, analyzeImage, PRESETS };
    } catch (e) { console.error("lut init", e); }
  });
})();
