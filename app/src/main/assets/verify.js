/* NewsCast 360 — التحقق التلقائي من الأخبار عن طريق البحث في المواقع الإخبارية (بدون مفاتيح) */
(function () {
  "use strict";
  var NET = {};
  window.__net = function (id, ok, b64) {
    var w = NET[id]; if (!w) return; delete NET[id];
    if (!ok) { w.rej({ code: "net" }); return; }
    try { var bin = atob(b64), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); w.res(new TextDecoder("utf-8").decode(bytes)); }
    catch (e) { w.rej({ code: "net" }); }
  };
  function netGet(url) {
    return new Promise(function (res, rej) {
      if (window.MihbaraNet && window.MihbaraNet.get) {
        var id = "n" + Date.now() + Math.random().toString(36).slice(2, 8);
        NET[id] = { res: res, rej: rej };
        setTimeout(function () { if (NET[id]) { delete NET[id]; rej({ code: "net_timeout" }); } }, 15000);
        window.MihbaraNet.get(url, id);
      } else {
        fetch(url).then(function (r) { return r.ok ? r.text() : Promise.reject(); }).then(res, function () { rej({ code: "no_bridge" }); });
      }
    });
  }

  // ---------- تصنيف المصادر ----------
  var OFFICIAL = /(\.gov\.eg$|^presidency\.eg$|^sis\.gov\.eg$|^cabinet\.gov\.eg$|\.gov$|^who\.int$|^un\.org$|^news\.un\.org$)/;
  var MAJOR = ["mena.org.eg", "ahram.org.eg", "gate.ahram.org.eg", "youm7.com", "almasryalyoum.com", "shorouknews.com", "masrawy.com", "elwatannews.com", "akhbarelyom.com", "elbalad.news", "cairo24.com", "alarabiya.net", "skynewsarabia.com", "bbc.com", "bbc.co.uk", "reuters.com", "apnews.com", "afp.com", "aljazeera.net", "cnn.com", "arabic.cnn.com", "france24.com", "independentarabia.com", "aawsat.com", "dw.com", "asharqbusiness.com", "asharq.com", "alqaheranews.net", "extranews.tv", "ahramonline.org.eg", "egypttoday.com", "dailynewsegypt.com"];
  var CHECKERS = ["misbar.com", "fatabyyano.net", "factuel.afp.com", "matsda2sh.com"];
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch (e) { return ""; } }
  function inList(h, list) { return list.some(function (d) { return h === d || h.endsWith("." + d); }); }
  function tierOf(url) {
    var h = hostOf(url);
    if (OFFICIAL.test(h)) return { k: 3, label: "جهة رسمية" };
    if (inList(h, CHECKERS)) return { k: 3, label: "منصة تدقيق" };
    if (inList(h, MAJOR)) return { k: 2, label: "مصدر إخباري موثوق" };
    return { k: 1, label: "مصدر غير مصنّف" };
  }

  // ---------- تطابق النصوص ----------
  var STOPW = new Set("في من على عن إلى الى إن ان أن كان كانت هذا هذه ذلك التي الذي الذين مع بعد قبل حتى او أو ثم كل بين عند اليوم امس أمس قال قالت وقال وقالت يوم لم لن قد ما لا هل جدا جداً عاجل انشر يتحذف خبر خطير المصدر شير دي ده دا السنة".split(" "));
  function norm(t) {
    return String(t || "").replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[^؀-ۿa-zA-Z0-9\s]/g, " ").toLowerCase();
  }
  function stem(w) { w = w.replace(/^(وال|بال|كال|فال|لل|ال)/, ""); if (w.length > 4) w = w.replace(/(ات|ون|ين|ها|هم|ه)$/, ""); return w; }
  function tokens(t) { return norm(t).split(/\s+/).filter(function (w) { return w.length > 1 && !STOPW.has(w); }).map(stem).filter(function (w) { return w.length > 1; }); }
  function score(claimToks, title) {
    var tt = tokens(title); if (!claimToks.length) return 0;
    var hit = 0; claimToks.forEach(function (c) { if (tt.some(function (x) { return x === c || (c.length > 3 && (x.indexOf(c) === 0 || c.indexOf(x) === 0) && Math.min(x.length, c.length) > 3); })) hit++; });
    return hit / claimToks.length;
  }
  var DENY = /(نفي|تنفي|ينفي|نفت|نفى|لا صحة|لاصحة|شائع|حقيقة|مزيف|مفبرك|كاذب|غير صحيح|مضلل|توضح حقيقة)/;

  // ---------- قراءة نتايج جوجل نيوز ----------
  function parseRSS(xml) {
    var doc = new DOMParser().parseFromString(xml, "text/xml");
    return Array.prototype.map.call(doc.querySelectorAll("item"), function (it) {
      var src = it.querySelector("source");
      var title = (it.querySelector("title") || {}).textContent || "";
      var sname = src ? src.textContent : "";
      if (sname && title.endsWith(" - " + sname)) title = title.slice(0, -(sname.length + 3));
      return { title: title.trim(), source: sname, sourceUrl: src ? src.getAttribute("url") : "", link: (it.querySelector("link") || {}).textContent || "", date: new Date((it.querySelector("pubDate") || {}).textContent || "") };
    }).filter(function (x) { return x.title && !isNaN(x.date); });
  }
  function gnews(q) { return "https://news.google.com/rss/search?q=" + encodeURIComponent(q) + "&hl=ar&gl=EG&ceid=EG:ar"; }

  // ---------- تنسيق ----------
  function fDate(d) { return d.toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  function fTime(d) { return d.toLocaleTimeString("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }); }
  function ago(d) {
    var m = Math.round((Date.now() - d) / 60000), n = function (x) { return x.toLocaleString("ar-EG"); };
    if (m < 1) return "دلوقتي"; if (m < 60) return "من " + n(m) + " دقيقة"; var h = Math.round(m / 60); if (h < 24) return "من " + n(h) + " ساعة";
    var dd = Math.round(h / 24); if (dd < 31) return "من " + n(dd) + " يوم"; return "من " + n(Math.round(dd / 30)) + " شهر";
  }
  function E(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var CSS = ".nv-verdict{border-radius:18px;padding:16px;margin-bottom:14px;color:#fff}.nv-verdict b{display:block;font-family:var(--display);font-size:18px;margin-bottom:4px}.nv-verdict p{margin:0;font-size:13.5px;opacity:.95}" +
    ".nv-ok{background:linear-gradient(135deg,#0ca678,#12b886)}.nv-warn{background:linear-gradient(135deg,#e67700,#f59f00)}.nv-bad{background:linear-gradient(135deg,#c92a2a,#fa5252)}.nv-none{background:linear-gradient(135deg,#495057,#868e96)}" +
    ".nv-first{border:1.5px solid var(--gold,#F5B700);background:rgba(245,183,0,.08);border-radius:16px;padding:14px;margin-bottom:14px}.nv-first h4{margin:0 0 8px;font-size:13px;color:#b07d00}" +
    ".nv-grid{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:14px}.nv-grid span{color:var(--muted)}.nv-grid b{font-weight:600}" +
    ".nv-list{display:grid;gap:10px;margin-top:6px}.nv-item{border:1px solid var(--line);border-radius:14px;padding:12px;background:var(--surface)}.nv-item .t{font-weight:500;font-size:14px;line-height:1.6;margin:6px 0}" +
    ".nv-meta{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:12px;color:var(--muted)}.nv-tag{font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px}" +
    ".nv-t3{background:rgba(18,184,134,.14);color:#0c8a63}.nv-t2{background:rgba(37,99,235,.12);color:#1d4ed8}.nv-t1{background:var(--surface2);color:var(--muted)}.nv-deny{background:rgba(250,82,82,.14);color:#c92a2a}" +
    ".nv-item a{font-size:13px;color:var(--accent);font-weight:600;text-decoration:none}.nv-src{font-weight:600;color:var(--ink)}.nv-h{font-family:var(--display);font-size:15px;margin:16px 0 4px}.nv-note{font-size:12px;color:var(--muted);margin-top:12px}";

  function verdictOf(matches) {
    var strong = matches.filter(function (m) { return m.s >= 0.5; });
    var trusted = strong.filter(function (m) { return m.tier.k >= 2; });
    var denied = trusted.filter(function (m) { return DENY.test(m.title); });
    if (denied.length) return { cls: "nv-bad", t: "فيه نفي أو توضيح من مصدر موثوق", p: "لقيت " + denied.length.toLocaleString("ar-EG") + " خبر من مصادر موثوقة بينفي الكلام دا أو بيوضح حقيقته. اقرا المصدر قبل ما تنشر أي حاجة." };
    if (trusted.length) return { cls: "nv-ok", t: "الخبر منشور في مصادر موثوقة ✓", p: "لقيته في " + new Set(trusted.map(function (m) { return m.source; })).size.toLocaleString("ar-EG") + " مصدر موثوق. التفاصيل والروابط تحت." };
    if (strong.length) return { cls: "nv-warn", t: "منشور في مواقع غير مصنّفة بس", p: "الخبر ظاهر في مواقع مش من قايمة المصادر الموثوقة. استنى لحد ما مصدر رسمي أو قناة إخبارية كبيرة تذيعه." };
    if (matches.length) return { cls: "nv-warn", t: "لقيت أخبار قريبة بس مش نفس الخبر", p: "فيه أخبار عن نفس الموضوع، بس محدش نشر نفس المعلومة بالظبط. راجع الأخبار اللي تحت." };
    return { cls: "nv-none", t: "مالقيتش الخبر دا في أي مصدر إخباري", p: "مفيش أي موقع إخباري نشر الخبر دا. غالباً شائعة أو خبر غير دقيق — ماتنشروش لحد ما يظهر في مصدر رسمي." };
  }

  function render(claim, matches) {
    var v = verdictOf(matches);
    var shown = matches.slice().sort(function (a, b) { return (b.tier.k - a.tier.k) || (b.s - a.s); }).slice(0, 10).sort(function (a, b) { return a.date - b.date; });
    var firstTrusted = matches.filter(function (m) { return m.s >= 0.5 && m.tier.k >= 2; }).sort(function (a, b) { return a.date - b.date; })[0]
      || matches.filter(function (m) { return m.s >= 0.5; }).sort(function (a, b) { return a.date - b.date; })[0];
    var h = "<style>" + CSS + "</style><div class='nv-verdict " + v.cls + "'><b>" + E(v.t) + "</b><p>" + E(v.p) + "</p></div>";
    if (firstTrusted) {
      h += "<div class='nv-first'><h4>أول مصدر نشر الخبر</h4><div class='nv-grid'>" +
        "<span>المصدر</span><b>" + E(firstTrusted.source) + " <em class='nv-tag nv-t" + firstTrusted.tier.k + "' style='font-style:normal'>" + firstTrusted.tier.label + "</em></b>" +
        "<span>التاريخ</span><b>" + E(fDate(firstTrusted.date)) + "</b>" +
        "<span>الساعة</span><b>" + E(fTime(firstTrusted.date)) + " بتوقيت القاهرة (" + E(ago(firstTrusted.date)) + ")</b>" +
        "<span>العنوان</span><b>" + E(firstTrusted.title) + "</b>" +
        "<span>الرابط</span><b><a href='" + E(firstTrusted.link) + "' target='_blank' rel='noopener' style='color:var(--accent)'>افتح الخبر الأصلي ←</a></b></div></div>";
    }
    if (shown.length) {
      h += "<h3 class='nv-h'>كل المصادر اللي نشرت (" + shown.length.toLocaleString("ar-EG") + ") — من الأقدم للأحدث</h3><div class='nv-list'>";
      shown.forEach(function (m) {
        h += "<div class='nv-item'><div class='nv-meta'><span class='nv-src'>" + E(m.source) + "</span><em class='nv-tag nv-t" + m.tier.k + "' style='font-style:normal'>" + m.tier.label + "</em>" +
          (DENY.test(m.title) ? "<em class='nv-tag nv-deny' style='font-style:normal'>نفي / توضيح</em>" : "") +
          "<span>" + (m.s >= 0.5 ? "تطابق قوي" : "خبر قريب") + "</span></div><div class='t'>" + E(m.title) + "</div>" +
          "<div class='nv-meta'><span>" + E(fDate(m.date)) + " · الساعة " + E(fTime(m.date)) + "</span><a href='" + E(m.link) + "' target='_blank' rel='noopener'>افتح الخبر</a></div></div>";
      });
      h += "</div>";
    }
    h += "<p class='nv-note'>البحث تم في المواقع الإخبارية عن طريق أخبار جوجل، والمواعيد بتوقيت القاهرة حسب وقت النشر المسجّل. افتح الرابط واقرا الخبر الأصلي قبل ما تعتمد عليه.</p>";
    return { html: h, verdict: v, first: firstTrusted, shown: shown };
  }

  function toText(claim, r) {
    var t = "### الحكم\n" + r.verdict.t + "\n" + r.verdict.p + "\n";
    if (r.first) t += "\n### أول مصدر نشر\n- **المصدر:** " + r.first.source + "\n- **التاريخ:** " + fDate(r.first.date) + "\n- **الساعة:** " + fTime(r.first.date) + " بتوقيت القاهرة\n- [" + r.first.title.replace(/[\[\]]/g, "") + "](" + r.first.link + ")\n";
    if (r.shown.length) t += "\n### المصادر\n" + r.shown.map(function (m) { return "- **" + m.source + "** (" + fDate(m.date) + " " + fTime(m.date) + "): [" + m.title.replace(/[\[\]]/g, "") + "](" + m.link + ")"; }).join("\n");
    return t;
  }

  async function runVerify() {
    saveDraft();
    var v = drafts.verify || {}, claim = (v.claim || "").trim();
    if (!claim) { $("note").textContent = "اكتب نص الخبر الأول."; return; }
    $("go").disabled = true; $("note").textContent = ""; renderExtra("verify", v);
    $("out").innerHTML = '<div class="livesearch"><i></i><span>بيدوّر في المواقع الإخبارية الرسمية والموثوقة…</span></div>' + SKEL;
    setStatus("جاري البحث", "live"); if (window.innerWidth < 820) { var pr = $("out").closest(".proof"); window.scrollTo({ top: pr.getBoundingClientRect().top + scrollY - 70, behavior: "smooth" }); }
    try {
      var kw = keywords(claim).split(" ").filter(Boolean);
      var qs = [kw.slice(0, 8).join(" "), kw.slice(0, 5).join(" ")].filter(function (q, i, a) { return q && a.indexOf(q) === i; });
      var results = await Promise.allSettled(qs.map(function (q) { return netGet(gnews(q)); }));
      var ok = results.filter(function (r) { return r.status === "fulfilled"; });
      if (!ok.length) throw (results[0] && results[0].reason) || { code: "net" };
      var seen = {}, items = [];
      ok.forEach(function (r) { parseRSS(r.value).forEach(function (it) { var k = it.title + "|" + it.source; if (!seen[k]) { seen[k] = 1; items.push(it); } }); });
      var ct = tokens(claim).slice(0, 14);
      var matches = items.map(function (it) { return Object.assign(it, { s: score(ct, it.title), tier: tierOf(it.sourceUrl) }); }).filter(function (m) { return m.s >= 0.3; });
      var r = render(claim, matches);
      $("out").innerHTML = r.html; setStatus("النتيجة", "live");
      var text = toText(claim, r); results_set(text); try { addHistory("verify", claim, text); } catch (e) { }
    } catch (err) {
      var msg = err && err.code === "no_bridge" ? "البحث التلقائي في الأخبار بيشتغل جوه تطبيق الموبايل. استخدم الأزرار اللي تحت عشان تدوّر بنفسك." :
        "مقدرتش أوصل للمواقع الإخبارية. اتأكد إن النت شغال وجرّب تاني.";
      $("out").innerHTML = "<p>" + E(msg) + "</p>"; setStatus("جاهز"); $("note").textContent = "";
    } finally { $("go").disabled = false; }
  }
  function results_set(text) { try { results.verify = text; } catch (e) { } }

  document.addEventListener("DOMContentLoaded", function () {
    try {
      TOOLS.verify.desc = "يدوّر على الخبر ويقولك مين نشره وإمتى بالساعة";
      TOOLS.verify.title = "اتحقق من الخبر في المواقع الإخبارية";
      TOOLS.verify.lead = "الصق الخبر، والأداة تدوّر عليه بنفسها في المواقع الإخبارية والرسمية، وتقولك هو منشور ولا لأ، ومين أول من نشره، والتاريخ والساعة، مع روابط الأخبار الأصلية.";
      TOOLS.verify.example = "### الحكم\nاضغط «نفّذ» والأداة هتدوّر على الخبر في المواقع الإخبارية حالاً، وتعرضلك مين نشره وإمتى بالتاريخ والساعة، مع روابط الأخبار الأصلية.";
      var card = document.getElementById("card-verify"); if (card) { var d = card.querySelector("span span"); if (d) d.textContent = TOOLS.verify.desc; card.dataset.q = (TOOLS.verify.name + " " + TOOLS.verify.desc).toLowerCase(); }
    } catch (e) { }
    try {
      var origExtra = renderExtra;
      renderExtra = function (tool, v) { origExtra(tool, v); var n = document.querySelector("#extra .trustnote"); if (n) n.textContent = "الأداة بتدوّر لوحدها في المواقع الإخبارية وبتعرضلك مين نشر الخبر وإمتى. والأزرار دي لو حابب تدوّر أكتر بنفسك."; var h = document.querySelector("#extra .vlinks h4"); if (h) h.textContent = "دوّر أكتر بنفسك"; };
    } catch (e) { }
    var form = document.getElementById("form");
    if (form) form.addEventListener("submit", function (e) {
      try { if (current !== "verify") return; } catch (x) { return; }
      e.preventDefault(); e.stopImmediatePropagation(); runVerify();
    }, true);
  });
})();
