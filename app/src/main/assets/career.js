/* NewsCast 360 — التحديث 4: المستقبل المهني والتفاعل + تعديلات (القاموس) */
(function () {
  "use strict";
  const { E, T, st, $$, N, words, fmtT } = NC;
  const FD = '"Alexandria","Readex Pro",Tahoma,sans-serif', FB = '"Readex Pro",Tahoma,sans-serif';
  const D = window.NC_DAILY || { sent: [], fake: [] };

  // =====================================================================
  // 20) البورتفوليو (PDF)
  // =====================================================================
  let pf = st("mihbara-portfolio") || { name: "", title: "طالب إعلام — إذاعة وتلفزيون", bio: "", skills: "كتابة الأخبار، التقديم، المونتاج، التحقق من المعلومات", contact: "", pick: [], color: "rose" };
  const PCOL = { rose: ["#E11D48", "#9D174D"], navy: ["#1E3A8A", "#0B1026"], green: ["#0F766E", "#064E3B"], dark: ["#111827", "#000000"] };
  let pfPhoto = null;
  function offPortfolio(box) {
    const c = NC.html("div", "slip"), H = loadH();
    c.innerHTML = `<h2>البورتفوليو</h2><p class="lead">اختار أحسن شغلك من السجل، واكتب بياناتك، وهيطلعلك ملف PDF شكله احترافي تبعته لأي قناة أو تدريب.</p>
    <div class="row"><div><label>اسمك</label><input id="pfN" type="text" value="${E(pf.name)}"></div><div><label>المسمى</label><input id="pfT" type="text" value="${E(pf.title)}"></div></div>
    <label>نبذة عنك</label><textarea id="pfB" style="min-height:80px" placeholder="سطرين عنك وعن اهتماماتك">${E(pf.bio)}</textarea>
    <label>مهاراتك (افصل بفواصل)</label><input id="pfS" type="text" value="${E(pf.skills)}">
    <label>للتواصل (إيميل، لينكدإن…)</label><input id="pfC" type="text" value="${E(pf.contact)}" dir="ltr">
    <label>اللون</label>${NC.seg("col", [["rose", "وردي"], ["navy", "كحلي"], ["green", "أخضر"], ["dark", "أسود"]], pf.color)}
    <div class="actions"><button class="btn ghost" type="button" id="pfP">${pfPhoto ? "غيّر صورتك" : "حط صورتك"}</button></div>
    <h3 class="group-title" style="margin-top:16px">اختار شغلك (${N(H.length)} في السجل)</h3>
    <div class="nc-list" id="pfL">${H.length ? H.map(it => `<label class="nc-row"><input type="checkbox" value="${E(it.id)}"${pf.pick.indexOf(it.id) >= 0 ? " checked" : ""}><span style="flex:1"><b>${E((toolMeta(it.tool) || {}).name || "")}</b><br><span class="nc-mini">${E(it.title)}</span></span></label>`).join("") : '<div class="empty"><b>السجل فاضي</b>استخدم أدوات التطبيق الأول، وشغلك هيظهر هنا.</div>'}</div>
    <div class="actions"><button class="btn" type="button" id="pfGo">اعمل الـ PDF</button></div><p class="nc-mini" id="pfNote"></p><canvas class="nc-cv" id="pfPrev" hidden></canvas>`;
    box.append(c);
    const sv = () => { pf.name = c.querySelector("#pfN").value; pf.title = c.querySelector("#pfT").value; pf.bio = c.querySelector("#pfB").value; pf.skills = c.querySelector("#pfS").value; pf.contact = c.querySelector("#pfC").value; pf.pick = $$(c, "#pfL input:checked").map(x => x.value); st("mihbara-portfolio", pf); };
    $$(c, "input,textarea").forEach(e => e.addEventListener("change", sv));
    NC.bindSeg(c, "col", v => { pf.color = v; sv(); });
    c.querySelector("#pfP").onclick = async () => { const f = await NC.pickFile("image/*"); if (!f) return; const im = new Image(); im.onload = () => { pfPhoto = im; c.querySelector("#pfP").textContent = "غيّر صورتك ✓"; }; im.src = URL.createObjectURL(f); };
    c.querySelector("#pfGo").onclick = async e => {
      sv(); if (!pf.name.trim()) { T("اكتب اسمك"); return; }
      const items = loadH().filter(it => pf.pick.indexOf(it.id) >= 0); if (!items.length) { T("اختار شغل واحد على الأقل"); return; }
      e.target.disabled = true; c.querySelector("#pfNote").textContent = "بيجهّز الصفحات…";
      try { await (document.fonts ? document.fonts.ready : Promise.resolve());
        const pages = buildPages(items); const pdf = await makePDF(pages);
        const prev = c.querySelector("#pfPrev"); prev.hidden = false; prev.width = pages[0].width; prev.height = pages[0].height; prev.getContext("2d").drawImage(pages[0], 0, 0);
        const w = await NC.saveBlob(pdf, "Portfolio_" + pf.name.replace(/\s+/g, "_") + ".pdf", "application/pdf", true);
        c.querySelector("#pfNote").textContent = `✓ اتحفظ في ${w} (${N(pages.length)} صفحة)`;
      } catch (er) { c.querySelector("#pfNote").textContent = "مقدرتش أعمل الملف."; }
      e.target.disabled = false;
    };
  }
  function buildPages(items) {
    const W = 1240, Hh = 1754, M = 100, [a1, a2] = PCOL[pf.color] || PCOL.rose, pages = [];
    const mk = () => { const cv = document.createElement("canvas"); cv.width = W; cv.height = Hh; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, Hh); g.direction = "rtl"; g.textAlign = "right"; pages.push(cv); return g; };
    const wrap = (g, t, mw) => { const out = []; String(t).split("\n").forEach(par => { if (!par.trim()) { out.push(""); return; } let cur = ""; par.split(/\s+/).forEach(w => { const x = cur ? cur + " " + w : w; if (g.measureText(x).width > mw && cur) { out.push(cur); cur = w; } else cur = x; }); out.push(cur); }); return out; };
    const footer = (g, n) => { g.fillStyle = "#9ca3af"; g.font = `400 22px ${FB}`; g.textAlign = "center"; g.fillText(pf.name + " · " + N(n), W / 2, Hh - 50); g.textAlign = "right"; };
    // الغلاف
    let g = mk(); const gr = g.createLinearGradient(0, 0, W, 700); gr.addColorStop(0, a1); gr.addColorStop(1, a2); g.fillStyle = gr; g.fillRect(0, 0, W, 760);
    if (pfPhoto) { g.save(); g.beginPath(); g.arc(W / 2, 330, 170, 0, 7); g.clip(); const r = Math.max(340 / pfPhoto.width, 340 / pfPhoto.height); g.drawImage(pfPhoto, W / 2 - pfPhoto.width * r / 2, 330 - pfPhoto.height * r / 2, pfPhoto.width * r, pfPhoto.height * r); g.restore(); g.strokeStyle = "#fff"; g.lineWidth = 10; g.beginPath(); g.arc(W / 2, 330, 172, 0, 7); g.stroke(); }
    g.textAlign = "center"; g.fillStyle = "#fff"; g.font = `800 84px ${FD}`; g.fillText(pf.name, W / 2, pfPhoto ? 620 : 380); g.font = `500 40px ${FB}`; g.fillText(pf.title, W / 2, pfPhoto ? 690 : 460);
    g.textAlign = "right"; let y = 860;
    if (pf.bio.trim()) { g.fillStyle = a1; g.font = `700 40px ${FD}`; g.fillText("نبذة", W - M, y); y += 60; g.fillStyle = "#1f2937"; g.font = `400 32px ${FB}`; wrap(g, pf.bio, W - 2 * M).forEach(l => { g.fillText(l, W - M, y); y += 52; }); y += 30; }
    const sk = pf.skills.split(/[،,]/).map(x => x.trim()).filter(Boolean);
    if (sk.length) { g.fillStyle = a1; g.font = `700 40px ${FD}`; g.fillText("المهارات", W - M, y); y += 40; let x = W - M; g.font = `500 28px ${FB}`;
      sk.forEach(s => { const w = g.measureText(s).width + 44; if (x - w < M) { x = W - M; y += 70; } g.fillStyle = "#f3f4f6"; g.beginPath(); g.roundRect ? g.roundRect(x - w, y, w, 54, 27) : g.rect(x - w, y, w, 54); g.fill(); g.fillStyle = "#111827"; g.fillText(s, x - 22, y + 37); x -= w + 14; }); y += 110; }
    g.fillStyle = a1; g.font = `700 40px ${FD}`; g.fillText("المحتويات", W - M, y); y += 60; g.font = `400 30px ${FB}`; g.fillStyle = "#374151";
    items.slice(0, 12).forEach((it, i) => { g.fillText(N(i + 1) + ". " + ((toolMeta(it.tool) || {}).name || "") + " — " + it.title.slice(0, 50), W - M, y); y += 48; });
    if (pf.contact.trim()) { g.fillStyle = "#6b7280"; g.font = `500 28px ${FB}`; g.textAlign = "center"; g.fillText(pf.contact, W / 2, Hh - 110); g.textAlign = "right"; }
    footer(g, 1);
    // صفحات الأعمال
    items.forEach((it, idx) => {
      g = mk(); g.fillStyle = a1; g.fillRect(0, 0, W, 16); y = 120;
      g.fillStyle = a1; g.font = `600 28px ${FB}`; g.fillText(N(idx + 1) + " · " + ((toolMeta(it.tool) || {}).name || ""), W - M, y); y += 70;
      g.fillStyle = "#111827"; g.font = `800 48px ${FD}`; wrap(g, it.title, W - 2 * M).slice(0, 3).forEach(l => { g.fillText(l, W - M, y); y += 66; });
      g.fillStyle = "#9ca3af"; g.font = `400 24px ${FB}`; try { g.fillText(new Date(it.at).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }), W - M, y); } catch (e) { } y += 30;
      g.fillStyle = "#e5e7eb"; g.fillRect(M, y, W - 2 * M, 3); y += 60;
      const body = String(it.text || "").replace(/\*\*/g, "").replace(/^#+\s*/gm, "■ ").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/^\|.*\|$/gm, l => l.replace(/\|/g, "  ").replace(/-{3,}/g, ""));
      g.font = `400 29px ${FB}`; const lines = wrap(g, body, W - 2 * M);
      lines.forEach(l => { if (y > Hh - 140) { footer(g, pages.length); g = mk(); g.fillStyle = a1; g.fillRect(0, 0, W, 16); y = 120; g.font = `400 29px ${FB}`; }
        if (l.indexOf("■ ") === 0) { g.fillStyle = a1; g.font = `700 32px ${FD}`; g.fillText(l.slice(2), W - M, y); g.font = `400 29px ${FB}`; y += 54; } else { g.fillStyle = "#1f2937"; g.fillText(l, W - M, y); y += l ? 48 : 24; } });
      footer(g, pages.length);
    });
    return pages;
  }
  async function makePDF(pages) {
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const push = x => { const b = typeof x === "string" ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push("\nendobj\n"); };
    push("%PDF-1.4\n%\xFF\xFF\n");
    const imgs = []; for (const cv of pages) { const b = await new Promise(r => cv.toBlob(r, "image/jpeg", 0.86)); imgs.push(new Uint8Array(await b.arrayBuffer())); }
    const n = pages.length, kids = []; for (let i = 0; i < n; i++) kids.push(3 + i * 3);
    obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
    obj(2, () => push(`<< /Type /Pages /Kids [${kids.map(k => k + " 0 R").join(" ")}] /Count ${n} >>`));
    pages.forEach((cv, i) => { const p = 3 + i * 3, ct = p + 1, im = p + 2, cs = "q 595.28 0 0 841.89 0 0 cm /Im0 Do Q";
      obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
      obj(ct, () => { push(`<< /Length ${cs.length} >>\nstream\n`); push(cs); push("\nendstream"); });
      obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgs[i].length} >>\nstream\n`); push(imgs[i]); push("\nendstream"); }); });
    const total = 3 + n * 3, xref = len; let x = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) x += String(offs[i]).padStart(10, "0") + " 00000 n \n";
    push(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: "application/pdf" });
  }

  // =====================================================================
  // 21) التحدي اليومي
  // =====================================================================
  const dk = () => NC.today();
  let dy = st("mihbara-daily") || { pts: 0, streak: 0, last: "", best: 0, done: {} };
  const saveD = () => st("mihbara-daily", dy);
  function dayItems() { const i = NC.dayIndex(); let bank = []; try { bank = BANK; } catch (e) { }
    return { s: D.sent[i % D.sent.length], f: D.fake[(i * 7) % D.fake.length], q: bank.length ? bank[(i * 13) % bank.length] : null }; }
  function offDaily(box) {
    const today = dk(), it = dayItems(), dn = dy.done[today] || (dy.done[today] = {});
    // كسر السلسلة لو فات يوم
    const y = new Date(); y.setDate(y.getDate() - 1); const yk = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
    if (dy.last && dy.last !== today && dy.last !== yk) { dy.streak = 0; }
    Object.keys(dy.done).sort().slice(0, -30).forEach(k => delete dy.done[k]);
    saveD();
    const c = NC.html("div", "slip"), lvl = dy.pts >= 1500 ? "رئيس تحرير 👑" : dy.pts >= 700 ? "محرر أول ⭐" : dy.pts >= 250 ? "محرر 📝" : dy.pts >= 80 ? "مراسل 🎤" : "متدرب 🌱";
    c.innerHTML = `<h2>التحدي اليومي</h2><p class="lead">كل يوم 3 تحديات: جملة تصلّحها، وخبر تتحقق منه، وسؤال. اجمع نقاط وحافظ على سلسلة الأيام.</p>
    <div class="nc-kpis"><div class="nc-kpi"><b>🔥 ${N(dy.streak)}</b><span>يوم ورا بعض</span></div><div class="nc-kpi"><b>${N(dy.pts)}</b><span>نقطة</span></div><div class="nc-kpi"><b style="font-size:16px">${lvl}</b><span>مستواك</span></div></div><div id="dyBody"></div>`;
    box.append(c);
    const b = c.querySelector("#dyBody");
    const finish = () => { if (dn.s != null && dn.f != null && (dn.q != null || !it.q) && !dn.all) { dn.all = true; dy.streak = dy.last === yk || dy.last === "" ? dy.streak + 1 : dy.last === today ? dy.streak : 1; dy.last = today; dy.best = Math.max(dy.best, dy.streak); dy.pts += 5; saveD(); T("خلصت تحديات النهارده 🔥 +5 نقاط"); renderOff("daily"); } };
    // جملة
    const s1 = NC.html("div", "nc-card"); s1.innerHTML = `<h4>١. صحّح الجملة</h4><p style="font-size:17px">«${E(it.s[0])}»</p>`;
    if (dn.s == null) { s1.innerHTML += `<textarea id="dyS" style="min-height:60px" placeholder="اكتب الصح (اختياري) وبعدين اكشف"></textarea><div class="actions"><button class="btn ghost" type="button" id="dyR">اكشف الإجابة</button></div><div id="dySA"></div>`;
      s1.querySelector("#dyR").onclick = () => { s1.querySelector("#dySA").innerHTML = `<p><b>الصح:</b> ${E(it.s[1])}</p><p class="nc-mini">${E(it.s[2])}</p><div class="actions"><button class="btn" type="button" data-v="1">كانت إجابتي صح ✓</button><button class="btn ghost" type="button" data-v="0">غلطت ✗</button></div>`;
        $$(s1, "[data-v]").forEach(x => x.onclick = () => { dn.s = +x.dataset.v; dy.pts += dn.s ? 10 : 2; saveD(); finish(); renderOff("daily"); }); };
    } else s1.innerHTML += `<p><b>الصح:</b> ${E(it.s[1])}</p><p class="nc-mini">${E(it.s[2])}</p><span class="nc-pill">${dn.s ? "+10 ✓" : "+2"}</span>`;
    b.append(s1);
    // خبر
    const s2 = NC.html("div", "nc-card"); s2.innerHTML = `<h4>٢. ينفع يتنشر ولا لأ؟</h4><p style="font-size:16px">«${E(it.f[0])}»</p>`;
    if (dn.f == null) { s2.innerHTML += `<div class="actions"><button class="btn" type="button" data-v="1">موثوق، ينفع</button><button class="btn ghost" type="button" data-v="0">مشكوك فيه، لأ</button></div>`;
      $$(s2, "[data-v]").forEach(x => x.onclick = () => { const ok = (+x.dataset.v === 1) === it.f[1]; dn.f = ok ? 1 : 0; dy.pts += ok ? 10 : 2; saveD(); finish(); renderOff("daily"); });
    } else s2.innerHTML += `<p>${dn.f ? "✓ صح" : "✗ مش دي"} — ${E(it.f[2])}</p>`;
    b.append(s2);
    // سؤال
    if (it.q) { const q = it.q, s3 = NC.html("div", "nc-card"); s3.innerHTML = `<h4>٣. سؤال اليوم</h4><p style="font-size:16px">${E(q.q)}</p><div class="opts"></div><p class="nc-mini" id="dyQE"></p>`;
      const o = s3.querySelector(".opts"); q.options.forEach((op, k) => { const btn = NC.html("button", "opt", `<i>${"أبجد"[k] || k + 1}</i><span>${E(op)}</span>`); btn.type = "button";
        if (dn.q != null) { btn.disabled = true; if (k === q.answer) btn.classList.add("right"); else if (k === dn.qa) btn.classList.add("wrong"); }
        btn.onclick = () => { dn.qa = k; dn.q = k === q.answer ? 1 : 0; dy.pts += dn.q ? 10 : 2; saveD(); finish(); renderOff("daily"); }; o.append(btn); });
      if (dn.q != null) s3.querySelector("#dyQE").textContent = q.explain || ""; b.append(s3); }
    if (dn.all) b.append(NC.html("p", "nc-mini", "خلصت تحديات النهارده ✓ ارجع بكرة عشان السلسلة متتقطعش. وتقدر تفعّل الإشعارات من الإعدادات."));
  }

  // =====================================================================
  // 23) لوحة الفرص
  // =====================================================================
  const OPP_SEARCH = [["تدريبات في القنوات والإذاعات", "تدريب صيفي لطلاب الإعلام في القنوات والإذاعات المصرية " + new Date().getFullYear()],
    ["مسابقات للطلاب", "مسابقة أفلام قصيرة وتقارير لطلاب الإعلام " + new Date().getFullYear()], ["منح ودورات", "منحة تدريبية صحافة وإعلام للطلاب العرب " + new Date().getFullYear()],
    ["تدريب أونلاين مجاني", "كورس مجاني صحافة رقمية وتحقق من المعلومات بالعربي"], ["فرص تطوع إعلامي", "تطوع فريق إعلامي مهرجان طلاب " + new Date().getFullYear()]];
  let op = st("mihbara-opps") || [];
  function offOpps(box) {
    const c = NC.html("div", "slip"), today = new Date(NC.today());
    c.innerHTML = `<h2>لوحة الفرص</h2><p class="lead">دوّر على تدريبات ومسابقات ومنح، واحفظ الفرص اللي تهمك بمواعيد التقديم، والتطبيق يفكرك قبل ما الميعاد يفوت.</p>
    <h3 class="group-title">دوّر على</h3><div class="nc-tags">${OPP_SEARCH.map((s, i) => `<a class="chipbtn" href="https://www.google.com/search?q=${encodeURIComponent(s[1])}" target="_blank" rel="noopener">${E(s[0])} ↗</a>`).join("")}</div>
    <p class="nc-mini">الروابط بتفتح بحث جوجل بأحدث النتايج. اتأكد دايماً من الإعلان على الصفحة الرسمية للجهة.</p>
    <h3 class="group-title" style="margin-top:14px">فرصي (${N(op.length)})</h3><div class="nc-list" id="opL"></div>
    <div class="nc-card"><h4>ضيف فرصة</h4><input id="opN" type="text" placeholder="اسم الفرصة (مثلاً: تدريب قناة …)"><div class="row"><div><label>آخر ميعاد</label><input id="opD" type="date"></div><div><label>النوع</label><select id="opT"><option>تدريب</option><option>مسابقة</option><option>منحة</option><option>وظيفة</option><option>تطوع</option></select></div></div><input id="opU" type="url" dir="ltr" placeholder="رابط الإعلان (اختياري)"><div class="actions"><button class="btn" type="button" id="opAdd">احفظ</button></div></div>`;
    box.append(c);
    const L = c.querySelector("#opL");
    op.sort((a, b) => (a.d || "9") < (b.d || "9") ? -1 : 1).forEach((o, i) => { const left = o.d ? Math.ceil((new Date(o.d) - today) / 864e5) : null;
      const r = NC.html("div", "nc-row"); r.innerHTML = `<div style="flex:1"><b>${E(o.n)}</b><div class="nc-mini">${E(o.t)}${o.d ? " · آخر ميعاد " + E(new Date(o.d).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })) : ""}</div></div>
      ${left != null ? `<span class="nc-pill" style="${left < 0 ? "opacity:.5" : left <= 3 ? "background:#dc2626;color:#fff" : left <= 7 ? "background:#f59e0b;color:#111" : ""}">${left < 0 ? "فات" : left === 0 ? "النهارده!" : "فاضل " + N(left) + " يوم"}</span>` : ""}
      <select data-s aria-label="الحالة">${["لسه", "قدّمت", "اتقبلت", "اترفضت"].map(s => `<option${s === o.s ? " selected" : ""}>${s}</option>`).join("")}</select>${o.u ? `<a class="mg-x" href="${E(o.u)}" target="_blank" rel="noopener" aria-label="فتح">↗</a>` : ""}<button class="mg-x" type="button" data-rm aria-label="حذف">✕</button>`;
      r.querySelector("[data-s]").onchange = e => { o.s = e.target.value; st("mihbara-opps", op); };
      r.querySelector("[data-rm]").onclick = () => { op.splice(op.indexOf(o), 1); st("mihbara-opps", op); renderOff("opps"); };
      L.append(r); });
    if (!op.length) L.innerHTML = '<div class="empty"><b>مفيش فرص محفوظة</b>دوّر من فوق، وضيف اللي يهمك.</div>';
    c.querySelector("#opAdd").onclick = () => { const n = c.querySelector("#opN").value.trim(); if (!n) { T("اكتب اسم الفرصة"); return; } let u = c.querySelector("#opU").value.trim(); if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
      op.push({ n, d: c.querySelector("#opD").value, t: c.querySelector("#opT").value, u, s: "لسه" }); st("mihbara-opps", op); renderOff("opps"); };
  }

  // =====================================================================
  // 24) مشاركة مشروع بـ QR (من غير إنترنت)
  // =====================================================================
  const QR = (function () {
    const ECC = [[-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
      [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]];
    const NB = [[-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
      [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]];
    const FMT = [1, 0]; // L, M
    const raw = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; } return r; };
    const dataCW = (v, e) => Math.floor(raw(v) / 8) - ECC[e][v] * NB[e][v];
    const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
    const div = d => { const r = new Array(d).fill(0); r[d - 1] = 1; let root = 1; for (let i = 0; i < d; i++) { for (let j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
    const rem = (data, dv) => { const r = new Array(dv.length).fill(0); data.forEach(b => { const f = b ^ r.shift(); r.push(0); dv.forEach((c, i) => r[i] ^= mul(c, f)); }); return r; };
    const bit = (x, i) => ((x >>> i) & 1) !== 0;
    function encode(bytes, e) {
      e = e || 0; let v = 1;
      for (; v <= 40; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCW(v, e) * 8) break; }
      if (v > 40) throw new Error("big");
      const bb = []; const app = (val, n) => { for (let i = n - 1; i >= 0; i--) bb.push((val >>> i) & 1); };
      app(4, 4); app(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => app(b, 8));
      const cap = dataCW(v, e) * 8; app(0, Math.min(4, cap - bb.length)); app(0, (8 - bb.length % 8) % 8);
      for (let p = 0xEC; bb.length < cap; p ^= 0xEC ^ 0x11) app(p, 8);
      const data = []; for (let i = 0; i < bb.length; i += 8) { let x = 0; for (let j = 0; j < 8; j++) x = (x << 1) | bb[i + j]; data.push(x); }
      const nb = NB[e][v], el = ECC[e][v], rc = Math.floor(raw(v) / 8), ns = nb - rc % nb, sl = Math.floor(rc / nb), dv = div(el), blocks = [];
      for (let i = 0, k = 0; i < nb; i++) { const dat = data.slice(k, k + sl - el + (i < ns ? 0 : 1)); k += dat.length; const ec = rem(dat, dv); if (i < ns) dat.push(0); blocks.push(dat.concat(ec)); }
      const all = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sl - el || j >= ns) all.push(b[i]); });
      const size = v * 4 + 17, M = [], F = []; for (let i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
      const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
      for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
      const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4); } };
      finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
      const ap = (() => { if (v === 1) return []; const n = Math.floor(v / 7) + 2, step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2, r = [6]; for (let p = size - 7; r.length < n; p -= step) r.splice(1, 0, p); return r; })();
      ap.forEach((a, i) => ap.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
      const fmt = mask => { const d = FMT[e] << 3 | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const bits = (d << 10 | r) ^ 0x5412;
        for (let i = 0; i <= 5; i++) set(8, i, bit(bits, i)); set(8, 7, bit(bits, 6)); set(8, 8, bit(bits, 7)); set(7, 8, bit(bits, 8)); for (let i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
        for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(bits, i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(bits, i)); set(8, size - 8, true); };
      fmt(0);
      if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const bits = v << 12 | r; for (let i = 0; i < 18; i++) { const b = bit(bits, i), a = size - 11 + i % 3, c = Math.floor(i / 3); set(a, c, b); set(c, a, b); } }
      let i = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert; if (!F[y][x] && i < all.length * 8) { M[y][x] = bit(all[i >>> 3], 7 - (i & 7)); i++; } } }
      const maskF = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0, (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
      const apply = m => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!F[y][x] && maskF[m](x, y)) M[y][x] = !M[y][x]; };
      const pen = () => { let p = 0, dark = 0; for (let y = 0; y < size; y++) { let run = 1, runC = 1; for (let x = 0; x < size; x++) { if (M[y][x]) dark++; if (x) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; if (M[x][y] === M[x - 1][y]) { runC++; if (runC === 5) p += 3; else if (runC > 5) p++; } else runC = 1; }
        if (x && y && M[y][x] === M[y][x - 1] && M[y][x] === M[y - 1][x] && M[y][x] === M[y - 1][x - 1]) p += 3; } } return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10; };
      let best = 0, bp = 1e9; for (let m = 0; m < 8; m++) { apply(m); fmt(m); const p = pen(); if (p < bp) { bp = p; best = m; } apply(m); }
      apply(best); fmt(best);
      return M;
    }
    function draw(cv, M, px) { const n = M.length, q = 4, s = px || Math.max(4, Math.floor(560 / (n + 2 * q))); cv.width = cv.height = (n + 2 * q) * s; const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = "#000"; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x]) g.fillRect((x + q) * s, (y + q) * s, s, s); }
    return { encode, draw };
  })();
  NC.QR = QR;
  const CHUNK = 700;
  function shareables() {
    const out = []; const mg = st("mihbara-mgmt") || {};
    (mg.projects || []).forEach(p => out.push({ k: "project", n: "مشروع: " + (p.name || p.title || "بدون اسم"), data: p }));
    const rd = st("mihbara-rundown"); if (rd) out.push({ k: "rundown", n: "جدول النشرة: " + rd.title, data: rd });
    const pr = store.get("mihbara-prompter"); if (pr) out.push({ k: "prompter", n: "نص التلقين", data: pr });
    loadH().slice(0, 15).forEach(h => out.push({ k: "history", n: ((toolMeta(h.tool) || {}).name || "") + ": " + h.title.slice(0, 40), data: h }));
    return out;
  }
  function offQR(box) {
    const c = NC.html("div", "slip"), S = shareables();
    c.innerHTML = `<h2>مشاركة بـ QR</h2><p class="lead">ابعت مشروعك أو جدول النشرة أو أي شغل لزميلك من غير إنترنت: إنت تعرض الكود، وهو يمسحه من نفس التطبيق.</p>
    ${NC.seg("m", [["send", "ابعت"], ["get", "استقبل"]], "send")}<div id="qrB"></div>`;
    box.append(c);
    const B = c.querySelector("#qrB");
    const send = () => {
      B.innerHTML = S.length ? `<label>هتبعت إيه؟</label><select id="qrS">${S.map((s, i) => `<option value="${i}">${E(s.n)}</option>`).join("")}</select><div class="actions"><button class="btn" type="button" id="qrGo">اعمل الكود</button></div><div id="qrOut"></div>` : '<div class="empty"><b>مفيش حاجة تتبعت</b>اعمل مشروع أو جدول نشرة أو استخدم أي أداة الأول.</div>';
      const g = B.querySelector("#qrGo"); if (!g) return;
      g.onclick = () => { const s = S[+B.querySelector("#qrS").value], json = JSON.stringify({ k: s.k, d: s.data }), bytes = new TextEncoder().encode(json);
        // نقسم على أكتر من كود لو البيانات كبيرة
        const b64 = btoa(String.fromCharCode.apply(null, Array.from(bytes))), n = Math.ceil(b64.length / CHUNK), id = Math.random().toString(36).slice(2, 6), codes = [];
        for (let i = 0; i < n; i++) codes.push(`NC360|${id}|${i + 1}/${n}|` + b64.slice(i * CHUNK, (i + 1) * CHUNK));
        if (n > 12) { T("الحاجة دي كبيرة على الـ QR. ابعتها كملف بالمشاركة."); return; }
        let k = 0; const out = B.querySelector("#qrOut");
        const show = () => { out.innerHTML = `<canvas class="nc-qr"></canvas><p class="nc-mini" style="text-align:center">${n > 1 ? `كود ${N(k + 1)} من ${N(n)} — زميلك يمسحهم واحد ورا التاني` : "خلي زميلك يفتح «مشاركة بـ QR ← استقبل» ويمسح الكود"}</p>${n > 1 ? '<div class="actions" style="justify-content:center"><button class="btn ghost" type="button" id="qrP">السابق</button><button class="btn" type="button" id="qrN">اللي بعده</button></div>' : ""}`;
          QR.draw(out.querySelector("canvas"), QR.encode(Array.from(new TextEncoder().encode(codes[k])), 0));
          const p = out.querySelector("#qrP"), nx = out.querySelector("#qrN"); if (p) { p.onclick = () => { k = (k - 1 + n) % n; show(); }; nx.onclick = () => { k = (k + 1) % n; show(); }; } };
        show(); };
    };
    const get = () => {
      B.innerHTML = `<div class="nc-stage" style="min-height:0"><video playsinline muted style="width:100%;display:block"></video></div><p class="nc-mini" id="qrSt">وجّه الكاميرا على الكود…</p>
      <details style="margin-top:8px"><summary class="nc-mini">الجهاز مش بيمسح؟ الصق الكود يدوي</summary><textarea id="qrT" style="min-height:70px" dir="ltr" placeholder="NC360|…"></textarea><div class="actions"><button class="btn ghost" type="button" id="qrA">استورد</button></div></details>`;
      const parts = {}; let stream = null, raf = 0, total = 0;
      const stop = () => { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; };
      NC.onLeave(stop);
      const feed = txt => { const m = /^NC360\|(\w+)\|(\d+)\/(\d+)\|(.*)$/s.exec(String(txt).trim()); if (!m) return false; total = +m[3]; parts[+m[2]] = m[4];
        const got = Object.keys(parts).length; B.querySelector("#qrSt").textContent = `استلمت ${N(got)} من ${N(total)}`;
        if (got === total) { stop(); let b64 = ""; for (let i = 1; i <= total; i++) b64 += parts[i]; try { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); importObj(JSON.parse(new TextDecoder().decode(u))); } catch (e) { T("الكود ناقص أو بايظ"); } }
        return true; };
      B.querySelector("#qrA").onclick = () => { B.querySelector("#qrT").value.split(/\s*\n\s*/).forEach(feed); };
      if (!("BarcodeDetector" in window)) { B.querySelector("#qrSt").textContent = "المسح بالكاميرا مش مدعوم على الجهاز ده. امسح الكود بكاميرا الموبايل العادية، وانسخ النص والصقه تحت."; B.querySelector("details").open = true; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(s => { stream = s; const v = B.querySelector("video"); v.srcObject = s; v.play();
        const det = new BarcodeDetector({ formats: ["qr_code"] }); let last = "";
        const loop = async () => { if (!stream) return; try { const r = await det.detect(v); r.forEach(x => { if (x.rawValue !== last) { last = x.rawValue; feed(x.rawValue); } }); } catch (e) { } raf = requestAnimationFrame(loop); }; loop();
      }).catch(() => { B.querySelector("#qrSt").textContent = "اسمح للتطبيق باستخدام الكاميرا، أو الصق الكود يدوي."; B.querySelector("details").open = true; });
    };
    function importObj(o) {
      if (!o || !o.k) { T("مش كود NewsCast 360"); return; }
      if (o.k === "project") { const mg = st("mihbara-mgmt") || {}; mg.projects = mg.projects || []; o.d.id = (o.d.id || "p") + "_" + Date.now().toString(36); mg.projects.unshift(o.d); st("mihbara-mgmt", mg); T("اتضاف المشروع ✓ هيظهر في إدارة المشروعات"); setTimeout(() => location.reload(), 900); }
      else if (o.k === "rundown") { st("mihbara-rundown", o.d); T("اتستورد جدول النشرة ✓"); open("rundown"); }
      else if (o.k === "prompter") { store.set("mihbara-prompter", String(o.d)); T("اتستورد نص التلقين ✓"); open("prompter"); }
      else if (o.k === "history") { const a = loadH(); o.d.id = Date.now() + "_qr"; a.unshift(o.d); saveH(a); T("اتضاف للسجل ✓"); open("history"); }
    }
    NC.bindSeg(c, "m", v => { NC.cleanup(); (v === "send" ? send : get)(); });
    send();
  }

  // =====================================================================
  // 25) ويدجت الشاشة الرئيسية
  // =====================================================================
  function offWidget(box) {
    let G = []; try { G = GLOSSARY; } catch (e) { }
    const i = NC.dayIndex(), term = G.length ? G[i % G.length] : ["", "", ""], s = D.sent.length ? D.sent[i % D.sent.length] : ["", "", ""];
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>ويدجت الشاشة الرئيسية</h2><p class="lead">حط NewsCast 360 على الشاشة الرئيسية لموبايلك، وكل يوم هيظهرلك مصطلح جديد وجملة تتعلم منها، من غير ما تفتح التطبيق.</p>
    <div class="nc-card" style="background:linear-gradient(135deg,#E11D48,#9D174D);color:#fff"><small style="opacity:.85">مصطلح اليوم</small><h3 style="margin:2px 0;font-family:var(--display)">${E(term[0])} <span dir="ltr" style="font-size:14px;opacity:.85">${E(term[1])}</span></h3><p style="margin:0 0 10px;font-size:14px">${E(term[2])}</p>
    <small style="opacity:.85">جملة اليوم</small><p style="margin:2px 0;font-size:14px"><s style="opacity:.7">${E(s[0])}</s><br><b>✓ ${E(s[1])}</b></p></div>
    <div class="nc-card"><h4>إزاي تضيفه؟</h4><ol style="margin:0;padding-inline-start:20px;line-height:2"><li>اضغط ضغطة طويلة على مكان فاضي في الشاشة الرئيسية.</li><li>اختار «الأدوات» أو «Widgets».</li><li>دوّر على <b>NewsCast 360</b> واسحب الويدجت للشاشة.</li></ol><p class="nc-mini">الويدجت بيتحدّث لوحده كل يوم، ولو دوست عليه بيفتح التطبيق.</p></div>
    <div class="actions"><button class="btn ghost" type="button" id="wgS">🔊 انطق المصطلح</button><button class="btn ghost" type="button" id="wgD">التحدي اليومي</button></div>`;
    box.append(c);
    c.querySelector("#wgS").onclick = () => { NC.speak(term[0], false); setTimeout(() => NC.speakLang(term[1], "en-US"), 1600); };
    c.querySelector("#wgD").onclick = () => open("daily");
  }

  // =====================================================================
  // تعديل: القاموس — بطاقات مذاكرة ونطق صوتي
  // =====================================================================
  let gl = st("mihbara-gl") || { mode: "list", cat: "الكل", known: [] };
  const saveGl = () => st("mihbara-gl", gl);
  function offGlossary2(box) {
    let G = []; try { G = GLOSSARY; } catch (e) { }
    const cats = ["الكل", ...new Set(G.map(g => g[3]))];
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>قاموس المصطلحات</h2><p class="lead">${N(G.length)} مصطلح إعلامي بالعربي والإنجليزي، وكل مصطلح ليه نطق صوتي. وفيه بطاقات مذاكرة تراجع بيها.</p>
    ${NC.seg("mode", [["list", "القاموس"], ["cards", "بطاقات المذاكرة"]], gl.mode)}<div class="chips" id="glC" style="margin-top:10px"></div><div id="glB"></div>`;
    box.append(c);
    NC.bindSeg(c, "mode", v => { gl.mode = v; saveGl(); body(); });
    const chips = c.querySelector("#glC");
    const drawChips = () => { chips.innerHTML = ""; cats.forEach(x => { const b = NC.html("button", "chipbtn", E(x)); b.type = "button"; b.setAttribute("aria-pressed", String(x === gl.cat)); b.onclick = () => { gl.cat = x; saveGl(); drawChips(); body(); }; chips.append(b); }); };
    const pool = () => G.filter(g => gl.cat === "الكل" || g[3] === gl.cat);
    const B = c.querySelector("#glB");
    const sayBoth = g => { NC.speak(g[0], false); setTimeout(() => NC.speakLang(g[1], "en-US"), Math.max(1200, g[0].length * 140)); };
    function body() {
      if (gl.mode === "list") {
        B.innerHTML = `<input id="glQ" type="search" placeholder="دوّر على مصطلح… (عربي أو إنجليزي)" style="margin-top:10px"><div class="cklist" id="glL"></div>`;
        const L = B.querySelector("#glL");
        const draw = () => { const q = B.querySelector("#glQ").value.trim().toLowerCase(); const it = pool().filter(g => !q || g[0].includes(q) || g[1].toLowerCase().includes(q) || g[2].includes(q));
          L.innerHTML = it.length ? "" : '<div class="empty"><b>مالقيتش المصطلح دا</b>جرّب كلمة تانية.</div>';
          it.forEach(g => { const d = NC.html("div", "gl-item"); d.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px;align-items:start"><div><b></b> <i dir="ltr"></i></div><span style="flex:none"><button type="button" class="mg-x" data-l="ar" aria-label="انطق بالعربي">🔊 ع</button><button type="button" class="mg-x" data-l="en" aria-label="Pronounce in English">🔊 En</button></span></div><p></p>`;
            d.querySelector("b").textContent = g[0]; d.querySelector("i").textContent = g[1]; d.querySelector("p").textContent = g[2];
            d.querySelector('[data-l="ar"]').onclick = () => NC.speak(g[0], false); d.querySelector('[data-l="en"]').onclick = () => NC.speakLang(g[1], "en-US"); L.append(d); }); };
        B.querySelector("#glQ").oninput = draw; draw();
      } else {
        const P = pool(), left = P.filter(g => gl.known.indexOf(g[1]) < 0);
        if (!left.length) { B.innerHTML = `<div class="empty" style="margin-top:12px"><b>حفظت كل مصطلحات «${E(gl.cat)}» 🎉</b><div class="actions" style="justify-content:center"><button class="btn" type="button" id="glR">ابدأ من الأول</button></div></div>`;
          B.querySelector("#glR").onclick = () => { gl.known = gl.known.filter(k => !P.some(g => g[1] === k)); saveGl(); body(); }; return; }
        const g = left[Math.floor(Math.random() * left.length)];
        B.innerHTML = `<div class="nc-meter" style="margin-top:12px"><i style="width:${(P.length - left.length) / P.length * 100}%;background:#22c55e"></i></div><p class="nc-mini">حفظت ${N(P.length - left.length)} من ${N(P.length)} · دوس على البطاقة تقلبها</p>
        <div class="nc-fc"><div class="nc-fci"><div class="nc-fcf"><b></b><i dir="ltr"></i></div><div class="nc-fcb"><p style="font-size:17px;line-height:1.8;margin:0"></p></div></div></div>
        <div class="actions" style="justify-content:center"><button class="btn ghost" type="button" id="glS">🔊 اسمع</button><button class="btn ghost" type="button" id="glN">لسه ✗</button><button class="btn" type="button" id="glK">عرفتها ✓</button></div>`;
        B.querySelector(".nc-fcf b").textContent = g[0]; B.querySelector(".nc-fcf i").textContent = g[1]; B.querySelector(".nc-fcb p").textContent = g[2];
        const fc = B.querySelector(".nc-fc"); fc.onclick = () => fc.classList.toggle("flip");
        B.querySelector("#glS").onclick = () => sayBoth(g);
        B.querySelector("#glN").onclick = () => body();
        B.querySelector("#glK").onclick = () => { gl.known.push(g[1]); saveGl(); body(); };
      }
    }
    drawChips(); body();
  }

  // ---------- التسجيل ----------
  NC.register({ key: "portfolio", name: "البورتفوليو", desc: "أحسن شغلك في ملف PDF شكله احترافي", tint: "#e11d48", render: offPortfolio, offline: true,
    icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>' });
  NC.register({ key: "daily", name: "التحدي اليومي", desc: "جملة، وخبر تتحقق منه، وسؤال كل يوم — بنقاط وسلسلة أيام", tint: "#f59f00", render: offDaily, offline: true,
    icon: '<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 4 1-2 0-5 0-7z"/>' });
  NC.register({ key: "anchortest", tool: NC.ANCHORTEST, tint: "#7048e8", icon: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/>' });
  NC.register({ key: "opps", name: "لوحة الفرص", desc: "تدريبات ومسابقات ومنح، ومواعيد التقديم قدامك", tint: "#0ca678", render: offOpps,
    icon: '<path d="M12 2l2.6 6.3L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.7z"/>' });
  NC.register({ key: "qrshare", name: "مشاركة بـ QR", desc: "ابعت مشروعك أو جدول النشرة لزميلك من غير إنترنت", tint: "#343a40", render: offQR, offline: true,
    icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 17h4v4h-4"/>' });
  NC.register({ key: "widget", name: "ويدجت الشاشة الرئيسية", desc: "مصطلح اليوم وجملة اليوم على شاشة موبايلك", tint: "#9D174D", render: offWidget, offline: true,
    icon: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/>' });
  NC.patch("glossary", offGlossary2);
  NC.group("مستقبلك المهني", "بورتفوليو، وتحدي يومي، واختبارات القنوات، والفرص", ["portfolio", "daily", "anchortest", "opps", "qrshare", "widget"], true);
})();
