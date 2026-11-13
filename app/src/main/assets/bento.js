/* NewsCast 360 — تبويب الأدوات الجديد (v3.4): خطوات الشغل + مربعات بنتو + شريط تنقّل عايم
   بيشتغل في الوضع الفاتح والغامق بنفس ألوان التطبيق (--a1 / --a2 / --tint) */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function N(x) { return Number(x).toLocaleString("ar-EG"); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  // خطوات الشغل: كل أداة في الخطوة اللي بتتستخدم فيها
  var STEPS = [
    { id: "find", n: "دوّر واتحقق", s: "اعرف الخبر صح قبل ما تكتب", k: ["verify", "ethics", "checklist", "brief", "outlets", "interview", "ask"] },
    { id: "write", n: "اكتب", s: "الخبر، والتقرير، والبيان، والترجمة", k: ["news", "opinion", "allformats", "proof", "templates", "content", "pressrel", "translate"] },
    { id: "shoot", n: "سجّل وصوّر", s: "الصوت والصورة والجرافيك", k: ["transcribe", "audioedit", "graphics", "camera", "jingles", "lut", "reels"] },
    { id: "air", n: "قدّم", s: "التدريب والتلقين والمذيع", k: ["onair", "tashkeel", "prompter", "studio", "guestsim", "rundown", "counter", "standup", "voicelab", "coach", "anchortest"] },
    { id: "publish", n: "انشر", s: "السوشيال والحملات", k: ["social", "campaign", "crisis", "qrshare", "widget"] },
    { id: "learn", n: "ذاكر واتطوّر", s: "الكلية، والإدارة، وشغلك الجاي", k: ["lecture", "research", "gradproj", "quiz", "glossary", "portfolio", "daily", "opps", "mproject", "mteam", "morg", "mleader"] }
  ];
  var K_STEP = "mihbara-tools-step", SHOW = 4, open4 = {};
  var DIGITS = ["١", "٢", "٣", "٤", "٥", "٦"];

  var css =
    /* رأس التبويب */
    "#toolsView.nb-on .nc-tabhead{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}" +
    "#toolsView.nb-on .nc-tabhead h2{font-size:30px;letter-spacing:-.4px}" +
    ".nb-find{flex:none;width:46px;height:46px;border-radius:16px;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:grid;place-items:center;cursor:pointer}" +
    ".nb-find svg{width:20px;height:20px}.nb-find[aria-pressed=true]{background:var(--ink);color:var(--bg)}" +
    "#toolsView.nb-on:not(.nb-search) .search{display:none}" +
    "#toolsView.nb-on:not(.nb-q) #homeGroups,#toolsView.nb-on:not(.nb-q) #nores,#toolsView.nb-on #ncCats{display:none!important}" +
    "#toolsView.nb-q #ncBento{display:none}" +
    /* شريط الخطوات */
    ".nb-steps{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:4px -16px 14px;padding:2px 16px}.nb-steps::-webkit-scrollbar{display:none}" +
    ".nb-step{flex:none;display:flex;align-items:center;gap:7px;height:40px;padding:0 15px 0 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--muted);font:inherit;font-size:13.5px;font-weight:500;white-space:nowrap;cursor:pointer;transition:background .2s,color .2s}" +
    ".nb-step b{width:22px;height:22px;border-radius:50%;background:var(--bg2);color:var(--ink);display:grid;place-items:center;font-size:11.5px}" +
    ".nb-step[aria-selected=true]{background:linear-gradient(135deg,var(--a1),var(--a2));border-color:transparent;color:#fff;font-weight:600;box-shadow:0 8px 18px -10px rgba(var(--rgb),.8)}" +
    ".nb-step[aria-selected=true] b{background:rgba(255,255,255,.25);color:#fff}" +
    ".nb-sub{margin:-4px 2px 12px;font-size:13px;color:var(--muted)}" +
    /* المربعات */
    ".nb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(116px,auto);gap:10px}" +
    ".nb-cell{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:10px;padding:15px;border-radius:24px;border:0;background:var(--tint-bg,var(--accent-soft));color:var(--ink);font:inherit;text-align:start;cursor:pointer;transition:transform .15s}" +
    ".nb-cell:active{transform:scale(.97)}" +
    ".nb-cell .nb-i{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:var(--surface);color:var(--tint,var(--accent))}" +
    ".nb-cell .nb-i svg{width:22px;height:22px}" +
    ".nb-cell b{font-size:15.5px;font-weight:600;line-height:1.4}" +
    ".nb-tags{position:absolute;top:13px;inset-inline-end:13px;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}" +
    ".nb-tag{display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:999px;background:var(--surface);color:var(--muted)}" +
    ".nb-tag svg{width:11px;height:11px}" +
    ".nb-hero{grid-column:span 2;grid-row:span 2;background:linear-gradient(140deg,var(--a1),var(--a2));color:#fff;box-shadow:0 18px 30px -18px rgba(var(--rgb),.9);padding:18px}" +
    ".nb-hero .nb-i{background:rgba(255,255,255,.18);color:#fff;width:48px;height:48px;border-radius:16px}" +
    ".nb-hero b{font-size:23px;font-weight:700}" +
    ".nb-hero p{margin:4px 0 0;font-size:13px;line-height:1.6;opacity:.88}" +
    ".nb-hero .nb-tag{background:rgba(255,255,255,.22);color:#fff}" +
    ".nb-go{display:flex;align-items:center;gap:10px;margin-top:14px}" +
    ".nb-go span:first-child{background:#fff;color:var(--a1);font-size:13.5px;font-weight:700;padding:9px 20px;border-radius:999px}" +
    ".nb-go span:last-child{font-size:12px;opacity:.8}" +
    ".nb-more{grid-column:span 2;display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:22px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;text-align:start;cursor:pointer}" +
    ".nb-more .nb-i{width:42px;height:42px;border-radius:14px;flex:none;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)}" +
    ".nb-more b{display:block;font-size:15px;font-weight:600}.nb-more small{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}" +
    ".nb-more svg.ch{width:20px;height:20px;color:var(--muted);flex:none;transition:transform .2s}.nb-more[aria-expanded=true] svg.ch{transform:rotate(-90deg)}" +
    /* شريط التنقّل العايم */
    ":root{--nb-nav:#17171C;--nb-navi:#9A9AA8}" +
    "@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--nb-nav:#262633;--nb-navi:#A3A3B5}}" +
    ":root[data-theme=dark]{--nb-nav:#262633;--nb-navi:#A3A3B5}" +
    "html body #mainnav{inset-inline:auto;left:50%;right:auto;transform:translateX(-50%);width:auto;max-width:calc(100% - 24px);gap:4px;padding:7px;border-radius:999px;background:var(--nb-nav);border:1px solid rgba(255,255,255,.06);box-shadow:0 16px 32px -12px rgba(10,10,30,.55);backdrop-filter:none}" +
    "html body #mainnav button{flex:none;flex-direction:row;justify-content:center;gap:7px;width:54px;height:48px;padding:0;border-radius:999px;color:var(--nb-navi);background:none;box-shadow:none}" +
    "html body #mainnav button span{display:none}" +
    "html body #mainnav button svg{width:22px;height:22px}" +
    "html body #mainnav button[aria-selected=true]{width:auto;padding:0 18px;background:linear-gradient(135deg,var(--a1),var(--a2));color:#fff;box-shadow:0 8px 18px -8px rgba(var(--rgb),.8)}" +
    "html body #mainnav button[aria-selected=true] span{display:inline;font-size:13.5px;font-weight:600}" +
    "@media (prefers-reduced-motion:reduce){.nb-cell,.nb-step,.nb-more svg.ch{transition:none}}";
  var se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  function meta(k) { try { return toolMeta(k); } catch (e) { return null; } }
  function icon(k) { try { return ico(k); } catch (e) { return ""; } }
  function exists(k) { return !!meta(k) && !!document.getElementById("card-" + k); }
  // الأدوات اللي اتضافت بعدين ومش في أي خطوة بتروح لآخر خطوة
  function steps() {
    var seen = {}, out = STEPS.map(function (s) { var k = s.k.filter(exists); k.forEach(function (x) { seen[x] = 1; }); return { id: s.id, n: s.n, s: s.s, k: k }; });
    [].forEach.call(document.querySelectorAll("#homeGroups .card"), function (c) { var k = c.id.replace(/^card-/, ""); if (!seen[k]) out[out.length - 1].k.push(k); });
    return out;
  }
  function usage() { var u = {}; try { loadH().forEach(function (h) { if (!u[h.tool]) u[h.tool] = { n: 0, at: h.at }; u[h.tool].n++; }); } catch (e) { } return u; }
  var LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>';
  function tags(k, hero) {
    var m = meta(k) || {}, out = [], A = window.NCAccount, S = window.NCShell;
    if (S && A && !A.play) {
      var t = S.tierOf(k), my = A.realTier();
      if (t !== "free" && (!A.enforce || A.RANK[my] < A.RANK[t])) {
        var locked = A.enforce && t === "pro";
        out.push('<span class="nb-tag">' + (locked ? LOCK : "") + (t === "pro" ? "محترف" : "طالب") + "</span>");
      }
    }
    if (m.off && !hero) out.push('<span class="nb-tag">من غير نت</span>');
    return out.length ? '<span class="nb-tags">' + out.join("") + "</span>" : "";
  }
  function ago(t) { try { return fmtDate(t); } catch (e) { return ""; } }

  var box, built = false;
  function ensure() {
    var tv = $("toolsView"); if (!tv) return null;
    if (!built) {
      built = true; tv.classList.add("nb-on");
      var head = tv.querySelector(".nc-tabhead");
      if (head) {
        head.innerHTML = '<div><p style="margin:0 0 2px">' + N(document.querySelectorAll("#homeGroups .card").length || 50) + " أداة · " + N(STEPS.length) + ' خطوات</p><h2>الأدوات</h2></div>' +
          '<button type="button" class="nb-find" aria-label="دوّر على أداة" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg></button>';
        var fb = head.querySelector(".nb-find"), si = $("toolSearch");
        fb.onclick = function () {
          var on = !tv.classList.contains("nb-search"); tv.classList.toggle("nb-search", on); fb.setAttribute("aria-pressed", on);
          if (on && si) setTimeout(function () { try { si.focus(); } catch (e) { } }, 30);
          if (!on && si && si.value) { si.value = ""; try { filterTools(); } catch (e) { } sync(); }
        };
      }
      box = document.createElement("div"); box.id = "ncBento";
      var g = $("homeGroups"); g.parentNode.insertBefore(box, g);
      var si2 = $("toolSearch"); if (si2) si2.addEventListener("input", sync);
    }
    return box;
  }
  function sync() { var tv = $("toolsView"), q = (($("toolSearch") || {}).value || "").trim(); if (tv) tv.classList.toggle("nb-q", !!q); }

  function render() {
    if (!ensure()) return;
    sync();
    var all = steps(), cur = lsGet(K_STEP);
    if (!all.some(function (s) { return s.id === cur && s.k.length; })) cur = "write";
    var st = all.filter(function (s) { return s.id === cur; })[0] || all[0];
    var use = usage();
    // الأداة الكبيرة = الأكتر استخدام في الخطوة دي، وإلا أول أداة
    var hero = st.k.slice().sort(function (a, b) { return ((use[b] || {}).n || 0) - ((use[a] || {}).n || 0); })[0];
    if (!(use[hero] || {}).n) hero = st.k[0];
    var rest = st.k.filter(function (k) { return k !== hero; });
    var expanded = !!open4[st.id], shown = expanded ? rest : rest.slice(0, SHOW), hidden = rest.length - SHOW;
    var hm = meta(hero) || {}, hu = use[hero];

    var html = '<div class="nb-steps" role="tablist" aria-label="خطوات الشغل">' + all.map(function (s, i) {
      return '<button type="button" role="tab" class="nb-step" data-s="' + s.id + '" aria-selected="' + (s.id === st.id) + '"><b>' + DIGITS[i] + "</b>" + esc(s.n) + "</button>";
    }).join("") + "</div>" +
      '<p class="nb-sub">' + esc(st.s) + " · " + N(st.k.length) + " " + (st.k.length > 10 ? "أداة" : "أدوات") + "</p>" +
      '<div class="nb-grid">' +
      '<button type="button" class="nb-cell nb-hero" data-k="' + hero + '">' + tags(hero, true) +
      '<span class="nb-i">' + icon(hero) + "</span><span><b>" + esc(hm.name || "") + "</b><p>" + esc(hm.desc || "") + '</p>' +
      '<span class="nb-go"><span>ابدأ</span><span>' + (hu ? (hu.n > 1 ? "استخدمتها " + N(hu.n) + " مرات" : "آخر مرة: " + ago(hu.at)) : (st.k.length > 1 ? "ابدأ من هنا" : "")) + "</span></span></span></button>" +
      shown.map(function (k) { var m = meta(k) || {}; return '<button type="button" class="nb-cell" data-k="' + k + '">' + tags(k) + '<span class="nb-i">' + icon(k) + "</span><b>" + esc(m.name || "") + "</b></button>"; }).join("") +
      (hidden > 0 ? '<button type="button" class="nb-more" aria-expanded="' + expanded + '"><span class="nb-i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"></rect><rect x="14" y="3" width="7" height="7" rx="2"></rect><rect x="3" y="14" width="7" height="7" rx="2"></rect><rect x="14" y="14" width="7" height="7" rx="2"></rect></svg></span><span style="flex:1"><b>' +
        (expanded ? "عرض أقل" : "+" + N(hidden) + " " + (hidden > 2 && hidden < 11 ? "أدوات تانية" : "أداة تانية") + " في «" + esc(st.n) + "»") + "</b><small>" +
        (expanded ? "رجّع الخطوة لشكلها المختصر" : rest.slice(SHOW, SHOW + 3).map(function (k) { return esc((meta(k) || {}).name || ""); }).join("، ") + (hidden > 3 ? "…" : "")) +
        '</small></span><svg class="ch" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></button>' : "") +
      "</div>";
    box.innerHTML = html;

    [].forEach.call(box.querySelectorAll(".nb-cell"), function (c) { try { tintEl(c, c.dataset.k); } catch (e) { } c.onclick = function () { open(c.dataset.k); }; });
    [].forEach.call(box.querySelectorAll(".nb-step"), function (b) {
      b.onclick = function () { lsSet(K_STEP, b.dataset.s); render(); var x = box.querySelector('.nb-step[aria-selected="true"]'); if (x) try { x.scrollIntoView({ inline: "center", block: "nearest" }); } catch (e) { } };
    });
    var mb = box.querySelector(".nb-more"); if (mb) mb.onclick = function () { open4[st.id] = !open4[st.id]; render(); };
  }
  window.NCBento = { render: render, STEPS: STEPS };

  // بنرسم لما تبويب الأدوات يتفتح، ولما الخطة أو الأدوات تتغيّر
  function hook() {
    if (window.NCShell && !NCShell.__nb) {
      var os = NCShell.show; NCShell.show = function (v) { var r = os.apply(this, arguments); if (v === "tools") try { render(); } catch (e) { console.error("bento", e); } return r; }; NCShell.__nb = true;
    }
    if (window.NCAccount) NCAccount.onChange(function () { if (typeof view !== "undefined" && view === "tools") try { render(); } catch (e) { } });
    try { if (typeof view !== "undefined" && view === "tools") render(); } catch (e) { }
  }
  document.addEventListener("DOMContentLoaded", function () { setTimeout(hook, 80); setTimeout(function () { try { if (typeof view !== "undefined" && view === "tools") render(); } catch (e) { } }, 800); });
})();
