/* NewsCast 360 — التحديث 1: محاكي على الهوا، تشكيل النص، معمل الصوت، محاكي الحوار */
(function () {
  "use strict";
  const { E, T, st, $$, N, words, fmtT } = NC;

  // =====================================================================
  // 1) محاكي «على الهوا»
  // =====================================================================
  const SAMPLE = "مساء الخير، وأهلاً بكم في نشرة الأخبار.\n\nافتتحت كلية الإعلام مركزاً جديداً للإنتاج الإذاعي والتلفزيوني، يضم أربعين جهاز مونتاج واستوديو للبودكاست.\n\nوقال عميد الكلية إن المركز سيخدم ألفاً ومئتي طالب سنوياً، وسيتيح لهم التدريب على إنتاج النشرات والبرامج.\n\nوفي الرياضة، يستعد المنتخب الوطني لمباراته المقبلة وسط تفاؤل جماهيري كبير، بعد سلسلة من النتائج الإيجابية.\n\nوعلى صعيد الطقس، تتوقع هيئة الأرصاد طقساً معتدلاً نهاراً بارداً ليلاً، مع فرص لسقوط أمطار خفيفة على السواحل الشمالية.\n\nكانت هذه أبرز الأخبار، شكراً لمتابعتكم.";
  const BREAKING = ["خبر عاجل: وقوع زلزال بقوة خمس درجات على مقياس ريختر قبالة السواحل الشمالية، ولا أنباء عن خسائر حتى الآن.",
    "خبر عاجل: مجلس الوزراء يعلن تعطيل الدراسة غداً في عدد من المحافظات بسبب سوء الأحوال الجوية.",
    "خبر عاجل: المنتخب الوطني يتأهل رسمياً إلى نهائيات كأس الأمم بعد فوزه منذ قليل.",
    "خبر عاجل: اندلاع حريق في أحد المخازن التجارية بوسط المدينة، وسيارات الإطفاء في الطريق.",
    "خبر عاجل: البنك المركزي يقرر تثبيت أسعار الفائدة في اجتماعه اليوم."];
  const IFB = ["المخرج: اختصر، الوقت ضيق.", "المخرج: ابتسم، إنت على الهوا.", "المخرج: الضيف اتأخر، املا عشرين ثانية لحد ما يوصل.", "المخرج: بص للكاميرا، مش للورق.", "المخرج: مطّول شوية، عندنا وقت زيادة.", "المخرج: روح للفقرة اللي بعدها على طول."];
  let sim = st("mihbara-onair") || { text: SAMPLE, mins: 2, lvl: "mid", rec: true, voice: true };
  const saveSim = () => st("mihbara-onair", sim);

  function offOnAir(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>محاكي «على الهوا»</h2><p class="lead">نشرة حية بالظبط زي الاستوديو: النص بيتحرك قدامك، وفي النص هتحصل مفاجآت. خبر عاجل يدخل فجأة، أو المخرج يكلمك في السماعة، أو التلقين يقف وتكمّل لوحدك. وفي الآخر تاخد درجة وتقييم.</p>
    <label for="oaText">نص النشرة</label><textarea id="oaText" style="min-height:170px"></textarea>
    <div class="actions" style="margin-top:6px"><button class="btn ghost" type="button" id="oaFromP">هات نص التلقين المحفوظ</button><button class="btn ghost" type="button" id="oaSample">نص تجريبي</button></div>
    <label>مدة النشرة</label>${NC.seg("mins", [["1", "دقيقة"], ["2", "دقيقتين"], ["3", "3 دقايق"]], String(sim.mins))}
    <label>صعوبة المفاجآت</label>${NC.seg("lvl", [["easy", "سهل"], ["mid", "متوسط"], ["hard", "صعب"]], sim.lvl)}
    <label class="check" style="margin-top:12px"><input type="checkbox" id="oaRec"${sim.rec ? " checked" : ""}> سجّل صوتي عشان أعرف الوقفات والصمت (Dead air)</label>
    <label class="check"><input type="checkbox" id="oaVoice"${sim.voice ? " checked" : ""}> المخرج يتكلم بصوت مسموع</label>
    <div class="actions"><button class="btn" type="button" id="oaGo">ابدأ البث</button></div>`;
    box.append(c);
    const ta = c.querySelector("#oaText"); ta.value = sim.text;
    ta.oninput = () => { sim.text = ta.value; saveSim(); };
    c.querySelector("#oaFromP").onclick = () => { const p = store.get("mihbara-prompter"); if (p) { ta.value = p; sim.text = p; saveSim(); T("اتجاب نص التلقين ✓"); } else T("مفيش نص محفوظ في التلقين"); };
    c.querySelector("#oaSample").onclick = () => { ta.value = SAMPLE; sim.text = SAMPLE; saveSim(); };
    NC.bindSeg(c, "mins", v => { sim.mins = +v; saveSim(); });
    NC.bindSeg(c, "lvl", v => { sim.lvl = v; saveSim(); });
    c.querySelector("#oaRec").onchange = e => { sim.rec = e.target.checked; saveSim(); };
    c.querySelector("#oaVoice").onchange = e => { sim.voice = e.target.checked; saveSim(); };
    c.querySelector("#oaGo").onclick = () => { if (words(ta.value).length < 15) { T("النص قصير. اكتب نشرة أطول شوية"); return; } runOnAir(box); };
  }

  async function runOnAir(box) {
    const total = sim.mins * 60, n = { easy: 2, mid: 3, hard: 5 }[sim.lvl] || 3;
    // جدول المفاجآت
    const kinds = ["breaking", "ifb", "freeze", "ifb", "breaking", "freeze"].slice(0, n);
    const slots = kinds.map((k, i) => ({ k, at: Math.round(total * (0.15 + 0.6 * (i + Math.random() * 0.6) / n)) })).sort((a, b) => a.at - b.at);
    slots.push({ k: "wrap", at: Math.max(10, total - 30) });
    const log = [];
    box.innerHTML = "";
    const s = NC.html("div", "slip");
    s.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="chip live" id="oaLive">● على الهوا</span><b class="nc-big" id="oaClock" style="font-size:30px;margin:0">${fmtT(total)}</b></div>
    <div id="oaEvent" style="min-height:8px;margin:8px 0"></div>
    <div class="nc-stage" id="oaStage"><div id="oaRoll" style="position:absolute;inset:0 18px;font-size:26px;line-height:1.85;font-family:var(--display);white-space:pre-wrap;will-change:transform"></div>
    <div id="oaFrozen" hidden style="position:absolute;inset:0;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;text-align:center;font-size:22px;font-weight:700;color:#fca5a5;padding:20px">التلقين وقف!<br>كمّل بكلامك لحد ما يرجع…</div></div>
    <div class="nc-meter" id="oaMeter" ${sim.rec ? "" : "hidden"}><i></i></div>
    <div class="actions"><button class="btn" type="button" id="oaEnd">إنهاء النشرة</button><button class="btn ghost" type="button" id="oaAbort">إلغاء</button></div>`;
    box.append(s);
    const roll = s.querySelector("#oaRoll"), stage = s.querySelector("#oaStage"), ev = s.querySelector("#oaEvent"), frozen = s.querySelector("#oaFrozen");
    roll.textContent = sim.text; stage.style.height = "320px";
    let rec = null, stopped = false;
    if (sim.rec) { try { rec = await NC.recorder(l => { s.querySelector("#oaMeter i").style.width = Math.min(100, l * 400) + "%"; }); } catch (e) { T(NC.micError(e)); s.querySelector("#oaMeter").hidden = true; } }
    const t0 = performance.now(); let paused = 0, pauseStart = 0, y = 0, raf = 0, freezeUntil = 0;
    const H = () => roll.scrollHeight, speed = () => (H() + 120) / (total * 0.92);
    let next = 0, last = t0;
    const tick = now => {
      if (stopped) return;
      const el = (now - t0) / 1000, dt = (now - last) / 1000; last = now;
      s.querySelector("#oaClock").textContent = (el > total ? "+" : "") + fmtT(Math.abs(total - el));
      s.querySelector("#oaClock").style.color = el > total ? "#dc2626" : total - el < 30 ? "#d97706" : "";
      if (now < freezeUntil) { frozen.hidden = false; } else { if (!frozen.hidden) { frozen.hidden = true; } y += speed() * dt; }
      roll.style.transform = `translateY(${24 - y}px)`;
      while (next < slots.length && el >= slots[next].at) fire(slots[next++], el);
      raf = requestAnimationFrame(tick);
    };
    const say = t => { if (sim.voice) NC.speak(t.replace(/^المخرج:\s*/, ""), true); };
    function fire(sl, el) {
      if (sl.k === "breaking") {
        const txt = BREAKING[Math.floor(Math.random() * BREAKING.length)], item = { k: "breaking", at: el, txt, react: null };
        ev.innerHTML = `<div class="nc-flash">⚡ ${E(txt)}<div class="actions" style="margin-top:8px"><button class="btn" type="button" style="background:#fff;color:#dc2626">قريته على الهوا ✓</button></div></div>`;
        ev.querySelector("button").onclick = () => { item.react = (performance.now() - t0) / 1000 - el; ev.innerHTML = ""; };
        log.push(item); setTimeout(() => { if (item.react == null) { ev.innerHTML = ""; } }, 20000);
      } else if (sl.k === "ifb" || sl.k === "wrap") {
        const txt = sl.k === "wrap" ? "المخرج: فاضل تلاتين ثانية، ابدأ الختام." : IFB[Math.floor(Math.random() * IFB.length)];
        ev.innerHTML = `<div class="nc-ifb">🎧 ${E(txt)}</div>`; say(txt); log.push({ k: sl.k, at: el, txt }); setTimeout(() => { if (ev.querySelector(".nc-ifb")) ev.innerHTML = ""; }, 6000);
      } else if (sl.k === "freeze") {
        const len = 7 + Math.random() * 6; freezeUntil = performance.now() + len * 1000; log.push({ k: "freeze", at: el, len });
      }
    }
    raf = requestAnimationFrame(tick);
    const stopAll = () => { stopped = true; cancelAnimationFrame(raf); NC.stopSpeak(); };
    NC.onLeave(() => { stopAll(); if (rec) rec.cancel(); });
    s.querySelector("#oaAbort").onclick = () => { stopAll(); if (rec) rec.cancel(); renderOff("onair"); };
    s.querySelector("#oaEnd").onclick = async () => {
      const dur = (performance.now() - t0) / 1000; stopAll();
      s.querySelector("#oaEnd").disabled = true; s.querySelector("#oaLive").textContent = "خلصت"; s.querySelector("#oaLive").className = "chip";
      let a = null; if (rec) { const r = await rec.stop(); if (r && r.buffer) a = NC.analyze(r.buffer, sim.text); }
      selfCheck(box, { dur, total, log, a });
    };
  }

  function selfCheck(box, R) {
    box.innerHTML = "";
    const Qs = ["بصّيت للكاميرا معظم الوقت؟", "قريت الخبر العاجل بهدوء ومن غير تلعثم؟", "لما التلقين وقف كمّلت كلام مفهوم من غير ما تسكت؟", "نفّذت تعليمات المخرج؟", "ختمت النشرة بشكل سليم؟"];
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>قيّم نفسك بصراحة</h2><p class="lead">خمس أسئلة سريعة، وبعدها تطلع درجتك.</p><div id="oaQs"></div><div class="actions"><button class="btn" type="button" id="oaScore">طلّع الدرجة</button></div>`;
    box.append(c);
    const ans = {}; const q = c.querySelector("#oaQs");
    Qs.forEach((t, i) => { const d = NC.html("div", "nc-row"); d.innerHTML = `<span style="flex:1">${E(t)}</span>${NC.seg("q" + i, [["1", "أيوه"], ["0.5", "نص نص"], ["0", "لأ"]], "")}`; q.append(d); NC.bindSeg(d, "q" + i, v => ans[i] = +v); });
    c.querySelector("#oaScore").onclick = () => { if (Object.keys(ans).length < Qs.length) { T("جاوب على الخمس أسئلة"); return; } score(box, R, Qs.map((t, i) => ans[i])); };
  }

  function score(box, R, self) {
    const fb = [], parts = [];
    const diff = Math.abs(R.dur - R.total);
    const pT = Math.max(0, 25 - Math.max(0, diff - 10) * 0.6); parts.push(["الالتزام بالوقت", pT, 25]);
    fb.push(diff <= 10 ? "التزمت بالوقت ممتاز ✓" : R.dur > R.total ? `زودت ${N(Math.round(diff))} ثانية عن وقت النشرة. في البث الحقيقي ده بيقطع على الفقرة اللي بعدك.` : `خلصت قبل الوقت بـ ${N(Math.round(diff))} ثانية. خليك جاهز بمادة احتياطي.`);
    const br = R.log.filter(x => x.k === "breaking");
    let pB = 15; if (br.length) { const s = br.map(b => b.react == null ? 0 : b.react <= 6 ? 1 : b.react <= 12 ? 0.6 : 0.3); pB = 15 * s.reduce((a, b) => a + b, 0) / s.length;
      fb.push(br.some(b => b.react == null) ? "فيه خبر عاجل ماأكدتش إنك قريته. العاجل بيتقرا فوراً." : "اتعاملت مع العاجل بسرعة ✓"); }
    parts.push(["سرعة التعامل مع العاجل", pB, 15]);
    let pD = 20, pF = 20;
    if (R.a) {
      const fz = R.log.filter(x => x.k === "freeze"); let dead = 0;
      fz.forEach(f => R.a.pauses.forEach(p => { const o = Math.max(0, Math.min(p.at + p.len, f.at + f.len) - Math.max(p.at, f.at)); if (o > 1.5) dead += o; }));
      const deadAll = R.a.pauses.filter(p => p.len >= 2.5).reduce((a, p) => a + p.len, 0);
      pD = Math.max(0, 20 - deadAll * 2.5); parts.push(["الصمت على الهوا (Dead air)", pD, 20]);
      fb.push(deadAll < 1 ? "مفيش صمت طويل على الهوا ✓" : `سكتّ حوالي ${N(Math.round(deadAll))} ثانية في وقفات طويلة${dead ? "، منها وقت وقوف التلقين" : ""}. اتعلم «جمل الطوارئ» زي: «ونتابع معكم تفاصيل هذا الخبر…».`);
      pF = Math.max(0, 20 - R.a.fillers * 3 - Math.max(0, R.a.longPauses - 2) * 2); parts.push(["الطلاقة (اممم والتردد)", pF, 20]);
      fb.push(R.a.fillers ? `لاحظت حوالي ${N(R.a.fillers)} مرة تردد زي «اممم» (رقم تقديري).` : "طلاقتك كويسة ومفيش تردد واضح ✓");
      if (R.a.levelDb < -32) fb.push("صوتك كان واطي على الميكروفون. اتكلم من البطن وقرّب شوية.");
    } else { parts.push(["الطلاقة والصمت", 40 * (self[2] + 1) / 2, 40]); }
    const pS = 20 * self.reduce((a, b) => a + b, 0) / self.length; parts.push(["تقييمك لنفسك", pS, 20]);
    const tot = Math.round(parts.reduce((a, p) => a + p[1], 0));
    const grade = tot >= 90 ? "مذيع جاهز للبث 🎙️" : tot >= 75 ? "أداء قوي، شوية تفاصيل" : tot >= 55 ? "بداية كويسة، كمّل تمرين" : "محتاج تمرين أكتر، وده طبيعي في الأول";
    box.innerHTML = "";
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>نتيجة البث</h2><div class="nc-score"><div class="ring" style="--p:${tot}"><b>${N(tot)}</b></div><div><b style="font-family:var(--display);font-size:18px">${E(grade)}</b><p class="nc-mini">مدة النشرة ${fmtT(R.dur)} من ${fmtT(R.total)}${R.a && R.dur > R.total * 0.6 && R.a.wpm ? " · سرعة تقريبية " + N(R.a.wpm) + " كلمة/دقيقة" : ""}</p></div></div>
    <div class="nc-list">${parts.map(p => `<div class="nc-row"><span style="flex:1">${E(p[0])}</span><b>${N(Math.round(p[1]))} / ${N(p[2])}</b></div>`).join("")}</div>
    <div class="nc-card"><h4>ملاحظات</h4><ul class="tips">${fb.map(x => `<li>${E(x)}</li>`).join("")}</ul></div>
    <div class="actions"><button class="btn" type="button" id="oaAgain">بث جديد</button><button class="btn ghost" type="button" id="oaShare">شارك النتيجة</button></div>`;
    box.append(c);
    const txt = `### محاكي على الهوا\nالدرجة: ${tot}/100 — ${grade}\n\n${parts.map(p => `- ${p[0]}: ${Math.round(p[1])}/${p[2]}`).join("\n")}\n\n### ملاحظات\n${fb.map(x => "- " + x).join("\n")}`;
    NC.saveTool("onair", "محاكي على الهوا — " + tot + "/100", txt);
    c.querySelector("#oaAgain").onclick = () => renderOff("onair");
    c.querySelector("#oaShare").onclick = () => shareText(`جبت ${tot}/100 في محاكي «على الهوا» على NewsCast 360 🎙️`);
  }

  // =====================================================================
  // 2) تشكيل النص للمذيع (أداة ذكاء اصطناعي)
  // =====================================================================
  const TASHKEEL = {
    name: "تشكيل النص للمذيع", desc: "النص يرجعلك متشكّل، والكلمات اللي ممكن تتقال غلط متعلّم عليها",
    title: "شكّل نصك قبل ما تطلع على الهوا", lead: "الصق نص النشرة أو الفقرة، وهيرجعلك متشكّل عشان تقراه صح، والكلمات اللي بيغلط فيها المذيعين كتير متعلّم عليها مع نطقها الصح.",
    fields: [{ id: "text", label: "النص", type: "textarea", value: "افتتح وزير التعليم العالي اليوم المؤتمر الدولي للإعلام الرقمي بمشاركة ثلاثة وعشرين دولة، وأكد أن الجامعات المصرية تولي اهتماماً خاصاً بتأهيل الطلاب لسوق العمل." },
      { id: "level", label: "مستوى التشكيل", type: "select", options: ["أواخر الكلمات والكلمات الصعبة بس", "تشكيل كامل"] }],
    method: "<strong>الطريقة: التشكيل بيحميك من اللحن</strong>المذيع مش محتاج كل حرف متشكّل؛ أهم حاجة أواخر الكلمات (الإعراب)، والأسماء والأفعال اللي ممكن تتقري بأكتر من طريقة، والأرقام اللي لازم تتقري صح مع المعدود.",
    prompt: v => `أنت مدقق لغوي ومدرّب إلقاء لمذيعي الأخبار. شكّل النص التالي بالعربية الفصحى ${v.level === "تشكيل كامل" ? "تشكيلاً كاملاً" : "على أواخر الكلمات والكلمات التي قد تُقرأ خطأ فقط"}، بدون تغيير أي كلمة من النص.
ضع الكلمات التي يكثر الخطأ في نطقها بين علامتي ** لتظهر بخط عريض.

النص:
${v.text}

اكتب الرد بهذا الشكل (عناوين بعلامة ###):
### النص مشكّلاً
### كلمات ممكن تتقال غلط
(جدول | الكلمة | النطق الصحيح | الخطأ الشائع |)
### الأرقام والمعدود
(اكتب كل رقم بالحروف كما يُنطق صحيحاً مع المعدود، أو اكتب "لا يوجد")
### نصيحة إلقاء
(بالعامية المصرية: فين تقف وفين تضغط على الكلمة)`,
    example: "### النص مشكّلاً\nافْتَتَحَ وزيرُ التعليمِ العالي اليومَ المؤتمرَ الدوليَّ للإعلامِ الرقميِّ بمشاركةِ **ثلاثٍ وعشرينَ دولةً**، وأكَّدَ أنَّ الجامعاتِ المصريةَ **تُولِي** اهتمامًا خاصًّا بتأهيلِ الطلابِ لسوقِ العملِ.\n\n### كلمات ممكن تتقال غلط\n| الكلمة | النطق الصحيح | الخطأ الشائع |\n|---|---|---|\n| ثلاثة وعشرين دولة | ثلاثٍ وعشرينَ دولةً | ثلاثةٍ وعشرين دولة |\n| تولي | تُولِي | تَوَلّى |\n\n### الأرقام والمعدود\n- ٢٣ دولة ← ثلاثٌ وعشرونَ دولةً (بعد حرف الجر: ثلاثٍ وعشرينَ)\n\n### نصيحة إلقاء\nاقف بعد «الرقمي»، واضغط على «اهتماماً خاصاً»."
  };

  // =====================================================================
  // 3) معمل الصوت
  // =====================================================================
  const VL_KEY = "mihbara-voicelab";
  let vlScript = st("mihbara-vl-script") || "";
  function offVoiceLab(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>معمل الصوت</h2><p class="lead">سجّل صوتك وانت بتقرا، وهحللك: سرعتك، وعدد مرات «اممم»، ومستوى الصوت، وفين وقفت. وكل تسجيل بيتحفظ عشان تقارن نفسك.</p>
    <label for="vlScript">النص اللي هتقراه (اختياري، عشان أحسب سرعتك بالكلمة)</label><textarea id="vlScript" style="min-height:110px" placeholder="الصق النص هنا…"></textarea>
    <div class="nc-big" id="vlTime">0:00</div><div class="nc-meter"><i id="vlLvl"></i></div>
    <div class="actions" style="justify-content:center"><button class="btn" type="button" id="vlRec">● ابدأ التسجيل</button><button class="btn ghost" type="button" id="vlFile">حلّل ملف صوت</button></div>
    <div id="vlOut"></div><div id="vlHist"></div>`;
    box.append(c);
    const ta = c.querySelector("#vlScript"); ta.value = vlScript; ta.oninput = () => { vlScript = ta.value; st("mihbara-vl-script", vlScript); };
    let rec = null;
    const btn = c.querySelector("#vlRec");
    btn.onclick = async () => {
      if (!rec) {
        try { rec = await NC.recorder((l, t) => { c.querySelector("#vlLvl").style.width = Math.min(100, l * 400) + "%"; c.querySelector("#vlTime").textContent = fmtT(t); }); }
        catch (e) { T(NC.micError(e)); return; }
        btn.textContent = "■ وقّف وحلّل"; btn.classList.add("nc-rec");
      } else {
        btn.disabled = true; const r = await rec.stop(); rec = null; btn.disabled = false; btn.textContent = "● تسجيل جديد"; btn.classList.remove("nc-rec");
        if (!r || !r.buffer) { T("مقدرتش أقرا التسجيل"); return; } show(r.buffer, r.blob);
      }
    };
    NC.onLeave(() => { if (rec) rec.cancel(); });
    c.querySelector("#vlFile").onclick = async () => { const f = await NC.pickFile("audio/*"); if (!f) return; try { show(await NC.decode(f), f); } catch (e) { T("مقدرتش أقرا الملف ده"); } };
    function show(ab, blob) {
      const a = NC.analyze(ab, vlScript), out = c.querySelector("#vlOut");
      const lv = a.clip ? ["bad", "فيه تشويش (Clipping) — ابعد شوية"] : a.levelDb < -32 ? ["bad", "واطي جداً"] : a.levelDb < -26 ? ["warn", "واطي شوية"] : a.levelDb > -10 ? ["warn", "عالي"] : ["good", "مناسب"];
      const sp = !a.wpm ? ["", "حط النص عشان أحسبها"] : a.wpm < 100 ? ["warn", "بطيء"] : a.wpm > 150 ? ["warn", "سريع"] : ["good", "مثالي للنشرة"];
      out.innerHTML = `<canvas class="nc-wave"></canvas><p class="nc-mini">الخطوط الزرقا = وقفاتك، والبرتقالي = مرات تردد محتملة (اممم).</p>
      <div class="nc-kpis"><div class="nc-kpi ${sp[0]}"><b>${a.wpm ? N(a.wpm) : "—"}</b><span>كلمة/دقيقة · ${sp[1]}</span></div>
      <div class="nc-kpi ${a.fillers > 3 ? "bad" : a.fillers ? "warn" : "good"}"><b>${N(a.fillers)}</b><span>«اممم» وتردد (تقديري)</span></div>
      <div class="nc-kpi ${lv[0]}"><b>${N(Math.round(a.levelDb))}</b><span>مستوى الصوت dB · ${lv[1]}</span></div>
      <div class="nc-kpi ${a.longPauses > 2 ? "warn" : "good"}"><b>${N(a.pauses.length)}</b><span>وقفة (${N(a.longPauses)} طويلة)</span></div>
      <div class="nc-kpi"><b>${fmtT(a.dur)}</b><span>المدة · كلام فعلي ${fmtT(a.speech)}</span></div>
      <div class="nc-kpi ${a.variety < 8 ? "warn" : "good"}"><b>${N(a.variety)}٪</b><span>تنوّع النبرة ${a.variety < 8 ? "· صوتك ثابت" : ""}</span></div></div>
      <div class="nc-card"><h4>فين وقفت</h4><p class="nc-mini">${a.pauses.length ? a.pauses.slice(0, 14).map(p => `عند ${fmtT(p.at)} (${N(p.len.toFixed(1))} ث)`).join(" · ") : "مفيش وقفات واضحة — حاول تقف عند نهاية كل جملة."}</p></div>
      <div class="actions"><button class="btn ghost" type="button" id="vlPlay">▶ اسمع التسجيل</button><button class="btn ghost" type="button" id="vlSave">احفظ الصوت</button>${(typeof CFG !== "undefined" && CFG.server) ? '<button class="btn ghost" type="button" id="vlDeep">تحليل دقيق بالذكاء الاصطناعي</button>' : ""}</div><div id="vlDeepOut"></div>`;
      const cv = out.querySelector("canvas");
      requestAnimationFrame(() => NC.drawWave(cv, ab, a.pauses.map(p => ({ at: p.at + p.len, w: p.len, color: "rgba(37,99,235,.28)" })).concat(a.fillerAt.map(t => ({ at: t + 0.4, w: 0.4, color: "rgba(245,158,11,.5)" })))));
      let src = null; out.querySelector("#vlPlay").onclick = () => { if (src) { try { src.stop(); } catch (e) { } src = null; return; } src = NC.play(ab); src.onended = () => src = null; };
      out.querySelector("#vlSave").onclick = async () => { try { const w = await NC.saveBlob(NC.wav(ab), "NewsCast360_voice_" + Date.now() + ".wav", "audio/wav"); T("اتحفظ في " + w); } catch (e) { T("مقدرتش أحفظ"); } };
      const deep = out.querySelector("#vlDeep");
      if (deep) deep.onclick = async () => {
        deep.disabled = true; const o = out.querySelector("#vlDeepOut"); o.innerHTML = '<p class="nc-mini">بيسمع التسجيل…</p>';
        try { const t = await NC.media(`استمع لهذا التسجيل لطالب إعلام يتدرب على قراءة الأخبار. ${vlScript ? "النص الذي كان يقرأه:\n" + vlScript + "\n" : ""}اكتب بالعامية المصرية وبعناوين ###:\n### التفريغ\n(ما قاله بالضبط)\n### كلمات الحشو\n(عدّ كل «اممم» و«إيه» و«يعني» وأمثالها بالرقم)\n### أخطاء النطق\n### ملاحظات على الإلقاء\n(السرعة، الوقفات، النبرة، الوضوح) و3 نصايح عملية`, blob, blob.type || "audio/webm");
          o.innerHTML = `<div class="nc-card">${NC.md(t)}</div>`; } catch (e) { o.innerHTML = `<p class="nc-mini">${E(NC.errMsg(e))}</p>`; }
        deep.disabled = false;
      };
      const H = st(VL_KEY) || []; H.unshift({ d: Date.now(), wpm: a.wpm, f: a.fillers, db: Math.round(a.levelDb), p: a.pauses.length, lp: a.longPauses, dur: Math.round(a.dur), v: a.variety }); st(VL_KEY, H.slice(0, 40));
      NC.saveTool("voicelab", "معمل الصوت — " + fmtT(a.dur), `### معمل الصوت\n- السرعة: ${a.wpm || "—"} كلمة/دقيقة\n- اممم وتردد (تقديري): ${a.fillers}\n- مستوى الصوت: ${Math.round(a.levelDb)} dB\n- الوقفات: ${a.pauses.length} (منها ${a.longPauses} طويلة)\n- المدة: ${fmtT(a.dur)}`);
      hist();
    }
    function hist() {
      const H = st(VL_KEY) || [], h = c.querySelector("#vlHist"); if (H.length < 1) { h.innerHTML = ""; return; }
      const fmtD = t => new Date(t).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
      h.innerHTML = `<div class="nc-card"><h4>قارن تسجيلاتك</h4><p class="nc-mini">اختار تسجيلين وشوف الفرق.</p>
      <div class="row"><div><label>التسجيل الأول</label><select id="vlA">${H.map((x, i) => `<option value="${i}"${i === Math.min(1, H.length - 1) ? " selected" : ""}>${fmtD(x.d)} · ${fmtT(x.dur)}</option>`).join("")}</select></div>
      <div><label>التسجيل التاني</label><select id="vlB">${H.map((x, i) => `<option value="${i}"${i === 0 ? " selected" : ""}>${fmtD(x.d)} · ${fmtT(x.dur)}</option>`).join("")}</select></div></div><div id="vlCmp"></div>
      <canvas class="nc-cv" id="vlChart" height="160"></canvas></div>`;
      const cmp = () => { const A = H[+h.querySelector("#vlA").value], B = H[+h.querySelector("#vlB").value];
        const row = (l, ka, better) => { const d = (B[ka] || 0) - (A[ka] || 0); const good = better === "down" ? d < 0 : better === "up" ? d > 0 : Math.abs((B.wpm || 0) - 125) < Math.abs((A.wpm || 0) - 125); return `<div class="nc-row"><span style="flex:1">${l}</span><span>${N(A[ka] || 0)} ← ${N(B[ka] || 0)}</span><b style="color:${d === 0 ? "var(--muted)" : good ? "#0c8a63" : "#dc2626"}">${d > 0 ? "+" : ""}${N(d)}</b></div>`; };
        h.querySelector("#vlCmp").innerHTML = `<div class="nc-list">${row("السرعة (كلمة/دقيقة)", "wpm", "mid")}${row("اممم وتردد", "f", "down")}${row("الوقفات الطويلة", "lp", "down")}${row("مستوى الصوت dB", "db", "up")}${row("تنوّع النبرة ٪", "v", "up")}</div>`; };
      h.querySelector("#vlA").onchange = cmp; h.querySelector("#vlB").onchange = cmp; cmp();
      // رسم بسيط لعدد الاممم عبر الوقت
      const cv = h.querySelector("#vlChart"), g = cv.getContext("2d"), W = cv.width = cv.clientWidth * 2, HH = cv.height = 320; const pts = H.slice(0, 12).reverse();
      g.clearRect(0, 0, W, HH); g.font = "22px sans-serif"; g.fillStyle = "#888"; g.fillText("اممم في آخر التسجيلات", W - 280, 30);
      const mx = Math.max(3, ...pts.map(p => p.f)); g.strokeStyle = "#E11D48"; g.lineWidth = 4; g.beginPath();
      pts.forEach((p, i) => { const x = 30 + i * (W - 60) / Math.max(1, pts.length - 1), y = HH - 30 - (p.f / mx) * (HH - 80); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      pts.forEach((p, i) => { const x = 30 + i * (W - 60) / Math.max(1, pts.length - 1), y = HH - 30 - (p.f / mx) * (HH - 80); g.fillStyle = "#E11D48"; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); });
    }
    hist();
  }

  // =====================================================================
  // 4) محاكي الحوار
  // =====================================================================
  const GUESTS = [["official", "مسؤول حكومي بيتهرب من الأسئلة المحرجة"], ["ceo", "مدير شركة في أزمة منتج معيب"], ["star", "نجم مشهور بيرفض أي سؤال شخصي"], ["coach", "مدرب كرة بعد خسارة كبيرة وعصبي"], ["custom", "ضيف تاني…"]];
  let gs = st("mihbara-guestsim") || { g: "official", topic: "تأخر تسليم مشروع إسكان الشباب سنتين", lvl: "hard", voice: false, chat: [] };
  const saveG = () => st("mihbara-guestsim", gs);
  function offGuest(box) {
    const c = NC.html("div", "slip");
    if (!gs.chat.length) {
      c.innerHTML = `<h2>محاكي الحوار</h2><p class="lead">ضيف افتراضي صعب بيراوغ ويتهرب، وإنت المذيع. اسأل وتابع وحاصره بالأسئلة، وفي الآخر تاخد تقييم لأدائك.</p>
      <label for="gsG">مين الضيف؟</label><select id="gsG">${GUESTS.map(g => `<option value="${g[0]}"${g[0] === gs.g ? " selected" : ""}>${g[1]}</option>`).join("")}</select>
      <div id="gsCW" ${gs.g === "custom" ? "" : "hidden"}><label for="gsC">اوصف الضيف</label><input id="gsC" type="text" value="${E(gs.custom || "")}" placeholder="مثلاً: رئيس نادي متهم بمخالفات مالية"></div>
      <label for="gsT">موضوع الحوار</label><input id="gsT" type="text" value="${E(gs.topic)}">
      <label>درجة الصعوبة</label>${NC.seg("lvl", [["easy", "متعاون"], ["mid", "بيراوغ"], ["hard", "صعب جداً"]], gs.lvl)}
      <label class="check" style="margin-top:12px"><input type="checkbox" id="gsV"${gs.voice ? " checked" : ""}> الضيف يرد بصوت مسموع</label>
      <div class="actions"><button class="btn" type="button" id="gsGo">ابدأ الحوار</button></div>`;
      box.append(c);
      c.querySelector("#gsG").onchange = e => { gs.g = e.target.value; c.querySelector("#gsCW").hidden = gs.g !== "custom"; saveG(); };
      NC.bindSeg(c, "lvl", v => { gs.lvl = v; saveG(); });
      c.querySelector("#gsV").onchange = e => { gs.voice = e.target.checked; saveG(); };
      c.querySelector("#gsGo").onclick = () => { gs.topic = c.querySelector("#gsT").value.trim(); gs.custom = (c.querySelector("#gsC") || {}).value || ""; if (!gs.topic) { T("اكتب موضوع الحوار"); return; }
        gs.chat = [{ r: "ai", t: "أهلاً بيك، اتفضل اسأل." }]; saveG(); renderOff("guestsim"); };
      return;
    }
    const who = gs.g === "custom" ? gs.custom : (GUESTS.find(g => g[0] === gs.g) || GUESTS[0])[1];
    c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">على الهوا مع: ${E(who)}</h2><span class="chip">${N(gs.chat.filter(m => m.r === "me").length)} / ١٠</span></div><p class="nc-mini">الموضوع: ${E(gs.topic)}</p>
    <div class="nc-chat" id="gsChat"></div>
    <label for="gsQ">سؤالك</label><textarea id="gsQ" style="min-height:70px" placeholder="اكتب سؤالك للضيف…"></textarea>
    <div class="actions"><button class="btn" type="button" id="gsAsk">اسأل</button><button class="btn ghost" type="button" id="gsEnd">إنهاء وتقييم</button><button class="btn ghost" type="button" id="gsNew">حوار جديد</button></div><div id="gsEval"></div>`;
    box.append(c);
    const chat = c.querySelector("#gsChat");
    const draw = () => { chat.innerHTML = gs.chat.map(m => `<div class="nc-msg ${m.r}"><small>${m.r === "me" ? "إنت (المذيع)" : "الضيف"}</small>${E(m.t)}</div>`).join(""); };
    draw();
    const persona = () => `أنت تلعب دور ضيف في برنامج حواري تلفزيوني مصري: ${who}. موضوع الحوار: ${gs.topic}.
${gs.lvl === "hard" ? "أنت صعب جداً: تتهرب من الإجابات المباشرة، تغيّر الموضوع، تهاجم السؤال، تستخدم أرقام عامة، ولا تعترف بأي خطأ إلا لو حاصرك المذيع بسؤال متابعة دقيق ومحدد مرتين." : gs.lvl === "mid" ? "أنت تراوغ أحياناً وتعطي إجابات عامة، لكن تجيب لو كان السؤال محدداً وواضحاً." : "أنت متعاون وتجيب بوضوح، مع بعض الإطالة."}
تكلم بالعامية المصرية المهذبة كما يتكلم الضيوف على التلفزيون، ورد في 2-4 جمل فقط. لا تخرج عن الدور أبداً ولا تذكر أنك ذكاء اصطناعي.`;
    const ask = c.querySelector("#gsAsk");
    ask.onclick = async () => {
      const q = c.querySelector("#gsQ").value.trim(); if (!q) return;
      if (gs.chat.filter(m => m.r === "me").length >= 10) { T("خلصت الأسئلة — دوس «إنهاء وتقييم»"); return; }
      gs.chat.push({ r: "me", t: q }); c.querySelector("#gsQ").value = ""; draw(); saveG(); ask.disabled = true;
      try { const t = await NC.ai(persona() + "\n\nالحوار حتى الآن:\n" + gs.chat.map(m => (m.r === "me" ? "المذيع: " : "الضيف: ") + m.t).join("\n") + "\n\nاكتب رد الضيف فقط:");
        const ans = NC.plain(t).replace(/^الضيف:\s*/, ""); gs.chat.push({ r: "ai", t: ans }); saveG(); draw(); if (gs.voice) NC.speak(ans, true); }
      catch (e) { gs.chat.pop(); draw(); T("الضيف مش بيرد دلوقتي، جرّب تاني"); }
      ask.disabled = false; chat.lastElementChild && chat.lastElementChild.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };
    c.querySelector("#gsNew").onclick = () => { gs.chat = []; saveG(); renderOff("guestsim"); };
    c.querySelector("#gsEnd").onclick = async () => {
      if (gs.chat.filter(m => m.r === "me").length < 3) { T("اسأل 3 أسئلة على الأقل"); return; }
      const o = c.querySelector("#gsEval"); o.innerHTML = '<p class="nc-mini">بيقيّم الحوار…</p>';
      const j = await NC.aiJSON(`أنت مدرب محاورة تلفزيونية خبير. قيّم أداء المذيع (طالب إعلام) في الحوار التالي مع ضيف صعب (${who}) عن: ${gs.topic}.
الحوار:\n${gs.chat.map(m => (m.r === "me" ? "المذيع: " : "الضيف: ") + m.t).join("\n")}
رد بـ JSON فقط: {"score":0-100,"verdict":"جملة","strengths":["..."],"improve":["..."],"followups":["سؤال متابعة كان لازم يتسأل"],"best":"أفضل سؤال سأله"}. اكتب بالعامية المصرية.`).catch(() => null);
      if (!j || j.score == null) { o.innerHTML = '<p class="nc-mini">مقدرتش أقيّم دلوقتي. جرّب تاني.</p>'; return; }
      const sc = Math.max(0, Math.min(100, Math.round(+j.score)));
      o.innerHTML = `<div class="nc-card"><div class="nc-score"><div class="ring" style="--p:${sc}"><b>${N(sc)}</b></div><b>${E(j.verdict || "")}</b></div>
      <h4>نقاط قوتك</h4><ul class="tips">${(j.strengths || []).map(x => `<li>${E(x)}</li>`).join("")}</ul>
      <h4>تحسّن إيه</h4><ul class="tips">${(j.improve || []).map(x => `<li>${E(x)}</li>`).join("")}</ul>
      <h4>أسئلة متابعة فاتتك</h4><ul class="tips">${(j.followups || []).map(x => `<li>${E(x)}</li>`).join("")}</ul>${j.best ? `<p class="nc-mini">أحسن سؤال: «${E(j.best)}»</p>` : ""}</div>`;
      NC.saveTool("guestsim", "محاكي الحوار — " + gs.topic + " — " + sc + "/100", `### محاكي الحوار (${who})\nالدرجة: ${sc}/100 — ${j.verdict || ""}\n\n### الحوار\n${gs.chat.map(m => (m.r === "me" ? "**المذيع:** " : "**الضيف:** ") + m.t).join("\n\n")}\n\n### تحسّن إيه\n${(j.improve || []).map(x => "- " + x).join("\n")}`);
    };
  }

  // ---------- التسجيل ----------
  NC.register({ key: "onair", name: "محاكي «على الهوا»", desc: "نشرة حية بمفاجآت: عاجل، والمخرج في السماعة، والتلقين يقف — وتاخد درجة", tint: "#dc2626", render: offOnAir,
    icon: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4M3.5 3.5a12 12 0 0 0 0 17M20.5 3.5a12 12 0 0 1 0 17"/>' });
  NC.register({ key: "tashkeel", tool: TASHKEEL, tint: "#0b7285", icon: '<path d="M5 18h14"/><path d="M8 14l4-9 4 9"/><path d="M9.5 11h5"/><path d="M10 3h4"/>' });
  NC.register({ key: "voicelab", name: "معمل الصوت", desc: "سجّل صوتك: السرعة، و«اممم»، ومستوى الصوت، والوقفات، وقارن تسجيلاتك", tint: "#7c3aed", render: offVoiceLab, offline: true,
    icon: '<path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0"/>' });
  NC.register({ key: "guestsim", name: "محاكي الحوار", desc: "ضيف افتراضي صعب بيتهرب ويراوغ، وإنت تحاوره وتاخد تقييم", tint: "#2563eb", render: offGuest,
    icon: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>' });
  NC.group("تدريب المذيع", "التحديث الجديد: اتدرب كأنك على الهوا بالظبط", ["onair", "tashkeel", "voicelab", "guestsim"], true);
})();
