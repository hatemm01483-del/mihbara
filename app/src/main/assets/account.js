/* NewsCast 360 — تسجيل الدخول والتجربة المجانية والاشتراك الشهري (v3.2)
   لو السيرفر مفعّل فيه الحسابات (auth: true) الحساب والاشتراك بيتسجلوا على السيرفر.
   لو لسه مش مفعّل: شاشة الدخول بتظهر برضه، والحساب والتجربة بيتحفظوا على الموبايل (وضع مؤقت) لحد ما السيرفر يتفعّل. */
(function () {
  "use strict";
  var C = window.MIHBARA_CONFIG || {};
  var SERVER = String(C.server || "").replace(/\/+$/, "");
  if (!SERVER) return;
  var K_TOK = "mihbara-acct-token", K_ME = "mihbara-acct-me", K_ON = "mihbara-acct-on", K_DEV = "mihbara-acct-dev", K_PHONE = "mihbara-acct-phone", K_LOCAL = "mihbara-local-acct", K_LTRIAL = "mihbara-local-trial";
  var ls = {
    get: function (k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set: function (k, v) { try { if (v == null || v === "") localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  };
  var A = window.NCAccount = { on: true, local: ls.get(K_ON) !== "1", token: ls.get(K_TOK), me: null, plan: { price: 229, days: 30, trialDays: 1 } };
  try { A.me = JSON.parse(ls.get(K_ME) || "null"); } catch (e) { A.me = null; }

  // ---------- كل طلب للسيرفر بياخد مفتاح الجلسة، ولو الاشتراك خلص بيظهر شاشة الاشتراك ----------
  var rawFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (A.token && !A.local && url.indexOf(SERVER) === 0) {
      init = Object.assign({}, init || {});
      var h = new Headers(init.headers || (typeof input !== "string" && input.headers) || {});
      if (!h.has("authorization")) h.set("authorization", "Bearer " + A.token);
      init.headers = h;
    }
    var p = rawFetch(input, init);
    if (url.indexOf(SERVER) === 0 && !/\/(auth\/|me$|pay\/|status$)/.test(url.slice(SERVER.length))) {
      p.then(function (r) {
        if (A.local) return;
        if (r.status === 402) { refreshMe().then(function () { showPaywall(); }); }
        else if (r.status === 401 && A.on) r.clone().json().then(function (j) { if (j && j.error === "login_required") logout(true); }).catch(function () { });
      }).catch(function () { });
    }
    return p;
  };
  function api(path, body, method) {
    var o = { method: method || (body ? "POST" : "GET"), headers: { "x-app-token": C.token || "" } };
    if (body) { o.headers["content-type"] = "application/json"; o.body = JSON.stringify(body); }
    return window.fetch(SERVER + path, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.__status = r.status; return j; }); });
  }
  function deviceId() {
    try { if (window.MihbaraUI && MihbaraUI.deviceId) { var d = MihbaraUI.deviceId(); if (d) return d; } } catch (e) { }
    var x = ls.get(K_DEV); if (!x) { x = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); ls.set(K_DEV, x); } return x;
  }

  // ---------- الحالة ----------
  function modeOf(me) {
    if (!me) return "none";
    var now = Date.now(); if ((me.subEnd || 0) > now) return "sub"; if ((me.trialEnd || 0) > now) return "trial"; return "expired";
  }
  function setMe(me) {
    if (me && me.plan) A.plan = me.plan;
    // نعدّل فرق الساعة بين الموبايل والسيرفر
    if (me && me.now) { var skew = Date.now() - me.now; if (Math.abs(skew) > 60000) { me.trialEnd += skew; me.subEnd += skew; } me.now = 0; }
    A.me = me; ls.set(K_ME, me ? JSON.stringify(me) : "");
    paintChip();
  }
  // ---------- الوضع المؤقت (قبل تفعيل الحسابات على السيرفر) ----------
  function localAcct() { try { return JSON.parse(ls.get(K_LOCAL) || "null"); } catch (e) { return null; } }
  function localMe() { var a = localAcct(); return a ? { email: a.email, name: a.name || "", trialEnd: a.trialEnd || 0, subEnd: 0, plan: A.plan, local: true } : null; }
  function pwHashLocal(pw, email) {
    var txt = "nc360|" + email + "|" + pw;
    try { return crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)).then(function (b) { return [].map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }); }
    catch (e) { var h = 0; for (var i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) | 0; return Promise.resolve("x" + h); }
  }
  function localAuth(reg, email, pw, name) {
    return pwHashLocal(pw, email).then(function (hp) {
      var a = localAcct();
      if (reg) {
        if (a && a.email === email) return { error: "exists" };
        var used = !!ls.get(K_LTRIAL), now = Date.now();
        a = { email: email, name: name, pw: hp, created: now, trialEnd: used ? 0 : now + ((A.plan && A.plan.trialDays) || 1) * 86400000 };
        ls.set(K_LOCAL, JSON.stringify(a)); ls.set(K_LTRIAL, "1");
        return { token: "local", me: localMe(), trialUsed: used };
      }
      if (!a || a.email !== email || a.pw !== hp) return { error: "bad_login" };
      return { token: "local", me: localMe() };
    });
  }
  function refreshMe() {
    if (!A.token) return Promise.resolve(null);
    if (A.local) { if (A.token === "local") setMe(localMe()); return Promise.resolve(A.me); }
    return api("/me").then(function (j) {
      if (j.__status === 401) { logout(true); return null; }
      if (j.email) setMe(j); return A.me;
    }).catch(function () { return A.me; });
  }
  function left(ms) {
    if (ms <= 0) return "خلصت";
    var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), d = Math.floor(h / 24);
    if (d >= 1) return d.toLocaleString("ar-EG") + (d === 1 ? " يوم" : d === 2 ? " يومين" : d <= 10 ? " أيام" : " يوم");
    if (h >= 1) return h.toLocaleString("ar-EG") + " س " + (m ? m.toLocaleString("ar-EG") + " د" : "");
    return Math.max(1, m).toLocaleString("ar-EG") + " دقيقة";
  }
  function fmtDate(t) { try { return new Date(t).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function say(t) { try { toast(t); } catch (e) { } }

  // ---------- الواجهة ----------
  var css = ".nc-gate{position:fixed;inset:0;z-index:60;overflow:auto;background:var(--bg,#0e0e13);display:flex;align-items:flex-start;justify-content:center;padding:max(24px,env(safe-area-inset-top)) 16px 32px}" +
    ".nc-gate[hidden]{display:none}.nc-gbox{width:100%;max-width:440px;margin-top:4vh}" +
    ".nc-brand{text-align:center;margin-bottom:18px}.nc-brand b{display:block;font-size:30px;font-weight:800;background:linear-gradient(90deg,var(--a1,#2563eb),var(--a2,#7c3aed));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.5px}.nc-brand span{color:var(--muted,#999);font-size:14px}" +
    ".nc-card{background:var(--card,#16161d);border:1px solid var(--line,#2a2a35);border-radius:24px;padding:22px;box-shadow:0 20px 40px -24px rgba(0,0,0,.35)}" +
    ".nc-card h2{margin:0 0 6px;font-size:20px}.nc-card p{margin:0 0 14px;color:var(--muted,#999);font-size:14px}" +
    ".nc-card label{display:block;font-size:13px;font-weight:600;margin:10px 0 6px}.nc-card input{margin:0}" +
    ".nc-card .btn{width:100%;margin-top:16px;padding:14px;font-size:16px}" +
    ".nc-msg{min-height:20px;margin-top:10px;font-size:13.5px;color:#e03131;text-align:center}.nc-msg.ok{color:#0c8a63}" +
    ".nc-switch{margin-top:14px;text-align:center;font-size:14px;color:var(--muted,#999)}.nc-switch button,.nc-link{font:inherit;color:var(--accent,#2563eb);background:none;border:0;padding:4px;cursor:pointer;font-weight:600;text-decoration:underline;text-underline-offset:3px}" +
    ".nc-gift{display:flex;gap:10px;align-items:center;margin-top:16px;padding:12px 14px;border-radius:16px;background:var(--accent-soft,rgba(37,99,235,.12));font-size:13.5px}.nc-gift i{font-style:normal;font-size:22px}" +
    ".nc-plan{position:relative;margin:14px 0 4px;padding:18px;border-radius:20px;border:2px solid var(--accent,#2563eb);background:var(--bg2,#1c1c25)}" +
    ".nc-plan .tag{position:absolute;top:-12px;inset-inline-start:16px;background:linear-gradient(135deg,var(--a1,#2563eb),var(--a2,#7c3aed));color:#fff;font-size:12px;font-weight:700;padding:3px 12px;border-radius:999px}" +
    ".nc-price{display:flex;align-items:baseline;gap:6px;margin:4px 0 10px}.nc-price b{font-size:40px;font-weight:800;line-height:1}.nc-price span{color:var(--muted,#999)}" +
    ".nc-feats{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:14px}.nc-feats li::before{content:'✓';color:#0c8a63;font-weight:800;margin-inline-end:8px}" +
    ".nc-pm{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:12px;font-size:12px;color:var(--muted,#999)}.nc-pm span{border:1px solid var(--line,#2a2a35);border-radius:999px;padding:3px 10px}" +
    ".nc-wait{display:grid;justify-items:center;gap:10px;text-align:center;padding:10px 0}.nc-wait i{width:44px;height:44px;border-radius:50%;border:4px solid var(--line,#2a2a35);border-top-color:var(--accent,#2563eb);animation:ncspin 1s linear infinite}@keyframes ncspin{to{transform:rotate(360deg)}}" +
    ".nc-done{font-size:64px;line-height:1;animation:ncpop .5s ease}@keyframes ncpop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}" +
    ".nc-chip{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:999px;border:1px solid var(--line,#2a2a35);background:var(--bg2,#1c1c25);color:var(--ink,#fff);cursor:pointer;white-space:nowrap}" +
    ".nc-chip.trial{background:rgba(245,159,0,.14);border-color:rgba(245,159,0,.4);color:#c77700}.nc-chip.sub{background:rgba(12,138,99,.13);border-color:rgba(12,138,99,.35);color:#0c8a63}.nc-chip.expired{background:rgba(224,49,49,.12);border-color:rgba(224,49,49,.35);color:#e03131}" +
    ".nc-rows{display:grid;gap:8px;margin:10px 0 4px;font-size:14px}.nc-rows div{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg,#0e0e13)}.nc-rows span{color:var(--muted,#999)}" +
    ".nc-trialbar{position:sticky;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:14;margin:14px auto 0;max-width:560px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-radius:16px;background:var(--card,#16161d);border:1px solid rgba(245,159,0,.45);font-size:13.5px;backdrop-filter:blur(14px)}" +
    ".nc-trialbar .btn{padding:8px 14px;font-size:13px}" +
    ".nc-crew{position:relative;display:flex;justify-content:center;align-items:flex-end;gap:70px;height:170px;padding-top:34px;margin:-4px 0 -18px;z-index:1;pointer-events:none}" +
    ".nc-crew img{height:136px;width:auto;filter:drop-shadow(0 10px 10px rgba(0,0,0,.25));animation:ncbob 1.6s ease-in-out infinite}.nc-crew img:last-child{animation-delay:-.8s}" +
    ".nc-bub{position:absolute;top:0;left:50%;transform:translateX(-50%);background:#fff;color:#111;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.18);white-space:nowrap}" +
    "@keyframes ncbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}" +
    "@media (prefers-reduced-motion:reduce){.nc-crew img{animation:none}}";
  var se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  var gate, chip, bar;
  function ensureGate() {
    if (gate) return gate;
    gate = document.createElement("div"); gate.className = "nc-gate"; gate.hidden = true; gate.setAttribute("role", "dialog"); gate.setAttribute("aria-modal", "true");
    document.body.appendChild(gate); return gate;
  }
  function lockScroll(on) { document.documentElement.style.overflow = on ? "hidden" : ""; }
  function hideGate() { if (gate) { gate.hidden = true; gate.innerHTML = ""; } lockScroll(false); stopPoll(); }
  var BRAND = '<div class="nc-brand"><b>NewsCast 360</b><span>خليك محاوط الخبر</span></div>';
  var CREW = '<div class="nc-crew" aria-hidden="true"><img src="nc-girl.webp" alt=""><span class="nc-bub">أهلاً بيك 👋</span><img src="nc-boy.webp" alt=""></div>';

  // شاشة الدخول / حساب جديد
  function showAuth(mode, msg) {
    ensureGate(); lockScroll(true); gate.hidden = false; mode = mode || "register";
    var reg = mode === "register", trialD = (A.plan && A.plan.trialDays) || 1;
    gate.innerHTML = '<div class="nc-gbox">' + BRAND + CREW + '<form class="nc-card" id="ncAuth" novalidate>' +
      '<h2>' + (reg ? "اعمل حسابك" : "سجّل دخولك") + '</h2><p>' + (reg ? "حساب واحد بيفتحلك كل أدوات NewsCast 360." : "أهلاً بيك تاني 👋") + '</p>' +
      (reg ? '<label for="ncName">الاسم</label><input id="ncName" autocomplete="name" placeholder="اسمك">' : "") +
      '<label for="ncEmail">الإيميل</label><input id="ncEmail" type="email" inputmode="email" autocomplete="email" dir="ltr" placeholder="name@example.com">' +
      '<label for="ncPw">كلمة السر</label><input id="ncPw" type="password" autocomplete="' + (reg ? "new-password" : "current-password") + '" dir="ltr" placeholder="٦ حروف أو أرقام على الأقل">' +
      '<button class="btn" type="submit" id="ncGo">' + (reg ? "ابدأ التجربة المجانية" : "دخول") + '</button>' +
      '<div class="nc-msg" id="ncMsg">' + esc(msg || "") + '</div>' +
      (reg ? '<div class="nc-gift"><i>🎁</i><div><b>تجربة مجانية ' + (trialD === 1 ? "يوم كامل" : trialD.toLocaleString("ar-EG") + " أيام") + '</b><br>بكل المميزات كأنك مشترك، ومن غير ما تدفع أي حاجة.</div></div>' : "") +
      '<div class="nc-switch">' + (reg ? 'عندك حساب؟ <button type="button" id="ncSw">سجّل دخول</button>' : 'أول مرة؟ <button type="button" id="ncSw">اعمل حساب جديد</button>') + '</div>' +
      '</form></div>';
    var f = gate.querySelector("#ncAuth"), m = gate.querySelector("#ncMsg");
    gate.querySelector("#ncSw").onclick = function () { showAuth(reg ? "login" : "register"); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var email = f.querySelector("#ncEmail").value.trim(), pw = f.querySelector("#ncPw").value, name = reg ? f.querySelector("#ncName").value.trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { m.className = "nc-msg"; m.textContent = "اكتب إيميل صحيح."; return; }
      if (pw.length < 6) { m.className = "nc-msg"; m.textContent = "كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل."; return; }
      var b = f.querySelector("#ncGo"); b.disabled = true; m.className = "nc-msg ok"; m.textContent = "لحظة…";
      (A.local ? localAuth(reg, email.toLowerCase(), pw, name) : api(reg ? "/auth/register" : "/auth/login", reg ? { email: email, password: pw, name: name, device: deviceId() } : { email: email, password: pw })).then(function (j) {
        b.disabled = false;
        if (j.token) {
          A.token = j.token; ls.set(K_TOK, j.token); setMe(j.me);
          if (modeOf(A.me) === "expired") { showPaywall(j.trialUsed ? "used" : ""); return; }
          hideGate(); paintBar();
          say(reg ? (j.trialUsed ? "اتعمل الحساب ✓" : "أهلاً بيك! التجربة المجانية بدأت 🎁") : "أهلاً بيك تاني ✓");
          return;
        }
        m.className = "nc-msg";
        m.textContent = ({ exists: "الإيميل ده عليه حساب بالفعل. سجّل دخول بدل كده.", bad_login: "الإيميل أو كلمة السر غلط.", bad_email: "اكتب إيميل صحيح.", weak_password: "كلمة السر قصيرة." })[j.error] || "حصلت مشكلة. اتأكد من النت وجرّب تاني.";
      }).catch(function () { b.disabled = false; m.className = "nc-msg"; m.textContent = "مفيش اتصال بالإنترنت. اتأكد من النت وجرّب تاني."; });
    };
    setTimeout(function () { var i = gate.querySelector(reg ? "#ncName" : "#ncEmail"); if (i) try { i.focus({ preventScroll: true }); } catch (e) { } }, 50);
  }

  function planCard() {
    var p = A.plan || {}, price = (p.price || 229).toLocaleString("ar-EG");
    return '<div class="nc-plan"><span class="tag">الاشتراك الشهري</span>' +
      '<div class="nc-price"><b>' + price + '</b><span>جنيه / شهر</span></div>' +
      '<ul class="nc-feats"><li>كل الأدوات الذكية من غير حدود</li><li>المذيع الافتراضي وتسجيل الفيديو</li><li>تفريغ الصوت وملخص المحاضرات</li><li>معمل الصوت والتدريب على الهوا</li><li>التحقق من الأخبار بالمصادر</li></ul></div>';
  }
  // شاشة الاشتراك
  function showPaywall(why) {
    if (!A.on) return;
    ensureGate(); lockScroll(true); gate.hidden = false;
    var mode = modeOf(A.me), active = mode === "sub" || mode === "trial";
    var head = why === "used" ? "التجربة المجانية اتاخدت قبل كده على الموبايل ده" : mode === "trial" ? "كمّل من غير توقف" : mode === "sub" ? "جدّد اشتراكك" : "خلصت التجربة المجانية";
    gate.innerHTML = '<div class="nc-gbox">' + BRAND + '<div class="nc-card" id="ncPay">' +
      '<h2>' + head + '</h2><p>' + (active ? "اشترك دلوقتي والمدة الجديدة هتتضاف على اللي فاضل." : "اشترك عشان تكمّل استخدام كل أدوات NewsCast 360.") + '</p>' + planCard() +
      '<label for="ncPhone">رقم الموبايل <small style="font-weight:400;color:var(--muted)">(للدفع بالمحفظة)</small></label><input id="ncPhone" type="tel" inputmode="tel" dir="ltr" placeholder="01xxxxxxxxx" value="' + esc(ls.get(K_PHONE)) + '">' +
      '<button class="btn" type="button" id="ncBuy">اشترك وادفع ' + ((A.plan && A.plan.price) || 229).toLocaleString("ar-EG") + ' جنيه</button>' +
      '<div class="nc-pm"><span>💳 كارت بنك</span><span>📱 فودافون كاش والمحافظ</span><span>🔒 دفع آمن عن طريق Paymob</span></div>' +
      '<div class="nc-msg" id="ncMsg"></div>' +
      '<div class="nc-switch">' + (active ? '<button type="button" class="nc-link" id="ncBack">رجوع</button> · ' : "") + '<button type="button" class="nc-link" id="ncOut">تسجيل خروج</button></div>' +
      '</div></div>';
    var m = gate.querySelector("#ncMsg");
    gate.querySelector("#ncOut").onclick = function () { logout(false); };
    var bk = gate.querySelector("#ncBack"); if (bk) bk.onclick = hideGate;
    if (A.local) {
      var cont = document.createElement("button"); cont.type = "button"; cont.className = "btn ghost"; cont.textContent = "كمّل دلوقتي"; cont.style.marginTop = "8px"; cont.style.width = "100%";
      cont.onclick = hideGate; gate.querySelector("#ncBuy").after(cont);
    }
    gate.querySelector("#ncBuy").onclick = function () {
      if (A.local) { m.className = "nc-msg ok"; m.textContent = "الدفع الأونلاين هيتفعّل قريب جداً. لحد كده تقدر تكمّل استخدام التطبيق عادي."; return; }
      var phone = gate.querySelector("#ncPhone").value.replace(/[^\d+]/g, "");
      if (phone && !/^(\+?20)?0?1[0125]\d{8}$/.test(phone)) { m.className = "nc-msg"; m.textContent = "اكتب رقم موبايل مصري صحيح، أو سيبه فاضي لو هتدفع بالكارت."; return; }
      if (phone) ls.set(K_PHONE, phone);
      var b = this; b.disabled = true; m.className = "nc-msg ok"; m.textContent = "بيجهّز صفحة الدفع…";
      api("/pay/start", { phone: phone ? (phone.indexOf("+") === 0 ? phone : "+2" + phone.replace(/^20/, "").replace(/^(?!0)/, "0")) : "" }).then(function (j) {
        b.disabled = false;
        if (j.url) { lastPayURL = j.url; openPay(j.url); showWaiting(); return; }
        m.className = "nc-msg";
        m.textContent = j.error === "pay_not_ready" ? "الدفع لسه مش متفعّل من عندنا. جرّب كمان شوية." : j.__status === 401 ? "سجّل دخول تاني." : "مقدرناش نفتح صفحة الدفع. جرّب تاني.";
      }).catch(function () { b.disabled = false; m.className = "nc-msg"; m.textContent = "مفيش اتصال بالإنترنت."; });
    };
  }
  var lastPayURL = "";
  function openPay(u) {
    // في التطبيق: اللينك بيفتح في المتصفح (MainActivity بتحوّل أي لينك برّه التطبيق للمتصفح)
    if (window.MihbaraUI) { location.href = u; return; }
    // في المتصفح: تبويب جديد (window.open هنا متغطي بدالة التنقل بتاعة التطبيق، فبنستخدم لينك)
    var a = document.createElement("a"); a.href = u; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
  }
  var pollT = null, pollUntil = 0, startSub = 0;
  function stopPoll() { if (pollT) { clearInterval(pollT); pollT = null; } }
  function showWaiting() {
    ensureGate(); gate.hidden = false; lockScroll(true);
    startSub = (A.me && A.me.subEnd) || 0;
    gate.innerHTML = '<div class="nc-gbox">' + BRAND + '<div class="nc-card"><div class="nc-wait"><i></i><h2>مستنيين الدفع…</h2>' +
      '<p>كمّل الدفع في الصفحة اللي اتفتحت. أول ما الفلوس توصل الاشتراك هيتفعّل هنا لوحده في ثواني.</p></div>' +
      '<a class="btn ghost" id="ncReopen" href="' + esc(lastPayURL) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:6px">صفحة الدفع مافتحتش؟ افتحها من هنا</a>' +
      '<div class="nc-switch"><button type="button" class="nc-link" id="ncChk">دفعت؟ اتأكد دلوقتي</button> · <button type="button" class="nc-link" id="ncCancel">رجوع</button></div></div></div>';
    gate.querySelector("#ncChk").onclick = checkPaid;
    gate.querySelector("#ncReopen").onclick = function (e) { if (window.MihbaraUI) { e.preventDefault(); location.href = lastPayURL; } };
    gate.querySelector("#ncCancel").onclick = function () { stopPoll(); showPaywall(); };
    stopPoll(); pollUntil = Date.now() + 20 * 60000;
    pollT = setInterval(function () { if (Date.now() > pollUntil) { stopPoll(); return; } checkPaid(); }, 2000);
  }
  function checkPaid() {
    refreshMe().then(function (me) {
      if (me && (me.subEnd || 0) > Math.max(Date.now(), startSub)) { stopPoll(); showSuccess(); }
    });
  }
  function showSuccess() {
    ensureGate(); gate.hidden = false;
    gate.innerHTML = '<div class="nc-gbox">' + BRAND + '<div class="nc-card" style="text-align:center"><div class="nc-done">✅</div><h2>الاشتراك اتفعّل!</h2>' +
      '<p>شغال لحد ' + fmtDate(A.me.subEnd) + '. استمتع بكل الأدوات.</p><button class="btn" type="button" id="ncGoOn">يلا نبدأ</button></div></div>';
    gate.querySelector("#ncGoOn").onclick = function () { hideGate(); paintBar(); };
    say("الاشتراك اتفعّل ✓");
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && pollT) checkPaid(); });

  // حسابي
  function showAccount() {
    var me = A.me || {}, mode = modeOf(me);
    var sh = document.createElement("div"); sh.className = "sheet"; sh.id = "ncAcctSheet";
    sh.innerHTML = '<div class="panel" role="dialog" aria-label="حسابي"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 style="margin:0;font-size:19px">حسابي</h2><button class="x" type="button" aria-label="إغلاق">✕</button></div>' +
      '<div class="nc-rows"><div><span>الاسم</span><b>' + esc(me.name || "—") + '</b></div><div><span>الإيميل</span><b dir="ltr">' + esc(me.email || "") + '</b></div>' +
      '<div><span>الحالة</span><b>' + (mode === "sub" ? "مشترك ✓" : mode === "trial" ? "تجربة مجانية" : "الاشتراك منتهي") + '</b></div>' +
      (mode === "sub" ? '<div><span>شغال لحد</span><b>' + fmtDate(me.subEnd) + '</b></div>' : mode === "trial" ? '<div><span>باقي على التجربة</span><b>' + left(me.trialEnd - Date.now()) + '</b></div>' : "") +
      '<div><span>الخطة</span><b>' + ((A.plan && A.plan.price) || 229).toLocaleString("ar-EG") + ' جنيه / شهر</b></div></div>' +
      '<button class="btn" type="button" id="ncRenew" style="width:100%;margin-top:12px">' + (mode === "sub" ? "جدّد الاشتراك" : "اشترك دلوقتي") + '</button>' +
      '<div class="nc-switch"><button type="button" class="nc-link" id="ncOut2">تسجيل خروج</button></div></div>';
    document.body.appendChild(sh);
    var close = function () { sh.remove(); };
    sh.querySelector(".x").onclick = close; sh.onclick = function (e) { if (e.target === sh) close(); };
    sh.querySelector("#ncRenew").onclick = function () { close(); showPaywall(); };
    sh.querySelector("#ncOut2").onclick = function () { close(); logout(false); };
  }
  function logout(expired) {
    A.token = ""; ls.set(K_TOK, ""); setMe(null); paintBar();
    if (A.on) showAuth(localAcct() || !A.local ? "login" : "register", expired ? "الجلسة خلصت. سجّل دخول تاني." : "");
  }

  // شارة الحساب في الهيدر
  function paintChip() {
    if (!A.on) { if (chip) chip.remove(); chip = null; return; }
    if (!chip) {
      var hdr = document.querySelector("header"); if (!hdr) return;
      chip = document.createElement("button"); chip.type = "button"; chip.className = "nc-chip"; chip.onclick = function () { if (A.token) showAccount(); else showAuth("login"); };
      var gear = hdr.querySelector(".gear,.iconbtn"); var host = gear ? gear.parentNode : hdr;
      host.insertBefore(chip, gear || null);
    }
    var mode = modeOf(A.me);
    chip.className = "nc-chip " + mode;
    chip.textContent = !A.token ? "👤 دخول" : mode === "sub" ? "⭐ مشترك" : mode === "trial" ? "🎁 تجربة · " + left(A.me.trialEnd - Date.now()) : "🔒 اشترك";
  }
  function paintBar() {
    var mode = A.on && A.token ? modeOf(A.me) : "none";
    if (mode !== "trial") { if (bar) bar.remove(); bar = null; return; }
    if (!bar) {
      bar = document.createElement("div"); bar.className = "nc-trialbar";
      var host = document.querySelector("main") || document.body; host.appendChild(bar);
    }
    bar.innerHTML = '<span>🎁 تجربة مجانية · باقي <b>' + left(A.me.trialEnd - Date.now()) + '</b></span><button class="btn" type="button">اشترك بـ ' + ((A.plan && A.plan.price) || 229).toLocaleString("ar-EG") + ' ج</button>';
    bar.querySelector("button").onclick = function () { showPaywall(); };
  }
  // كل دقيقة: نحدّث العدّاد، ولو التجربة أو الاشتراك خلص نقفل
  setInterval(function () {
    if (!A.on || !A.token) return;
    paintChip(); paintBar();
    if (!A.local && modeOf(A.me) === "expired" && (!gate || gate.hidden)) refreshMe().then(function () { if (modeOf(A.me) === "expired") showPaywall(); });
  }, 60000);

  // ---------- البداية ----------
  function decide() {
    paintChip(); paintBar();
    if (!A.on) { hideGate(); return; }
    if (!A.token) { showAuth("register"); return; }
    if (modeOf(A.me) === "expired") showPaywall();
  }
  var decided = false;
  function boot() {
    if (A.local && A.token === "local") setMe(localMe());
    // من الكاش: الشاشة الصح بتظهر على طول حتى من غير نت
    if (A.token) { decided = true; decide(); }
    var done = false, fallback = setTimeout(function () { if (!done && !decided) { decided = true; decide(); } }, 2500);
    api("/status").then(function (s) {
      done = true; clearTimeout(fallback);
      if (s.plan) A.plan = s.plan;
      var server = !!s.auth, wasLocal = A.local; A.local = !server; ls.set(K_ON, server ? "1" : "");
      if (server && wasLocal && A.token === "local") {
        // السيرفر اتفعّل: الحساب المؤقت لازم يتعمل على السيرفر
        A.token = ""; ls.set(K_TOK, ""); setMe(null); decided = true; decide(); return;
      }
      if (server && A.token) refreshMe().then(decide); else { if (A.token === "local") setMe(localMe()); decide(); }
    }).catch(function () { done = true; clearTimeout(fallback); if (!decided) { decided = true; decide(); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); }); else boot();
})();
