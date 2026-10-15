/* صَدى — أخبارك اللحظية + المساعد الإعلامي */
(function () {
  "use strict";
  var NF = window.NF;
  if (!NF) return;
  var E = NF.E, N = NF.N, U = NF.U, st = NF.st;
  var REFRESH_MS = 5 * 60 * 1000;
  function homeVisible() { var h = document.getElementById("homeView"); return !h || !h.hidden; }
  var NB = window.MihbaraNotify || null;

  // ---------- اهتمامات خاصة يضيفها المستخدم ----------
  function customList() { return st("mihbara-interests-custom") || []; }
  function addCustomToList(c) { if (!NF.INTERESTS.some(function (i) { return i.k === c.k; })) NF.INTERESTS.push({ k: c.k, name: c.name, src: NF.gSearch(c.q + " when:1d"), custom: true }); }
  customList().forEach(addCustomToList);
  function interestByKey(k) { return NF.INTERESTS.find(function (i) { return i.k === k; }); }

  function removeCustom(k) {
    st("mihbara-interests-custom", customList().filter(function (c) { return c.k !== k; }));
    var i = NF.INTERESTS.findIndex(function (x) { return x.k === k; }); if (i >= 0) NF.INTERESTS.splice(i, 1);
    var mine = st("mihbara-interests"); if (Array.isArray(mine)) st("mihbara-interests", mine.filter(function (x) { return x !== k; }));
  }
  function addDelBtn(chip) {
    if (!chip || !/^c_/.test(chip.dataset.k || "") || chip.nextElementSibling && chip.nextElementSibling.classList.contains("lv-del")) return;
    var d = document.createElement("button"); d.type = "button"; d.className = "lv-del"; d.setAttribute("aria-label", "امسح " + chip.textContent); d.textContent = "✕";
    d.onclick = function () { removeCustom(chip.dataset.k); chip.remove(); d.remove(); };
    chip.after(d);
  }
  // إضافة خانة «اهتمام خاص» لشاشة الاهتمامات
  function enhanceSheet(sh) {
    if (sh.querySelector("#lvCustom")) return;
    var chips = sh.querySelector("#nfChips"); if (!chips) return;
    var row = document.createElement("div"); row.className = "lv-addrow"; row.id = "lvCustom";
    row.innerHTML = "<input id='lvCustomIn' placeholder='ضيف اهتمام خاص: مثلاً الأهلي، الذكاء الاصطناعي، الدولار' maxlength='40'><button class='btn mini' type='button' id='lvCustomAdd'>إضافة</button>";
    chips.after(row);
    Array.prototype.forEach.call(chips.querySelectorAll(".nf-chip"), addDelBtn);
    var inp = row.querySelector("#lvCustomIn");
    function add() {
      var name = inp.value.trim().replace(/\s+/g, " ");
      if (name.length < 2) { try { toast("اكتب الاهتمام الأول"); } catch (e) { } return; }
      var k = "c_" + Date.now().toString(36);
      var c = { k: k, name: name, q: name };
      var list = customList(); list.push(c); st("mihbara-interests-custom", list.slice(-12));
      addCustomToList(c);
      var b = document.createElement("button"); b.type = "button"; b.className = "nf-chip"; b.textContent = name; b.dataset.k = k; b.setAttribute("aria-pressed", "true");
      b.onclick = function () { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); };
      chips.append(b); addDelBtn(b); inp.value = "";
    }
    row.querySelector("#lvCustomAdd").onclick = add;
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); add(); } });
  }

  // ---------- أخبارك اللحظية ----------
  var feed = { items: [], at: 0, filter: "all", expanded: false, loading: false, fresh: {} };
  (function () { var c = st("mihbara-feed"); if (c && c.items) { feed.items = c.items; feed.at = c.at; } })();
  function seenSet() { return new Set(st("mihbara-feed-seen") || []); }

  async function refreshFeed(manual) {
    if (feed.loading) return; feed.loading = true; paintStatus();
    var ints = (NF.myInterests() || ["egypt", "politics", "sports"]).map(interestByKey).filter(Boolean);
    var res = await Promise.allSettled(ints.map(function (i) { return NF.netGet(i.src); }));
    var all = [];
    ints.forEach(function (i, n) {
      if (res[n].status !== "fulfilled") return;
      NF.parseRSS(res[n].value).filter(function (x) { return Date.now() - x.date < 36 * 3600000; })
        .sort(function (a, b) { return b.date - a.date; }).slice(0, 15)
        .forEach(function (x) { all.push({ t: x.title, s: x.source, u: x.link, d: +x.date, k: i.k, tr: NF.tier(x.sourceUrl) }); });
    });
    feed.loading = false;
    if (!all.length) { paintStatus(res.some(function (r) { return r.status === "fulfilled"; }) ? "" : "مقدرتش أوصل للأخبار دلوقتي. هحاول تاني بعد شوية."); return; }
    all.sort(function (a, b) { return b.d - a.d; });
    var dd = NF.dedupe(all.map(function (x) { return { title: x.t, x: x }; })).map(function (o) { return o.x; }).slice(0, 60);
    var prev = new Set(feed.items.map(function (x) { return x.u; }));
    var newOnes = feed.items.length ? dd.filter(function (x) { return !prev.has(x.u); }) : [];
    newOnes.forEach(function (x) { feed.fresh[x.u] = 1; });
    feed.items = dd; feed.at = Date.now();
    st("mihbara-feed", { items: dd, at: feed.at });
    if (NB) { try { NB.seen(JSON.stringify(dd.map(function (x) { return x.u; }))); } catch (e) { } }
    paintFeed();
    if (newOnes.length && !manual) showNewPill(newOnes.length);
    else if (manual) { try { toast(newOnes.length ? ("وصل " + N(newOnes.length) + " خبر جديد") : "مفيش أخبار أجدد دلوقتي"); } catch (e) { } }
  }
  function showNewPill(n) {
    var p = document.getElementById("lvNewPill"); if (!p) return;
    p.textContent = "↑ " + N(n) + " خبر جديد"; p.hidden = false;
    clearTimeout(showNewPill._t); showNewPill._t = setTimeout(function () { p.hidden = true; }, 15000);
  }
  function paintStatus(err) {
    var s = document.getElementById("lvStatus"); if (!s) return;
    if (feed.loading) { s.innerHTML = "<i class='lv-dot spin'></i>بيحدّث…"; return; }
    s.innerHTML = err ? E(err) : ("<i class='lv-dot'></i>مباشر · آخر تحديث " + (feed.at ? E(NF.fTime(new Date(feed.at))) : "—"));
  }
  function paintFeed() {
    var box = document.getElementById("lvFeed"); if (!box) return;
    var ints = (NF.myInterests() || []).map(interestByKey).filter(Boolean);
    var chips = document.getElementById("lvChips");
    chips.innerHTML = "";
    [{ k: "all", name: "الكل" }].concat(ints).forEach(function (i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "lv-chip"; b.textContent = i.name; b.setAttribute("aria-pressed", String(feed.filter === i.k));
      b.onclick = function () { feed.filter = i.k; feed.expanded = false; paintFeed(); }; chips.append(b);
    });
    var list = feed.items.filter(function (x) { return feed.filter === "all" || x.k === feed.filter; });
    var shown = list.slice(0, feed.expanded ? 20 : 6);
    var seen = seenSet();
    box.innerHTML = shown.length ? shown.map(function (x) {
      var isNew = feed.fresh[x.u] || (Date.now() - x.d < 30 * 60000 && !seen.has(x.u));
      var cat = interestByKey(x.k);
      return "<li class='lv-item'><a href='" + U(x.u) + "' target='_blank' rel='noopener' data-u='" + E(x.u) + "'>" + (isNew ? "<em class='lv-new'>جديد</em>" : "") + E(x.t) + "</a>" +
        "<div class='lv-meta'><b>" + E(x.s) + "</b>" + (x.tr >= 2 ? "<em class='nf-tag'>موثوق</em>" : "") + "<span>" + E(NF.ago(new Date(x.d))) + "</span>" + (cat && feed.filter === "all" ? "<span class='lv-cat'>" + E(cat.name) + "</span>" : "") +
        "<button type='button' class='lv-ask' data-t='" + E(x.t) + "' data-s='" + E(x.s) + "'>اكتب عنه</button></div></li>";
    }).join("") : "<li class='lv-empty'>" + (feed.loading || !feed.at ? "بيجهّز أخبارك…" : "مفيش أخبار في القسم ده دلوقتي.") + "</li>";
    var more = document.getElementById("lvMore");
    more.hidden = list.length <= 6; more.textContent = feed.expanded ? "عرض أقل" : "عرض أخبار أكتر (" + N(Math.min(list.length, 20)) + ")";
    paintStatus();
  }
  function notifySync() {
    if (!NB) return;
    try {
      var list = (NF.myInterests() || []).map(interestByKey).filter(Boolean).map(function (i) { return { n: i.name, u: i.src }; });
      NB.configure(JSON.stringify(list));
      if (!localStorage.getItem("mihbara-notify-asked") && list.length) { localStorage.setItem("mihbara-notify-asked", "1"); NB.setEnabled(true); }
    } catch (e) { }
    paintBell();
  }
  function paintBell() {
    var b = document.getElementById("lvBell"); if (!b) return;
    if (!NB) { b.hidden = true; return; }
    var on = false; try { on = NB.isEnabled(); } catch (e) { }
    b.textContent = on ? "🔔 التنبيهات شغالة" : "🔕 التنبيهات مقفولة"; b.setAttribute("aria-pressed", String(on));
  }
  function markSeen() {
    var s = seenSet(); feed.items.slice(0, 40).forEach(function (x) { s.add(x.u); });
    st("mihbara-feed-seen", Array.from(s).slice(-300));
  }

  // ---------- المساعد الإعلامي ----------
  var SUGGEST = [
    "اكتب خبر صحفي بالهرم المقلوب عن ",
    "حوّل البيان ده لتقرير تلفزيوني دقيقتين: ",
    "اقترح ٥ زوايا مختلفة لتغطية موضوع ",
    "اكتب ١٠ أسئلة لحوار صحفي مع ",
    "اكتب بوست فيسبوك وتغريدة عن خبر ",
    "حلّل التغطية الإعلامية لقضية "
  ];
  function buildPrompt(req, ctx) {
    return "إنت «صَدى»، مساعد إعلامي محترف بيساعد طلاب وأساتذة الإعلام في مصر.\n" +
      "رد على الطلب اللي تحت بشكل إعلامي بحت وبمعايير غرف الأخبار:\n" +
      "- اختار الشكل الصحفي المناسب للطلب (خبر بالهرم المقلوب، تقرير، سكريبت تلفزيوني أو إذاعي، بوست سوشيال، أسئلة حوار، مقال رأي، تحليل تغطية، خطة تغطية...).\n" +
      "- ابدأ بعنوان قوي، واستخدم عناوين فرعية ونقاط لو مناسب.\n" +
      "- اكتب بالعربية الفصحى الإعلامية المبسطة، إلا لو الطلب محدد لهجة أو لغة تانية.\n" +
      "- ماتخترعش أرقام أو تصريحات أو أسماء؛ لو محتاج معلومة مش موجودة حط مكانها [للتحقق: ...].\n" +
      "- التزم بأخلاقيات المهنة: الحياد، الدقة، نسب المعلومة لمصدرها، احترام الخصوصية.\n" +
      "- لو الطلب مش إعلامي، تناوله من زاوية إعلامية (إزاي يتغطّى أو يتقدّم للجمهور).\n" +
      "- اختم بسطر «ملاحظة تحريرية:» فيها نصيحة قصيرة أو مصادر مقترحة للتحقق.\n" +
      (ctx ? "\nسياق المحادثة السابقة (للمتابعة):\n" + ctx + "\n" : "") +
      "\nالطلب:\n" + req;
  }
  function renderAsk(box) {
    box.innerHTML = "<div class='slip'><h2>المساعد الإعلامي</h2><p class='lead'>اكتب أي طلب: خبر، تقرير، سكريبت، أسئلة حوار، فكرة تغطية، أو حتى سؤال عن المهنة، والرد هيجيلك بشكل إعلامي احترافي.</p></div>" +
      "<div id='lvThread' class='lv-thread'></div>" +
      "<div class='proof lv-compose'><textarea id='lvQ' placeholder='مثلاً: اكتب تقرير تلفزيوني عن ارتفاع أسعار الذهب في مصر' rows='4'></textarea>" +
      "<div class='lv-sugs' id='lvSugs'></div><div class='actions'><button class='btn' type='button' id='lvSend'>ابعت</button><button class='btn ghost' type='button' id='lvClear'>محادثة جديدة</button></div></div>";
    var q = box.querySelector("#lvQ"), th = box.querySelector("#lvThread"), sugs = box.querySelector("#lvSugs");
    var turns = st("mihbara-ask-thread") || [];
    function saveTurns() { st("mihbara-ask-thread", turns.slice(-10)); }
    function actionsFor(item, req, text) {
      var act = document.createElement("div"); act.className = "actions";
      act.innerHTML = "<button class='btn mini' type='button'>نسخ</button><button class='btn ghost mini' type='button'>مشاركة</button><button class='btn ghost mini' type='button'>حفظ في السجل</button>";
      var bs = act.querySelectorAll("button");
      bs[0].onclick = function () { copyText(text); };
      bs[1].onclick = function () { shareText(text, "صَدى"); };
      bs[2].onclick = function () { try { addHistory("ask", req, text); toast("اتحفظ في السجل ✓"); } catch (e) { } };
      item.querySelector(".lv-a").append(act);
    }
    turns.forEach(function (t) {
      var it = document.createElement("div"); it.className = "lv-turn";
      it.innerHTML = "<div class='lv-q'>" + E(t.q) + "</div><div class='lv-a proof'><div class='lv-body'>" + md(t.a) + "</div></div>";
      th.append(it); actionsFor(it, t.q, t.a);
    });
    SUGGEST.forEach(function (s) { var b = document.createElement("button"); b.type = "button"; b.className = "lv-chip"; b.textContent = s.replace(/[:\s]+$/, "") + "…"; b.onclick = function () { q.value = s; q.focus(); }; sugs.append(b); });
    var ctrl = null;
    async function send() {
      var req = q.value.trim(); if (!req) { q.focus(); return; }
      if (ctrl) ctrl.abort(); ctrl = new AbortController();
      var ctx = turns.slice(-2).map(function (t) { return "طلب: " + t.q + "\nرد مختصر: " + t.a.slice(0, 900); }).join("\n---\n");
      var item = document.createElement("div"); item.className = "lv-turn";
      item.innerHTML = "<div class='lv-q'>" + E(req) + "</div><div class='lv-a proof'><div class='livesearch'><i></i><span>بيكتب الرد…</span></div><div class='lv-body'></div></div>";
      th.append(item); q.value = ""; item.scrollIntoView({ block: "start", behavior: "smooth" });
      var body = item.querySelector(".lv-body"), wait = item.querySelector(".livesearch");
      try {
        var out = await sample(buildPrompt(req, ctx), { signal: ctrl.signal, onText: function (o) { wait.hidden = true; body.innerHTML = md(o.text); } });
        wait.hidden = true; body.innerHTML = md(out.text);
        turns.push({ q: req, a: out.text }); saveTurns();
        actionsFor(item, req, out.text);
      } catch (e) {
        wait.hidden = true;
        var msg = (typeof ERR !== "undefined" && ERR[e && e.code]) || "حصلت مشكلة. جرّب تاني.";
        if (e && e.code === "cancelled") msg = "اتلغى الطلب.";
        body.innerHTML = (e && e.text ? md(e.text) : "") + "<p class='lv-err'>" + E(msg) + "</p>";
      }
    }
    box.querySelector("#lvSend").onclick = send;
    q.addEventListener("keydown", function (e) { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); });
    box.querySelector("#lvClear").onclick = function () { if (ctrl) ctrl.abort(); turns = []; saveTurns(); th.innerHTML = ""; q.value = ""; q.focus(); };
    if (window.__lvPending) { q.value = window.__lvPending; window.__lvPending = null; send(); }
  }
  function askAbout(text) { window.__lvPending = text; open("ask"); }

  // ---------- CSS ----------
  var css = ".lv-askbar{display:flex;gap:8px;align-items:stretch;margin-top:14px;padding:8px;border-radius:20px;background:var(--surface);border:1.5px solid var(--line);box-shadow:var(--shadow)}" +
    ".lv-askbar textarea{flex:1;min-height:46px;max-height:120px;resize:none;border:0;background:transparent;font:inherit;font-size:15px;color:var(--ink);padding:8px 10px;outline:none}" +
    ".lv-askbar button{flex:none;border:0;border-radius:14px;padding:0 16px;font:inherit;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2));cursor:pointer}" +
    ".lv-askhint{font-size:12px;color:var(--muted);margin:6px 6px 0}" +
    ".lv-feedwrap{margin-top:14px;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:14px;box-shadow:var(--shadow);position:relative}" +
    ".lv-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.lv-head h3{margin:0;font-family:var(--display);font-size:17px}" +
    ".lv-status{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px}.lv-dot{width:8px;height:8px;border-radius:50%;background:#12B886;box-shadow:0 0 0 0 rgba(18,184,134,.6);animation:lvPulse 2s infinite;display:inline-block}" +
    ".lv-dot.spin{background:var(--a2)}@keyframes lvPulse{70%{box-shadow:0 0 0 7px rgba(18,184,134,0)}100%{box-shadow:0 0 0 0 rgba(18,184,134,0)}}" +
    ".lv-tools{display:flex;gap:6px}.lv-tools button{font:inherit;font-size:12.5px;border:1px solid var(--line);background:var(--surface2);color:var(--ink);border-radius:999px;padding:5px 10px;cursor:pointer}" +
    ".lv-chips{display:flex;gap:6px;overflow-x:auto;margin:10px 0 4px;padding-bottom:4px;scrollbar-width:none}.lv-chip{flex:none;font:inherit;font-size:13px;padding:6px 12px;border-radius:999px;border:1.5px solid var(--line);background:var(--surface2);color:var(--ink);cursor:pointer}" +
    ".lv-chip[aria-pressed='true']{background:var(--accent-soft);border-color:var(--accent);color:var(--accent);font-weight:700}" +
    ".lv-list{list-style:none;margin:6px 0 0;padding:0;display:grid}.lv-item{padding:10px 2px;border-top:1px solid var(--line)}.lv-item:first-child{border-top:0}" +
    ".lv-item a{color:var(--ink);text-decoration:none;font-weight:600;line-height:1.6;font-size:15px}.lv-new{font-style:normal;font-size:11px;font-weight:700;color:#fff;background:#E03131;border-radius:6px;padding:1px 6px;margin-inline-end:6px;vertical-align:2px}" +
    ".lv-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12px;color:var(--muted);margin-top:4px}.lv-meta b{color:var(--ink)}.lv-cat{background:var(--surface2);border-radius:999px;padding:1px 8px}" +
    ".lv-ask{margin-inline-start:auto;font:inherit;font-size:12px;font-weight:600;color:var(--accent);background:none;border:0;cursor:pointer;padding:2px 4px}" +
    ".lv-more{width:100%;margin-top:6px;font:inherit;font-weight:600;font-size:13.5px;color:var(--accent);background:var(--surface2);border:0;border-radius:12px;padding:9px;cursor:pointer}" +
    ".lv-empty{color:var(--muted);padding:12px 2px;list-style:none}" +
    ".lv-pill{position:absolute;inset-inline:0;margin:auto;top:-12px;width:max-content;font:inherit;font-size:13px;font-weight:700;color:#fff;background:#E03131;border:0;border-radius:999px;padding:6px 14px;box-shadow:0 6px 16px -6px rgba(224,49,49,.7);cursor:pointer}" +
    ".lv-del{font:inherit;font-size:11px;line-height:1;width:22px;height:22px;margin-inline-start:-4px;border-radius:50%;border:0;background:var(--surface2);color:var(--muted);cursor:pointer;align-self:center}.lv-addrow{display:flex;gap:8px;margin:4px 0 8px}#lvBell[aria-pressed='true']{border-color:var(--accent);color:var(--accent)}.lv-addrow input{flex:1;min-width:0}" +
    ".lv-thread{display:grid;gap:14px;margin-bottom:12px}.lv-q{justify-self:start;max-width:90%;background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;border-radius:18px 18px 18px 4px;padding:10px 14px;white-space:pre-wrap;line-height:1.7}" +
    ".lv-a{margin-top:8px}.lv-sugs{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.lv-err{color:var(--flash);font-weight:600}.lv-compose textarea{width:100%}";
  var se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  // ---------- الربط ----------
  document.addEventListener("DOMContentLoaded", function () {
    try {
      ICONS.ask = '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/>';
      TINT.ask = "#7048e8";
      EXTRA.ask = { name: "المساعد الإعلامي", desc: "اكتب أي طلب واستلم رد إعلامي احترافي" };
      OFF.push("ask");
      var g = GROUPS.find(function (x) { return x.items.indexOf("brief") >= 0; });
      if (g) g.items.unshift("ask"); else GROUPS.unshift({ title: "غرفة الأخبار", items: ["ask"] });
      NEWBIES.push("ask");
      var prevOff = renderOff;
      renderOff = function (k) {
        if (k === "ask") { var box = document.getElementById("offBody"); box.innerHTML = ""; renderAsk(box); return; }
        prevOff(k);
      };
      buildHome(); filterTools();

      var hero = document.querySelector(".hhero");
      if (hero) {
        // خانة الكتابة في الرئيسية
        var ab = document.createElement("div"); ab.id = "lvAskWrap";
        ab.innerHTML = "<form class='lv-askbar' id='lvAskBar'><textarea id='lvAskIn' rows='1' placeholder='اكتب اللي محتاجه هنا…'></textarea><button type='submit'>اسأل</button></form><p class='lv-askhint'>مثلاً: «اكتب خبر عن افتتاح معرض الكتاب» أو «إزاي أغطي مؤتمر صحفي؟»</p>";
        hero.after(ab);
        ab.querySelector("#lvAskBar").addEventListener("submit", function (e) { e.preventDefault(); var v = ab.querySelector("#lvAskIn").value.trim(); if (!v) { ab.querySelector("#lvAskIn").focus(); return; } ab.querySelector("#lvAskIn").value = ""; askAbout(v); });
        ab.querySelector("#lvAskIn").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ab.querySelector("#lvAskBar").requestSubmit(); } });
        // أخبارك اللحظية
        var fw = document.createElement("section"); fw.className = "lv-feedwrap"; fw.id = "lvFeedWrap";
        fw.innerHTML = "<button type='button' class='lv-pill' id='lvNewPill' hidden></button><div class='lv-head'><h3>أخبارك الآن</h3><div class='lv-tools'><button type='button' id='lvBell' hidden></button><button type='button' id='lvRefresh'>تحديث</button><button type='button' id='lvEditInts'>اهتماماتي</button></div></div>" +
          "<div class='lv-status' id='lvStatus'></div><div class='lv-chips' id='lvChips'></div><ul class='lv-list' id='lvFeed'></ul><button type='button' class='lv-more' id='lvMore' hidden></button>";
        ab.after(fw);
        fw.querySelector("#lvRefresh").onclick = function () { refreshFeed(true); };
        var bell = fw.querySelector("#lvBell"); if (NB) bell.hidden = false;
        bell.onclick = function () { var on = false; try { on = NB.isEnabled(); NB.setEnabled(!on); } catch (e) { } localStorage.setItem("mihbara-notify-asked", "1"); setTimeout(paintBell, 400); try { toast(on ? "التنبيهات اتقفلت" : "هيجيلك تنبيه لما ينزل خبر جديد في اهتماماتك"); } catch (e) { } };
        fw.querySelector("#lvEditInts").onclick = function () { NF.showInterests(); };
        fw.querySelector("#lvMore").onclick = function () { feed.expanded = !feed.expanded; paintFeed(); };
        fw.querySelector("#lvNewPill").onclick = function () { this.hidden = true; feed.filter = "all"; paintFeed(); fw.scrollIntoView({ behavior: "smooth", block: "start" }); };
        fw.addEventListener("click", function (e) {
          var b = e.target.closest(".lv-ask"); if (b) { e.preventDefault(); askAbout("اكتب خبر صحفي بالهرم المقلوب عن العنوان ده (المصدر: " + b.dataset.s + "):\n«" + b.dataset.t + "»\nووضّح المعلومات اللي محتاجة تحقق قبل النشر."); return; }
          var a = e.target.closest("a[data-u]"); if (a) { delete feed.fresh[a.dataset.u]; var s = seenSet(); s.add(a.dataset.u); st("mihbara-feed-seen", Array.from(s).slice(-300)); }
        });
        // إخفاء الأقسام دي وقت البحث في الأدوات
        var ts = document.getElementById("toolSearch");
        if (ts) ts.addEventListener("input", function () { var on = !!this.value.trim(); ab.style.display = on ? "none" : ""; fw.style.display = on ? "none" : ""; });
        paintFeed(); paintBell();
        if (NF.myInterests()) { refreshFeed(false); notifySync(); }
        // لما ترجع للرئيسية بعد شوية، نحدّث
        new MutationObserver(function () { if (homeVisible() && Date.now() - feed.at > 2 * 60000) refreshFeed(false); })
          .observe(document.getElementById("homeView"), { attributes: true, attributeFilter: ["hidden"] });
      }
      // تحديث تلقائي
      setInterval(function () { if (document.visibilityState === "visible" && homeVisible()) refreshFeed(false); }, REFRESH_MS);
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && homeVisible() && Date.now() - feed.at > 60000) refreshFeed(false);
        if (document.visibilityState === "visible") paintBell();
        if (document.visibilityState === "hidden") markSeen();
      });
      // متابعة شاشة الاهتمامات: نضيف خانة الاهتمام الخاص، ونحدّث الأخبار بعد الحفظ
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes.forEach(function (n) { if (n.id === "interestsSheet") enhanceSheet(n); });
          m.removedNodes.forEach(function (n) { if (n.id === "interestsSheet") { feed.filter = "all"; feed.fresh = {}; paintFeed(); refreshFeed(false); notifySync(); } });
        });
      }).observe(document.body, { childList: true });
      var openSheet = document.getElementById("interestsSheet"); if (openSheet) enhanceSheet(openSheet);
    } catch (e) { console.error("live init", e); }
  });
})();
