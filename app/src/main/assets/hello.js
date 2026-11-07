/* NewsCast 360 — شاشة الترحيب (حاتم وشيماء بيرحبوا بيك) + تقسيم أوضح للرئيسية (v3.2) */
(function () {
  "use strict";
  var reduce = false; try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { }

  var css =
    /* ---------- شاشة الترحيب ---------- */
    ".nc-hello{position:fixed;inset:0;z-index:80;overflow:hidden;display:grid;place-items:center;background:radial-gradient(60rem 40rem at 50% 110%,rgba(255,255,255,.18),transparent 60%),linear-gradient(160deg,var(--a1,#e11d48),var(--a2,#7c3aed));color:#fff;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .45s ease,transform .45s ease}" +
    ".nc-hello.out{opacity:0;transform:scale(1.04);pointer-events:none}" +
    ".nc-hstage{position:relative;width:min(420px,94vw);min-height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(40px,8vh,70px);padding:24px 0 60px}" +
    ".nc-htitle{position:relative;text-align:center;animation:nchtitle .7s cubic-bezier(.2,.9,.3,1.3) .15s both}" +
    ".nc-htitle b{display:block;font-size:clamp(30px,9vw,42px);font-weight:800;letter-spacing:.5px;text-shadow:0 6px 24px rgba(0,0,0,.25)}" +
    ".nc-htitle span{display:block;font-size:16px;opacity:.92;margin-top:2px}" +
    ".nc-hsay{display:inline-block;margin-top:14px;font-size:17px;font-weight:700;background:rgba(255,255,255,.18);padding:7px 16px;border-radius:999px;backdrop-filter:blur(6px);animation:ncpopin .5s ease 1.25s both}" +
    ".nc-hcrew{position:relative;display:flex;align-items:flex-end;justify-content:center;gap:clamp(26px,9vw,56px);width:100%;padding-top:20px}" +
    ".nc-hp{position:relative;display:flex;flex-direction:column;align-items:center}" +
    ".nc-hp img{display:block;height:min(250px,34vh);width:auto;transform-origin:50% 100%;filter:drop-shadow(0 14px 14px rgba(0,0,0,.28))}" +
    ".nc-hp i{display:block;width:70%;height:14px;margin-top:-6px;border-radius:50%;background:rgba(0,0,0,.28);filter:blur(3px)}" +
    ".nc-hp.g{animation:ncinR .8s cubic-bezier(.2,.9,.3,1.2) both}.nc-hp.b{animation:ncinL .8s cubic-bezier(.2,.9,.3,1.2) .12s both}" +
    ".nc-hp img{animation:nchop .62s cubic-bezier(.3,0,.4,1) .8s infinite}.nc-hp.b img{animation-delay:1.11s}" +
    ".nc-hp i{animation:ncshadow .62s cubic-bezier(.3,0,.4,1) .8s infinite}.nc-hp.b i{animation-delay:1.11s}" +
    ".nc-wave{position:absolute;top:18%;font-size:34px;transform-origin:70% 80%;animation:ncwave .5s ease-in-out .9s infinite alternate;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}" +
    ".nc-hp.g .nc-wave{right:-22px}.nc-hp.b .nc-wave{left:-22px;animation-delay:1.15s}" +
    ".nc-hb{position:absolute;z-index:2;bottom:calc(100% + 4px);white-space:nowrap;background:#fff;color:#1b1b24;font-size:14px;font-weight:800;padding:7px 13px;border-radius:16px;box-shadow:0 10px 24px rgba(0,0,0,.22);animation:ncpopin .45s cubic-bezier(.2,.9,.3,1.4) both}" +
    ".nc-hb::after{content:'';position:absolute;bottom:-7px;left:50%;margin-left:-7px;border:7px solid transparent;border-top-color:#fff;border-bottom:0}" +
    ".nc-hp.g .nc-hb{animation-delay:.85s}.nc-hp.b .nc-hb{animation-delay:1.2s}" +
    ".nc-hskip{position:absolute;bottom:max(18px,env(safe-area-inset-bottom));left:0;right:0;text-align:center;font-size:13px;opacity:.75;animation:ncpopin .4s ease 1.6s both}" +
    ".nc-conf{position:absolute;top:-20px;width:9px;height:14px;border-radius:2px;opacity:.95;animation:ncfall linear forwards}" +
    "@keyframes ncinR{from{transform:translateX(70vw) rotate(10deg);opacity:0}to{transform:none;opacity:1}}" +
    "@keyframes ncinL{from{transform:translateX(-70vw) rotate(-10deg);opacity:0}to{transform:none;opacity:1}}" +
    "@keyframes nchop{0%,100%{transform:translateY(0) scale(1.04,.96)}12%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-34px) scale(.98,1.03)}88%{transform:translateY(0) scale(1,1)}}" +
    "@keyframes ncshadow{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.62);opacity:.45}}" +
    "@keyframes ncwave{from{transform:rotate(-18deg)}to{transform:rotate(22deg)}}" +
    "@keyframes ncpopin{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}" +
    "@keyframes nchtitle{from{transform:translateY(-30px) scale(.8);opacity:0}to{transform:none;opacity:1}}" +
    "@keyframes ncfall{to{transform:translateY(110vh) rotate(720deg)}}" +
    "@media (prefers-reduced-motion:reduce){.nc-hello *{animation-duration:.01s!important;animation-iteration-count:1!important}}" +
    /* ---------- تقسيم الرئيسية ---------- */
    ".nc-cats{position:sticky;z-index:5;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin:18px -16px 0;padding:10px 16px;background:var(--bg,#f6f6f9);-webkit-mask-image:linear-gradient(90deg,transparent,#000 16px,#000 calc(100% - 16px),transparent)}" +
    ".nc-cats::-webkit-scrollbar{display:none}" +
    ".nc-cat{flex:none;display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:999px;border:1px solid var(--line,#ddd);background:var(--card,#fff);color:var(--ink,#111);cursor:pointer;white-space:nowrap;transition:background .2s,color .2s,box-shadow .2s}" +
    ".nc-cat small{font-size:11px;font-weight:700;min-width:20px;padding:1px 6px;border-radius:999px;background:var(--bg2,#eee);color:var(--muted,#666)}" +
    ".nc-cat[aria-pressed=true]{background:linear-gradient(135deg,var(--a1,#e11d48),var(--a2,#7c3aed));color:#fff;border-color:transparent;box-shadow:0 6px 16px -6px rgba(var(--rgb,225,29,72),.6)}" +
    ".nc-cat[aria-pressed=true] small{background:rgba(255,255,255,.25);color:#fff}" +
    "#homeGroups .grp{position:relative;margin-top:18px;padding:16px 14px 14px;border-radius:22px;background:var(--card,#fff);border:1px solid var(--line,#e5e5ea)}" +
    "#homeGroups .grp>.group-title{display:flex;align-items:center;gap:8px;margin:0}" +
    "#homeGroups .grp>.group-title .nc-gi{font-size:20px;line-height:1}" +
    "#homeGroups .grp>.group-title .nc-gc{margin-inline-start:auto;font-size:12px;font-weight:700;color:var(--muted,#666);background:var(--bg2,#eee);padding:2px 9px;border-radius:999px}" +
    "#homeGroups .grp>.group-sub{margin:4px 0 0;font-size:13px;color:var(--muted,#666)}" +
    "#homeGroups .grp.nc-fold .card.nc-more{display:none}" +
    ".nc-morebtn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin-top:10px;font:inherit;font-size:13.5px;font-weight:700;color:var(--accent,#e11d48);background:var(--bg2,#f1f1f4);border:0;border-radius:14px;padding:10px;cursor:pointer}" +
    ".nc-morebtn svg{width:16px;height:16px;transition:transform .25s}.grp:not(.nc-fold) .nc-morebtn svg{transform:rotate(180deg)}" +
    "#homeGroups.nc-q .grp.nc-fold .card.nc-more{display:flex}#homeGroups.nc-q .nc-morebtn{display:none}";
  var se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  // =================== شاشة الترحيب ===================
  function greetName() {
    try { var me = window.NCAccount && NCAccount.me; var n = me && (me.name || "").trim().split(/\s+/)[0]; return n || ""; } catch (e) { return ""; }
  }
  function showHello() {
    if (document.querySelector(".nc-hello")) return;
    var h = new Date().getHours(), part = h >= 5 && h < 12 ? "صباح الخير" : h >= 12 && h < 17 ? "نهارك سعيد" : "مساء الخير";
    var nm = greetName();
    var el = document.createElement("div"); el.className = "nc-hello"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "أهلاً بيك في NewsCast 360");
    el.innerHTML = '<div class="nc-hstage">' +
      '<div class="nc-htitle"><b>NewsCast 360</b><span>خليك محاوط الخبر</span><div class="nc-hsay">' + part + (nm ? " يا " + nm.replace(/[<>&"]/g, "") : "") + ' ✨</div></div>' +
      '<div class="nc-hcrew">' +
      '<div class="nc-hp g"><span class="nc-hb">أهلاً بيك! 👋</span><img src="nc-girl.webp" alt="شيماء"><i></i></div>' +
      '<div class="nc-hp b"><span class="nc-hb">منوّر يا بطل!</span><img src="nc-boy.webp" alt="حاتم"><i></i></div>' +
      '</div><div class="nc-hskip">اضغط في أي حتة للدخول</div></div>';
    // قصاقيص ملونة
    if (!reduce) {
      var cols = ["#ffd43b", "#ffffff", "#69db7c", "#74c0fc", "#ff8787", "#e599f7"];
      for (var i = 0; i < 26; i++) {
        var c = document.createElement("span"); c.className = "nc-conf";
        c.style.left = (Math.random() * 100) + "%"; c.style.background = cols[i % cols.length];
        c.style.animationDuration = (2.2 + Math.random() * 1.8) + "s"; c.style.animationDelay = (Math.random() * 1.2) + "s";
        c.style.transform = "rotate(" + (Math.random() * 180) + "deg)"; el.appendChild(c);
      }
    }
    document.body.appendChild(el);
    var prevOv = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    var closed = false;
    function close() {
      if (closed) return; closed = true; el.classList.add("out");
      setTimeout(function () { el.remove(); var g = document.querySelector(".nc-gate:not([hidden])"); if (!g) document.documentElement.style.overflow = prevOv === "hidden" ? "" : prevOv; }, 460);
    }
    el.addEventListener("click", close);
    setTimeout(close, reduce ? 1200 : 3600);
    window.ncHelloClose = close;
  }
  // تظهر مرة مع كل فتحة للتطبيق (مش مع كل رجوع للرئيسية)
  var shown = false; try { shown = sessionStorage.getItem("nc-hello") === "1"; sessionStorage.setItem("nc-hello", "1"); } catch (e) { }
  if (!shown) { if (document.body) showHello(); else document.addEventListener("DOMContentLoaded", showHello); }
  // نجهّز الصور بدري
  ["nc-girl.webp", "nc-boy.webp"].forEach(function (u) { var i = new Image(); i.src = u; });

  // =================== تقسيم الرئيسية ===================
  var ICONS_G = [
    [/موادي|الدراس/, "📚", "موادي"], [/غرفة الأخبار/, "📰", "غرفة الأخبار"], [/إدارة/, "📊", "الإدارة"], [/عُدّة|عدة/, "🧰", "عُدّة الإعلامي"],
    [/الكتابة|التحرير/, "✍️", "الكتابة"], [/التحقق/, "🔎", "التحقق"], [/الاستوديو/, "🎬", "الاستوديو"], [/صناعة المحتوى|السوشيال/, "📱", "المحتوى"],
    [/تدريب المذيع/, "🎙️", "تدريب المذيع"], [/الصوت والصورة/, "🎧", "صوت وصورة"], [/الفكر|العلاقات/, "🧠", "علاقات عامة ودراسة"], [/مستقبلك|المهني/, "🚀", "مستقبلك"]
  ];
  function meta(title) { for (var i = 0; i < ICONS_G.length; i++) if (ICONS_G[i][0].test(title)) return { i: ICONS_G[i][1], n: ICONS_G[i][2] }; return { i: "✨", n: title }; }
  var K_CAT = "mihbara-home-cat", K_OPEN = "mihbara-home-open";
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  var FOLD = 4;
  function enhanceHome() {
    var box = document.getElementById("homeGroups"); if (!box) return;
    var groups = [].slice.call(box.querySelectorAll(":scope > .grp")); if (!groups.length) return;
    var opened = {}; try { opened = JSON.parse(lsGet(K_OPEN) || "{}"); } catch (e) { }
    groups.forEach(function (g, gi) {
      var t = g.querySelector(".group-title"), title = t ? t.textContent : "", m = meta(title);
      g.dataset.cat = String(gi); g.dataset.title = title;
      var cards = [].slice.call(g.querySelectorAll(".card"));
      if (t && !t.querySelector(".nc-gi")) { var ic = document.createElement("span"); ic.className = "nc-gi"; ic.textContent = m.i; t.prepend(ic); var cn = document.createElement("span"); cn.className = "nc-gc"; cn.textContent = cards.length.toLocaleString("ar-EG"); t.append(cn); }
      cards.forEach(function (c, i) { c.classList.toggle("nc-more", i >= FOLD); });
      if (cards.length > FOLD && !g.querySelector(".nc-morebtn")) {
        var b = document.createElement("button"); b.type = "button"; b.className = "nc-morebtn";
        var paint = function () { var f = g.classList.contains("nc-fold"); b.innerHTML = (f ? "عرض الكل (" + cards.length.toLocaleString("ar-EG") + ")" : "عرض أقل") + ' <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>'; };
        b.onclick = function () { g.classList.toggle("nc-fold"); opened[title] = !g.classList.contains("nc-fold"); lsSet(K_OPEN, JSON.stringify(opened)); paint(); if (g.classList.contains("nc-fold")) { var y = g.getBoundingClientRect().top + scrollY - 140; if (y < scrollY) scrollTo({ top: y, behavior: "smooth" }); } };
        g.classList.toggle("nc-fold", !opened[title]); paint(); g.appendChild(b);
      } else if (cards.length <= FOLD) g.classList.remove("nc-fold");
    });
    // شريط الأقسام
    var bar = document.getElementById("ncCats");
    if (!bar) { bar = document.createElement("div"); bar.id = "ncCats"; bar.className = "nc-cats"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "أقسام الأدوات"); box.parentNode.insertBefore(bar, box); }
    var total = box.querySelectorAll(".card").length;
    bar.innerHTML = '<button type="button" class="nc-cat" data-c="all">🗂️ الكل <small>' + total.toLocaleString("ar-EG") + '</small></button>' +
      groups.map(function (g) { var m = meta(g.dataset.title); return '<button type="button" class="nc-cat" data-c="' + g.dataset.cat + '" data-t="' + g.dataset.title.replace(/"/g, "&quot;") + '">' + m.i + " " + m.n + ' <small>' + g.querySelectorAll(".card").length.toLocaleString("ar-EG") + '</small></button>'; }).join("");
    var cur = lsGet(K_CAT) || "all";
    if (cur !== "all" && !groups.some(function (g) { return g.dataset.title === cur; })) cur = "all";
    [].forEach.call(bar.querySelectorAll(".nc-cat"), function (b) {
      b.onclick = function () { cur = b.dataset.c === "all" ? "all" : b.dataset.t; lsSet(K_CAT, cur); apply(true); };
    });
    function apply(scroll) {
      var q = (document.getElementById("toolSearch") || {}).value || "";
      [].forEach.call(bar.querySelectorAll(".nc-cat"), function (b) {
        var on = cur === "all" ? b.dataset.c === "all" : b.dataset.t === cur; b.setAttribute("aria-pressed", on);
        if (on && scroll) try { b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); } catch (e) { }
      });
      groups.forEach(function (g) {
        var hideCat = !q.trim() && cur !== "all" && g.dataset.title !== cur;
        g.style.display = hideCat ? "none" : "";
        if (cur !== "all" && g.dataset.title === cur) g.classList.remove("nc-fold");
      });
      if (scroll) { var y = bar.getBoundingClientRect().top + scrollY - stickTop() - 4; if (Math.abs(scrollY - y) > 10 && scrollY > y) scrollTo({ top: y, behavior: "smooth" }); }
    }
    window.ncApplyCat = apply;
    bar.style.top = stickTop() + "px";
    apply(false);
  }
  function stickTop() { var h = document.querySelector("header"); if (!h) return 0; var r = h.getBoundingClientRect(); return Math.max(0, Math.round(r.bottom)); }
  addEventListener("resize", function () { var b = document.getElementById("ncCats"); if (b) b.style.top = stickTop() + "px"; });

  function hook() {
    if (typeof buildHome !== "function" || buildHome.__nc) return;
    var ob = buildHome;
    buildHome = function () { var r = ob.apply(this, arguments); try { enhanceHome(); } catch (e) { console.error("home", e); } return r; };
    buildHome.__nc = true;
    if (typeof filterTools === "function") {
      var of = filterTools;
      filterTools = function () {
        var r = of.apply(this, arguments);
        var q = ((document.getElementById("toolSearch") || {}).value || "").trim(), box = document.getElementById("homeGroups"), bar = document.getElementById("ncCats");
        if (box) box.classList.toggle("nc-q", !!q); if (bar) bar.style.display = q ? "none" : "";
        if (!q && window.ncApplyCat) window.ncApplyCat(false);
        return r;
      };
      var s = document.getElementById("toolSearch"); if (s) s.addEventListener("input", function () { filterTools(); });
    }
    try { buildHome(); } catch (e) { }
  }
  // بعد ما كل الإضافات تضيف أدواتها (kit.js بيبني الرئيسية في setTimeout)
  document.addEventListener("DOMContentLoaded", function () { setTimeout(hook, 30); setTimeout(function () { try { enhanceHome(); } catch (e) { } }, 600); });
})();
