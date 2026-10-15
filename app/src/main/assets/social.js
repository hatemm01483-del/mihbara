// صحفجي — صناعة المحتوى: استوديو السوشيال (بوست/كاروسيل صور) + ريلز وستوري بورد
(function () {
  "use strict";
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const T = m => { try { toast(m); } catch (e) { } };
  const $$ = (r, s) => Array.prototype.slice.call(r.querySelectorAll(s));
  const cl = (x, a, b) => Math.min(b, Math.max(a, x));
  const st = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };
  const FD = '"Alexandria","Readex Pro",Tahoma,sans-serif', FB = '"Readex Pro",Tahoma,sans-serif';
  const words = s => String(s || "").trim().split(/\s+/).filter(Boolean);
  const clip = (s, n) => { const w = words(s); return w.length > n ? w.slice(0, n).join(" ") + "…" : w.join(" "); };
  const plain = s => String(s || "").replace(/[#*_>`|]/g, " ").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/[ \t]+/g, " ").trim();
  const sentences = s => plain(s).split(/(?<=[.!؟?])\s+|\n+/).map(x => x.trim()).filter(x => words(x).length > 2);
  function parseJSON(t) { t = String(t || ""); const a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { try { return JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, "$1")); } catch (e2) { return null; } } }
  async function ai(prompt) { const r = await sample(prompt); return parseJSON(r && r.text); }

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
  const toBlob = c => new Promise(r => c.toBlob(r, "image/png"));
  function fromHistoryOptions() {
    let a = []; try { a = loadH().slice(0, 12); } catch (e) { }
    return a.length ? `<select class="sc-hist"><option value="">— أو هات مادة من شغلك المحفوظ —</option>${a.map((it, i) => `<option value="${i}">${E((toolMeta(it.tool) || {}).name || "")} · ${E(String(it.title).slice(0, 50))}</option>`).join("")}</select>` : "";
  }
  function bindHistory(c, ta) {
    const s = c.querySelector(".sc-hist"); if (!s) return;
    s.onchange = () => { const it = loadH()[+s.value]; if (it) { ta.value = plain(it.text).slice(0, 4000); ta.dispatchEvent(new Event("input")); } s.value = ""; };
  }
  function segHTML(name, opts, val) { return `<div class="sc-seg" data-seg="${name}">${opts.map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${k === val}">${l}</button>`).join("")}</div>`; }
  function bindSeg(c, name, fn) { $$(c, `[data-seg="${name}"] button`).forEach(b => b.onclick = () => { $$(c, `[data-seg="${name}"] button`).forEach(x => x.setAttribute("aria-pressed", x === b)); fn(b.dataset.v); }); }
  async function fontsReady() { try { await Promise.all([document.fonts.load(`700 40px ${FD}`, "صحفجي"), document.fonts.load(`500 40px ${FB}`, "صحفجي"), document.fonts.load(`400 40px ${FB}`, "صحفجي")]); } catch (e) { } }

  // =====================================================================
  //                         استوديو السوشيال
  // =====================================================================
  const SIZES = { post: [1080, 1350, "بوست 4:5"], square: [1080, 1080, "مربع 1:1"], story: [1080, 1920, "ستوري 9:16"], wide: [1200, 675, "عريض 16:9"] };
  const THEMES = {
    breaking: { n: "عاجل", bg: ["#B91C1C", "#450A0A"], ink: "#fff", sub: "rgba(255,255,255,.86)", acc: "#FDE047", tag: "عاجل" },
    classic: { n: "جرنال", bg: ["#FBF8F3", "#EFE8DC"], ink: "#111827", sub: "#4B5563", acc: "#BE123C", tag: "" },
    dark: { n: "داكن ذهبي", bg: ["#16161F", "#05050A"], ink: "#fff", sub: "rgba(255,255,255,.78)", acc: "#F5B700", tag: "" },
    vivid: { n: "ملوّن", bg: ["#F43F5E", "#7C3AED"], ink: "#fff", sub: "rgba(255,255,255,.9)", acc: "#FDBA74", tag: "" },
    quote: { n: "اقتباس", bg: ["#FFFFFF", "#F3F4F6"], ink: "#111827", sub: "#374151", acc: "#E11D48", tag: "", quote: true }
  };
  const SDEF = { text: "", size: "post", theme: "breaking", kind: "single", n: 5, lang: "fusha", brand: "صحفجي نيوز", handle: "@sahafgy", accent: "", slides: [], caption: "", tags: [] };
  let SS = Object.assign({}, SDEF, st("mihbara-social") || {}), photo = null, rendering = 0;
  const saveS = () => st("mihbara-social", Object.assign({}, SS));

  function wrapLines(ctx, text, maxW) {
    const out = []; String(text || "").split("\n").forEach(par => {
      let line = ""; words(par).forEach(w => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
      if (line) out.push(line);
    }); return out;
  }
  function fit(ctx, text, maxW, maxH, big, small, weight, fam, lh, maxLines) {
    for (let fs = big; fs >= small; fs -= 2) { ctx.font = `${weight} ${fs}px ${fam}`; const L = wrapLines(ctx, text, maxW); if (L.length * fs * lh <= maxH && (!maxLines || L.length <= maxLines)) return { fs, L }; }
    ctx.font = `${weight} ${small}px ${fam}`; let L = wrapLines(ctx, text, maxW); const m = Math.max(1, Math.floor(maxH / (small * lh))); if (L.length > m) { L = L.slice(0, m); L[m - 1] += "…"; } return { fs: small, L };
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function micMark(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(12, 7, 5.5, 0, 7); ctx.fill(); ctx.fillRect(8, 12.6, 8, 1.8); ctx.fillRect(11, 14.4, 2, 5); rrect(ctx, 7.5, 19.4, 9, 2.6, 1.3); ctx.fill(); ctx.restore();
  }
  function drawSlide(cv, sl, i, total) {
    const [W, H] = SIZES[SS.size] || SIZES.post; cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d"), th = THEMES[SS.theme] || THEMES.breaking, acc = SS.accent || th.acc, u = W / 1080, pad = 80 * u;
    ctx.direction = "rtl"; ctx.textBaseline = "alphabetic";
    let g = ctx.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, th.bg[0]); g.addColorStop(1, th.bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const dark = th.ink === "#fff";
    if (photo && (i === 0 || SS.kind === "single")) {
      const r = Math.max(W / photo.width, H / photo.height), pw = photo.width * r, ph = photo.height * r; ctx.drawImage(photo, (W - pw) / 2, (H - ph) / 2, pw, ph);
      g = ctx.createLinearGradient(0, H * .2, 0, H); g.addColorStop(0, "rgba(0,0,0,.05)"); g.addColorStop(.55, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,.9)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else if (SS.theme === "vivid" || SS.theme === "dark") {
      ctx.globalAlpha = .12; ctx.strokeStyle = acc; ctx.lineWidth = 40 * u; ctx.beginPath(); ctx.arc(W * .05, H * .08, 260 * u, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    } else if (SS.theme === "breaking") {
      ctx.globalAlpha = .08; ctx.fillStyle = "#fff"; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(W - k * 220 * u, 0); ctx.lineTo(W - k * 220 * u - 90 * u, 0); ctx.lineTo(W - k * 220 * u - 400 * u, H); ctx.lineTo(W - k * 220 * u - 310 * u, H); ctx.fill(); } ctx.globalAlpha = 1;
    } else if (SS.theme === "classic") {
      ctx.fillStyle = th.ink; ctx.fillRect(pad, pad + 70 * u, W - 2 * pad, 4 * u); ctx.fillRect(pad, pad + 80 * u, W - 2 * pad, 1.5 * u);
    }
    const onPhoto = photo && (i === 0 || SS.kind === "single"), ink = onPhoto ? "#fff" : th.ink, sub = onPhoto ? "rgba(255,255,255,.88)" : th.sub;
    // البراند فوق
    const bx = W - pad; ctx.textAlign = "right";
    micMark(ctx, bx - 44 * u, pad - 6 * u, 44 * u, onPhoto || dark ? "#fff" : acc);
    ctx.font = `700 ${34 * u}px ${FD}`; ctx.fillStyle = ink; ctx.fillText(SS.brand || "صحفجي نيوز", bx - 60 * u, pad + 30 * u);
    if (total > 1) { ctx.textAlign = "left"; ctx.font = `600 ${26 * u}px ${FB}`; ctx.fillStyle = sub; ctx.fillText(`${i + 1}/${total}`, pad, pad + 28 * u); ctx.textAlign = "right"; }
    // العلامة (عاجل/كيكر)
    const top = pad + 150 * u, maxW = W - 2 * pad, bottomRes = 150 * u;
    let y = top;
    const kick = SS.theme === "breaking" && i === 0 ? (sl.kicker && sl.kicker !== "عاجل" ? "عاجل | " + sl.kicker : "عاجل") : sl.kicker;
    if (kick) {
      ctx.font = `700 ${30 * u}px ${FD}`; const kw = ctx.measureText(kick).width + 44 * u;
      ctx.fillStyle = acc; rrect(ctx, bx - kw, y, kw, 58 * u, 12 * u); ctx.fill();
      ctx.fillStyle = (SS.theme === "classic" || SS.theme === "quote") ? "#fff" : "#111"; ctx.fillText(kick, bx - 22 * u, y + 40 * u); y += 100 * u;
    }
    const avail = H - y - bottomRes - pad;
    if (th.quote) {
      ctx.save(); ctx.direction = "ltr"; ctx.textAlign = "right"; ctx.font = `700 ${280 * u}px Georgia,serif`; ctx.fillStyle = acc; ctx.globalAlpha = .9; ctx.fillText("\u201D", bx + 6 * u, y + 200 * u); ctx.restore(); y += 150 * u;
    }
    const isCover = i === 0, body = sl.body || "";
    let tf = fit(ctx, sl.title || "", maxW, (body ? .62 : .95) * (avail - (th.quote ? 170 * u : 0)), isCover ? 104 * u : 86 * u, 46 * u, 700, FD, 1.32, 6);
    // لو العنوان قليل، خليه في نص الصفحة الرأسي
    const tH = tf.L.length * tf.fs * 1.32;
    ctx.font = `500 ${40 * u}px ${FB}`;
    let bf = body ? fit(ctx, body, maxW, avail - tH - 50 * u - (th.quote ? 170 * u : 0), 44 * u, 28 * u, 500, FB, 1.6, 9) : null;
    const total2 = tH + (bf ? 40 * u + bf.L.length * bf.fs * 1.6 : 0);
    if (onPhoto || SS.size === "story") y = Math.max(y, H - bottomRes - pad - total2 - 20 * u);
    else y = Math.max(y, y + (H - bottomRes - pad - y - total2) * .42);
    ctx.fillStyle = ink; ctx.font = `700 ${tf.fs}px ${FD}`;
    tf.L.forEach((l, k) => ctx.fillText(l, bx, y + tf.fs * (1 + k * 1.32)));
    y += tH + 10 * u;
    if (bf) {
      ctx.fillStyle = acc; ctx.fillRect(bx - 90 * u, y + 6 * u, 90 * u, 7 * u); y += 40 * u;
      ctx.fillStyle = sub; ctx.font = `500 ${bf.fs}px ${FB}`; bf.L.forEach((l, k) => ctx.fillText(l, bx, y + bf.fs * (1 + k * 1.6)));
    }
    // الفوتر
    const fy = H - pad;
    ctx.globalAlpha = .9; ctx.fillStyle = sub; ctx.font = `500 ${26 * u}px ${FB}`; ctx.save(); ctx.direction = "ltr"; ctx.textAlign = "right"; ctx.fillText(SS.handle || "", bx, fy); ctx.restore(); ctx.globalAlpha = 1;
    if (total > 1 && i < total - 1) {
      ctx.textAlign = "left"; ctx.font = `700 ${28 * u}px ${FD}`; ctx.fillStyle = onPhoto || dark ? "#fff" : acc; ctx.fillText("اسحب ←", pad, fy);
    }
    ctx.textAlign = "right";
  }
  function socialPrompt(text) {
    const n = SS.kind === "single" ? 1 : cl(+SS.n || 5, 3, 8);
    return `إنت محرر سوشيال ميديا شاطر في مؤسسة إخبارية مصرية. حوّل المادة اللي تحت لـ${n === 1 ? "بوست صورة واحدة" : `كاروسيل من ${n} شرائح`} لانستجرام وفيسبوك.
- اللغة: ${SS.lang === "ammiya" ? "عامية مصرية خفيفة ومحترمة" : "عربي فصيح مبسّط"}.
- ${n === 1 ? "الشريحة فيها: كيكر (كلمة أو اتنين زي: عاجل/اقتصاد/جامعة)، عنوان قوي أقل من 12 كلمة، وسطرين شرح بحد أقصى 30 كلمة." : "الشريحة الأولى غلاف جذاب بعنوان قوي (هوك) من غير شرح طويل، الشرائح اللي بعدها كل واحدة فكرة واحدة (عنوان قصير + شرح بحد أقصى 30 كلمة)، والأخيرة خلاصة + دعوة للتفاعل أو المتابعة."}
- متضيفش أي معلومة أو رقم مش موجود في المادة.
- اكتب كابشن للبوست (2-4 سطور) و 4-6 هاشتاجات مناسبة.
رجّع JSON بس من غير أي كلام قبله أو بعده:
{"slides":[{"kicker":"","title":"","body":""}],"caption":"","hashtags":["#"]}

المادة:
"""${String(text).slice(0, 5000)}"""`;
  }
  function localSlides(text) {
    const S = sentences(text); if (!S.length) return null;
    if (SS.kind === "single") return { slides: [{ kicker: "خبر", title: clip(S[0], 12), body: clip(S.slice(1, 3).join(" "), 30) }], caption: clip(S.slice(0, 3).join(" "), 60), hashtags: ["#صحفجي", "#أخبار"] };
    const n = cl(+SS.n || 5, 3, 8), sl = [{ kicker: "خبر", title: clip(S[0], 12), body: "" }];
    S.slice(1, n - 1).forEach((s, k) => sl.push({ kicker: String(k + 1), title: clip(s, 9), body: clip(s, 30) }));
    sl.push({ kicker: "الخلاصة", title: "تابعنا عشان توصلك الأخبار أول بأول", body: clip(S[0], 24) });
    return { slides: sl, caption: clip(S.slice(0, 3).join(" "), 60), hashtags: ["#صحفجي", "#أخبار"] };
  }
  function cleanSlides(j) {
    const sl = (j && Array.isArray(j.slides) ? j.slides : []).map(s => ({ kicker: String(s.kicker || "").slice(0, 30), title: String(s.title || "").slice(0, 160), body: String(s.body || "").slice(0, 400) })).filter(s => s.title || s.body);
    return { slides: sl.slice(0, 10), caption: String((j && j.caption) || ""), tags: ((j && j.hashtags) || []).map(String).map(h => h.startsWith("#") ? h : "#" + h).slice(0, 8) };
  }

  function offSocial(box) {
    const head = document.createElement("div"); head.className = "slip";
    head.innerHTML = `<h2>استوديو السوشيال</h2><p class="lead">حط خبرك أو أي مادة، و«صحفجي» يحوّلها لبوست أو كاروسيل صور متصمم وجاهز للنشر على انستجرام وفيسبوك، مع الكابشن والهاشتاجات. تقدر تعدّل أي كلمة وتختار الشكل، وتحفظ الصور على موبايلك.</p>`;
    box.append(head);
    const c = document.createElement("div"); c.className = "proof sc"; box.append(c);
    c.innerHTML = `<label for="scText">الخبر أو المادة</label><textarea id="scText" placeholder="الصق الخبر هنا… أو اكتب الفكرة">${E(SS.text)}</textarea>${fromHistoryOptions()}
      <label>نوع البوست</label>${segHTML("kind", [["single", "صورة واحدة"], ["carousel", "كاروسيل"]], SS.kind)}
      <div class="sc-n" ${SS.kind === "single" ? "hidden" : ""}><label for="scN">عدد الشرائح: <b id="scNv">${SS.n}</b></label><input type="range" id="scN" min="3" max="8" value="${SS.n}"></div>
      <label>المقاس</label>${segHTML("size", Object.keys(SIZES).map(k => [k, SIZES[k][2]]), SS.size)}
      <label>الشكل</label><div class="sc-themes">${Object.keys(THEMES).map(k => `<button type="button" data-th="${k}" aria-pressed="${k === SS.theme}"><i style="background:linear-gradient(135deg,${THEMES[k].bg[0]},${THEMES[k].bg[1]})"><b style="background:${THEMES[k].acc}"></b></i>${THEMES[k].n}</button>`).join("")}</div>
      <label>اللغة</label>${segHTML("lang", [["fusha", "فصحى مبسطة"], ["ammiya", "عامية مصرية"]], SS.lang)}
      <details class="sc-more"><summary>البراند والصورة</summary>
        <div class="sc-2"><div><label for="scBrand">اسم الصفحة</label><input id="scBrand" value="${E(SS.brand)}"></div><div><label for="scHandle">اليوزر</label><input id="scHandle" dir="ltr" value="${E(SS.handle)}"></div></div>
        <div class="sc-2"><div><label for="scAcc">لون مميز</label><input id="scAcc" type="color" value="${E(SS.accent || THEMES[SS.theme].acc)}"></div><div><label>صورة خلفية للغلاف</label><div class="sc-row"><label class="btn ghost sc-file">اختار صورة<input type="file" accept="image/*" id="scPhoto" hidden></label><button type="button" class="btn ghost" id="scNoPhoto" ${photo ? "" : "hidden"}>شيل الصورة</button></div></div></div>
      </details>
      <div class="actions"><button class="btn" type="button" id="scGo">✨ اعمل البوست</button>${SS.slides.length ? `<button class="btn ghost" type="button" id="scBlank">ابدأ فاضي</button>` : `<button class="btn ghost" type="button" id="scBlank">صمّم بنفسك</button>`}</div>
      <div id="scOut"></div>`;
    const ta = c.querySelector("#scText"); ta.oninput = () => { SS.text = ta.value; saveS(); }; bindHistory(c, ta);
    bindSeg(c, "kind", v => { SS.kind = v; c.querySelector(".sc-n").hidden = v === "single"; saveS(); });
    bindSeg(c, "size", v => { SS.size = v; saveS(); renderOut(); });
    bindSeg(c, "lang", v => { SS.lang = v; saveS(); });
    const nI = c.querySelector("#scN"); nI.oninput = () => { SS.n = +nI.value; c.querySelector("#scNv").textContent = nI.value; saveS(); };
    $$(c, "[data-th]").forEach(b => b.onclick = () => { $$(c, "[data-th]").forEach(x => x.setAttribute("aria-pressed", x === b)); SS.theme = b.dataset.th; SS.accent = ""; c.querySelector("#scAcc").value = THEMES[SS.theme].acc; saveS(); renderOut(); });
    c.querySelector("#scBrand").oninput = e => { SS.brand = e.target.value; saveS(); renderOut(true); };
    c.querySelector("#scHandle").oninput = e => { SS.handle = e.target.value; saveS(); renderOut(true); };
    c.querySelector("#scAcc").oninput = e => { SS.accent = e.target.value; saveS(); renderOut(true); };
    c.querySelector("#scPhoto").onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; const im = new Image(); im.onload = () => { photo = im; c.querySelector("#scNoPhoto").hidden = false; renderOut(); }; im.src = URL.createObjectURL(f); };
    c.querySelector("#scNoPhoto").onclick = () => { photo = null; c.querySelector("#scNoPhoto").hidden = true; renderOut(); };
    c.querySelector("#scBlank").onclick = () => { if (!SS.slides.length || confirmBlank()) { SS.slides = [{ kicker: "خبر", title: "اكتب العنوان هنا", body: "واكتب التفاصيل هنا" }]; SS.caption = ""; SS.tags = []; saveS(); renderOut(); } };
    c.querySelector("#scGo").onclick = async () => {
      const text = ta.value.trim(); if (words(text).length < 4) { T("اكتب الخبر الأول"); ta.focus(); return; }
      const btn = c.querySelector("#scGo"); btn.disabled = true; btn.textContent = "بيجهّز البوست…";
      let j = null; try { j = cleanSlides(await ai(socialPrompt(text))); if (!j.slides.length) j = null; } catch (e) { j = null; }
      if (!j) { const l = localSlides(text); j = l && cleanSlides(l); if (j) T("اتعمل من غير ذكاء اصطناعي — عدّل براحتك"); }
      btn.disabled = false; btn.textContent = "✨ اعمل البوست";
      if (!j || !j.slides.length) { T("مقدرتش أعمل البوست، جرّب تاني"); return; }
      SS.slides = j.slides; SS.caption = j.caption; SS.tags = j.tags; saveS();
      try { addHistory("social", SS.slides[0].title, slidesText()); } catch (e) { }
      renderOut(); setTimeout(() => { const o = document.getElementById("scOut"); o && o.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    };
    renderOut();
  }
  function confirmBlank() { return true; }
  function slidesText() { return SS.slides.map((s, i) => `${i + 1}) ${s.kicker ? "[" + s.kicker + "] " : ""}${s.title}\n${s.body}`).join("\n\n") + (SS.caption ? "\n\n— الكابشن —\n" + SS.caption : "") + (SS.tags.length ? "\n" + SS.tags.join(" ") : ""); }
  let drawT = 0;
  async function renderOut(onlyDraw) {
    const o = document.getElementById("scOut"); if (!o) return;
    if (!SS.slides.length) { o.innerHTML = ""; return; }
    if (onlyDraw && o.querySelector(".sc-strip")) { clearTimeout(drawT); drawT = setTimeout(drawAll, 60); return; }
    const total = SS.slides.length;
    o.innerHTML = `<div class="sc-hd"><b>المعاينة</b><small>${total > 1 ? "اسحب يمين وشمال عشان تشوف الشرائح" : ""}</small></div>
      <div class="sc-strip">${SS.slides.map((_, i) => `<div class="sc-fr"><canvas data-i="${i}"></canvas><div class="sc-fa"><button type="button" class="chipbtn" data-save="${i}">حفظ</button><button type="button" class="chipbtn" data-share="${i}">مشاركة</button></div></div>`).join("")}</div>
      <div class="actions"><button class="btn" type="button" id="scSaveAll">⬇️ احفظ ${total > 1 ? "كل الصور (" + total + ")" : "الصورة"}</button><button class="btn ghost" type="button" id="scCap">انسخ الكابشن</button></div>
      <details class="sc-cap" open><summary>الكابشن والهاشتاجات</summary><textarea id="scCaption" rows="4">${E(SS.caption)}</textarea><input id="scTags" dir="auto" value="${E(SS.tags.join(" "))}"></details>
      <details class="sc-edit"><summary>عدّل الكلام (${total})</summary>${SS.slides.map((s, i) => `<div class="sc-se" data-i="${i}"><div class="sc-seh"><b>شريحة ${i + 1}</b><span>${i > 0 ? `<button type="button" class="chipbtn" data-up="${i}">↑</button>` : ""}${total > 1 ? `<button type="button" class="chipbtn" data-del="${i}">حذف</button>` : ""}</span></div>
        <input data-f="kicker" placeholder="كيكر (اختياري)" value="${E(s.kicker)}"><textarea data-f="title" rows="2" placeholder="العنوان">${E(s.title)}</textarea><textarea data-f="body" rows="3" placeholder="الشرح (اختياري)">${E(s.body)}</textarea></div>`).join("")}
        <div class="actions"><button type="button" class="btn ghost" id="scAdd">+ شريحة جديدة</button></div></details>`;
    $$(o, ".sc-se").forEach(d => { const i = +d.dataset.i; $$(d, "[data-f]").forEach(f => f.oninput = () => { SS.slides[i][f.dataset.f] = f.value; saveS(); clearTimeout(drawT); drawT = setTimeout(() => drawOne(i), 80); }); });
    $$(o, "[data-del]").forEach(b => b.onclick = () => { SS.slides.splice(+b.dataset.del, 1); saveS(); renderOut(); });
    $$(o, "[data-up]").forEach(b => b.onclick = () => { const i = +b.dataset.up; const t = SS.slides[i]; SS.slides[i] = SS.slides[i - 1]; SS.slides[i - 1] = t; saveS(); renderOut(); });
    o.querySelector("#scAdd").onclick = () => { SS.slides.push({ kicker: "", title: "عنوان جديد", body: "" }); saveS(); renderOut(); };
    o.querySelector("#scCaption").oninput = e => { SS.caption = e.target.value; saveS(); };
    o.querySelector("#scTags").oninput = e => { SS.tags = e.target.value.split(/\s+/).filter(Boolean); saveS(); };
    o.querySelector("#scCap").onclick = () => copyText((SS.caption + "\n\n" + SS.tags.join(" ")).trim());
    $$(o, "[data-save]").forEach(b => b.onclick = () => exportOne(+b.dataset.save, false));
    $$(o, "[data-share]").forEach(b => b.onclick = () => exportOne(+b.dataset.share, true));
    o.querySelector("#scSaveAll").onclick = async () => { const b = o.querySelector("#scSaveAll"); b.disabled = true; let where = ""; try { for (let i = 0; i < SS.slides.length; i++) { b.textContent = `بيحفظ ${i + 1}/${SS.slides.length}…`; where = await exportOne(i, false, true); } T(`اتحفظوا في ${where} ✓`); } catch (e) { T("مقدرتش أحفظ الصور"); } b.disabled = false; b.textContent = "⬇️ احفظ تاني"; };
    await fontsReady(); drawAll();
  }
  function drawOne(i) { const cv = document.querySelector(`#scOut canvas[data-i="${i}"]`); if (cv) drawSlide(cv, SS.slides[i], i, SS.slides.length); }
  function drawAll() { SS.slides.forEach((_, i) => drawOne(i)); }
  async function exportOne(i, share, quiet) {
    const cv = document.createElement("canvas"); await fontsReady(); drawSlide(cv, SS.slides[i], i, SS.slides.length);
    const b = await toBlob(cv); const name = `Sahafgy_post_${Date.now()}_${i + 1}.png`;
    try { const where = await saveBlob(b, name, "image/png", share); if (!quiet) T(share ? "اختار هتشاركها فين" : `اتحفظت في ${where} ✓`); return where; }
    catch (e) { if (!quiet) T("مقدرتش أحفظ الصورة"); throw e; }
  }

  // =====================================================================
  //                         ريلز وستوري بورد
  // =====================================================================
  const SHOTS = {
    close: ["كلوز", "#E11D48"], medium: ["ميديم", "#F59E0B"], wide: ["واسعة", "#10B981"], broll: ["بي رول", "#3B82F6"], text: ["نص على الشاشة", "#8B5CF6"], screen: ["سكرين/جرافيك", "#64748B"]
  };
  const RDEF = { text: "", plat: "reels", dur: 30, style: "news", lang: "ammiya", data: null };
  let RS = Object.assign({}, RDEF, st("mihbara-reels") || {});
  const saveR = () => st("mihbara-reels", RS);
  const STYLES = [["news", "خبر سريع"], ["explain", "شرح/إكسبلينر"], ["opinion", "رأي"], ["behind", "كواليس/ڤلوج"], ["street", "رأي الشارع"]];
  function thumb(type) {
    const bg = "#1F2937", sk = "#F9FAFB", c = (SHOTS[type] || SHOTS.medium)[1];
    const fr = (inner) => `<svg viewBox="0 0 54 96" xmlns="http://www.w3.org/2000/svg"><rect width="54" height="96" rx="6" fill="${bg}"/>${inner}<rect x="1" y="1" width="52" height="94" rx="5.5" fill="none" stroke="${c}" stroke-width="2"/></svg>`;
    switch (type) {
      case "close": return fr(`<circle cx="27" cy="42" r="17" fill="${sk}"/><path d="M4 96 Q27 62 50 96Z" fill="${c}"/><circle cx="21" cy="40" r="1.8" fill="${bg}"/><circle cx="33" cy="40" r="1.8" fill="${bg}"/><path d="M21 49 Q27 53 33 49" stroke="${bg}" stroke-width="1.6" fill="none"/>`);
      case "medium": return fr(`<circle cx="27" cy="36" r="9" fill="${sk}"/><path d="M10 80 Q12 50 27 48 Q42 50 44 80Z" fill="${c}"/><rect x="36" y="56" width="3" height="12" rx="1.5" fill="${sk}"/><circle cx="37.5" cy="55" r="3" fill="#9CA3AF"/>`);
      case "wide": return fr(`<path d="M0 66 H54 V96 H0Z" fill="#374151"/><rect x="6" y="40" width="10" height="26" fill="#4B5563"/><rect x="38" y="34" width="12" height="32" fill="#4B5563"/><circle cx="27" cy="56" r="3" fill="${sk}"/><path d="M24 70 Q27 59 30 70Z" fill="${c}"/>`);
      case "broll": return fr(`<path d="M0 72 L18 50 L30 62 L40 52 L54 70 V96 H0Z" fill="${c}" opacity=".85"/><circle cx="40" cy="28" r="7" fill="#FDE68A"/>`);
      case "text": return fr(`<rect x="8" y="30" width="38" height="7" rx="3" fill="${c}"/><rect x="8" y="42" width="30" height="5" rx="2.5" fill="${sk}"/><rect x="8" y="51" width="34" height="5" rx="2.5" fill="${sk}" opacity=".7"/><rect x="8" y="60" width="22" height="5" rx="2.5" fill="${sk}" opacity=".5"/>`);
      default: return fr(`<rect x="10" y="18" width="34" height="60" rx="5" fill="${sk}"/><rect x="14" y="26" width="26" height="14" rx="2" fill="${c}"/><rect x="14" y="44" width="20" height="3" rx="1.5" fill="#9CA3AF"/><rect x="14" y="50" width="24" height="3" rx="1.5" fill="#9CA3AF"/><rect x="14" y="56" width="16" height="3" rx="1.5" fill="#9CA3AF"/>`);
    }
  }
  function reelsPrompt(text) {
    const pl = { reels: "Instagram Reels", tiktok: "TikTok", shorts: "YouTube Shorts" }[RS.plat] || "Reels";
    const sty = (STYLES.find(s => s[0] === RS.style) || STYLES[0])[1];
    return `إنت صانع محتوى فيديو قصير ومخرج شاطر بتشتغل لمؤسسة إخبارية مصرية. اعمل خطة فيديو ${pl} مدته ${RS.dur} ثانية بالظبط، بأسلوب «${sty}»، عن المادة اللي تحت.
- أول 3 ثواني هوك قوي يوقّف اللي بيقلّب.
- قسّم الفيديو للقطات (shots) متتالية من 0 لحد ${RS.dur} ثانية، كل لقطة 2-8 ثواني. نوع اللقطة لازم يكون واحد من: close, medium, wide, broll, text, screen.
- لكل لقطة: اللي بيظهر في الكادر (visual) وزاوية/حركة الكاميرا، الكلام المنطوق (voice) ${RS.lang === "ammiya" ? "بالعامية المصرية" : "بالفصحى المبسطة"}، النص اللي يتكتب على الشاشة (text) قصير جداً، والصوت/المؤثر (sound).
- الكلام المنطوق لازم يكفي الوقت (حوالي 2.3 كلمة في الثانية).
- متضيفش أي معلومة أو رقم مش موجود في المادة.
رجّع JSON بس من غير أي كلام قبله أو بعده:
{"title":"عنوان الفيديو","hook":"جملة الهوك","shots":[{"from":0,"to":3,"type":"close","visual":"","camera":"","voice":"","text":"","sound":""}],"cover":"نص الغلاف (3-5 كلمات)","caption":"كابشن","hashtags":["#"],"music":"نوع الموسيقى المقترح","tips":["نصيحة تصوير عملية"]}

المادة:
"""${String(text).slice(0, 5000)}"""`;
  }
  function cleanReel(j) {
    if (!j || !Array.isArray(j.shots) || !j.shots.length) return null;
    const D = RS.dur; let t = 0;
    let sh = j.shots.map(s => ({ from: +s.from || 0, to: +s.to || 0, type: SHOTS[String(s.type || "").toLowerCase()] ? String(s.type).toLowerCase() : "medium", visual: String(s.visual || ""), camera: String(s.camera || ""), voice: String(s.voice || ""), text: String(s.text || ""), sound: String(s.sound || "") }));
    sh.sort((a, b) => a.from - b.from);
    sh = sh.map(s => { const len = cl((s.to - s.from) || 3, 1, 12); const o = Object.assign({}, s, { from: t, to: t + len }); t += len; return o; });
    const k = D / t; let acc = 0; sh.forEach(s => { const len = Math.max(1, Math.round((s.to - s.from) * k)); s.from = acc; s.to = acc + len; acc += len; });
    if (sh.length) sh[sh.length - 1].to = D;
    sh = sh.filter(s => s.to > s.from);
    return { title: String(j.title || ""), hook: String(j.hook || (sh[0] && sh[0].voice) || ""), shots: sh, cover: String(j.cover || ""), caption: String(j.caption || ""), tags: (j.hashtags || []).map(String).map(h => h.startsWith("#") ? h : "#" + h).slice(0, 8), music: String(j.music || ""), tips: (j.tips || []).map(String).slice(0, 5) };
  }
  function localReel(text) {
    const S = sentences(text); if (!S.length) return null; const D = RS.dur, n = cl(Math.round(D / 5), 3, 12), per = D / n, types = ["close", "broll", "text", "medium", "broll", "wide", "text", "close"];
    const shots = []; for (let i = 0; i < n; i++) shots.push({ from: Math.round(i * per), to: Math.round((i + 1) * per), type: i === 0 ? "close" : types[i % types.length], visual: i === 0 ? "المذيع/المراسل بيبص للكاميرا مباشرة" : "لقطات من مكان الحدث", camera: i === 0 ? "ثابتة على مستوى العين" : "حركة بطيئة", voice: clip(S[i % S.length], Math.round(per * 2.3)), text: clip(S[i % S.length], 5), sound: i === 0 ? "مؤثر افتتاحي سريع" : "موسيقى خفيفة" });
    return { title: clip(S[0], 8), hook: clip(S[0], 10), shots, cover: clip(S[0], 5), caption: clip(S.slice(0, 2).join(" "), 40), hashtags: ["#صحفجي", "#ريلز"], music: "إيقاع سريع خفيف", tips: ["صوّر عمودي 9:16", "خلي الإضاءة في وش المتكلم"] };
  }
  function offReels(box) {
    const head = document.createElement("div"); head.className = "slip";
    head.innerHTML = `<h2>ريلز وستوري بورد</h2><p class="lead">حوّل خبرك لخطة فيديو قصير جاهزة للتصوير: هوك أول 3 ثواني، تقسيم اللقطات بالثانية، الكلام والنص اللي على الشاشة، وستوري بورد متصوّر تقدر تحفظه صورة أو تبعته للتلقين.</p>`;
    box.append(head);
    const c = document.createElement("div"); c.className = "proof sc"; box.append(c);
    c.innerHTML = `<label for="rlText">الخبر أو الفكرة</label><textarea id="rlText" placeholder="الصق الخبر أو اكتب فكرة الفيديو…">${E(RS.text)}</textarea>${fromHistoryOptions()}
      <label>المنصة</label>${segHTML("plat", [["reels", "ريلز"], ["tiktok", "تيك توك"], ["shorts", "شورتس"]], RS.plat)}
      <label>المدة</label>${segHTML("dur", [["15", "15ث"], ["30", "30ث"], ["60", "60ث"], ["90", "90ث"]], String(RS.dur))}
      <label>الأسلوب</label>${segHTML("style", STYLES, RS.style)}
      <label>لغة الكلام</label>${segHTML("lang", [["ammiya", "عامية مصرية"], ["fusha", "فصحى مبسطة"]], RS.lang)}
      <div class="actions"><button class="btn" type="button" id="rlGo">🎬 اعمل خطة الفيديو</button></div><div id="rlOut"></div>`;
    const ta = c.querySelector("#rlText"); ta.oninput = () => { RS.text = ta.value; saveR(); }; bindHistory(c, ta);
    bindSeg(c, "plat", v => { RS.plat = v; saveR(); }); bindSeg(c, "dur", v => { RS.dur = +v; saveR(); }); bindSeg(c, "style", v => { RS.style = v; saveR(); }); bindSeg(c, "lang", v => { RS.lang = v; saveR(); });
    c.querySelector("#rlGo").onclick = async () => {
      const text = ta.value.trim(); if (words(text).length < 4) { T("اكتب الخبر أو الفكرة الأول"); ta.focus(); return; }
      const b = c.querySelector("#rlGo"); b.disabled = true; b.textContent = "بيجهّز الخطة…";
      let r = null; try { r = cleanReel(await ai(reelsPrompt(text))); } catch (e) { r = null; }
      if (!r) { r = cleanReel(localReel(text)); if (r) T("اتعملت من غير ذكاء اصطناعي — عدّل براحتك"); }
      b.disabled = false; b.textContent = "🎬 اعمل خطة الفيديو";
      if (!r) { T("مقدرتش أعمل الخطة، جرّب تاني"); return; }
      RS.data = r; saveR(); try { addHistory("reels", r.title || r.hook, reelText(r)); } catch (e) { }
      renderReel(); setTimeout(() => { const o = document.getElementById("rlOut"); o && o.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    };
    renderReel();
  }
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  function reelText(r) {
    return `🎬 ${r.title}\n🪝 الهوك: ${r.hook}\n\n` + r.shots.map((s, i) => `${i + 1}) ${fmt(s.from)}–${fmt(s.to)} · ${SHOTS[s.type][0]}\n📷 ${s.visual}${s.camera ? " (" + s.camera + ")" : ""}\n🎙️ ${s.voice}${s.text ? "\n🔤 " + s.text : ""}${s.sound ? "\n🎵 " + s.sound : ""}`).join("\n\n") + `\n\n🖼️ الغلاف: ${r.cover}\n🎵 الموسيقى: ${r.music}\n\n${r.caption}\n${r.tags.join(" ")}`;
  }
  function renderReel() {
    const o = document.getElementById("rlOut"); if (!o) return; const r = RS.data; if (!r) { o.innerHTML = ""; return; }
    const D = r.shots.length ? r.shots[r.shots.length - 1].to : RS.dur, wc = r.shots.reduce((a, s) => a + words(s.voice).length, 0), rate = wc / Math.max(1, D);
    o.innerHTML = `<div class="rl-hook"><small>🪝 الهوك — أول 3 ثواني</small><b>${E(r.hook)}</b></div>
      <div class="rl-meta"><span>⏱️ ${D} ثانية</span><span>🎞️ ${r.shots.length} لقطة</span><span class="${rate > 3 ? "rl-warn" : ""}">🗣️ ${wc} كلمة ${rate > 3 ? "— كتير على الوقت، اختصر" : rate < 1.4 ? "— فيه مساحة لصمت ومؤثرات" : "— مناسب"}</span></div>
      <div class="rl-tl" aria-hidden="true">${r.shots.map(s => `<i style="flex:${s.to - s.from};background:${SHOTS[s.type][1]}" title="${E(SHOTS[s.type][0])}"></i>`).join("")}</div>
      <div class="rl-leg">${Object.keys(SHOTS).filter(k => r.shots.some(s => s.type === k)).map(k => `<span><i style="background:${SHOTS[k][1]}"></i>${SHOTS[k][0]}</span>`).join("")}</div>
      <div class="rl-board">${r.shots.map((s, i) => `<div class="rl-shot"><div class="rl-th">${thumb(s.type)}<em>${i + 1}</em></div><div class="rl-bd"><div class="rl-h"><b>${fmt(s.from)} – ${fmt(s.to)}</b><span style="color:${SHOTS[s.type][1]}">${SHOTS[s.type][0]}</span></div>
        <p>📷 ${E(s.visual)}${s.camera ? ` <small>(${E(s.camera)})</small>` : ""}</p><p class="rl-v">🎙️ ${E(s.voice)}</p>${s.text ? `<p class="rl-t">🔤 ${E(s.text)}</p>` : ""}${s.sound ? `<p><small>🎵 ${E(s.sound)}</small></p>` : ""}</div></div>`).join("")}</div>
      <div class="rl-extra"><p><b>🖼️ نص الغلاف:</b> ${E(r.cover)}</p><p><b>🎵 الموسيقى:</b> ${E(r.music)}</p>${r.tips.length ? `<p><b>💡 نصايح التصوير:</b></p><ul>${r.tips.map(t => `<li>${E(t)}</li>`).join("")}</ul>` : ""}<p><b>✍️ الكابشن:</b><br>${E(r.caption)}<br><span dir="auto">${E(r.tags.join(" "))}</span></p></div>
      <div class="actions"><button class="btn" type="button" id="rlPng">⬇️ احفظ الستوري بورد صورة</button><button class="btn ghost" type="button" id="rlPrompt">🎙️ ابعت الكلام للتلقين</button><button class="btn ghost" type="button" id="rlCopy">انسخ الخطة</button><button class="btn ghost" type="button" id="rlShare">مشاركة</button></div>`;
    o.querySelector("#rlCopy").onclick = () => copyText(reelText(r));
    o.querySelector("#rlShare").onclick = () => shareText(reelText(r), r.title || "خطة فيديو");
    o.querySelector("#rlPrompt").onclick = () => { try { store.set("mihbara-prompter", r.shots.map(s => s.voice).filter(Boolean).join("\n\n")); } catch (e) { } open("prompter"); T("الكلام جاهز في التلقين ✓"); };
    o.querySelector("#rlPng").onclick = async () => { const b = o.querySelector("#rlPng"); b.disabled = true; try { const where = await boardPNG(r); T(`اتحفظ في ${where} ✓`); } catch (e) { T("مقدرتش أحفظ الصورة"); } b.disabled = false; };
  }
  function svgImg(s) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }); }
  async function boardPNG(r) {
    await fontsReady();
    const W = 1080, pad = 48, thW = 135, thH = 240, cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    ctx.direction = "rtl";
    const textW = W - pad * 3 - thW;
    // نحسب الارتفاع
    const lay = r.shots.map(s => { ctx.font = `500 26px ${FB}`; const v = wrapLines(ctx, "🎙️ " + s.voice, textW); ctx.font = `400 23px ${FB}`; const vi = wrapLines(ctx, "📷 " + s.visual + (s.camera ? " (" + s.camera + ")" : ""), textW); const tx = s.text ? wrapLines(ctx, "🔤 " + s.text, textW) : []; const h = Math.max(thH, 50 + vi.length * 34 + v.length * 38 + tx.length * 34 + 20); return { v, vi, tx, h }; });
    ctx.font = `700 40px ${FD}`; const tl = wrapLines(ctx, r.title || "خطة فيديو", W - pad * 2);
    ctx.font = `600 30px ${FB}`; const hk = wrapLines(ctx, "🪝 " + r.hook, W - pad * 2 - 40);
    const H = pad + tl.length * 52 + 30 + hk.length * 42 + 50 + 40 + lay.reduce((a, l) => a + l.h + 24, 0) + 90;
    cv.width = W; cv.height = H;
    ctx.fillStyle = "#0F0F17"; ctx.fillRect(0, 0, W, H); ctx.direction = "rtl"; ctx.textAlign = "right";
    let y = pad; ctx.fillStyle = "#fff"; ctx.font = `700 40px ${FD}`; tl.forEach(l => { y += 52; ctx.fillText(l, W - pad, y); });
    y += 24; ctx.fillStyle = "#2A1520"; rrect(ctx, pad, y, W - pad * 2, hk.length * 42 + 30, 18); ctx.fill(); ctx.fillStyle = "#FDA4AF"; ctx.font = `600 30px ${FB}`; hk.forEach((l, k) => ctx.fillText(l, W - pad - 20, y + 44 + k * 42)); y += hk.length * 42 + 50;
    const D = r.shots[r.shots.length - 1].to; let x = W - pad; r.shots.forEach(s => { const w = (W - pad * 2) * (s.to - s.from) / D; ctx.fillStyle = SHOTS[s.type][1]; ctx.fillRect(x - w + 2, y, w - 4, 16); x -= w; }); y += 40;
    for (let i = 0; i < r.shots.length; i++) {
      const s = r.shots[i], L = lay[i];
      ctx.fillStyle = "#181824"; rrect(ctx, pad - 12, y - 12, W - pad * 2 + 24, L.h + 24, 18); ctx.fill();
      try { const im = await svgImg(thumb(s.type)); ctx.drawImage(im, W - pad - thW, y, thW, thH); } catch (e) { }
      ctx.fillStyle = "#fff"; ctx.font = `700 26px ${FD}`; ctx.textAlign = "center"; ctx.fillText(String(i + 1), W - pad - thW / 2, y + thH - 14); ctx.textAlign = "right";
      const tx0 = W - pad * 2 - thW; let yy = y + 34;
      ctx.font = `700 27px ${FD}`; ctx.fillStyle = "#fff"; ctx.fillText(`${fmt(s.from)} – ${fmt(s.to)}`, tx0, yy);
      ctx.fillStyle = SHOTS[s.type][1]; ctx.textAlign = "left"; ctx.fillText(SHOTS[s.type][0], pad, yy); ctx.textAlign = "right"; yy += 16;
      ctx.font = `400 23px ${FB}`; ctx.fillStyle = "#CBD5E1"; L.vi.forEach(l => { yy += 34; ctx.fillText(l, tx0, yy); });
      ctx.font = `500 26px ${FB}`; ctx.fillStyle = "#fff"; L.v.forEach(l => { yy += 38; ctx.fillText(l, tx0, yy); });
      ctx.font = `400 23px ${FB}`; ctx.fillStyle = "#C4B5FD"; L.tx.forEach(l => { yy += 34; ctx.fillText(l, tx0, yy); });
      y += L.h + 24;
    }
    ctx.fillStyle = "rgba(255,255,255,.55)"; ctx.font = `500 24px ${FB}`; micMark(ctx, W - pad - 30, H - 64, 30, "#E11D48"); ctx.fillText("اتعمل على صحفجي · خليك صحفجي", W - pad - 44, H - 40);
    const b = await toBlob(cv); return saveBlob(b, `Sahafgy_storyboard_${Date.now()}.png`, "image/png", false);
  }

  // ===================== CSS + تسجيل الأدوات =====================
  const css = `.sc-seg{display:flex;flex-wrap:wrap;gap:6px}.sc-seg button,.sc-themes button{font:inherit;font-size:13px;padding:8px 13px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface2);color:var(--ink);cursor:pointer}
.sc-seg button[aria-pressed="true"],.sc-themes button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft);color:var(--accent);font-weight:700}
.sc-hist{margin-top:8px}.sc-n input{direction:ltr;padding:0;background:none;border:0;box-shadow:none}
.sc-themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px}.sc-themes button{display:grid;justify-items:center;gap:6px;padding:8px}.sc-themes i{display:block;width:100%;aspect-ratio:4/5;border-radius:8px;position:relative;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}.sc-themes i b{position:absolute;right:10%;top:22%;width:46%;height:8%;border-radius:3px}
.sc-more{border:1px solid var(--line);border-radius:14px;padding:6px 12px;margin-top:14px}.sc-more summary,.sc-cap summary,.sc-edit summary{cursor:pointer;font-weight:700;padding:4px 0}
.sc-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.sc-row{display:flex;gap:6px;flex-wrap:wrap}.sc-file{display:inline-block;margin:0;color:var(--ink)}#scAcc{height:46px;padding:4px}
.sc-hd{display:flex;justify-content:space-between;align-items:baseline;margin:18px 0 8px}.sc-hd small{color:var(--muted)}
.sc-strip{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:8px;-webkit-overflow-scrolling:touch}.sc-fr{flex:0 0 78%;max-width:340px;scroll-snap-align:center}.sc-fr canvas{width:100%;height:auto;display:block;border-radius:12px;box-shadow:0 8px 24px -10px rgba(0,0,0,.45)}.sc-fa{display:flex;gap:6px;justify-content:center;margin-top:8px}
.sc-cap,.sc-edit{border:1px solid var(--line);border-radius:14px;padding:6px 12px;margin-top:12px}.sc-cap textarea{min-height:90px}.sc-cap input{margin-top:8px}
.sc-se{border-top:1px dashed var(--line);padding:10px 0;display:grid;gap:6px}.sc-se textarea{min-height:56px}.sc-seh{display:flex;justify-content:space-between;align-items:center}.sc-seh span{display:flex;gap:6px}
.rl-hook{margin-top:16px;background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;border-radius:16px;padding:14px 16px}.rl-hook small{display:block;opacity:.85;margin-bottom:4px}.rl-hook b{font-size:18px;line-height:1.6}
.rl-meta{display:flex;flex-wrap:wrap;gap:6px 14px;margin:10px 0;font-size:13px;color:var(--muted)}.rl-warn{color:var(--flash);font-weight:700}
.rl-tl{display:flex;height:14px;border-radius:7px;overflow:hidden;gap:2px}.rl-tl i{display:block;min-width:4px}
.rl-leg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--muted);margin:6px 0 12px}.rl-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-inline-end:4px;vertical-align:-1px}
.rl-board{display:grid;gap:10px}.rl-shot{display:grid;grid-template-columns:64px 1fr;gap:12px;background:var(--surface2);border-radius:14px;padding:10px}.rl-th{position:relative;align-self:start}.rl-th svg{width:64px;height:auto;display:block}.rl-th em{position:absolute;bottom:4px;inset-inline:0;text-align:center;font-style:normal;font-weight:700;color:#fff;font-size:13px}
.rl-bd p{margin:4px 0;font-size:13.5px;line-height:1.7}.rl-bd small{color:var(--muted)}.rl-h{display:flex;justify-content:space-between;font-size:13px}.rl-v{font-weight:600;font-size:14.5px!important}.rl-t{color:#7C3AED}
.rl-extra{background:var(--surface2);border-radius:14px;padding:10px 14px;margin-top:12px;font-size:14px;line-height:1.8}.rl-extra p{margin:4px 0}.rl-extra ul{margin:0;padding-inline-start:20px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .rl-t{color:#C4B5FD}}:root[data-theme="dark"] .rl-t{color:#C4B5FD}`;
  const se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  document.addEventListener("DOMContentLoaded", function () {
    try {
      ICONS.social = '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>';
      ICONS.reels = '<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M10 9l5 3-5 3z"/><path d="M5 6h14"/>';
      TINT.social = "#db2777"; TINT.reels = "#7c3aed";
      EXTRA.social = { name: "استوديو السوشيال", desc: "حوّل خبرك لبوست أو كاروسيل صور جاهز لانستجرام وفيسبوك" };
      EXTRA.reels = { name: "ريلز وستوري بورد", desc: "خطة فيديو قصير بالثانية: هوك ولقطات وكلام وستوري بورد" };
      OFF.push("social", "reels"); NEWBIES.push("social", "reels");
      GROUPS.unshift({ title: "صناعة المحتوى", sub: "خلّي خبرك يتشاف على السوشيال", items: ["social", "reels"] });
      const prevOff = renderOff;
      renderOff = function (k) { if (k !== "social" && k !== "reels") return prevOff(k); const box = document.getElementById("offBody"); box.innerHTML = ""; (k === "social" ? offSocial : offReels)(box); };
      buildHome(); filterTools();
    } catch (e) { console.error("social init", e); }
  });
})();
