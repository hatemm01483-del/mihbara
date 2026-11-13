/* NewsCast 360 — الواجهة الجديدة (v3.3)
   4 تبويبات: الرئيسية · الأدوات · الحساب · الإعدادات
   + لعبة «حقيقة ولا شائعة؟» + أقفال الخطط على الأدوات */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function N(x) { return Number(x).toLocaleString("ar-EG"); }
  function st(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function say(t) { try { toast(t); } catch (e) { } }
  function icon(k) { try { return ico(k); } catch (e) { return ""; } }
  var ACC = function () { return window.NCAccount || null; };

  // ================= الخطط: كل أداة في أنهي خطة =================
  // مجاني: عُدّة الإعلامي + اللعبة + الاختبار والسجل · محترف: الصوت والصورة + الاستوديو (المذيع الافتراضي) · الباقي: طالب
  var FREE_PAGES = { home: 1, tools: 1, account: 1, settings: 1, game: 1, quiz: 1, history: 1 };
  var tierMap = null;
  function buildTierMap() {
    tierMap = {};
    try {
      GROUPS.forEach(function (g) {
        var t = /عُدّة|عدة/.test(g.title) ? "free" : /الصوت والصورة|الاستوديو/.test(g.title) ? "pro" : "student";
        g.items.forEach(function (k) { if (!tierMap[k] || tierMap[k] === "student") tierMap[k] = t; });
      });
    } catch (e) { }
    tierMap.studio = "pro";
    return tierMap;
  }
  function tierOfTool(k) { if (FREE_PAGES[k]) return "free"; if (!tierMap) buildTierMap(); return tierMap[k] || "student"; }
  var NCShell = window.NCShell = { tierOf: tierOfTool };
  NCShell.canOpen = function (k) {
    var A = ACC(); if (!A || !A.enforce) return true;
    var t = tierOfTool(k);
    if (t === "pro" && !A.can("pro")) { A.showPaywall("pro", "tool"); return false; }
    return true;
  };
  // شارة الخطة على كروت الأدوات
  function decorate() {
    buildTierMap();
    var A = ACC(), enforce = A && A.enforce, my = A ? A.realTier() : "free";
    [].forEach.call(document.querySelectorAll("#homeGroups .card"), function (c) {
      var k = c.id.replace(/^card-/, ""), t = tierOfTool(k), b = c.querySelector(".nc-lock");
      var show = t !== "free" && !(A && A.play) && (!enforce || A.RANK[my] < A.RANK[t]);
      if (!show) { if (b) b.remove(); c.classList.remove("nc-locked"); return; }
      if (!b) { b = document.createElement("em"); b.className = "nc-lock"; c.append(b); }
      var locked = enforce && t === "pro";
      b.className = "nc-lock " + t; b.textContent = (locked ? "🔒 " : t === "pro" ? "⭐ " : "🎓 ") + (t === "pro" ? "محترف" : "طالب");
      c.classList.toggle("nc-locked", locked);
    });
  }
  NCShell.decorate = decorate;

  // ================= الشكل =================
  var css =
    ".nc-tabhead{margin:4px 2px 14px}.nc-tabhead h2{margin:0;font-family:var(--display);font-size:24px}.nc-tabhead p{margin:2px 0 0;color:var(--muted);font-size:14px}" +
    ".card .nc-lock{position:absolute;bottom:8px;inset-inline-end:8px;font-style:normal;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:var(--accent-soft,rgba(37,99,235,.12));color:var(--accent,#2563eb);pointer-events:none}" +
    ".card .nc-lock.pro{background:rgba(245,159,0,.15);color:#b86e00}.card{position:relative}.card.nc-locked{opacity:.78}" +
    /* الرئيسية */
    ".nc-hx{display:grid;gap:12px;margin:14px 0}" +
    ".nc-gamecard{position:relative;overflow:hidden;display:flex;align-items:center;gap:12px;width:100%;text-align:start;font:inherit;color:#fff;cursor:pointer;border:0;border-radius:22px;padding:16px 16px 16px 8px;background:linear-gradient(135deg,#7c3aed,#e11d48);box-shadow:0 14px 30px -16px rgba(124,58,237,.7)}" +
    ".nc-gamecard .gi{flex:none;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:rgba(255,255,255,.18);font-size:28px}" +
    ".nc-gamecard b{display:block;font-size:17px}.nc-gamecard small{display:block;opacity:.9;font-size:13px;margin-top:2px}" +
    ".nc-gamecard img{height:78px;margin-inline-start:auto;margin-block:-16px -18px;filter:drop-shadow(0 8px 8px rgba(0,0,0,.25))}" +
    ".nc-short{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}" +
    ".nc-short button{display:flex;flex-direction:column;align-items:center;gap:6px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink);background:var(--card);border:1px solid var(--line);border-radius:18px;padding:12px 4px;cursor:pointer}" +
    ".nc-short svg{width:22px;height:22px;color:var(--accent)}" +
    ".nc-planbar{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-radius:18px;background:var(--card);border:1px solid var(--line);font-size:13.5px}.nc-planbar .btn{padding:8px 14px;font-size:13px}" +
    /* الإعدادات */
    ".nc-set{display:grid;gap:14px}.nc-group{background:var(--card);border:1px solid var(--line);border-radius:20px;overflow:hidden}" +
    ".nc-group h3{margin:0;padding:12px 16px 4px;font-size:13px;color:var(--muted);font-weight:700}" +
    ".nc-row{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:10px 16px;font:inherit;color:var(--ink);background:none;border:0;border-top:1px solid var(--line);text-align:start;cursor:pointer}" +
    ".nc-group h3+.nc-row{border-top:0}.nc-row .ri{flex:none;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;font-size:17px;background:var(--bg2)}" +
    ".nc-row .rt{flex:1;min-width:0}.nc-row .rt b{display:block;font-size:15px;font-weight:600}.nc-row .rt small{display:block;color:var(--muted);font-size:12.5px}" +
    ".nc-row .rv{color:var(--muted);font-size:13px}.nc-row.danger b{color:#e03131}" +
    ".nc-segs{display:flex;gap:4px;padding:3px;border-radius:12px;background:var(--bg2)}.nc-segs button{font:inherit;font-size:12.5px;border:0;background:none;color:var(--muted);padding:6px 10px;border-radius:9px;cursor:pointer}.nc-segs button[aria-pressed=true]{background:var(--card);color:var(--ink);font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,.12)}" +
    ".nc-sw{position:relative;flex:none;width:46px;height:28px;border-radius:999px;background:var(--line);transition:background .2s}.nc-sw::after{content:'';position:absolute;top:3px;inset-inline-start:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:inset-inline-start .2s}" +
    ".nc-sw[aria-checked=true]{background:var(--accent,#2563eb)}.nc-sw[aria-checked=true]::after{inset-inline-start:21px}" +
    ".nc-about{text-align:center;color:var(--muted);font-size:12.5px;padding:6px 0 10px}" +
    /* اللعبة */
    ".gm{max-width:520px;margin:0 auto}.gm-top{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;font-size:13.5px}" +
    ".gm-pill{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;background:var(--card);border:1px solid var(--line);font-weight:700}" +
    ".gm-time{height:6px;border-radius:999px;background:var(--line);overflow:hidden;margin-bottom:14px}.gm-time i{display:block;height:100%;background:linear-gradient(90deg,#0c8a63,#f59f00,#e03131);background-size:300% 100%;transition:width .1s linear}" +
    ".gm-stage{position:relative;height:min(360px,52vh);touch-action:pan-y;user-select:none;-webkit-user-select:none}" +
    ".gm-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:24px 22px;border-radius:26px;background:var(--card);border:1px solid var(--line);box-shadow:0 24px 40px -24px rgba(0,0,0,.45);font-size:18px;font-weight:600;line-height:1.75;cursor:grab;will-change:transform}" +
    ".gm-card.back{transform:scale(.94) translateY(14px);opacity:.6;pointer-events:none}" +
    ".gm-card .gq{font-size:12.5px;font-weight:700;color:var(--muted)}" +
    ".gm-stamp{position:absolute;top:22px;font-size:20px;font-weight:900;padding:4px 14px;border:3px solid;border-radius:12px;opacity:0;transform:rotate(-12deg)}" +
    ".gm-stamp.t{inset-inline-start:18px;color:#0c8a63}.gm-stamp.f{inset-inline-end:18px;color:#e03131;transform:rotate(12deg)}" +
    ".gm-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.gm-btns button{font:inherit;font-size:16px;font-weight:800;padding:14px;border-radius:18px;border:0;cursor:pointer;color:#fff}" +
    ".gm-btns .gf{background:#e03131}.gm-btns .gt{background:#0c8a63}.gm-hint{text-align:center;color:var(--muted);font-size:12.5px;margin-top:8px}" +
    ".gm-res{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:22px;border-radius:26px;color:#fff;font-size:15px;animation:gmIn .25s ease}" +
    ".gm-res.ok{background:linear-gradient(135deg,#0c8a63,#0ca678)}.gm-res.no{background:linear-gradient(135deg,#c92a2a,#e8590c)}.gm-res b{font-size:24px}.gm-res .btn{background:#fff;color:#111;margin-top:6px}" +
    "@keyframes gmIn{from{transform:scale(.92);opacity:0}}" +
    ".gm-start{text-align:center;padding:10px 0}.gm-start .crew{display:flex;justify-content:center;gap:28px;align-items:flex-end;height:150px}.gm-start .crew img{height:140px;animation:ncbob 1.6s ease-in-out infinite}.gm-start .crew img+img{animation-delay:-.8s}" +
    ".gm-start h2{font-family:var(--display);font-size:26px;margin:10px 0 4px}.gm-start p{color:var(--muted);margin:0 0 14px}" +
    ".gm-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.gm-stats div{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:10px 4px}.gm-stats b{display:block;font-size:20px}.gm-stats span{font-size:12px;color:var(--muted)}" +
    ".gm-lv{margin:4px auto 0;max-width:320px;font-size:13px}.gm-lv .nc-meter{height:8px}" +
    ".gm-start .btn{width:100%;padding:14px;font-size:16px;margin-top:8px}" +
    ".gm-pop{font-size:56px;line-height:1;animation:ncpop .6s ease}" +
    "@keyframes ncbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes ncpop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}" +
    "@media (prefers-reduced-motion:reduce){.gm-start .crew img{animation:none}}";
  var se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  // ================= الرئيسية =================
  function renderHomeExtra() {
    var box = $("ncHomeExtra"); if (!box) return;
    var hero = document.querySelector("#homeView .hhero"); if (hero && hero.nextElementSibling !== box) hero.after(box);
    var g = st("mihbara-game") || {}, A = ACC();
    var planbar = "";
    if (A && A.enforce && A.realTier() === "free")
      planbar = '<div class="nc-planbar"><span>🌱 الخطة المجانية · باقي <b>' + N(A.leftToday()) + '</b> استخدام ذكي النهارده</span><button class="btn" type="button" data-go="plans">شوف الخطط</button></div>';
    box.innerHTML = '<div class="nc-hx">' + planbar +
      '<button type="button" class="nc-gamecard" data-go="game"><span class="gi">🕵️</span><span><b>حقيقة ولا شائعة؟</b><small>' + (g.best ? "أعلى سكور ليك: " + N(g.best) + " · كسّر الرقم!" : "لعبة: اسحب الخبر يمين لو حقيقة وشمال لو شائعة") + '</small></span><img src="nc-boy.webp" alt=""></button>' +
      '<div class="nc-short">' + [["tools", "كل الأدوات"], ["quiz", "الاختبار"], ["history", "السجل"], ["studio", "المذيع"]].map(function (x) {
        return '<button type="button" data-go="' + x[0] + '">' + icon(x[0]) + '<span>' + x[1] + '</span></button>';
      }).join("") + '</div></div>';
    [].forEach.call(box.querySelectorAll("[data-go]"), function (b) {
      b.onclick = function () { var k = b.dataset.go; if (k === "plans") { A.showPaywall("student"); return; } open(k); };
    });
  }

  // ================= الإعدادات =================
  var ZOOM = [["0.9", "صغير"], ["1", "عادي"], ["1.12", "كبير"]];
  function applyZoom() { var z = st("mihbara-zoom"); try { document.body.style.zoom = z && z !== "1" ? z : ""; } catch (e) { } }
  function renderSettings() {
    var el = $("settingsView"); if (!el) return;
    var theme = (function () { try { return localStorage.getItem("mihbara-theme") || ""; } catch (e) { return ""; } })();
    var NB = window.MihbaraNotify, notif = false; try { notif = !!(NB && NB.isEnabled()); } catch (e) { }
    var z = st("mihbara-zoom") || "1", ints = (st("mihbara-interests") || []).length;
    function seg(name, opts, val) { return '<span class="nc-segs" data-seg="' + name + '">' + opts.map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (o[0] === val) + '">' + o[1] + '</button>'; }).join("") + '</span>'; }
    function row(id, ic, t, s, right, cls) { return '<button type="button" class="nc-row ' + (cls || "") + '" data-r="' + id + '"><span class="ri">' + ic + '</span><span class="rt"><b>' + t + '</b>' + (s ? "<small>" + s + "</small>" : "") + '</span>' + (right || "") + '</button>'; }
    function div(id, ic, t, s, right) { return '<div class="nc-row" data-r="' + id + '" style="cursor:default"><span class="ri">' + ic + '</span><span class="rt"><b>' + t + '</b>' + (s ? "<small>" + s + "</small>" : "") + '</span>' + right + '</div>'; }
    el.innerHTML = '<div class="nc-tabhead"><h2>الإعدادات</h2><p>خلّي التطبيق على مزاجك</p></div><div class="nc-set">' +
      '<div class="nc-group"><h3>الشكل</h3>' +
      div("theme", "🌗", "المظهر", "", seg("theme", [["", "تلقائي"], ["light", "فاتح"], ["dark", "غامق"]], theme)) +
      div("zoom", "🔠", "حجم الخط", "", seg("zoom", ZOOM, z)) + '</div>' +
      '<div class="nc-group"><h3>الأخبار والتنبيهات</h3>' +
      row("ints", "🧭", "اهتماماتك في الأخبار", ints ? N(ints) + " اهتمامات مختارة" : "اختار المواضيع اللي تهمك", '<span class="rv">‹</span>') +
      (NB ? row("notif", "🔔", "إشعارات الأخبار العاجلة", "تنبيه لما يحصل خبر مهم في اهتماماتك", '<span class="nc-sw" role="switch" aria-checked="' + notif + '"></span>') : "") + '</div>' +
      '<div class="nc-group"><h3>الحساب</h3>' + row("acct", "👤", "الحساب والخطط", "", '<span class="rv">‹</span>') + '</div>' +
      '<div class="nc-group"><h3>البيانات</h3>' +
      row("hist", "🗂️", "مسح السجل", "يمسح كل النتايج المحفوظة", "", "danger") +
      row("game0", "🕹️", "تصفير اللعبة", "يمسح السكور والمستوى", "", "danger") +
      row("all", "🧹", "مسح كل بيانات التطبيق", "يرجّع التطبيق زي ما نزّلته", "", "danger") + '</div>' +
      '<div class="nc-group"><h3>عن التطبيق</h3>' +
      row("tour", "🧭", "جولة في التطبيق", "", '<span class="rv">‹</span>') +
      row("privacy", "🔒", "سياسة الخصوصية", "", '<span class="rv">‹</span>') +
      row("terms", "📄", "الشروط والأحكام", "", '<span class="rv">‹</span>') + '</div>' +
      '<p class="nc-about">NewsCast 360 · نسخة 3.4<br>خليك محاوط الخبر</p></div>';
    [].forEach.call(el.querySelectorAll("[data-seg]"), function (s) {
      [].forEach.call(s.querySelectorAll("button"), function (b) {
        b.onclick = function () {
          [].forEach.call(s.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", x === b); });
          var v = b.dataset.v;
          if (s.dataset.seg === "theme") { try { if (v) localStorage.setItem("mihbara-theme", v); else localStorage.removeItem("mihbara-theme"); applyTheme(v); } catch (e) { } }
          if (s.dataset.seg === "zoom") { st("mihbara-zoom", v); applyZoom(); }
        };
      });
    });
    var arm = {};
    function confirmTwice(b, msg, fn) {
      var k = b.dataset.r; if (arm[k]) { arm[k] = 0; fn(); return; }
      arm[k] = 1; var s = b.querySelector("small"), old = s.textContent; s.textContent = msg; setTimeout(function () { arm[k] = 0; s.textContent = old; }, 3500);
    }
    var on = function (id, fn) { var b = el.querySelector('[data-r="' + id + '"]'); if (b) b.onclick = function () { fn(b); }; };
    on("ints", function () { try { NF.showInterests(); } catch (e) { say("الأخبار مش متاحة دلوقتي"); } });
    on("notif", function (b) { try { var v = !NB.isEnabled(); NB.setEnabled(v); localStorage.setItem("mihbara-notify-asked", "1"); b.querySelector(".nc-sw").setAttribute("aria-checked", v); say(v ? "الإشعارات اتفعّلت ✓" : "الإشعارات اتقفلت"); } catch (e) { } });
    on("acct", function () { open("account"); });
    on("hist", function (b) { confirmTwice(b, "دوس تاني للتأكيد", function () { try { localStorage.removeItem("mihbara-history"); } catch (e) { } try { updateStats(); buildRecent(); } catch (e) { } say("السجل اتمسح ✓"); }); });
    on("game0", function (b) { confirmTwice(b, "دوس تاني للتأكيد", function () { try { localStorage.removeItem("mihbara-game"); } catch (e) { } say("اللعبة اتصفّرت ✓"); }); });
    on("all", function (b) { confirmTwice(b, "دوس تاني للتأكيد — مش هينفع ترجّعها", function () { try { var keep = ["mihbara-acct-dev"]; Object.keys(localStorage).forEach(function (k) { if (/^mihbara-/.test(k) && keep.indexOf(k) < 0) localStorage.removeItem(k); }); } catch (e) { } location.reload(); }); });
    on("tour", function () { var t = $("openTour"); if (t) t.click(); });
    on("privacy", function () { try { openLegal("privacy"); } catch (e) { } });
    on("terms", function () { try { openLegal("terms"); } catch (e) { } });
  }

  // ================= اللعبة: حقيقة ولا شائعة؟ =================
  var MORE = [
    ["أعلنت وزارة التربية والتعليم مواعيد امتحانات الثانوية العامة في مؤتمر صحفي ونشرتها على موقعها الرسمي.", true, "جهة مسؤولة، ومؤتمر علني، وموقع رسمي."],
    ["«خبر عاجل»: حظر تجول في كل المحافظات من بكره! — والمصدر رسالة متداولة على واتساب.", false, "قرار بالحجم ده بيطلع من جهة رسمية ويتنقل في كل القنوات، مش رسالة واتساب."],
    ["صورة لسمكة قرش في شارع بعد السيول.", false, "صورة شهيرة متفبركة بتتنشر مع كل فيضان. اعمل بحث عكسي."],
    ["نشرت جامعة القاهرة على صفحتها الرسمية الموثقة نتيجة تنسيق المرحلة الأولى.", true, "صفحة رسمية موثقة للجهة صاحبة الشأن."],
    ["دراسة منشورة في مجلة علمية محكّمة وذكرت أسماء الباحثين وحجم العينة.", true, "مجلة محكّمة + أسماء + منهجية واضحة = مصدر قوي."],
    ["«اشرب مية سخنة بليمون كل يوم وهتتحمى من كل الأمراض» — منشور عليه مليون لايك.", false, "عدد اللايكات مش دليل. ادعاء طبي مبالغ فيه ومن غير مصدر علمي."],
    ["وكالة أنباء رسمية نقلت تصريح المتحدث العسكري بالنص مع فيديو المؤتمر.", true, "نص التصريح + فيديو + وكالة رسمية."],
    ["لاعب مشهور «اتعاقد مع ريال مدريد» — حساب ساخر اسمه شبه اسم صحفي رياضي معروف.", false, "حسابات الانتحال والسخرية بتقلّد أسماء الصحفيين. بص على اليوزر والتوثيق."],
    ["فيديو قديم لمظاهرة في بلد تاني بيتنشر على إنه حصل النهارده في مصر.", false, "إعادة سياق. دوّر على أول ظهور للفيديو ولافتات ولغة الناس فيه."],
    ["موقع إخباري معروف نشر الخبر وكتب اسم المحرر ورابط البيان الأصلي.", true, "شفافية: اسم كاتب + رابط للمصدر الأصلي تقدر ترجعله."],
    ["لينك «سجّل هنا عشان تاخد منحة 5000 جنيه من الحكومة» على موقع غريب.", false, "تصيّد. المنح الحكومية بتتعلن على المواقع الرسمية (.gov.eg)."],
    ["الهيئة العامة للأرصاد نبّهت من شبورة مائية الصبح على الطرق السريعة.", true, "جهة مختصة في نطاق تخصصها."],
    ["«مصادر» بتقول إن سعر الدولار هيوصل 200 جنيه الأسبوع الجاي.", false, "مصادر مجهولة + توقع مبالغ فيه + تخويف. ارجع للبنك المركزي والمحللين المعروفين."],
    ["صورة لتصريح منسوب لوزير مكتوبة بخط وتصميم مختلف عن صفحة الوزارة.", false, "التصميم المختلف علامة على التفبريك. قارن بالصفحة الرسمية."],
    ["أعلن النادي الأهلي على حسابه الرسمي الموثق التعاقد مع مدرب جديد.", true, "الإعلان من الجهة نفسها على حسابها الموثق."],
    ["فيديو بالذكاء الاصطناعي لمذيع مشهور بيعلن عن دواء سحري للتخسيس.", false, "تزييف عميق للإعلانات. المذيعين مابيعلنوش عن أدوية بالشكل ده، ودوّر على تشوّه الشفايف والصوت."],
    ["إحصائية من الجهاز المركزي للتعبئة العامة والإحصاء عن عدد السكان.", true, "الجهة الرسمية المختصة بالإحصاءات في مصر."],
    ["«أول مرة في التاريخ!» — بوست بيقول إن الشمس هتطلع من الغرب الشهر الجاي.", false, "ادعاء مستحيل علمياً بصياغة مثيرة."],
    ["تقرير منشور في 3 وكالات أنباء دولية بنفس التفاصيل عن زلزال في اليابان، مع بيان هيئة الأرصاد اليابانية.", true, "تعدد مصادر مستقلة + جهة رسمية مختصة."],
    ["تسجيل صوتي «مسرّب» من غير ما نعرف مين اللي سجّله ولا إمتى.", false, "التسجيلات مجهولة المصدر ممكن تكون مقطوعة أو متركبة. محتاج تأكيد من أطرافها."],
    ["الخبر بيقول «وفقاً لدراسة» ومفيش أي رابط ولا اسم جامعة.", false, "«دراسة» من غير تفاصيل = جملة للإقناع بس."],
    ["مجلس الوزراء نشر إنفوجراف رسمي بيرد على شائعة ويوضح الحقيقة.", true, "المركز الإعلامي لمجلس الوزراء مصدر رسمي للرد على الشائعات."],
    ["حساب جديد عنده 20 متابع نشر «انفراد» عن خبر سياسي كبير.", false, "حساب جديد ومن غير تاريخ = موثوقيته ضعيفة جداً."],
    ["صحفي ميداني بث مباشر من موقع الحريق وظهرت معالم المكان واضحة.", true, "بث مباشر من المكان بمعالم واضحة دليل قوي (بس لسه اتأكد من التفاصيل)."]
  ];
  var LEVELS = ["متدرب", "محرر مبتدئ", "مدقق أخبار", "محقق رقمي", "صياد شائعات", "رئيس تحرير", "أسطورة التحقق"];
  function lvOf(xp) { var l = Math.floor(Math.sqrt((xp || 0) / 60)); return Math.min(l, LEVELS.length - 1); }
  function lvXP(l) { return l * l * 60; }
  function pool() { var a = (window.NC_DAILY && NC_DAILY.fake) || []; return a.concat(MORE); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var G = null, timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function renderGameStart(el) {
    stopTimer();
    var g = st("mihbara-game") || {}, xp = g.xp || 0, lv = lvOf(xp), nx = lv < LEVELS.length - 1 ? lvXP(lv + 1) : lvXP(lv), cur = lvXP(lv);
    var pct = lv >= LEVELS.length - 1 ? 100 : Math.round((xp - cur) / Math.max(1, nx - cur) * 100);
    var aiOK = !!(window.NC && NC.ai && window.MIHBARA_CONFIG && MIHBARA_CONFIG.server);
    el.innerHTML = '<div class="gm"><div class="gm-start"><div class="crew" aria-hidden="true"><img src="nc-girl.webp" alt=""><img src="nc-boy.webp" alt=""></div>' +
      '<h2>حقيقة ولا شائعة؟</h2><p>هيظهرلك خبر. اسحبه <b>يمين لو حقيقة</b> و<b>شمال لو شائعة</b> — قبل ما الوقت يخلص!</p>' +
      '<div class="gm-stats"><div><b>' + N(g.best || 0) + '</b><span>أعلى سكور</span></div><div><b>' + N(g.games || 0) + '</b><span>جولات</span></div><div><b>' + N(g.right || 0) + '</b><span>إجابات صح</span></div></div>' +
      '<div class="gm-lv">المستوى <b>' + N(lv + 1) + ' · ' + LEVELS[lv] + '</b><div class="nc-meter"><i style="width:' + pct + '%"></i></div></div>' +
      '<button class="btn" type="button" id="gmGo">يلا نلعب (١٠ أخبار)</button>' +
      (aiOK ? '<button class="btn ghost" type="button" id="gmAI">🤖 جولة أخبار جديدة بالذكاء الاصطناعي</button>' : "") + '</div></div>';
    $("gmGo").onclick = function () { start(shuffle(pool()).slice(0, 10)); };
    var ai = $("gmAI"); if (ai) ai.onclick = function () {
      ai.disabled = true; ai.textContent = "بيجهّز أخبار جديدة…";
      NC.aiJSON('اكتب 8 أمثلة قصيرة (جملة أو جملتين بالعامية المصرية أو الفصحى المبسطة) لأخبار أو منشورات ممكن تقابل طالب إعلام على السوشيال أو في الأخبار، نصها حقيقي وموثوق ونصها شائعة أو مضلل، ومتنوعة (رياضة، صحة، تعليم، اقتصاد، تكنولوجيا). ماتستخدمش أسماء أشخاص حقيقيين في ادعاءات كاذبة. رجّع JSON فقط بالشكل: {"items":[{"t":"نص الخبر","real":true,"why":"سبب قصير بالعامية المصرية يعلّم الطالب إزاي يعرف"}]}')
        .then(function (j) {
          var it = ((j && j.items) || []).filter(function (x) { return x && x.t && typeof x.real === "boolean"; }).map(function (x) { return [String(x.t), x.real, String(x.why || "")]; });
          if (it.length < 4) throw new Error("bad");
          start(shuffle(it).slice(0, 10));
        }).catch(function (e) { ai.disabled = false; ai.textContent = "🤖 جولة أخبار جديدة بالذكاء الاصطناعي"; if (!e || e.message !== "sub_required") say("مقدرناش نجيب أخبار جديدة دلوقتي. العب الجولة العادية."); });
    };
  }
  var T_LIMIT = 15;
  function start(items) { G = { items: items, i: 0, score: 0, streak: 0, best: 0, right: 0 }; drawCard(); }
  function drawCard() {
    var el = $("gameDesk"); if (!el || !G) return;
    stopTimer();
    if (G.i >= G.items.length) return finish();
    var it = G.items[G.i], nxt = G.items[G.i + 1];
    el.innerHTML = '<div class="gm"><div class="gm-top"><span class="gm-pill">⭐ ' + N(G.score) + '</span><span class="gm-pill">🔥 ' + N(G.streak) + '</span><span class="gm-pill">' + N(G.i + 1) + " / " + N(G.items.length) + '</span></div>' +
      '<div class="gm-time"><i id="gmT" style="width:100%"></i></div>' +
      '<div class="gm-stage" id="gmStage">' + (nxt ? '<div class="gm-card back"><span class="gq">خبر جاي…</span></div>' : "") +
      '<div class="gm-card" id="gmCard" role="group" aria-label="الخبر"><span class="gm-stamp t">حقيقة ✓</span><span class="gm-stamp f">شائعة ✗</span><span class="gq">📰 الخبر ده…</span><div>' + esc(it[0]) + '</div></div></div>' +
      '<div class="gm-btns"><button type="button" class="gt" id="gmTrue">حقيقة ✓</button><button type="button" class="gf" id="gmFake">شائعة ✗</button></div>' +
      '<p class="gm-hint">اسحب الكارت لليمين = حقيقة · للشمال = شائعة</p></div>';
    var card = $("gmCard"), t0 = Date.now(), done = false;
    function answer(real) {
      if (done) return; done = true; stopTimer();
      var left = Math.max(0, T_LIMIT - (Date.now() - t0) / 1000), ok = real === it[1], gained = 0;
      if (ok) { G.streak++; G.right++; G.best = Math.max(G.best, G.streak); gained = Math.round((10 + left) * (1 + Math.floor(G.streak / 3) * 0.5)); G.score += gained; }
      else G.streak = 0;
      var dir = real === null ? 0 : real ? 1 : -1;
      card.style.transition = "transform .3s ease, opacity .3s"; card.style.transform = "translateX(" + (dir * 130) + "%) rotate(" + (dir * 18) + "deg)"; card.style.opacity = dir ? "0" : "1";
      try { if (navigator.vibrate) navigator.vibrate(ok ? 20 : [40, 40, 40]); } catch (e) { }
      setTimeout(function () {
        var stage = $("gmStage"); if (!stage) return;
        var r = document.createElement("div"); r.className = "gm-res " + (ok ? "ok" : "no");
        r.innerHTML = '<b>' + (ok ? "صح! +" + N(gained) : real === null ? "الوقت خلص ⏰" : "غلط 😅") + '</b><div>الخبر ده <b style="font-size:inherit">' + (it[1] ? "حقيقة" : "شائعة") + '</b>.</div><div>' + esc(it[2]) + '</div>' +
          (G.streak >= 3 && ok ? '<div>🔥 ' + N(G.streak) + ' صح ورا بعض — النقط بتتضاعف!</div>' : "") + '<button class="btn" type="button" id="gmNext">' + (G.i + 1 >= G.items.length ? "النتيجة" : "اللي بعده") + '</button>';
        stage.appendChild(r); var nb = $("gmNext"); nb.onclick = function () { G.i++; drawCard(); }; try { nb.focus({ preventScroll: true }); } catch (e) { }
      }, real === null ? 0 : 260);
    }
    $("gmTrue").onclick = function () { answer(true); }; $("gmFake").onclick = function () { answer(false); };
    // السحب
    var sx = 0, dx = 0, drag = false, stT = card.querySelector(".gm-stamp.t"), stF = card.querySelector(".gm-stamp.f");
    card.addEventListener("pointerdown", function (e) { if (done) return; drag = true; sx = e.clientX; dx = 0; card.style.transition = "none"; try { card.setPointerCapture(e.pointerId); } catch (x) { } });
    card.addEventListener("pointermove", function (e) {
      if (!drag) return; dx = e.clientX - sx;
      card.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 18) + "deg)";
      stT.style.opacity = Math.max(0, Math.min(1, dx / 90)); stF.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    });
    function up() {
      if (!drag) return; drag = false;
      if (Math.abs(dx) > 90) answer(dx > 0);
      else { card.style.transition = "transform .25s ease"; card.style.transform = ""; stT.style.opacity = 0; stF.style.opacity = 0; }
    }
    card.addEventListener("pointerup", up); card.addEventListener("pointercancel", up);
    // الوقت
    var bar = $("gmT");
    timer = setInterval(function () {
      if (!$("gmT")) { stopTimer(); return; }
      var p = 1 - (Date.now() - t0) / (T_LIMIT * 1000);
      bar.style.width = Math.max(0, p * 100) + "%"; bar.style.backgroundPosition = (p * 100) + "% 0";
      if (p <= 0) answer(null);
    }, 100);
  }
  function finish() {
    var el = $("gameDesk"); stopTimer();
    var g = st("mihbara-game") || {}, oldLv = lvOf(g.xp || 0), rec = G.score > (g.best || 0);
    g.best = Math.max(g.best || 0, G.score); g.games = (g.games || 0) + 1; g.right = (g.right || 0) + G.right; g.xp = (g.xp || 0) + G.score; g.streak = Math.max(g.streak || 0, G.best);
    st("mihbara-game", g);
    var lv = lvOf(g.xp), up = lv > oldLv, total = G.items.length;
    el.innerHTML = '<div class="gm"><div class="gm-start"><div class="gm-pop">' + (rec ? "🏆" : G.right >= total * 0.7 ? "🎉" : "💪") + '</div>' +
      '<h2>' + (rec ? "رقم قياسي جديد!" : "خلصت الجولة") + '</h2><p>جاوبت صح على ' + N(G.right) + " من " + N(total) + (up ? ' · <b>طلعت مستوى «' + LEVELS[lv] + '»</b> 🎖️' : "") + '</p>' +
      '<div class="gm-stats"><div><b>' + N(G.score) + '</b><span>السكور</span></div><div><b>' + N(g.best) + '</b><span>أعلى سكور</span></div><div><b>' + N(G.best) + '</b><span>أطول سلسلة</span></div></div>' +
      '<button class="btn" type="button" id="gmAgain">العب تاني</button><button class="btn ghost" type="button" id="gmShare">شارك السكور</button>' +
      '<button class="btn ghost" type="button" id="gmHome">رجوع للرئيسية</button></div></div>';
    $("gmAgain").onclick = function () { start(shuffle(pool()).slice(0, 10)); };
    $("gmHome").onclick = function () { open("home"); };
    $("gmShare").onclick = function () {
      var t = "جبت " + N(G.score) + " نقطة في لعبة «حقيقة ولا شائعة؟» على NewsCast 360 🕵️ — تقدر تكسر رقمي؟";
      try { if (window.MihbaraShare) { MihbaraShare.share(t); return; } } catch (e) { }
      try { if (navigator.share) { navigator.share({ text: t }); return; } } catch (e) { }
      try { navigator.clipboard.writeText(t); say("اتنسخ ✓"); } catch (e) { }
    };
    G = null;
  }

  // ================= لما تبويب يتفتح =================
  NCShell.show = function (v) {
    if (v !== "game") { stopTimer(); G = null; }
    if (v === "home") renderHomeExtra();
    else if (v === "tools") decorate();
    else if (v === "account") { var A = ACC(); if (A) A.renderPage($("accountView")); else $("accountView").innerHTML = '<div class="nc-tabhead"><h2>الحساب</h2></div>'; }
    else if (v === "settings") renderSettings();
    else if (v === "game") renderGameStart($("gameDesk"));
  };
  function boot() {
    applyZoom();
    if (typeof buildHome === "function" && !buildHome.__sh) {
      var ob = buildHome; buildHome = function () { var r = ob.apply(this, arguments); try { decorate(); } catch (e) { } return r; }; buildHome.__sh = true;
    }
    decorate(); renderHomeExtra();
    var A = ACC(); if (A) A.onChange(function () { try { decorate(); if (typeof view !== "undefined") { if (view === "account") A.renderPage($("accountView")); if (view === "home") renderHomeExtra(); } } catch (e) { } });
  }
  document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 60); setTimeout(decorate, 700); });
})();
