/* NewsCast 360 — التحديث 2: الصوت والصورة */
(function () {
  "use strict";
  const { E, T, st, $$, N, words, fmtT } = NC;
  const FD = '"Alexandria","Readex Pro",Tahoma,sans-serif', FB = '"Readex Pro",Tahoma,sans-serif';
  const hasServer = () => typeof CFG !== "undefined" && !!CFG.server;

  // =====================================================================
  // 5) تفريغ المقابلات
  // =====================================================================
  function offTranscribe(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>تفريغ المقابلات</h2><p class="lead">اختار تسجيل المقابلة (لحد 12 ميجا تقريباً 10 دقايق)، وهيتحوّل لنص مكتوب بالتوقيت، مع أقوى الجمل اللي تنفع «ساوند بايت» في تقريرك.</p>
    ${hasServer() ? "" : '<p class="nc-mini" style="color:#d97706">⚠ الميزة دي محتاجة السيرفر الخاص بالتطبيق شغال.</p>'}
    <label>نوع التسجيل</label>${NC.seg("kind", [["interview", "مقابلة"], ["presser", "مؤتمر صحفي"], ["vox", "آراء الشارع"]], "interview")}
    <label class="check" style="margin-top:10px"><input type="checkbox" id="trMasri" checked> الكلام بالعامية المصرية (اكتبه زي ما اتقال)</label>
    <div class="actions"><button class="btn" type="button" id="trPick">اختار ملف صوت</button><button class="btn ghost" type="button" id="trRec">● سجّل دلوقتي</button></div>
    <p class="nc-mini" id="trInfo"></p><div id="trOut"></div>`;
    box.append(c);
    let kind = "interview"; NC.bindSeg(c, "kind", v => kind = v);
    const go = async (blob, name) => {
      const out = c.querySelector("#trOut"); c.querySelector("#trInfo").textContent = (name || "تسجيل") + " · " + N((blob.size / 1048576).toFixed(1)) + " ميجا";
      out.innerHTML = '<div class="progress"><span></span></div><p class="nc-mini">بيسمع ويفرّغ… ممكن ياخد دقيقة.</p>';
      try {
        const t = await NC.media(`فرّغ هذا التسجيل الصوتي (${kind === "presser" ? "مؤتمر صحفي" : kind === "vox" ? "آراء الناس في الشارع" : "مقابلة صحفية"}) تفريغاً دقيقاً ${c.querySelector("#trMasri").checked ? "كما قيل بالضبط بالعامية المصرية" : "بالفصحى المبسطة"}، دون حذف أو إضافة.
اكتب بعناوين ###:
### التفريغ
(كل فقرة تبدأ بالتوقيت [د:ث] واسم المتحدث: المحاور / الضيف 1 / الضيف 2…)
### أقوى الجمل (ساوند بايت)
(5 جمل بالتوقيت، كل جملة أقل من 15 ثانية، وليه هي قوية)
### ملخص في 3 نقاط
### أسئلة متابعة مقترحة`, blob, blob.type || "audio/mpeg");
        out.innerHTML = `<div class="nc-card">${NC.md(t)}</div><div class="actions"><button class="btn ghost" type="button" id="trCopy">انسخ</button><button class="btn ghost" type="button" id="trShare">شارك</button></div>`;
        out.querySelector("#trCopy").onclick = () => copyText(t); out.querySelector("#trShare").onclick = () => shareText(t, "تفريغ مقابلة");
        NC.saveTool("transcribe", "تفريغ: " + (name || "تسجيل"), t);
      } catch (e) { out.innerHTML = `<p class="nc-mini">${E(NC.errMsg(e))}</p>`; }
    };
    c.querySelector("#trPick").onclick = async () => { const f = await NC.pickFile("audio/*,video/*"); if (f) go(f, f.name); };
    let rec = null; const rb = c.querySelector("#trRec");
    rb.onclick = async () => { if (!rec) { try { rec = await NC.recorder((l, t) => rb.textContent = "■ وقّف (" + fmtT(t) + ")"); rb.classList.add("nc-rec"); } catch (e) { T(NC.micError(e)); } }
      else { const r = await rec.stop(); rec = null; rb.classList.remove("nc-rec"); rb.textContent = "● سجّل دلوقتي"; if (r) go(r.blob, "تسجيل من الميكروفون"); } };
    NC.onLeave(() => { if (rec) rec.cancel(); });
  }

  // =====================================================================
  // 7) مكتبة الفواصل والجينجلز (أصوات بتتولّد على الجهاز = حقوقها مسموحة)
  // =====================================================================
  async function synth(dur, build) { const sr = 44100, oc = new OfflineAudioContext(2, Math.ceil(sr * dur), sr); const out = oc.createDynamicsCompressor(); out.connect(oc.destination); build(oc, out); return await oc.startRendering(); }
  const tone = (oc, out, f, t, d, type, vol, a) => { const o = oc.createOscillator(), g = oc.createGain(); o.type = type || "sine"; o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + (a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0008, t + d); o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05); return o; };
  const noise = (oc, out, t, d, f0, f1, vol, q) => { const len = Math.ceil(oc.sampleRate * d), b = oc.createBuffer(1, len, oc.sampleRate), x = b.getChannelData(0); for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
    const s = oc.createBufferSource(), bp = oc.createBiquadFilter(), g = oc.createGain(); s.buffer = b; bp.type = "bandpass"; bp.Q.value = q || 2; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + d * 0.6); g.gain.linearRampToValueAtTime(0, t + d); s.connect(bp); bp.connect(g); g.connect(out); s.start(t); };
  const kick = (oc, out, t, v) => { const o = oc.createOscillator(), g = oc.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25); g.gain.setValueAtTime(v || 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4); };
  const hat = (oc, out, t, v) => noise(oc, out, t, 0.05, 9000, 8000, v || 0.15, 1);
  const JINGLES = [
    { id: "sting", n: "فاصل الأخبار (Sting)", d: "دخول قوي لبداية النشرة أو العناوين", dur: 3.2, f: (oc, o) => { [196, 247, 294, 392].forEach(f => tone(oc, o, f, 0.05, 2.8, "sawtooth", 0.07, 0.02)); noise(oc, o, 0, 0.6, 400, 6000, 0.25); kick(oc, o, 0.05, 1); kick(oc, o, 0.55, 0.7); [784, 988].forEach((f, i) => tone(oc, o, f, 0.55 + i * 0.12, 1.6, "triangle", 0.15)); } },
    { id: "bed", n: "خلفية النشرة (Bed) — 30 ثانية", d: "موسيقى تحت صوت المذيع، بتتكرر من غير قطع", dur: 30, f: (oc, o) => { const bpm = 100, b = 60 / bpm; for (let t = 0; t < 30; t += b) { kick(oc, o, t, 0.35); hat(oc, o, t + b / 2, 0.06); } const ch = [[110, 165, 220], [98, 147, 196], [87, 131, 175], [98, 147, 196]]; for (let k = 0; k < 30 / (b * 4); k++) ch[k % 4].forEach(f => tone(oc, o, f, k * b * 4, b * 4, "triangle", 0.05, 0.4)); for (let t = 0; t < 30; t += b / 2) tone(oc, o, 440 * (t / (b / 2) % 8 < 4 ? 1 : 1.122), t, 0.18, "sine", 0.025); } },
    { id: "breaking", n: "عاجل", d: "تنبيه سريع قبل الخبر العاجل", dur: 3.5, f: (oc, o) => { for (let i = 0; i < 6; i++) { tone(oc, o, 880 + i * 60, i * 0.38, 0.22, "square", 0.08); tone(oc, o, 660 + i * 45, i * 0.38 + 0.19, 0.18, "square", 0.06); } kick(oc, o, 2.4, 1); tone(oc, o, 110, 2.4, 1, "sawtooth", 0.15); } },
    { id: "whoosh", n: "انتقال (Whoosh)", d: "بين الفقرات أو مع الجرافيك", dur: 1.6, f: (oc, o) => { noise(oc, o, 0, 1.4, 300, 7000, 0.6, 1.2); kick(oc, o, 1.2, 0.5); } },
    { id: "clock", n: "تيك تاك الساعة", d: "عدّ تنازلي قبل البث أو في فقرة الوقت", dur: 10, f: (oc, o) => { for (let i = 0; i < 10; i++) { noise(oc, o, i, 0.04, 3000, 2500, 0.35, 8); noise(oc, o, i + 0.5, 0.04, 2200, 1800, 0.25, 8); } } },
    { id: "radio", n: "فاصل إذاعي هادي", d: "بين الفقرات في البرامج الإذاعية", dur: 5, f: (oc, o) => { [523, 659, 784, 1047, 784, 659].forEach((f, i) => tone(oc, o, f, i * 0.32, 2.4, "sine", 0.18, 0.005)); [262, 330, 392].forEach(f => tone(oc, o, f, 0, 4.5, "triangle", 0.05, 0.6)); } },
    { id: "outro", n: "ختام النشرة", d: "نهاية البرنامج أو النشرة", dur: 6, f: (oc, o) => { [[392, 494, 587], [349, 440, 523], [330, 392, 494], [294, 370, 440, 587]].forEach((ch, i) => ch.forEach(f => tone(oc, o, f, i * 1.1, i === 3 ? 3 : 1.2, "sawtooth", 0.05, 0.05))); kick(oc, o, 3.3, 0.8); } },
    { id: "pips", n: "إشارة الوقت (بيب)", d: "الإشارة التقليدية قبل رأس الساعة", dur: 6.5, f: (oc, o) => { for (let i = 0; i < 5; i++) tone(oc, o, 1000, i, 0.1, "sine", 0.3, 0.002); tone(oc, o, 1000, 5, 0.6, "sine", 0.3, 0.002); } },
  ];
  const jcache = {};
  async function jingle(id) { if (!jcache[id]) { const j = JINGLES.find(x => x.id === id); jcache[id] = await synth(j.dur, j.f); } return jcache[id]; }
  function offJingles(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>مكتبة الفواصل والجينجلز</h2><p class="lead">مؤثرات وموسيقى بتتولّد على موبايلك، فحقوقها ملكك وتقدر تستخدمها في أي إنتاج. اسمع، ونزّل، أو ابعتها لمحرر الصوت.</p><div class="nc-list" id="jgList"></div>`;
    box.append(c);
    let src = null; const stop = () => { if (src) { try { src.stop(); } catch (e) { } src = null; } }; NC.onLeave(stop);
    const l = c.querySelector("#jgList");
    JINGLES.forEach(j => { const r = NC.html("div", "nc-row"); r.style.flexWrap = "wrap";
      r.innerHTML = `<div style="flex:1;min-width:160px"><b>${E(j.n)}</b><div class="nc-mini">${E(j.d)} · ${N(j.dur)} ث</div></div><button class="btn ghost" type="button" data-a="play">▶</button><button class="btn ghost" type="button" data-a="save">نزّل</button><button class="btn ghost" type="button" data-a="use">للمحرر</button>`;
      r.querySelector('[data-a="play"]').onclick = async e => { stop(); const b = await jingle(j.id); src = NC.play(b); };
      r.querySelector('[data-a="save"]').onclick = async () => { try { const w = await NC.saveBlob(NC.wav(await jingle(j.id)), "NewsCast360_" + j.id + ".wav", "audio/wav"); T("اتحفظ في " + w); } catch (e) { T("مقدرتش أحفظ"); } };
      r.querySelector('[data-a="use"]').onclick = async () => { NC.bed = { buf: await jingle(j.id), name: j.n }; T("اتبعتت لمحرر الصوت ✓"); open("audioedit"); };
      l.append(r); });
  }

  // =====================================================================
  // 6) محرر صوت بسيط
  // =====================================================================
  const AE = { voice: null, vname: "", start: 0, end: 0, fin: 0.5, fout: 1, mvol: 0.35, duck: 0.25, intro: 2, out: null };
  function offAudioEdit(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>محرر صوت بسيط</h2><p class="lead">قص التسجيل، واعمل Fade في الأول والآخر، وحط موسيقى في الخلفية صوتها بيوطى لوحده لما حد يتكلم (Ducking).</p>
    <div class="actions"><button class="btn" type="button" id="aeV">اختار ملف الصوت</button><button class="btn ghost" type="button" id="aeR">● سجّل</button></div>
    <div id="aeBody"></div>`;
    box.append(c);
    const body = c.querySelector("#aeBody");
    const load = (ab, name) => { AE.voice = ab; AE.vname = name; AE.start = 0; AE.end = ab.duration; AE.out = null; draw(); };
    c.querySelector("#aeV").onclick = async () => { const f = await NC.pickFile("audio/*"); if (!f) return; try { load(await NC.decode(f), f.name); } catch (e) { T("مقدرتش أقرا الملف"); } };
    let rec = null; const rb = c.querySelector("#aeR");
    rb.onclick = async () => { if (!rec) { try { rec = await NC.recorder((l, t) => rb.textContent = "■ وقّف (" + fmtT(t) + ")"); rb.classList.add("nc-rec"); } catch (e) { T(NC.micError(e)); } }
      else { const r = await rec.stop(); rec = null; rb.classList.remove("nc-rec"); rb.textContent = "● سجّل"; if (r && r.buffer) load(r.buffer, "تسجيل"); } };
    let src = null; const stop = () => { if (src) { try { src.stop(); } catch (e) { } src = null; } };
    NC.onLeave(() => { stop(); if (rec) rec.cancel(); });
    function draw() {
      if (!AE.voice) { body.innerHTML = '<p class="nc-mini">اختار ملف صوت الأول.</p>'; return; }
      const D = AE.voice.duration;
      body.innerHTML = `<p class="nc-mini">${E(AE.vname)} · ${fmtT(D)}</p><canvas class="nc-wave" id="aeWave"></canvas>
      <div class="row"><div><label>البداية: <b id="aeSv">${fmtT(AE.start)}</b></label><input type="range" id="aeS" min="0" max="${D}" step="0.1" value="${AE.start}"></div>
      <div><label>النهاية: <b id="aeEv">${fmtT(AE.end)}</b></label><input type="range" id="aeE" min="0" max="${D}" step="0.1" value="${AE.end}"></div></div>
      <div class="row"><div><label>Fade في الأول: <b id="aeFiv">${AE.fin}</b> ث</label><input type="range" id="aeFi" min="0" max="5" step="0.1" value="${AE.fin}"></div>
      <div><label>Fade في الآخر: <b id="aeFov">${AE.fout}</b> ث</label><input type="range" id="aeFo" min="0" max="5" step="0.1" value="${AE.fout}"></div></div>
      <div class="nc-card"><h4>موسيقى الخلفية</h4><p class="nc-mini" id="aeBedN">${NC.bed ? "♫ " + E(NC.bed.name) : "مفيش موسيقى"}</p>
      <div class="actions"><button class="btn ghost" type="button" id="aeBedLib">من مكتبة الجينجلز</button><button class="btn ghost" type="button" id="aeBedF">من ملف</button>${NC.bed ? '<button class="btn ghost" type="button" id="aeBedX">شيل الموسيقى</button>' : ""}</div>
      <div class="row"><div><label>صوت الموسيقى</label><input type="range" id="aeMv" min="0" max="1" step="0.05" value="${AE.mvol}"></div><div><label>توطية الموسيقى وقت الكلام</label><input type="range" id="aeDk" min="0.05" max="1" step="0.05" value="${AE.duck}"></div></div>
      <div><label>مقدمة موسيقى قبل الكلام: <b id="aeInv">${AE.intro}</b> ث</label><input type="range" id="aeIn" min="0" max="8" step="0.5" value="${AE.intro}"></div></div>
      <div class="actions"><button class="btn" type="button" id="aeMix">اعمل المكساج واسمعه</button><button class="btn ghost" type="button" id="aeSave" ${AE.out ? "" : "disabled"}>احفظ WAV</button></div>`;
      const wave = () => NC.drawWave(body.querySelector("#aeWave"), AE.voice, [{ at: AE.start, w: AE.start, color: "rgba(0,0,0,.45)" }, { at: D, w: D - AE.end, color: "rgba(0,0,0,.45)" }]);
      requestAnimationFrame(wave);
      const bind = (id, key, lab, f) => body.querySelector(id).oninput = e => { AE[key] = +e.target.value; if (lab) body.querySelector(lab).textContent = f ? f(AE[key]) : AE[key]; AE.out = null; body.querySelector("#aeSave").disabled = true; if (key === "start" || key === "end") { if (AE.end < AE.start + 0.5) AE.end = Math.min(D, AE.start + 0.5); wave(); } };
      bind("#aeS", "start", "#aeSv", fmtT); bind("#aeE", "end", "#aeEv", fmtT); bind("#aeFi", "fin", "#aeFiv"); bind("#aeFo", "fout", "#aeFov"); bind("#aeMv", "mvol"); bind("#aeDk", "duck"); bind("#aeIn", "intro", "#aeInv");
      body.querySelector("#aeBedLib").onclick = () => open("jingles");
      body.querySelector("#aeBedF").onclick = async () => { const f = await NC.pickFile("audio/*"); if (!f) return; try { NC.bed = { buf: await NC.decode(f), name: f.name }; draw(); } catch (e) { T("مقدرتش أقرا الملف"); } };
      const bx = body.querySelector("#aeBedX"); if (bx) bx.onclick = () => { NC.bed = null; draw(); };
      body.querySelector("#aeMix").onclick = async e => { stop(); e.target.disabled = true; try { AE.out = await mix(); body.querySelector("#aeSave").disabled = false; src = NC.play(AE.out); } catch (er) { T("مقدرتش أعمل المكساج"); } e.target.disabled = false; };
      body.querySelector("#aeSave").onclick = async () => { if (!AE.out) return; try { const w = await NC.saveBlob(NC.wav(AE.out), "NewsCast360_mix_" + Date.now() + ".wav", "audio/wav"); T("اتحفظ في " + w); } catch (e) { T("مقدرتش أحفظ"); } };
    }
    async function mix() {
      const v = AE.voice, sr = v.sampleRate, len = AE.end - AE.start, bed = NC.bed && NC.bed.buf, intro = bed ? AE.intro : 0, total = intro + len + (bed ? 1.5 : 0);
      const oc = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
      const vs = oc.createBufferSource(), vg = oc.createGain(); vs.buffer = v; vs.connect(vg); vg.connect(oc.destination);
      vg.gain.setValueAtTime(AE.fin ? 0 : 1, intro); if (AE.fin) vg.gain.linearRampToValueAtTime(1, intro + AE.fin);
      vg.gain.setValueAtTime(1, intro + Math.max(AE.fin, len - AE.fout)); vg.gain.linearRampToValueAtTime(AE.fout ? 0 : 1, intro + len);
      vs.start(intro, AE.start, len);
      if (bed) {
        const ms = oc.createBufferSource(), mg = oc.createGain(); ms.buffer = bed; ms.loop = true; ms.connect(mg); mg.connect(oc.destination);
        // ظرف الكلام: نوطّي الموسيقى لما الصوت يكون شغال
        const a = NC.analyze(v), fr = a.hop; mg.gain.setValueAtTime(0, 0); mg.gain.linearRampToValueAtTime(AE.mvol, 0.6);
        let prev = null;
        for (let i = Math.floor(AE.start / fr); i < Math.floor(AE.end / fr); i++) { let on = false; for (let k = -10; k <= 10; k++) if (a.voiced[i + k]) { on = true; break; }
          if (on !== prev) { const t = intro + i * fr - AE.start; mg.gain.setTargetAtTime(on ? AE.mvol * AE.duck : AE.mvol, Math.max(0.6, t), 0.12); prev = on; } }
        mg.gain.setTargetAtTime(AE.mvol, intro + len, 0.2); mg.gain.setTargetAtTime(0, total - 1.2, 0.35);
        ms.start(0); ms.stop(total);
      }
      return await oc.startRendering();
    }
    draw();
  }

  // =====================================================================
  // 8) محاكي الكاميرا والإضاءة
  // =====================================================================
  const AP = [1.8, 2.8, 4, 5.6, 8, 11, 16], SH = [30, 60, 125, 250, 500, 1000], ISO = [100, 200, 400, 800, 1600, 3200, 6400];
  const SCENES = { studio: ["استوديو", 9], day: ["خارجي نهار", 14], indoor: ["داخلي عادي", 7], night: ["شارع بالليل", 4] };
  let cam = st("mihbara-cam") || { a: 2, s: 2, i: 1, scene: "studio", move: false, tab: "cam", key: 1, fill: 0.5, back: 0.7 };
  function offCamera(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>محاكي الكاميرا والإضاءة</h2><p class="lead">اتعلم مثلث التعريض (فتحة العدسة، والشتر، والـ ISO)، ومخطط الإضاءة الثلاثية، وشوف النتيجة على الصورة على طول.</p>
    ${NC.seg("tab", [["cam", "الكاميرا"], ["light", "الإضاءة الثلاثية"]], cam.tab)}<div id="cmBody"></div>`;
    box.append(c);
    NC.bindSeg(c, "tab", v => { cam.tab = v; st("mihbara-cam", cam); draw(); });
    const body = c.querySelector("#cmBody");
    function draw() { body.innerHTML = ""; (cam.tab === "cam" ? camTab : lightTab)(body); }
    draw();
  }
  function scene(g, W, H, opts) {
    // خلفية: شبابيك وأضواء
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, "#3b5b8c"); sky.addColorStop(1, "#c9a27a"); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) { g.fillStyle = ["#f6d365", "#fda085", "#a1c4fd", "#fff1a8"][i % 4]; g.beginPath(); g.arc((i + 0.5) * W / 9, H * (0.18 + (i % 3) * 0.09), W * 0.025, 0, 7); g.fill(); }
    g.fillStyle = "#5b4636"; g.fillRect(0, H * 0.72, W, H * 0.28);
  }
  function subject(g, x, y, s) { g.fillStyle = "#1f2a44"; g.beginPath(); g.ellipse(x, y + s * 1.25, s * 1.05, s * 0.75, 0, Math.PI, 0); g.fill(); g.fillRect(x - s * 1.05, y + s * 1.25, s * 2.1, s); g.fillStyle = "#d9a37c"; g.beginPath(); g.ellipse(x, y, s * 0.62, s * 0.78, 0, 0, 7); g.fill(); g.fillStyle = "#2b1a12"; g.beginPath(); g.ellipse(x, y - s * 0.45, s * 0.66, s * 0.42, 0, Math.PI, 0); g.fill(); g.fillStyle = "#e11d48"; g.fillRect(x - s * 0.08, y + s * 0.9, s * 0.16, s * 0.9); }
  function camTab(body) {
    const W = 800, H = 500;
    body.innerHTML = `<canvas class="nc-cv" id="cmCv" width="${W}" height="${H}"></canvas><div class="nc-kpis" id="cmK"></div>
    <label>المكان</label>${NC.seg("scene", Object.keys(SCENES).map(k => [k, SCENES[k][0]]), cam.scene)}
    <div><label>فتحة العدسة (Aperture): <b id="cmAv"></b></label><input type="range" id="cmA" min="0" max="${AP.length - 1}" value="${cam.a}"></div>
    <div><label>سرعة الغالق (Shutter): <b id="cmSv"></b></label><input type="range" id="cmS" min="0" max="${SH.length - 1}" value="${cam.s}"></div>
    <div><label>الحساسية ISO: <b id="cmIv"></b></label><input type="range" id="cmI" min="0" max="${ISO.length - 1}" value="${cam.i}"></div>
    <label class="check"><input type="checkbox" id="cmM"${cam.move ? " checked" : ""}> الضيف بيتحرك</label><div class="nc-card" id="cmTip"></div>`;
    const cv = body.querySelector("#cmCv"), g = cv.getContext("2d"), off = document.createElement("canvas"); off.width = W; off.height = H; const og = off.getContext("2d");
    const render = () => {
      const N0 = AP[cam.a], t = 1 / SH[cam.s], iso = ISO[cam.i], ev = Math.log2(N0 * N0 / t) - Math.log2(iso / 100), diff = SCENES[cam.scene][1] - ev;
      const bright = Math.max(0.05, Math.min(4, Math.pow(2, diff * 0.55)));
      body.querySelector("#cmAv").textContent = "f/" + N0; body.querySelector("#cmSv").textContent = "1/" + SH[cam.s]; body.querySelector("#cmIv").textContent = iso;
      g.clearRect(0, 0, W, H);
      // الخلفية مع عمق الميدان
      og.clearRect(0, 0, W, H); scene(og, W, H);
      g.filter = `blur(${Math.max(0, (8 / N0) * 3 - 1).toFixed(1)}px) brightness(${bright})`; g.drawImage(off, 0, 0); g.filter = "none";
      // الضيف مع حركة
      og.clearRect(0, 0, W, H); subject(og, W / 2, H * 0.42, 70);
      const ghosts = cam.move ? Math.max(1, Math.round(SH.length - cam.s) * 2) : 1;
      g.filter = `brightness(${bright})`; for (let k = 0; k < ghosts; k++) { g.globalAlpha = 1 / ghosts + (k === ghosts - 1 ? 0.15 : 0); g.drawImage(off, (k - ghosts / 2) * 6, 0); } g.globalAlpha = 1; g.filter = "none";
      // ضوضاء ISO
      const amt = Math.max(0, Math.log2(iso / 400)) * 18; if (amt > 0) { const im = g.getImageData(0, 0, W, H), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); }
      const st2 = diff > 1.2 ? ["bad", "محروقة (Over)"] : diff < -1.2 ? ["bad", "غامقة (Under)"] : Math.abs(diff) > 0.5 ? ["warn", "قريبة"] : ["good", "مظبوطة ✓"];
      body.querySelector("#cmK").innerHTML = `<div class="nc-kpi ${st2[0]}"><b>${st2[1]}</b><span>التعريض</span></div><div class="nc-kpi"><b>${N0 <= 2.8 ? "ضحل" : N0 >= 11 ? "عميق" : "متوسط"}</b><span>عمق الميدان</span></div><div class="nc-kpi ${amt > 30 ? "warn" : "good"}"><b>${amt > 30 ? "عالية" : amt > 0 ? "خفيفة" : "مفيش"}</b><span>الحبيبات (Noise)</span></div><div class="nc-kpi ${cam.move && SH[cam.s] < 250 ? "warn" : "good"}"><b>${cam.move && SH[cam.s] < 250 ? "مهزوزة" : "ثابتة"}</b><span>الحركة</span></div>`;
      body.querySelector("#cmTip").innerHTML = `<h4>ليه كده؟</h4><ul class="tips"><li>فتحة أوسع (رقم أصغر زي f/1.8) = نور أكتر وخلفية مغبشة، وده شكل الحوارات والإنترفيو.</li><li>شتر أسرع (1/500) = بيجمد الحركة بس بيقلل النور. في الفيديو القاعدة: الشتر = ضعف عدد الكادرات (1/50 لـ 25 كادر).</li><li>ISO أعلى = الصورة أفتح بس بتظهر حبيبات. ارفعه آخر حاجة.</li>${st2[0] !== "good" ? `<li><b>${diff > 0 ? "قلل النور: قفّل الفتحة أو سرّع الشتر أو وطّي الـ ISO." : "زوّد النور: افتح الفتحة أو بطّأ الشتر أو ارفع الـ ISO."}</b></li>` : ""}</ul>`;
      st("mihbara-cam", cam);
    };
    body.querySelector("#cmA").oninput = e => { cam.a = +e.target.value; render(); };
    body.querySelector("#cmS").oninput = e => { cam.s = +e.target.value; render(); };
    body.querySelector("#cmI").oninput = e => { cam.i = +e.target.value; render(); };
    body.querySelector("#cmM").onchange = e => { cam.move = e.target.checked; render(); };
    NC.bindSeg(body, "scene", v => { cam.scene = v; render(); });
    render();
  }
  function lightTab(body) {
    const W = 800, H = 520;
    body.innerHTML = `<canvas class="nc-cv" id="lgCv" width="${W}" height="${H}"></canvas>
    <div><label>الضوء الأساسي (Key): <b id="lkv"></b></label><input type="range" id="lk" min="0" max="1" step="0.05" value="${cam.key}"></div>
    <div><label>ضوء الملء (Fill): <b id="lfv"></b></label><input type="range" id="lf" min="0" max="1" step="0.05" value="${cam.fill}"></div>
    <div><label>الضوء الخلفي (Back): <b id="lbv"></b></label><input type="range" id="lb" min="0" max="1" step="0.05" value="${cam.back}"></div>
    <div class="nc-card" id="lgTip"></div>`;
    const cv = body.querySelector("#lgCv"), g = cv.getContext("2d");
    const render = () => {
      const k = cam.key, f = cam.fill, b = cam.back; g.fillStyle = "#14141c"; g.fillRect(0, 0, W, H);
      // الوجه (يمين الكانفاس)
      const fx = 560, fy = 230, s = 120;
      g.fillStyle = `rgb(${30 + 40 * b},${30 + 40 * b},${45 + 40 * b})`; g.fillRect(400, 0, 400, H);
      if (b > 0) { g.save(); g.shadowColor = `rgba(255,240,200,${b})`; g.shadowBlur = 40 * b; g.strokeStyle = `rgba(255,236,190,${0.9 * b})`; g.lineWidth = 6; g.beginPath(); g.ellipse(fx, fy, s * 0.64, s * 0.8, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.restore(); }
      const base = 25, lit = v => Math.round(base + 210 * Math.min(1, v));
      const grad = g.createLinearGradient(fx - s * 0.62, 0, fx + s * 0.62, 0);
      grad.addColorStop(0, `rgb(${lit(k)},${lit(k) * 0.78 | 0},${lit(k) * 0.62 | 0})`); grad.addColorStop(1, `rgb(${lit(f * 0.8)},${lit(f * 0.8) * 0.78 | 0},${lit(f * 0.8) * 0.62 | 0})`);
      g.fillStyle = "#1f2a44"; g.fillRect(fx - s * 1.1, fy + s * 0.9, s * 2.2, s * 2);
      g.fillStyle = grad; g.beginPath(); g.ellipse(fx, fy, s * 0.62, s * 0.78, 0, 0, 7); g.fill();
      g.fillStyle = "#2b1a12"; g.beginPath(); g.ellipse(fx, fy - s * 0.45, s * 0.66, s * 0.42, 0, Math.PI, 0); g.fill();
      // المخطط (يسار)
      g.fillStyle = "#ffffff10"; g.fillRect(0, 0, 400, H); g.fillStyle = "#fff"; g.font = "bold 22px " + FB; g.textAlign = "center"; g.fillText("مخطط الإضاءة من فوق", 200, 34);
      const sub = [200, 260]; g.fillStyle = "#e11d48"; g.beginPath(); g.arc(sub[0], sub[1], 22, 0, 7); g.fill(); g.fillStyle = "#fff"; g.font = "16px " + FB; g.fillText("الضيف", sub[0], sub[1] + 44);
      g.fillStyle = "#9ca3af"; g.fillRect(185, 440, 30, 26); g.fillText("الكاميرا", 200, 490);
      const lamp = (x, y, v, n) => { g.globalAlpha = 0.25 + 0.75 * v; g.fillStyle = "#fde047"; g.beginPath(); g.moveTo(x, y); g.lineTo(sub[0] + (x - sub[0]) * 0.25, sub[1] + (y - sub[1]) * 0.25 - 14); g.lineTo(sub[0] + (x - sub[0]) * 0.25, sub[1] + (y - sub[1]) * 0.25 + 14); g.closePath(); g.fill(); g.globalAlpha = 1; g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.fillStyle = "#e5e7eb"; g.fillText(n + " " + Math.round(v * 100) + "٪", x, y + 34); };
      lamp(70, 380, k, "Key"); lamp(330, 380, f, "Fill"); lamp(200, 90, b, "Back");
      body.querySelector("#lkv").textContent = Math.round(k * 100) + "٪"; body.querySelector("#lfv").textContent = Math.round(f * 100) + "٪"; body.querySelector("#lbv").textContent = Math.round(b * 100) + "٪";
      const ratio = f > 0.02 ? (k / f) : 99;
      const look = ratio > 3.5 ? "درامي جداً (Low key) — مناسب للتحقيقات والدراما" : ratio > 1.8 ? "متوازن — ده الشكل المثالي للحوار والنشرة" : "مسطّح (Flat) — الوش ناقصه عمق";
      body.querySelector("#lgTip").innerHTML = `<h4>نسبة Key:Fill ≈ ${ratio > 50 ? "∞" : ratio.toFixed(1)} : 1 — ${look}</h4><ul class="tips"><li><b>Key:</b> الضوء الأقوى، بزاوية 45° من الكاميرا.</li><li><b>Fill:</b> في الناحية التانية بنص قوة الـ Key تقريباً، بيخفف الضل.</li><li><b>Back:</b> ورا الضيف، بيفصله عن الخلفية ويعمل حواف منوّرة.</li>${b < 0.2 ? "<li>من غير Back light الضيف ممكن يلزق في الخلفية.</li>" : ""}</ul>`;
      st("mihbara-cam", cam);
    };
    body.querySelector("#lk").oninput = e => { cam.key = +e.target.value; render(); };
    body.querySelector("#lf").oninput = e => { cam.fill = +e.target.value; render(); };
    body.querySelector("#lb").oninput = e => { cam.back = +e.target.value; render(); };
    document.fonts && document.fonts.ready.then(render); render();
  }

  // =====================================================================
  // 9) جرافيك الشاشة
  // =====================================================================
  let gx = st("mihbara-gfx") || { t: "lower", name: "د. أحمد سامي", role: "أستاذ الإعلام الرقمي", style: "rose", ticker: "افتتاح مركز الإنتاج الإذاعي والتلفزيوني بكلية الإعلام  ◆  المنتخب يستعد لمباراته المقبلة  ◆  طقس معتدل نهاراً بارد ليلاً", ttl: "إزاي تبقى مذيع في 30 يوم؟", sub: "خطوات عملية من الاستوديو", photo: null };
  const GST = { rose: ["#E11D48", "#9D174D", "#fff"], navy: ["#1E3A8A", "#0B1026", "#fff"], gold: ["#F5B700", "#B45309", "#111"], dark: ["#111827", "#000", "#fff"] };
  function offGraphics(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>جرافيك الشاشة</h2><p class="lead">اعمل اسم الضيف اللي بيظهر تحت الشاشة (Lower third)، وشريط الأخبار، وصورة الغلاف (Thumbnail). الصور بتتحفظ بخلفية شفافة عشان تحطها في المونتاج على طول.</p>
    ${NC.seg("t", [["lower", "اسم الضيف"], ["ticker", "شريط الأخبار"], ["thumb", "صورة الغلاف"]], gx.t)}
    <label>اللون</label>${NC.seg("style", [["rose", "وردي"], ["navy", "كحلي"], ["gold", "دهبي"], ["dark", "أسود"]], gx.style)}
    <div id="gxF"></div><canvas class="nc-cv" id="gxCv" style="background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0 0/20px 20px"></canvas>
    <div class="actions"><button class="btn" type="button" id="gxSave">احفظ PNG</button></div>`;
    box.append(c);
    const cv = c.querySelector("#gxCv"), g = cv.getContext("2d"), F = c.querySelector("#gxF");
    const fields = () => {
      F.innerHTML = gx.t === "lower" ? `<label>اسم الضيف</label><input id="gxN" type="text" value="${E(gx.name)}"><label>صفته</label><input id="gxR" type="text" value="${E(gx.role)}">`
        : gx.t === "ticker" ? `<label>عناوين الشريط (افصل بينها بـ ◆)</label><textarea id="gxTk" style="min-height:80px">${E(gx.ticker)}</textarea>`
          : `<label>العنوان</label><input id="gxT" type="text" value="${E(gx.ttl)}"><label>سطر تحت العنوان</label><input id="gxS" type="text" value="${E(gx.sub)}"><div class="actions"><button class="btn ghost" type="button" id="gxP">${gx.photo ? "غيّر الصورة" : "حط صورة"}</button></div>`;
      const on = (id, k) => { const e = F.querySelector(id); if (e) e.oninput = () => { gx[k] = e.value; save(); draw(); }; };
      on("#gxN", "name"); on("#gxR", "role"); on("#gxTk", "ticker"); on("#gxT", "ttl"); on("#gxS", "sub");
      const p = F.querySelector("#gxP"); if (p) p.onclick = async () => { const f = await NC.pickFile("image/*"); if (!f) return; const im = new Image(); im.onload = () => { photoImg = im; draw(); }; im.src = URL.createObjectURL(f); };
    };
    let photoImg = null;
    const save = () => { const o = Object.assign({}, gx); st("mihbara-gfx", o); };
    const wrap = (t, mw, font) => { g.font = font; const ws = t.split(/\s+/), L = []; let cur = ""; ws.forEach(w => { const x = cur ? cur + " " + w : w; if (g.measureText(x).width > mw && cur) { L.push(cur); cur = w; } else cur = x; }); if (cur) L.push(cur); return L; };
    function draw() {
      const [a1, a2, ink] = GST[gx.style] || GST.rose;
      g.direction = "rtl"; g.textAlign = "right";
      if (gx.t === "lower") { cv.width = 1920; cv.height = 300; g.clearRect(0, 0, 1920, 300);
        g.font = `700 64px ${FD}`; const w1 = Math.max(g.measureText(gx.name).width, 420) + 120; g.font = `500 40px ${FB}`; const w2 = Math.max(g.measureText(gx.role).width + 100, w1 * 0.7);
        const x = 1920 - 120; const gr = g.createLinearGradient(x - w1, 0, x, 0); gr.addColorStop(0, a2); gr.addColorStop(1, a1);
        g.fillStyle = gr; g.fillRect(x - w1, 60, w1, 110); g.fillStyle = "rgba(255,255,255,.95)"; g.fillRect(x - w2, 170, w2, 70); g.fillStyle = a1; g.fillRect(x, 60, 18, 180);
        g.fillStyle = ink; g.font = `700 64px ${FD}`; g.fillText(gx.name, x - 50, 138); g.fillStyle = "#111"; g.font = `500 40px ${FB}`; g.fillText(gx.role, x - 50, 220);
      } else if (gx.t === "ticker") { cv.width = 1920; cv.height = 160; g.clearRect(0, 0, 1920, 160);
        g.fillStyle = "rgba(255,255,255,.96)"; g.fillRect(0, 40, 1920, 90); g.fillStyle = a1; g.fillRect(1920 - 300, 30, 300, 110); g.fillStyle = ink; g.font = `800 52px ${FD}`; g.textAlign = "center"; g.fillText("عاجل", 1920 - 150, 105);
        g.textAlign = "right"; g.fillStyle = "#111"; g.font = `600 44px ${FB}`; g.save(); g.beginPath(); g.rect(0, 40, 1920 - 300, 90); g.clip(); g.fillText(gx.ticker.replace(/\s*◆\s*/g, "   ◆   "), 1920 - 340, 100); g.restore();
        g.fillStyle = a2; g.fillRect(0, 130, 1920, 10);
      } else { cv.width = 1280; cv.height = 720; const gr = g.createLinearGradient(0, 0, 1280, 720); gr.addColorStop(0, a1); gr.addColorStop(1, a2); g.fillStyle = gr; g.fillRect(0, 0, 1280, 720);
        if (photoImg) { const r = Math.max(560 / photoImg.width, 720 / photoImg.height); g.save(); g.beginPath(); g.rect(0, 0, 560, 720); g.clip(); g.drawImage(photoImg, 280 - photoImg.width * r / 2, 360 - photoImg.height * r / 2, photoImg.width * r, photoImg.height * r); g.restore(); const sh = g.createLinearGradient(380, 0, 620, 0); sh.addColorStop(0, "rgba(0,0,0,0)"); sh.addColorStop(1, a1); g.fillStyle = sh; g.fillRect(380, 0, 240, 720); }
        g.fillStyle = ink; const L = wrap(gx.ttl, photoImg ? 620 : 1120, `800 96px ${FD}`); g.font = `800 96px ${FD}`; L.slice(0, 4).forEach((l, i) => g.fillText(l, 1220, 200 + i * 118));
        g.fillStyle = ink === "#111" ? "#111" : "#FDE047"; g.font = `600 44px ${FB}`; g.fillText(gx.sub, 1220, 220 + Math.min(4, L.length) * 118);
        g.fillStyle = "rgba(255,255,255,.9)"; g.font = `700 32px ${FD}`; g.textAlign = "left"; g.fillText("NewsCast 360", 50, 670); }
    }
    NC.bindSeg(c, "t", v => { gx.t = v; save(); fields(); draw(); });
    NC.bindSeg(c, "style", v => { gx.style = v; save(); draw(); });
    c.querySelector("#gxSave").onclick = () => cv.toBlob(async b => { try { const w = await NC.saveBlob(b, "NewsCast360_" + gx.t + "_" + Date.now() + ".png", "image/png"); T("اتحفظت في " + w); } catch (e) { T("مقدرتش أحفظ"); } }, "image/png");
    fields(); (document.fonts ? document.fonts.load(`700 64px ${FD}`, "نيوزكاست").catch(() => 0) : Promise.resolve()).then(draw); draw();
  }

  // =====================================================================
  // 10) وقفة المراسل (Stand-up)
  // =====================================================================
  let su = st("mihbara-standup") || { ev: "افتتاح مركز الإنتاج الإذاعي والتلفزيوني بكلية الإعلام", loc: "أمام مبنى الكلية", name: "", len: 20, script: "" };
  function offStandup(box) {
    const c = NC.html("div", "slip");
    c.innerHTML = `<h2>وقفة المراسل</h2><p class="lead">اتمرّن على الظهور من مكان الحدث: اكتب أو ولّد نص الوقفة، وصوّر نفسك بالكاميرا الأمامية مع عدّاد الوقت، وخد تقييم.</p>
    <label>الحدث</label><input id="suEv" type="text" value="${E(su.ev)}"><div class="row"><div><label>المكان</label><input id="suLoc" type="text" value="${E(su.loc)}"></div><div><label>اسمك</label><input id="suN" type="text" value="${E(su.name)}" placeholder="اسم المراسل"></div></div>
    <label>مدة الوقفة</label>${NC.seg("len", [["15", "15 ث"], ["20", "20 ث"], ["30", "30 ث"]], String(su.len))}
    <div class="actions"><button class="btn ghost" type="button" id="suGen">اكتبلي نص الوقفة</button></div>
    <label>نص الوقفة</label><textarea id="suS" style="min-height:110px" placeholder="اكتب نصك أو دوس «اكتبلي»…"></textarea><p class="nc-mini" id="suW"></p>
    <div class="actions"><button class="btn" type="button" id="suGo">ابدأ التصوير</button></div><div id="suStage"></div>`;
    box.append(c);
    const ta = c.querySelector("#suS"); ta.value = su.script;
    const upd = () => { su.ev = c.querySelector("#suEv").value; su.loc = c.querySelector("#suLoc").value; su.name = c.querySelector("#suN").value; su.script = ta.value; st("mihbara-standup", su); const n = words(ta.value).length; c.querySelector("#suW").textContent = n ? `${N(n)} كلمة ≈ ${N(Math.round(n / 2.1))} ثانية` : ""; };
    $$(c, "input,textarea").forEach(e => e.addEventListener("input", upd)); upd();
    NC.bindSeg(c, "len", v => { su.len = +v; upd(); });
    c.querySelector("#suGen").onclick = async e => { e.target.disabled = true; try { const t = await NC.ai(`اكتب نص وقفة مراسل تلفزيوني (Stand-up) مدتها ${su.len} ثانية تقريباً (حوالي ${Math.round(su.len * 2.1)} كلمة) عن: ${su.ev}، والمراسل واقف ${su.loc}. بالعربية الفصحى المبسطة، جمل قصيرة، يذكر المكان ويضيف معلومة يشوفها المشاهد، وينتهي بالتوقيع: «${su.name || "فلان"}، NewsCast 360، ${su.loc}». اكتب النص فقط.`);
      ta.value = NC.plain(t); upd(); } catch (er) { T("مقدرتش أكتب دلوقتي"); } e.target.disabled = false; };
    c.querySelector("#suGo").onclick = () => { if (words(ta.value).length < 10) { T("اكتب نص الوقفة الأول"); return; } shoot(c.querySelector("#suStage")); };
  }
  async function shoot(stage) {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true }); } catch (e) { T((e && e.name === "NotAllowedError") ? "اسمح للتطبيق بالكاميرا والميكروفون" : "مقدرتش أفتح الكاميرا"); return; }
    stage.innerHTML = `<div class="nc-stage" style="min-height:0"><video playsinline muted autoplay style="width:100%;display:block;transform:scaleX(-1)"></video><div id="suCD" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:90px;font-weight:800;color:#fff;text-shadow:0 4px 20px #000"></div>
    <div style="position:absolute;top:10px;right:12px" class="chip live" id="suLive">جاهز</div><div id="suT" style="position:absolute;top:10px;left:12px;font-size:22px;font-weight:700;color:#fff;text-shadow:0 2px 8px #000">0:00</div>
    <div id="suP" style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.6);color:#fff;font-size:18px;line-height:1.7;padding:8px 12px;max-height:40%;overflow:hidden"></div></div>
    <div class="actions"><button class="btn" type="button" id="suStop" disabled>خلصت</button><button class="btn ghost" type="button" id="suX">إلغاء</button></div>`;
    const v = stage.querySelector("video"); v.srcObject = stream; stage.querySelector("#suP").textContent = su.script;
    const types = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"], mime = window.MediaRecorder ? (types.find(t => MediaRecorder.isTypeSupported(t)) || "") : "";
    let rec = null, parts = [], t0 = 0, raf = 0, done = false;
    const end = () => { done = true; cancelAnimationFrame(raf); try { rec && rec.state !== "inactive" && rec.stop(); } catch (e) { } stream.getTracks().forEach(t => t.stop()); };
    NC.onLeave(end);
    stage.querySelector("#suX").onclick = () => { end(); stage.innerHTML = ""; };
    const cd = stage.querySelector("#suCD");
    for (const n of ["3", "2", "1"]) { if (done) return; cd.textContent = n; await new Promise(r => setTimeout(r, 900)); }
    cd.textContent = ""; stage.querySelector("#suLive").textContent = "● REC";
    if (mime) { rec = new MediaRecorder(stream, { mimeType: mime }); rec.ondataavailable = e => e.data.size && parts.push(e.data); rec.start(500); }
    t0 = performance.now(); const sb = stage.querySelector("#suStop"); sb.disabled = false;
    const tick = () => { const t = (performance.now() - t0) / 1000; stage.querySelector("#suT").textContent = fmtT(t); stage.querySelector("#suT").style.color = t > su.len + 3 ? "#fca5a5" : "#fff"; raf = requestAnimationFrame(tick); }; tick();
    sb.onclick = async () => {
      const dur = (performance.now() - t0) / 1000; sb.disabled = true;
      const blob = await new Promise(res => { if (!rec) return res(null); rec.onstop = () => res(new Blob(parts, { type: mime.split(";")[0] })); end(); });
      if (!rec) end();
      let a = null; if (blob) { try { a = NC.analyze(await NC.decode(blob), su.script); } catch (e) { } }
      evalStandup(stage, dur, a, blob);
    };
  }
  function evalStandup(stage, dur, a, blob) {
    const Qs = ["بصّيت في الكاميرا (العدسة) مش في الشاشة؟", "المكان باين ورايا ومرتبط بالخبر؟", "قلت توقيعي في الآخر صح؟", "حركة إيدي وجسمي طبيعية ومش متوترة؟"];
    stage.innerHTML = `<div class="nc-card"><h4>قيّم وقفتك</h4><div id="suQ"></div><div class="actions"><button class="btn" type="button" id="suSc">طلّع الدرجة</button>${blob ? '<button class="btn ghost" type="button" id="suSv">احفظ الفيديو</button>' : ""}</div><div id="suR"></div></div>`;
    const ans = {}; Qs.forEach((q, i) => { const d = NC.html("div", "nc-row"); d.innerHTML = `<span style="flex:1">${E(q)}</span>${NC.seg("s" + i, [["1", "أيوه"], ["0", "لأ"]], "")}`; stage.querySelector("#suQ").append(d); NC.bindSeg(d, "s" + i, v => ans[i] = +v); });
    if (blob) stage.querySelector("#suSv").onclick = async () => { try { const w = await NC.saveBlob(blob, "NewsCast360_standup_" + Date.now() + "." + (blob.type.indexOf("mp4") >= 0 ? "mp4" : "webm"), blob.type); T("اتحفظ في " + w); } catch (e) { T("مقدرتش أحفظ"); } };
    stage.querySelector("#suSc").onclick = () => {
      if (Object.keys(ans).length < Qs.length) { T("جاوب على كل الأسئلة"); return; }
      const fb = []; let sc = 0; const diff = Math.abs(dur - su.len);
      const pt = Math.max(0, 30 - Math.max(0, diff - 3) * 3); sc += pt; fb.push(diff <= 3 ? "التزمت بمدة الوقفة ✓" : dur > su.len ? `طولت ${N(Math.round(diff))} ثانية. الوقفة لازم تكون مركّزة.` : `خلصت أسرع بـ ${N(Math.round(diff))} ثانية. ممكن تكون بتجري في الكلام.`);
      if (a) { const pf = Math.max(0, 30 - a.fillers * 6 - Math.max(0, a.longPauses - 1) * 5); sc += pf; fb.push(a.fillers ? `فيه تردد تقريباً ${N(a.fillers)} مرة.` : "كلامك ماشي بطلاقة ✓"); if (a.levelDb < -32) fb.push("صوتك واطي — في الشارع لازم تعلّي صوتك أكتر."); }
      else sc += 20;
      sc += Qs.reduce((s, q, i) => s + ans[i] * 10, 0);
      if (!ans[0]) fb.push("بص في العدسة نفسها، مش في صورتك على الشاشة."); if (!ans[2]) fb.push("التوقيع (الاسم، القناة، المكان) جزء أساسي من الوقفة.");
      sc = Math.round(Math.min(100, sc));
      stage.querySelector("#suR").innerHTML = `<div class="nc-score"><div class="ring" style="--p:${sc}"><b>${N(sc)}</b></div><p class="nc-mini">المدة ${fmtT(dur)} من ${fmtT(su.len)}</p></div><ul class="tips">${fb.map(x => `<li>${E(x)}</li>`).join("")}</ul>`;
      NC.saveTool("standup", "وقفة المراسل — " + sc + "/100", `### وقفة المراسل\n${su.ev}\n\nالدرجة: ${sc}/100\n\n### النص\n${su.script}\n\n### ملاحظات\n${fb.map(x => "- " + x).join("\n")}`);
    };
  }

  // =====================================================================
  // 11) جدول النشرة (Rundown)
  // =====================================================================
  const TYPES = ["مقدمة", "خبر مقروء", "تقرير مصوّر", "خبر بفويس أوفر", "ضيف / حوار", "مراسل على الهوا", "فاصل", "الطقس", "رياضة", "ختام"];
  let rd = st("mihbara-rundown") || { title: "نشرة الساعة التاسعة", start: "21:00", target: 300, items: [
    { t: "مقدمة", n: "التحية والعناوين", d: 30, s: "مساء الخير، وأهلاً بكم في نشرة الأخبار." },
    { t: "خبر مقروء", n: "افتتاح مركز الإنتاج", d: 45, s: "افتتحت كلية الإعلام مركزاً جديداً للإنتاج الإذاعي والتلفزيوني." },
    { t: "تقرير مصوّر", n: "تقرير: جولة في المركز", d: 120, s: "" },
    { t: "رياضة", n: "استعدادات المنتخب", d: 40, s: "يستعد المنتخب الوطني لمباراته المقبلة." },
    { t: "الطقس", n: "حالة الطقس", d: 30, s: "تتوقع هيئة الأرصاد طقساً معتدلاً نهاراً." },
    { t: "ختام", n: "الختام", d: 15, s: "كانت هذه أبرز الأخبار، شكراً لمتابعتكم." }] };
  const saveR = () => st("mihbara-rundown", rd);
  const mmss = s => fmtT(s), parse = v => { const m = String(v).match(/(\d+)\s*[:.]\s*(\d+)/); return m ? +m[1] * 60 + +m[2] : Math.max(0, parseInt(v) || 0); };
  function offRundown(box) {
    const c = NC.html("div", "slip");
    const tot = rd.items.reduce((a, x) => a + (+x.d || 0), 0), diff = tot - rd.target;
    let clock = (() => { const [h, m] = (rd.start || "21:00").split(":").map(Number); return (h || 0) * 3600 + (m || 0) * 60; })();
    const at = s => { const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, ss = s % 60; return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(ss).padStart(2, "0"); };
    c.innerHTML = `<h2>جدول النشرة (Rundown)</h2><p class="lead">رتّب فقرات النشرة بالدقيقة، وشوف هتبدأ كل فقرة إمتى، وابعت النص كله للتلقين بضغطة.</p>
    <div class="row"><div><label>اسم النشرة</label><input id="rdT" type="text" value="${E(rd.title)}"></div><div><label>تبدأ الساعة</label><input id="rdS" type="time" value="${E(rd.start)}"></div><div><label>المدة المطلوبة</label><input id="rdG" type="text" value="${mmss(rd.target)}" inputmode="numeric"></div></div>
    <div class="nc-kpis"><div class="nc-kpi"><b>${N(rd.items.length)}</b><span>فقرة</span></div><div class="nc-kpi"><b>${mmss(tot)}</b><span>المدة الكلية</span></div><div class="nc-kpi ${Math.abs(diff) <= 10 ? "good" : "bad"}"><b>${diff > 0 ? "+" : diff < 0 ? "−" : ""}${mmss(Math.abs(diff))}</b><span>${diff > 10 ? "زيادة — احذف أو اختصر" : diff < -10 ? "ناقص — زوّد مادة" : "مظبوط ✓"}</span></div></div>
    <div class="nc-list" id="rdL"></div>
    <div class="actions"><button class="btn ghost" type="button" id="rdAdd">+ فقرة</button><button class="btn" type="button" id="rdP">ابعت للتلقين</button><button class="btn ghost" type="button" id="rdSh">شارك الجدول</button></div>`;
    box.append(c);
    const L = c.querySelector("#rdL");
    rd.items.forEach((it, i) => { const start = clock; clock += +it.d || 0;
      const d = NC.html("div", "nc-card"); d.style.margin = "0";
      d.innerHTML = `<div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><b style="font-family:var(--display)">${N(i + 1)}. <span class="nc-mini">${at(start)}</span></b><span><button class="mg-x" type="button" data-a="up" aria-label="لفوق">▲</button><button class="mg-x" type="button" data-a="dn" aria-label="لتحت">▼</button><button class="mg-x" type="button" data-a="rm" aria-label="حذف">✕</button></span></div>
      <div class="row"><div><select data-k="t">${TYPES.map(x => `<option${x === it.t ? " selected" : ""}>${x}</option>`).join("")}</select></div><div><input data-k="d" type="text" inputmode="numeric" value="${mmss(it.d)}" aria-label="المدة"></div></div>
      <input data-k="n" type="text" value="${E(it.n)}" placeholder="اسم الفقرة"><textarea data-k="s" style="min-height:60px;margin-top:6px" placeholder="نص المذيع (اختياري)">${E(it.s || "")}</textarea>`;
      d.querySelectorAll("[data-k]").forEach(e => e.onchange = () => { const k = e.dataset.k; it[k] = k === "d" ? parse(e.value) : e.value; saveR(); renderOff("rundown"); });
      d.querySelector('[data-a="up"]').onclick = () => { if (i) { rd.items.splice(i - 1, 0, rd.items.splice(i, 1)[0]); saveR(); renderOff("rundown"); } };
      d.querySelector('[data-a="dn"]').onclick = () => { if (i < rd.items.length - 1) { rd.items.splice(i + 1, 0, rd.items.splice(i, 1)[0]); saveR(); renderOff("rundown"); } };
      d.querySelector('[data-a="rm"]').onclick = () => { rd.items.splice(i, 1); saveR(); renderOff("rundown"); };
      L.append(d); });
    c.querySelector("#rdT").onchange = e => { rd.title = e.target.value; saveR(); };
    c.querySelector("#rdS").onchange = e => { rd.start = e.target.value; saveR(); renderOff("rundown"); };
    c.querySelector("#rdG").onchange = e => { rd.target = parse(e.target.value); saveR(); renderOff("rundown"); };
    c.querySelector("#rdAdd").onclick = () => { rd.items.push({ t: "خبر مقروء", n: "", d: 30, s: "" }); saveR(); renderOff("rundown"); };
    const asText = () => `${rd.title} — يبدأ ${rd.start}\n` + rd.items.map((it, i) => `${i + 1}. [${mmss(it.d)}] ${it.t}: ${it.n}`).join("\n") + `\nالمدة الكلية: ${mmss(tot)}`;
    c.querySelector("#rdSh").onclick = () => shareText(asText(), rd.title);
    c.querySelector("#rdP").onclick = () => { const s = rd.items.map(it => (it.s || "").trim()).filter(Boolean).join("\n\n"); if (!s) { T("مفيش نصوص في الفقرات"); return; } store.set("mihbara-prompter", s); NC.saveTool("rundown", rd.title, asText()); T("اتبعت للتلقين ✓"); open("prompter"); };
  }

  // ---------- التسجيل ----------
  NC.register({ key: "transcribe", name: "تفريغ المقابلات", desc: "من ملف صوت لنص مكتوب بالتوقيت، مع أقوى الجمل (ساوند بايت)", tint: "#0ca678", render: offTranscribe,
    icon: '<path d="M4 4h10l6 6v10a0 0 0 0 1 0 0H4z"/><path d="M14 4v6h6"/><path d="M8 14h8M8 17h5"/>' });
  NC.register({ key: "audioedit", name: "محرر صوت بسيط", desc: "قص، وFade، وموسيقى خلفية بتوطى لوحدها وقت الكلام", tint: "#7048e8", render: offAudioEdit, offline: true,
    icon: '<path d="M6 4v16M18 4v16"/><path d="M3 9h6M15 14h6"/><path d="M10 12h4"/>' });
  NC.register({ key: "jingles", name: "مكتبة الفواصل والجينجلز", desc: "مؤثرات وموسيقى للنشرات والبرامج، حقوقها مسموحة", tint: "#f76707", render: offJingles, offline: true,
    icon: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>' });
  NC.register({ key: "camera", name: "محاكي الكاميرا والإضاءة", desc: "ISO وفتحة العدسة والشتر، ومخطط الإضاءة الثلاثية", tint: "#1c7ed6", render: offCamera, offline: true,
    icon: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>' });
  NC.register({ key: "graphics", name: "جرافيك الشاشة", desc: "اسم الضيف تحت الشاشة، وشريط الأخبار، وصورة الغلاف", tint: "#e64980", render: offGraphics, offline: true,
    icon: '<rect x="2" y="4" width="20" height="14" rx="2"/><path d="M5 14h9M5 11h6"/><path d="M8 21h8"/>' });
  NC.register({ key: "standup", name: "وقفة المراسل", desc: "اتمرّن على الظهور من مكان الحدث بالكاميرا، وخد تقييم", tint: "#2b8a3e", render: offStandup,
    icon: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M8 22l4-7 4 7M8 11l4 1 3-3"/><path d="M17 9h3v3"/>' });
  NC.register({ key: "rundown", name: "جدول النشرة", desc: "رتّب الفقرات بالدقيقة وابعتها للتلقين بضغطة", tint: "#495057", render: offRundown, offline: true,
    icon: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>' });
  NC.group("الصوت والصورة", "أدوات الإنتاج: صوت، وكاميرا، وجرافيك، وجدول النشرة", ["transcribe", "audioedit", "jingles", "camera", "graphics", "standup", "rundown"], true);
})();
