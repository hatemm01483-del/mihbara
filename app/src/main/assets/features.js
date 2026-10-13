/* مِحبرة — غرفة الأخبار: الاهتمامات، التقرير الصباحي، مدرب الإلقاء، لوحات المؤسسات */
(function () {
  "use strict";
  // ---------- شبكة (مشتركة مع verify.js) ----------
  var NET2 = {}, prevNet = window.__net;
  window.__net = function (id, ok, b64) {
    var w = NET2[id];
    if (!w) { if (prevNet) prevNet(id, ok, b64); return; }
    delete NET2[id];
    if (!ok) { w.rej({ code: "net" }); return; }
    try { var bin = atob(b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); w.res(new TextDecoder("utf-8").decode(u)); } catch (e) { w.rej({ code: "net" }); }
  };
  function netGet(url) {
    return new Promise(function (res, rej) {
      if (window.MihbaraNet && window.MihbaraNet.get) {
        var id = "f" + Date.now() + Math.random().toString(36).slice(2, 8);
        NET2[id] = { res: res, rej: rej };
        setTimeout(function () { if (NET2[id]) { delete NET2[id]; rej({ code: "net_timeout" }); } }, 15000);
        window.MihbaraNet.get(url, id);
      } else fetch(url).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(res, function () { rej({ code: "no_bridge" }); });
    });
  }
  var G = "hl=ar&gl=EG&ceid=EG:ar";
  function gSearch(q) { return "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&" + G; }
  function gTopic(t) { return "https://news.google.com/rss/headlines/section/topic/" + t + "?" + G; }
  function parseRSS(xml) {
    var doc = new DOMParser().parseFromString(xml, "text/xml");
    return Array.prototype.map.call(doc.querySelectorAll("item"), function (it) {
      var src = it.querySelector("source"), title = (it.querySelector("title") || {}).textContent || "", sname = src ? src.textContent : "";
      if (sname && title.endsWith(" - " + sname)) title = title.slice(0, -(sname.length + 3));
      return { title: title.trim(), source: sname, sourceUrl: src ? src.getAttribute("url") : "", link: (it.querySelector("link") || {}).textContent || "", date: new Date((it.querySelector("pubDate") || {}).textContent || "") };
    }).filter(function (x) { return x.title && !isNaN(x.date); });
  }
  // ---------- أدوات مساعدة ----------
  function E(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function U(u) { return /^https:\/\//i.test(String(u || "")) ? E(u) : "#"; }
  function N(x) { return Number(x).toLocaleString("ar-EG"); }
  function fTime(d) { return d.toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }); }
  function fDay(d) { return d.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function fShort(d) { return d.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short" }); }
  function cairoHour(d) { return Number(d.toLocaleString("en-US", { timeZone: "Africa/Cairo", hour: "numeric", hour12: false })) % 24; }
  function ago(d) { var m = Math.round((Date.now() - d) / 60000); if (m < 1) return "دلوقتي"; if (m < 60) return "من " + N(m) + " د"; var h = Math.round(m / 60); if (h < 24) return "من " + N(h) + " س"; return "من " + N(Math.round(h / 24)) + " يوم"; }
  function st(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function nrm(t) { return String(t || "").replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^؀-ۿa-zA-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
  function similar(a, b) { var A = nrm(a).split(" ").filter(function (w) { return w.length > 2; }), B = new Set(nrm(b).split(" ").filter(function (w) { return w.length > 2; })); if (!A.length) return 0; var h = A.filter(function (w) { return B.has(w); }).length; return h / Math.min(A.length, B.size || 1); }
  function dedupe(items) { var out = []; items.forEach(function (it) { if (!out.some(function (o) { return similar(o.title, it.title) > 0.6; })) out.push(it); }); return out; }
  var MAJORS = ["mena.org.eg", "ahram.org.eg", "youm7.com", "almasryalyoum.com", "shorouknews.com", "masrawy.com", "elwatannews.com", "akhbarelyom.com", "alarabiya.net", "alhadath.net", "skynewsarabia.com", "bbc.com", "reuters.com", "aljazeera.net", "cnn.com", "france24.com", "independentarabia.com", "aawsat.com", "elbalad.news", "cairo24.com", "alqaheranews.net", "yallakora.com", "filgoal.com"];
  function hostOf(u) { try { return new URL(u).hostname.replace(/^(www|m)\./, "").toLowerCase(); } catch (e) { return ""; } }
  function tier(u) { var h = hostOf(u); if (/\.gov\.eg$|presidency\.eg$/.test(h)) return 3; return MAJORS.some(function (d) { return h === d || h.endsWith("." + d); }) ? 2 : 1; }
  function toastF(m) { try { toast(m); } catch (e) { } }

  // ---------- الاهتمامات ----------
  var INTERESTS = [
    { k: "egypt", name: "أخبار مصر", src: gTopic("NATION") },
    { k: "politics", name: "سياسة", src: gSearch("(الرئيس OR مجلس الوزراء OR البرلمان OR وزير الخارجية OR مجلس النواب) when:1d") },
    { k: "world", name: "أخبار دولية", src: gTopic("WORLD") },
    { k: "economy", name: "اقتصاد", src: gTopic("BUSINESS") },
    { k: "sports", name: "رياضة", src: gTopic("SPORTS") },
    { k: "art", name: "فن وثقافة", src: gTopic("ENTERTAINMENT") },
    { k: "tech", name: "تكنولوجيا", src: gTopic("TECHNOLOGY") },
    { k: "health", name: "صحة", src: gTopic("HEALTH") },
    { k: "science", name: "علوم", src: gTopic("SCIENCE") },
    { k: "education", name: "تعليم وجامعات", src: gSearch("(وزارة التربية والتعليم OR الجامعات OR الثانوية العامة OR التعليم العالي) when:1d") },
    { k: "accidents", name: "حوادث وقضايا", src: gSearch("(حادث OR النيابة العامة OR القبض على OR محكمة) when:1d") }
  ];
  function myInterests() { var v = st("mihbara-interests"); return Array.isArray(v) && v.length ? v : null; }
  function showInterests(onDone) {
    var cur = myInterests() || ["egypt", "politics", "sports"];
    var sh = document.createElement("div"); sh.className = "sheet nf-sheet"; sh.id = "interestsSheet";
    sh.innerHTML = "<div class='panel'><h2>إيه الأخبار اللي تهمك؟</h2><p class='small'>اختار اهتماماتك، وهنجهّزلك التقرير الصباحي على أساسها. تقدر تغيّرها في أي وقت.</p><div class='nf-chips' id='nfChips'></div><div class='actions'><button class='btn' type='button' id='nfSave'>حفظ</button><button class='btn ghost' type='button' id='nfSkip'>بعدين</button></div></div>";
    document.body.append(sh);
    var box = sh.querySelector("#nfChips");
    INTERESTS.forEach(function (it) { var b = document.createElement("button"); b.type = "button"; b.className = "nf-chip"; b.textContent = it.name; b.setAttribute("aria-pressed", String(cur.indexOf(it.k) >= 0)); b.onclick = function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); }; b.dataset.k = it.k; box.append(b); });
    function close(save) { if (save) { var sel = Array.prototype.filter.call(box.children, function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.dataset.k; }); if (!sel.length) { toastF("اختار اهتمام واحد على الأقل"); return; } st("mihbara-interests", sel); st("mihbara-brief", null); toastF("اهتماماتك اتحفظت ✓"); } else if (!myInterests()) st("mihbara-interests", cur); sh.remove(); if (onDone) onDone(); }
    sh.querySelector("#nfSave").onclick = function () { close(true); };
    sh.querySelector("#nfSkip").onclick = function () { close(false); };
  }

  // ---------- التقرير الصباحي ----------
  async function buildBrief(force) {
    var cached = st("mihbara-brief");
    if (!force && cached && Date.now() - cached.at < 30 * 60000) return cached;
    var ints = (myInterests() || ["egypt", "politics", "sports"]).map(function (k) { return INTERESTS.find(function (i) { return i.k === k; }); }).filter(Boolean);
    var reqs = [{ k: "top", name: "أهم العناوين", src: "https://news.google.com/rss?" + G }].concat(ints);
    var res = await Promise.allSettled(reqs.map(function (r) { return netGet(r.src); }));
    if (!res.some(function (r) { return r.status === "fulfilled"; })) throw (res[0] && res[0].reason) || { code: "net" };
    var used = [], sections = [];
    reqs.forEach(function (r, i) {
      if (res[i].status !== "fulfilled") return;
      var items = parseRSS(res[i].value).filter(function (x) { return Date.now() - x.date < 26 * 3600000; });
      if (items.length < 3) items = parseRSS(res[i].value).filter(function (x) { return Date.now() - x.date < 50 * 3600000; });
      items.sort(function (a, b) { return (tier(b.sourceUrl) - tier(a.sourceUrl)) || (b.date - a.date); });
      items = dedupe(items).filter(function (x) { return !used.some(function (u) { return similar(u, x.title) > 0.6; }); }).slice(0, r.k === "top" ? 6 : 5);
      items.sort(function (a, b) { return b.date - a.date; });
      items.forEach(function (x) { used.push(x.title); });
      if (items.length) sections.push({ k: r.k, name: r.name, items: items.map(function (x) { return { t: x.title, s: x.source, u: x.link, d: +x.date, tr: tier(x.sourceUrl) }; }) });
    });
    var brief = { at: Date.now(), sections: sections };
    st("mihbara-brief", brief);
    return brief;
  }
  function briefText(b) {
    var t = "التقرير الصباحي — " + fDay(new Date(b.at)) + "\nجاهز لاجتماع التحرير (آخر تحديث " + fTime(new Date(b.at)) + ")\n";
    b.sections.forEach(function (s) { t += "\n■ " + s.name + "\n"; s.items.forEach(function (x, i) { t += (i + 1) + ". " + x.t + "\n   المصدر: " + x.s + " — " + fTime(new Date(x.d)) + "\n   " + x.u + "\n"; }); });
    return t;
  }
  function briefMd(b) {
    var t = "### التقرير الصباحي — " + fDay(new Date(b.at)) + "\n";
    b.sections.forEach(function (s) { t += "\n### " + s.name + "\n" + s.items.map(function (x) { return "- [" + x.t.replace(/[\[\]]/g, "") + "](" + x.u + ") — **" + x.s + "** " + fTime(new Date(x.d)); }).join("\n") + "\n"; });
    return t;
  }
  function renderBrief(box) {
    box.innerHTML = "<div class='slip nf-brief-head'><div><h2>التقرير الصباحي</h2><p class='lead' id='nfBriefDate'>" + E(fDay(new Date())) + "</p></div><div class='headbtns'><button class='btn mini' type='button' id='nfRefresh'>حدّث التقرير</button><button class='btn ghost mini' type='button' id='nfInts'>اهتماماتي</button></div></div><div id='nfBriefBody'></div>";
    var body = box.querySelector("#nfBriefBody");
    box.querySelector("#nfInts").onclick = function () { showInterests(function () { load(true); }); };
    box.querySelector("#nfRefresh").onclick = function () { load(true); };
    async function load(force) {
      body.innerHTML = "<div class='proof'><div class='livesearch'><i></i><span>بيجمّع أهم الأخبار من المصادر…</span></div>" + SKEL + "</div>";
      try {
        var b = await buildBrief(force);
        var h = "<div class='proof'><div class='nf-meta-row'><span class='chip live'>جاهز لاجتماع التحرير</span><span class='small'>آخر تحديث " + E(fTime(new Date(b.at))) + " · " + N(b.sections.reduce(function (a, s) { return a + s.items.length; }, 0)) + " خبر</span></div>";
        b.sections.forEach(function (s) {
          h += "<h3 class='nf-sec'>" + E(s.name) + "</h3><ol class='nf-list'>";
          s.items.forEach(function (x) { h += "<li><a href='" + U(x.u) + "' target='_blank' rel='noopener'>" + E(x.t) + "</a><div class='nf-src'><b>" + E(x.s) + "</b>" + (x.tr >= 2 ? "<em class='nf-tag'>موثوق</em>" : "") + "<span>" + E(fTime(new Date(x.d))) + " · " + E(ago(new Date(x.d))) + "</span></div></li>"; });
          h += "</ol>";
        });
        if (!b.sections.length) h += "<p>مالقيتش أخبار جديدة دلوقتي. جرّب تحدّث بعد شوية.</p>";
        h += "<div class='actions'><button class='btn' type='button' id='nfShare'>مشاركة التقرير</button><button class='btn ghost' type='button' id='nfCopy'>نسخ</button><button class='btn ghost' type='button' id='nfSaveH'>حفظ في السجل</button></div><p class='nv-note small'>الأخبار مجمّعة من المواقع الإخبارية عن طريق أخبار جوجل، والمواعيد بتوقيت القاهرة. افتح الخبر قبل ما تعتمد عليه.</p></div>";
        body.innerHTML = h;
        body.querySelector("#nfShare").onclick = function () { try { shareText(briefText(b)); } catch (e) { } };
        body.querySelector("#nfCopy").onclick = function () { try { copyText(briefText(b)); } catch (e) { } };
        body.querySelector("#nfSaveH").onclick = function () { try { addHistory("brief", "التقرير الصباحي — " + fShort(new Date(b.at)), briefMd(b)); toastF("اتحفظ في السجل ✓"); } catch (e) { } };
      } catch (err) {
        body.innerHTML = "<div class='proof'><p>" + (err && err.code === "no_bridge" ? "التقرير الصباحي بيشتغل جوه تطبيق الموبايل." : "مقدرتش أوصل للأخبار. اتأكد إن النت شغال وجرّب تاني.") + "</p></div>";
      }
    }
    load(false);
  }

  // ---------- مدرب الإلقاء ----------
  var ILL = {
    frameOk: "<svg viewBox='0 0 160 100' class='nf-ill' role='img' aria-label='الكادر الصحيح'><rect x='4' y='4' width='152' height='92' rx='6' class='nf-frame'/><path d='M57 4V96M103 4V96M4 35H156M4 65H156' class='nf-grid'/><circle cx='80' cy='38' r='13' class='nf-fig'/><path d='M50 96c2-22 14-32 30-32s28 10 30 32' class='nf-fig'/><circle cx='75' cy='36' r='1.6' class='nf-eye'/><circle cx='85' cy='36' r='1.6' class='nf-eye'/><path d='M140 12l4 4 8-8' class='nf-ok'/></svg>",
    frameBad: "<svg viewBox='0 0 160 100' class='nf-ill' role='img' aria-label='كادر غلط'><rect x='4' y='4' width='152' height='92' rx='6' class='nf-frame'/><path d='M57 4V96M103 4V96M4 35H156M4 65H156' class='nf-grid'/><circle cx='118' cy='68' r='13' class='nf-fig'/><path d='M92 110c2-16 12-24 26-24s24 8 26 24' class='nf-fig'/><path d='M141 9l10 10M151 9l-10 10' class='nf-bad'/></svg>",
    eyes: "<svg viewBox='0 0 160 100' class='nf-ill' role='img' aria-label='النظر للعدسة'><rect x='104' y='34' width='44' height='30' rx='5' class='nf-frame'/><circle cx='126' cy='49' r='9' class='nf-lens'/><circle cx='42' cy='46' r='16' class='nf-fig'/><path d='M14 96c2-22 12-30 28-30s26 8 28 30' class='nf-fig'/><circle cx='48' cy='44' r='1.8' class='nf-eye'/><path d='M60 44H112' class='nf-ray'/></svg>",
    posture: "<svg viewBox='0 0 160 100' class='nf-ill' role='img' aria-label='الجلسة الصحيحة'><path d='M40 92H120' class='nf-grid'/><circle cx='80' cy='22' r='11' class='nf-fig'/><path d='M80 33V66M60 44H100M80 66L70 92M80 66L90 92' class='nf-line'/><path d='M60 44l-6 14M100 44l6 14' class='nf-line'/><path d='M136 14l4 4 8-8' class='nf-ok'/></svg>",
    hands: "<svg viewBox='0 0 160 100' class='nf-ill' role='img' aria-label='حركة الإيدين'><circle cx='80' cy='22' r='11' class='nf-fig'/><path d='M50 96c2-26 12-40 30-40s28 14 30 40' class='nf-fig'/><path d='M60 70c6-4 14-4 20 0M100 70c-6-4-14-4-20 0' class='nf-line'/><rect x='46' y='60' width='68' height='22' rx='4' class='nf-zone'/></svg>"
  };
  var TWISTERS = ["خيط حرير على حيط خليل.", "ضابطٌ ظريفٌ ضاعَ ظلُّه في الضباب.", "قال القاضي: القضية قديمة، والقرار قريب.", "ثلاثة ذئاب ذهبت ثم ثارت في الثلج.", "صوت الصحفي الصادق يصل أسرع من الصدى.", "طار الطائر الطويل فوق الطريق الطيني."];
  var PACE_TEXT = "مساء الخير، وأهلاً بكم في نشرة مِحبرة نيوز. نبدأ بأبرز الأخبار. افتتحت كلية الإعلام معملاً جديداً للصحافة الرقمية، يضم أربعين جهاز كمبيوتر واستوديو للبودكاست. ويخدم المعمل ألفاً ومئتي طالب سنوياً. وفي الرياضة، يستعد المنتخب لمباراته المقبلة وسط تفاؤل جماهيري كبير. كانت هذه أبرز الأخبار، شكراً لمتابعتكم.";
  function renderCoach(box) {
    var tabs = [["cam", "الكاميرا والوقفة"], ["voice", "الصوت والنطق"], ["pace", "القراءة بانتظام"]], cur = "cam";
    box.innerHTML = "<div class='slip'><h2>مدرب الإلقاء</h2><p class='lead'>اتعلّم إزاي تقف أو تقعد قدام الكاميرا، وتظبط صوتك، وتقرا بإيقاع منتظم زي المذيعين.</p><div class='seg2' id='nfTabs'></div></div><div id='nfCoachBody'></div>";
    var tb = box.querySelector("#nfTabs"), body = box.querySelector("#nfCoachBody");
    function drawTabs() { tb.innerHTML = ""; tabs.forEach(function (t) { var b = document.createElement("button"); b.type = "button"; b.textContent = t[1]; b.setAttribute("aria-pressed", String(t[0] === cur)); b.onclick = function () { stopAll(); cur = t[0]; drawTabs(); draw(); }; tb.append(b); }); }
    var timers = [];
    function stopAll() { timers.forEach(clearInterval); timers = []; }
    function card(ill, title, pts, ok) { return "<div class='nf-card'>" + ill + "<div><b class='" + (ok === false ? "nf-badt" : "nf-okt") + "'>" + E(title) + "</b><ul>" + pts.map(function (p) { return "<li>" + E(p) + "</li>"; }).join("") + "</ul></div></div>"; }
    function draw() {
      if (cur === "cam") {
        body.innerHTML = "<div class='nf-cards'>" +
          card(ILL.frameOk, "الكادر الصح ✓", ["عينيك على الخط الأفقي اللي فوق (قاعدة الأتلات).", "مسافة صغيرة فوق راسك، مش كبيرة ومش معدومة.", "الكاميرا في مستوى عينيك بالظبط، مش من تحت ولا من فوق."]) +
          card(ILL.frameBad, "الكادر الغلط ✗", ["راسك مقطوع أو في طرف الصورة.", "فراغ كبير فوقك يخلّيك تبان صغير.", "الكاميرا مايلة أو بتصوّرك من تحت."], false) +
          card(ILL.eyes, "بص للعدسة، مش للشاشة", ["العدسة هي عين المشاهد؛ لما تبصلها هو يحس إنك بتكلمه.", "لو بتقرا من التلقين، خلّي الموبايل جنب العدسة أو تحتها مباشرة.", "ارمش طبيعي، وماتثبتش عينك بشكل جامد."]) +
          card(ILL.posture, "الوقفة أو القعدة", ["ضهرك مفرود وكتافك مرتاحة لتحت.", "لو قاعد: اقعد على أول الكرسي ومتسندش لورا.", "ثبّت جسمك، وماتتمرجحش يمين وشمال."]) +
          card(ILL.hands, "الإيدين", ["خلّي إيديك في المنطقة بين صدرك ووسطك.", "حركة بسيطة مفتوحة بتأكد على الكلام، مش أكتر.", "ماتمسكش القلم أو تلعب في حاجة قدامك."]) +
          "</div><div class='proof'><h3 class='nf-sec'>قبل ما تبدأ التصوير</h3><ul class='nf-check'><li>الإضاءة قدامك مش وراك (الشباك قدامك).</li><li>خلفية هادية ومرتبة.</li><li>الموبايل ثابت على حامل، والكاميرا الخلفية أوضح.</li><li>اشرب مية، وخد نفسين عميقين.</li><li>جرّب «التلقين» من عُدّة الصحفي عشان تقرا وانت باصص للكاميرا.</li></ul><div class='actions'><button class='btn' type='button' id='nfGoPrompter'>افتح التلقين</button></div></div>";
        body.querySelector("#nfGoPrompter").onclick = function () { open("prompter"); };
      } else if (cur === "voice") {
        body.innerHTML = "<div class='proof nf-breath'><h3 class='nf-sec'>تمرين التنفّس (قبل الهوا)</h3><p class='small'>شهيق ٤ ثواني من الأنف، ثبات ٤، زفير ٦ من البق. كرّره ٤ مرات عشان صوتك يبقى ثابت.</p><div class='nf-circle' id='nfCircle'><span id='nfBreathTxt'>جاهز؟</span></div><div class='actions' style='justify-content:center'><button class='btn' type='button' id='nfBreathGo'>ابدأ التمرين</button></div></div>" +
          "<div class='proof'><h3 class='nf-sec'>تمارين النطق</h3><p class='small'>اقرا كل جملة ٣ مرات: الأولى ببطء ووضوح، وبعدين أسرع شوية. ركّز على مخارج الحروف.</p><ol class='nf-tw'>" + TWISTERS.map(function (t) { return "<li>" + E(t) + "</li>"; }).join("") + "</ol></div>" +
          "<div class='proof'><h3 class='nf-sec'>نصايح الصوت</h3><ul class='nf-check'><li>اتكلم من بطنك (الحجاب الحاجز)، مش من زورك.</li><li>ارفع نبرة صوتك في أول الخبر ونزّلها في آخره.</li><li>اقف وقفة قصيرة عند كل فاصلة، وأطول عند النقطة.</li><li>شدّد على الكلمة المهمة في الجملة (الرقم أو الاسم).</li><li>ابتسامة خفيفة بتبان في الصوت حتى من غير صورة.</li></ul></div>";
        body.querySelector("#nfBreathGo").onclick = function () {
          stopAll(); var steps = [["شهيق", 4, "in"], ["ثبات", 4, "hold"], ["زفير", 6, "out"]], round = 0, si = 0, left = steps[0][1], c = body.querySelector("#nfCircle"), tx = body.querySelector("#nfBreathTxt");
          function show() { tx.textContent = steps[si][0] + " " + N(left); c.className = "nf-circle " + steps[si][2]; }
          show();
          timers.push(setInterval(function () { left--; if (left <= 0) { si++; if (si >= steps.length) { si = 0; round++; if (round >= 4) { stopAll(); tx.textContent = "عاش! صوتك جاهز"; c.className = "nf-circle"; return; } } left = steps[si][1]; } show(); }, 1000));
        };
      } else {
        body.innerHTML = "<div class='proof'><h3 class='nf-sec'>اقرا مع الإيقاع</h3><p class='small'>الكلمة الملوّنة بتتحرك بسرعة المذيع. اقرا بصوت عالي وحاول تكون معاها بالظبط. المعدّل الطبيعي في النشرة حوالي ١٢٠ كلمة في الدقيقة.</p>" +
          "<div class='range' style='margin:10px 0'><span>بطيء</span><input type='range' id='nfWpm' min='80' max='160' step='10' value='120'><span>سريع</span><b id='nfWpmV'>١٢٠ كلمة/د</b></div>" +
          "<textarea id='nfPaceTxt' style='min-height:110px'></textarea><div class='nf-pace' id='nfPace'></div>" +
          "<div class='actions'><button class='btn' type='button' id='nfPaceGo'>ابدأ</button><button class='btn ghost' type='button' id='nfPaceStop'>إيقاف</button></div><p class='small' id='nfPaceInfo'></p></div>";
        var ta = body.querySelector("#nfPaceTxt"), pv = body.querySelector("#nfPace"), wpm = body.querySelector("#nfWpm"), wv = body.querySelector("#nfWpmV"), info = body.querySelector("#nfPaceInfo");
        ta.value = PACE_TEXT;
        function paint(idx) { var w = ta.value.trim().split(/\s+/); pv.innerHTML = w.map(function (x, i) { return "<span class='" + (i < idx ? "done" : i === idx ? "on" : "") + "'>" + E(x) + "</span>"; }).join(" "); var cur = pv.querySelector(".on"); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" }); }
        function est() { var n = ta.value.trim().split(/\s+/).filter(Boolean).length; info.textContent = "النص فيه " + N(n) + " كلمة، ومدته المتوقعة " + N(Math.round(n / wpm.value * 60)) + " ثانية."; }
        wpm.oninput = function () { wv.textContent = N(wpm.value) + " كلمة/د"; est(); };
        ta.oninput = function () { paint(-1); est(); };
        paint(-1); est();
        body.querySelector("#nfPaceGo").onclick = function () { stopAll(); var i = 0, total = ta.value.trim().split(/\s+/).length; paint(0); timers.push(setInterval(function () { i++; if (i >= total) { stopAll(); paint(total); info.textContent = "خلصت! جرّب تاني بسرعة أعلى شوية."; return; } paint(i); }, 60000 / wpm.value)); };
        body.querySelector("#nfPaceStop").onclick = function () { stopAll(); };
      }
    }
    drawTabs(); draw();
    window.__coachStop = stopAll;
  }

  // ---------- لوحات المؤسسات ----------
  var OUTLETS = [
    { k: "youm7", name: "اليوم السابع", d: "youm7.com" }, { k: "ahram", name: "الأهرام", d: "ahram.org.eg" }, { k: "masry", name: "المصري اليوم", d: "almasryalyoum.com" },
    { k: "shorouk", name: "الشروق", d: "shorouknews.com" }, { k: "masrawy", name: "مصراوي", d: "masrawy.com" }, { k: "watan", name: "الوطن", d: "elwatannews.com" },
    { k: "hadath", name: "الحدث", d: "alhadath.net" }, { k: "arabiya", name: "العربية", d: "alarabiya.net" }, { k: "sky", name: "سكاي نيوز عربية", d: "skynewsarabia.com" },
    { k: "bbc", name: "BBC عربي", d: "bbc.com/arabic" }, { k: "jazeera", name: "الجزيرة", d: "aljazeera.net" }, { k: "qahera", name: "القاهرة الإخبارية", d: "alqaheranews.net" }
  ];
  var CATS = [
    ["سياسة", /(الرئيس|وزير|الحكومة|البرلمان|النواب|الشيوخ|سفير|دبلوماس|مجلس الوزراء|انتخاب|حزب)/],
    ["اقتصاد", /(الدولار|الجنيه|البورصة|أسعار|سعر|الذهب|البنك|اقتصاد|استثمار|تضخم|الضرائب|الموازنة)/],
    ["رياضة", /(الأهلي|الزمالك|مباراة|الدوري|المنتخب|لاعب|مدرب|كأس|بطولة|هدف|الكونفدرالية|أبطال)/],
    ["فن", /(فنان|فنانة|فيلم|مسلسل|مطرب|حفل|أغنية|سينما|مهرجان|دراما|ممثل)/],
    ["حوادث", /(حادث|مصرع|إصابة|القبض|النيابة|محكمة|جريمة|حريق|ضبط|السجن|المتهم)/],
    ["صحة", /(الصحة|مستشفى|طبيب|مرض|فيروس|علاج|دواء|لقاح)/],
    ["تعليم", /(التعليم|الجامعة|الجامعات|الطلاب|امتحان|الثانوية|المدارس|تنسيق)/],
    ["دولي", /(أمريكا|الولايات المتحدة|إسرائيل|غزة|روسيا|أوكرانيا|الصين|إيران|أوروبا|السودان|ليبيا|سوريا|لبنان|الأمم المتحدة)/],
    ["تكنولوجيا", /(تكنولوجيا|ذكاء اصطناعي|الذكاء الاصطناعي|هاتف|آيفون|تطبيق|الإنترنت|سامسونج|جوجل)/]
  ];
  var STOPK = new Set("في من على عن إلى الى ان أن إن مع بعد قبل حتى او أو ثم كل بين عند هذا هذه ذلك التي الذي اليوم امس أمس خلال حول بشأن تعرف عاجل فيديو صور بالصور بالفيديو منذ كيف ماذا لماذا هل ما لا يوم عام اليوم السابع مصر المصري".split(" "));
  function catOf(t) { for (var i = 0; i < CATS.length; i++) if (CATS[i][1].test(t)) return CATS[i][0]; return "أخرى"; }
  function myOutlets() { return (st("mihbara-outlets-custom") || []).concat(OUTLETS); }
  function bars(rows, opts) {
    // rows: [{label, v, tip}] — شريط أفقي لسلسلة واحدة
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }).concat([1]));
    return "<div class='nf-hbars'>" + rows.map(function (r) { return "<div class='nf-hrow' title='" + E(r.tip || (r.label + ": " + N(r.v))) + "' tabindex='0'><span class='nf-hl'>" + E(r.label) + "</span><span class='nf-htrack'><i style='width:" + (r.v / max * 100) + "%'></i></span><b>" + N(r.v) + "</b></div>"; }).join("") + "</div>";
  }
  function hourChart(counts) {
    var max = Math.max.apply(null, counts.concat([1])), W = 24 * 14, H = 110;
    var s = "<div class='nf-chartwrap'><svg viewBox='0 0 " + (W + 10) + " " + (H + 24) + "' class='nf-vbars' role='img' aria-label='عدد الأخبار في كل ساعة'>";
    s += "<line x1='5' y1='" + (H + 2) + "' x2='" + (W + 5) + "' y2='" + (H + 2) + "' class='nf-axis'/>";
    counts.forEach(function (c, h) {
      var bh = c ? Math.max(3, c / max * H) : 0, x = 5 + (23 - h) * 14 + 2, y = H + 2 - bh;
      s += "<g class='nf-bar' tabindex='0'><title>الساعة " + N(h) + ": " + N(c) + " خبر</title><rect x='" + x + "' y='4' width='10' height='" + (H - 2) + "' class='nf-hit'/>" + (bh ? "<path d='M" + x + "," + (H + 2) + "V" + (y + 3) + "q0,-3 3,-3h4q3,0 3,3V" + (H + 2) + "Z' class='nf-mark'/>" : "") + "</g>";
      if (h % 6 === 0) s += "<text x='" + (x + 5) + "' y='" + (H + 18) + "' class='nf-tick'>" + N(h) + "</text>";
    });
    return s + "</svg></div>";
  }
  function topWords(items) {
    var cnt = {};
    items.forEach(function (x) { new Set(nrm(x.title).split(" ").filter(function (w) { return w.length > 3 && !STOPK.has(w) && !/^\d+$/.test(w); })).forEach(function (w) { cnt[w] = (cnt[w] || 0) + 1; }); });
    return Object.keys(cnt).map(function (k) { return [k, cnt[k]]; }).filter(function (x) { return x[1] > 1; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10);
  }
  function renderOutlets(box) {
    var sel = st("mihbara-outlet") || "youm7";
    box.innerHTML = "<div class='slip'><h2>لوحة المؤسسات</h2><p class='lead'>اختار جريدة أو قناة، وشوف نشاطها النهارده: عدد الأخبار، ساعات النشر، أكتر الأقسام، أهم الموضوعات، وأرشيف أخبارها بالروابط.</p><div class='nf-chips' id='nfOut'></div><details class='nf-add'><summary>+ ضيف مؤسسة تانية</summary><div class='row'><div><label for='nfOName'>الاسم</label><input id='nfOName' placeholder='مثلاً: أخبار اليوم'></div><div><label for='nfODom'>الموقع</label><input id='nfODom' dir='ltr' placeholder='akhbarelyom.com'></div></div><div class='actions'><button class='btn mini' type='button' id='nfOAdd'>إضافة</button></div></details></div><div id='nfDash'></div>";
    var chips = box.querySelector("#nfOut"), dash = box.querySelector("#nfDash");
    function drawChips() { chips.innerHTML = ""; myOutlets().forEach(function (o) { var b = document.createElement("button"); b.type = "button"; b.className = "nf-chip"; b.textContent = o.name; b.setAttribute("aria-pressed", String(o.k === sel)); b.onclick = function () { sel = o.k; st("mihbara-outlet", sel); drawChips(); load(); }; chips.append(b); }); }
    box.querySelector("#nfOAdd").onclick = function () {
      var n = box.querySelector("#nfOName").value.trim(), d = box.querySelector("#nfODom").value.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
      if (!n || !/^[a-z0-9.-]+\.[a-z]{2,}(\/[\w-]+)?$/i.test(d)) { toastF("اكتب الاسم والموقع صح (مثلاً akhbarelyom.com)"); return; }
      var list = st("mihbara-outlets-custom") || []; var k = "c" + Date.now(); list.unshift({ k: k, name: n, d: d }); st("mihbara-outlets-custom", list); sel = k; st("mihbara-outlet", sel); drawChips(); load(); toastF("اتضافت ✓");
    };
    async function load() {
      var o = myOutlets().find(function (x) { return x.k === sel; }) || OUTLETS[0];
      dash.innerHTML = "<div class='proof'><div class='livesearch'><i></i><span>بيجمّع بيانات " + E(o.name) + "…</span></div>" + SKEL + "</div>";
      try {
        var r = await Promise.allSettled([netGet(gSearch("site:" + o.d + " when:1d")), netGet(gSearch("site:" + o.d + " when:7d"))]);
        if (r[0].status !== "fulfilled" && r[1].status !== "fulfilled") throw r[0].reason || { code: "net" };
        var day = r[0].status === "fulfilled" ? parseRSS(r[0].value) : [], week = r[1].status === "fulfilled" ? parseRSS(r[1].value) : [];
        var now = Date.now(), last24 = day.filter(function (x) { return now - x.date < 24 * 3600000; });
        var capped = day.length >= 100;
        var hours = new Array(24).fill(0); last24.forEach(function (x) { hours[cairoHour(x.date)]++; });
        var peak = hours.indexOf(Math.max.apply(null, hours));
        var breaking = last24.filter(function (x) { return /عاجل/.test(x.title); }).length;
        var catCount = {}; last24.forEach(function (x) { var c = catOf(x.title); catCount[c] = (catCount[c] || 0) + 1; });
        var catRows = Object.keys(catCount).map(function (k) { return { label: k, v: catCount[k] }; }).sort(function (a, b) { return b.v - a.v; });
        var words = topWords(last24.length ? last24 : week);
        // أرشيف محلي: لقطة يومية
        var snapKey = "mihbara-snap-" + o.k, snaps = st(snapKey) || {}, today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Cairo" });
        snaps[today] = last24.length; var keys = Object.keys(snaps).sort().slice(-14); var trimmed = {}; keys.forEach(function (k) { trimmed[k] = snaps[k]; }); st(snapKey, trimmed);
        var h = "<div class='nf-kpis'>" +
          "<div class='stat'><b>" + N(last24.length) + (capped ? "+" : "") + "</b><span>خبر في آخر ٢٤ ساعة (حسب أخبار جوجل)</span></div>" +
          "<div class='stat'><b>" + (capped ? "—" : N(Math.round(last24.length / 24 * 10) / 10)) + "</b><span>خبر في الساعة (متوسط)</span></div>" +
          "<div class='stat'><b>" + (last24.length && !capped ? N(peak) + ":٠٠" : "—") + "</b><span>أكتر ساعة نشر</span></div>" +
          "<div class='stat'><b>" + N(breaking) + "</b><span>خبر «عاجل»</span></div></div>";
        h += "<div class='proof'><h3 class='nf-sec'>النشر على مدار اليوم (بتوقيت القاهرة)</h3>" + (capped ? "<p class='small'>المؤسسة دي بتنشر كتير جداً، فالرسم بيوضح آخر ١٠٠ خبر بس مش اليوم كله.</p>" : "") + hourChart(hours) + "</div>";
        h += "<div class='proof'><h3 class='nf-sec'>توزيع الأخبار على الأقسام</h3>" + (catRows.length ? bars(catRows) : "<p class='small'>مفيش بيانات كفاية.</p>") + "</div>";
        if (words.length) h += "<div class='proof'><h3 class='nf-sec'>أكتر الكلمات تكراراً في العناوين</h3><div class='nf-words'>" + words.map(function (w) { return "<span>" + E(w[0]) + " <b>" + N(w[1]) + "</b></span>"; }).join("") + "</div></div>";
        if (keys.length > 1) h += "<div class='proof'><h3 class='nf-sec'>سجل الأداء (من أرشيف جهازك)</h3>" + bars(keys.map(function (k) { return { label: fShort(new Date(k + "T12:00:00")), v: trimmed[k] }; })) + "<p class='small'>كل مرة تفتح اللوحة بيتحفظ عدد أخبار اليوم، فالسجل بيكبر مع الوقت.</p></div>";
        var arch = (last24.length ? last24 : week).slice().sort(function (a, b) { return b.date - a.date; });
        h += "<div class='proof'><h3 class='nf-sec'>أرشيف الأخبار</h3><input type='search' id='nfArchQ' placeholder='دوّر في أرشيف " + E(o.name) + "…'><ol class='nf-list' id='nfArch'></ol></div>";
        h += "<p class='nv-note small'>المؤشرات مبنية على الأخبار المنشورة علناً والمفهرسة في أخبار جوجل (أقصى ١٠٠ خبر لكل فترة)، ومش بيانات داخلية زي عدد المشاهدات أو الزيارات.</p>";
        dash.innerHTML = h;
        var al = dash.querySelector("#nfArch"), aq = dash.querySelector("#nfArchQ");
        function drawArch() { var q = nrm(aq.value); var list = arch.filter(function (x) { return !q || nrm(x.title).indexOf(q) >= 0; }).slice(0, 40); al.innerHTML = list.length ? list.map(function (x) { return "<li><a href='" + U(x.link) + "' target='_blank' rel='noopener'>" + E(x.title) + "</a><div class='nf-src'><em class='nf-tag'>" + E(catOf(x.title)) + "</em><span>" + E(fShort(x.date)) + " · " + E(fTime(x.date)) + "</span></div></li>"; }).join("") : "<li>مفيش نتايج.</li>"; }
        aq.oninput = drawArch; drawArch();
      } catch (err) {
        dash.innerHTML = "<div class='proof'><p>" + (err && err.code === "no_bridge" ? "لوحة المؤسسات بتشتغل جوه تطبيق الموبايل." : "مقدرتش أجيب البيانات. اتأكد من النت وجرّب تاني.") + "</p></div>";
      }
    }
    drawChips(); load();
  }

  // ---------- CSS ----------
  var css = ".nf-sheet{align-items:center}.nf-sheet .panel{max-width:520px}.nf-chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}" +
    ".nf-chip{font:inherit;font-size:14px;font-weight:500;padding:9px 14px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface2);color:var(--ink);cursor:pointer}" +
    ".nf-chip[aria-pressed='true']{background:var(--accent-soft);border-color:var(--accent);color:var(--accent);font-weight:600}" +
    ".nf-brief-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}.nf-brief-head .lead{margin:0}" +
    ".nf-meta-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.nf-sec{font-family:var(--display);font-size:16px;margin:18px 0 8px;display:flex;align-items:center;gap:8px}" +
    ".nf-sec::before{content:'';width:6px;height:16px;border-radius:3px;background:var(--accent)}" +
    ".nf-list{margin:0;padding-inline-start:22px;display:grid;gap:10px}.nf-list li::marker{color:var(--accent);font-weight:700}.nf-list a{color:var(--ink);font-weight:500;text-decoration:none;line-height:1.6}" +
    ".nf-src{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12px;color:var(--muted);margin-top:3px}.nf-src b{color:var(--ink);font-weight:600}" +
    ".nf-tag{font-style:normal;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent)}" +
    ".nf-cards{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));margin-bottom:14px}" +
    ".nf-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:14px;display:grid;gap:10px;box-shadow:var(--shadow)}.nf-card ul{margin:6px 0 0;padding-inline-start:18px;font-size:13.5px}" +
    ".nf-okt{color:#0c8a63}.nf-badt{color:var(--flash)}.nf-ill{width:100%;height:auto;background:var(--surface2);border-radius:12px}" +
    ".nf-frame{fill:none;stroke:var(--muted);stroke-width:2}.nf-grid{stroke:var(--line);stroke-width:1.2;stroke-dasharray:4 4;fill:none}.nf-fig{fill:var(--accent-soft);stroke:var(--accent);stroke-width:2}" +
    ".nf-eye{fill:var(--accent)}.nf-line{stroke:var(--accent);stroke-width:3;stroke-linecap:round;fill:none}.nf-ok{stroke:#12b886;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}" +
    ".nf-bad{stroke:var(--flash);stroke-width:3;stroke-linecap:round}.nf-lens{fill:var(--surface);stroke:var(--accent);stroke-width:3}.nf-ray{stroke:#f5b700;stroke-width:2;stroke-dasharray:5 4}.nf-zone{fill:rgba(18,184,134,.12);stroke:#12b886;stroke-dasharray:4 3}" +
    ".nf-check{margin:0;padding-inline-start:20px;display:grid;gap:6px;font-size:14px}.nf-tw{display:grid;gap:8px;font-family:var(--display);font-size:17px;padding-inline-start:24px}" +
    ".nf-circle{width:150px;height:150px;margin:16px auto;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);border:3px solid var(--accent);font-family:var(--display);font-size:18px;color:var(--accent);transition:transform 4s ease-in-out}" +
    ".nf-circle.in{transform:scale(1.25)}.nf-circle.hold{transform:scale(1.25)}.nf-circle.out{transform:scale(.85);transition-duration:6s}" +
    ".nf-pace{margin-top:12px;padding:14px;border-radius:14px;background:var(--surface2);font-family:var(--display);font-size:19px;line-height:2;max-height:220px;overflow:auto}" +
    ".nf-pace span{color:var(--muted);transition:color .1s}.nf-pace span.done{color:var(--ink)}.nf-pace span.on{color:#fff;background:var(--accent);border-radius:6px;padding:0 4px}" +
    ".nf-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}@media(min-width:700px){.nf-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}}" +
    ".nf-kpis .stat{background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}" +
    ".nf-chartwrap{overflow-x:auto}.nf-vbars{width:100%;min-width:300px;height:auto;direction:ltr}.nf-mark{fill:var(--accent)}.nf-hit{fill:transparent}.nf-bar:hover .nf-mark,.nf-bar:focus .nf-mark{fill:var(--a1)}" +
    ".nf-axis{stroke:var(--line);stroke-width:1}.nf-tick{font-size:10px;fill:var(--muted);text-anchor:middle;font-family:var(--body)}" +
    ".nf-hbars{display:grid;gap:8px}.nf-hrow{display:grid;grid-template-columns:90px 1fr 40px;gap:10px;align-items:center;font-size:13px}.nf-hrow b{font-variant-numeric:tabular-nums;text-align:start}" +
    ".nf-htrack{height:12px;background:var(--surface2);border-radius:6px;overflow:hidden}.nf-htrack i{display:block;height:100%;background:var(--accent);border-radius:6px 0 0 6px}" +
    ".nf-words{display:flex;flex-wrap:wrap;gap:8px}.nf-words span{background:var(--surface2);border-radius:999px;padding:5px 12px;font-size:13.5px}.nf-words b{color:var(--accent)}" +
    ".nf-add summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:14px;margin-top:4px}.nf-banner{display:flex;align-items:center;gap:12px;width:100%;text-align:start;font:inherit;color:var(--ink);margin-top:14px;padding:14px;border-radius:18px;border:1.5px solid var(--accent);background:var(--accent-soft);cursor:pointer}" +
    ".nf-banner .ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2));flex:none}.nf-banner b{display:block;font-size:15px}.nf-banner span span{font-size:12.5px;color:var(--muted)}";
  var styleEl = document.createElement("style"); styleEl.textContent = css; document.head.appendChild(styleEl);

  // ---------- الربط مع التطبيق ----------
  document.addEventListener("DOMContentLoaded", function () {
    try {
      ICONS.brief = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/><path d="M8 21h8"/>';
      ICONS.outlets = '<path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6M9 11h.01M15 11h.01"/>';
      ICONS.coach = '<rect x="2" y="7" width="14" height="10" rx="2"/><path d="M16 11l6-3v8l-6-3"/><circle cx="9" cy="12" r="2"/>';
      TINT.brief = "#f08c00"; TINT.outlets = "#1c7ed6"; TINT.coach = "#d6336c";
      EXTRA.brief = { name: "التقرير الصباحي", desc: "أهم أخبار النهارده بمصادرها قبل اجتماع التحرير" };
      EXTRA.outlets = { name: "لوحة المؤسسات", desc: "نشاط وأرشيف ومؤشرات كل جريدة أو قناة" };
      EXTRA.coach = { name: "مدرب الإلقاء", desc: "الوقفة قدام الكاميرا، الصوت، والقراءة بانتظام", off: true };
      OFF.push("brief", "outlets", "coach");
      GROUPS.unshift({ title: "غرفة الأخبار", items: ["brief", "outlets", "coach"] });
      NEWBIES.push("brief", "outlets", "coach");
      var origOff = renderOff;
      renderOff = function (k) {
        if (window.__coachStop) { window.__coachStop(); window.__coachStop = null; }
        var box = document.getElementById("offBody");
        if (k === "brief") { box.innerHTML = ""; renderBrief(box); return; }
        if (k === "outlets") { box.innerHTML = ""; renderOutlets(box); return; }
        if (k === "coach") { box.innerHTML = ""; renderCoach(box); return; }
        origOff(k);
      };
      buildHome(); filterTools();
      // بانر التقرير الصباحي في الرئيسية
      var hero = document.querySelector(".hhero");
      if (hero) { var bn = document.createElement("button"); bn.type = "button"; bn.className = "nf-banner"; bn.id = "nfBriefBanner"; bn.innerHTML = "<span class='ic'>" + ico("brief") + "</span><span><b>تقريرك الصباحي جاهز</b><span>أهم أخبار النهارده حسب اهتماماتك، بالمصادر والروابط</span></span>"; bn.onclick = function () { open("brief"); }; hero.after(bn); }
      document.getElementById("toolSearch").addEventListener("input", function () { var b = document.getElementById("nfBriefBanner"); if (b) b.style.display = this.value.trim() ? "none" : ""; });
      // سؤال الاهتمامات أول مرة
      var origClose = closeWelcome;
      closeWelcome = function () { origClose(); if (!myInterests()) setTimeout(function () { showInterests(); }, 250); };
      var skipBtn = document.getElementById("w-skip"); if (skipBtn) skipBtn.onclick = closeWelcome;
      if (localStorage.getItem("mihbara-welcomed") && !myInterests()) setTimeout(function () { showInterests(); }, 700);
    } catch (e) { console.error("features init", e); }
  });
})();
