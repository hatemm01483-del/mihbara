/* NewsCast 360 — الحساب والخطط (v3.3)
   - التطبيق بيفتح على طول من غير تسجيل دخول. الحساب اختياري من تبويب «الحساب».
   - 3 خطط: مجاني (عُدّة الإعلامي + اللعبة + ٣ استخدامات ذكية في اليوم) · طالب ٩٩ ج · محترف ٢٢٩ ج.
   - الخطط بتتطبّق بس لما السيرفر يكون متفعّل فيه الحسابات والدفع. قبل كده كل حاجة مفتوحة ببلاش. */
(function () {
  "use strict";
  var C = window.MIHBARA_CONFIG || {};
  var SERVER = String(C.server || "").replace(/\/+$/, "");
  var K_TOK = "mihbara-acct-token", K_ME = "mihbara-acct-me", K_ON = "mihbara-acct-on", K_PAY = "mihbara-acct-pay", K_DEV = "mihbara-acct-dev", K_PHONE = "mihbara-acct-phone", K_LOCAL = "mihbara-local-acct", K_USE = "mihbara-ai-use";
  var ls = {
    get: function (k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } },
    set: function (k, v) { try { if (v == null || v === "") localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  };
  var DEF_PLAN = { price: 229, days: 30, trialDays: 1, freeDaily: 3, prices: { student: 99, pro: 229 } };
  var A = window.NCAccount = {
    on: !!SERVER, local: ls.get(K_ON) !== "1", enforce: ls.get(K_ON) === "1" && ls.get(K_PAY) === "1",
    token: ls.get(K_TOK), me: null, plan: DEF_PLAN
  };
  try { A.me = JSON.parse(ls.get(K_ME) || "null"); } catch (e) { A.me = null; }
  var subs = [];
  A.onChange = function (fn) { subs.push(fn); };
  function changed() { paintChip(); paintBar(); subs.forEach(function (f) { try { f(); } catch (e) { } }); }

  // ---------- الخطط ----------
  var PLANS = {
    free: { n: "مجاني", i: "🌱", f: ["عُدّة الإعلامي كلها (بتشتغل من غير نت)", "لعبة «حقيقة ولا شائعة؟»", "٣ استخدامات للأدوات الذكية كل يوم", "الاختبار والسجل"] },
    student: { n: "طالب", i: "🎓", f: ["كل أدوات الكتابة والتحرير", "التحقق من الأخبار والتحضير", "تدريب المذيع ومحاكي الحوار", "غرفة الأخبار والمحتوى والدراسة", "الأدوات الذكية من غير حدود"] },
    pro: { n: "محترف", i: "⭐", f: ["كل اللي في خطة الطالب", "المذيع الافتراضي وتسجيل الفيديو", "تفريغ المقابلات والمحاضرات", "معمل الصوت والصورة وتحليل الصوت", "التدريب على الهوا بالكامل"] }
  };
  var RANK = { free: 0, student: 1, pro: 2 };
  A.PLANS = PLANS; A.RANK = RANK;
  function price(t) { var p = (A.plan && A.plan.prices) || DEF_PLAN.prices; return t === "free" ? 0 : +(p[t] || DEF_PLAN.prices[t]); }
  function freeDaily() { return +((A.plan && A.plan.freeDaily) || 3); }
  function modeOf(me) {
    if (!me) return "none";
    var now = Date.now();
    if ((me.subEnd || 0) > now || (me.stuEnd || 0) > now) return "sub";
    if ((me.trialEnd || 0) > now) return "trial"; return "expired";
  }
  // مستوى الحساب الحالي
  A.tier = function () {
    if (!A.enforce) return "pro"; // قبل تفعيل الاشتراكات: كل حاجة مفتوحة
    var me = A.token ? A.me : null; if (!me) return "free";
    var now = Date.now();
    if ((me.subEnd || 0) > now || (me.trialEnd || 0) > now) return "pro";
    if ((me.stuEnd || 0) > now) return "student";
    return "free";
  };
  A.realTier = function () { var me = A.token ? A.me : null; if (!me) return "free"; var now = Date.now(); return (me.subEnd || 0) > now || (me.trialEnd || 0) > now ? "pro" : (me.stuEnd || 0) > now ? "student" : "free"; };
  A.can = function (need) { return RANK[A.tier()] >= RANK[need || "free"]; };
  function today() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  A.usedToday = function () { try { var u = JSON.parse(ls.get(K_USE) || "{}"); return u.d === today() ? +u.n || 0 : 0; } catch (e) { return 0; } };
  function useOne() { ls.set(K_USE, JSON.stringify({ d: today(), n: A.usedToday() + 1 })); }
  A.leftToday = function () { return Math.max(0, freeDaily() - A.usedToday()); };

  // ---------- الطلبات للسيرفر ----------
  var rawFetch = window.fetch.bind(window);
  function fake402(need) { return Promise.resolve(new Response(JSON.stringify({ error: "subscription_required", need: need }), { status: 402, headers: { "content-type": "application/json" } })); }
  if (SERVER) window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (url.indexOf(SERVER) !== 0) return rawFetch(input, init);
    var path = url.slice(SERVER.length).split("?")[0];
    var gated = /^\/(ai|tts|media)$|^\/did\//.test(path), need = /^\/(media$|did\/)/.test(path) ? "pro" : "student";
    if (gated && A.enforce && !A.can(need)) {
      if (need === "pro" || A.leftToday() <= 0) { setTimeout(function () { showPaywall(need, need === "student" ? "quota" : ""); }, 0); return fake402(need); }
      useOne(); setTimeout(changed, 0);
    }
    if (!A.local) {
      init = Object.assign({}, init || {});
      var h = new Headers(init.headers || (typeof input !== "string" && input.headers) || {});
      if (!h.has("authorization")) h.set("authorization", A.token ? "Bearer " + A.token : "Device " + deviceId());
      init.headers = h;
    }
    var p = rawFetch(input, init);
    if (gated) p.then(function (r) {
      if (r.status === 402 && !A.local) r.clone().json().then(function (j) { refreshMe().then(function () { showPaywall((j && j.need) || "student", j && j.need === "student" ? "quota" : ""); }); }).catch(function () { });
      else if (r.status === 401 && A.token) r.clone().json().then(function (j) { if (j && j.error === "login_required") logout(true); }).catch(function () { });
    }).catch(function () { });
    return p;
  };
  function api(path, body, method) {
    var o = { method: method || (body ? "POST" : "GET"), headers: { "x-app-token": C.token || "" } };
    if (body) { o.headers["content-type"] = "application/json"; o.body = JSON.stringify(body); }
    return window.fetch(SERVER + path, o).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j.__status = r.status; return j; }); });
  }
  function deviceId() {
    try { if (window.MihbaraUI && MihbaraUI.deviceId) { var d = MihbaraUI.deviceId(); if (d) return String(d).replace(/[^\w-]/g, "").slice(0, 64); } } catch (e) { }
    var x = ls.get(K_DEV); if (!x) { x = "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); ls.set(K_DEV, x); } return x;
  }
  function setMe(me) {
    if (me && me.plan) A.plan = Object.assign({}, DEF_PLAN, me.plan);
    if (me && me.now) { var skew = Date.now() - me.now; if (Math.abs(skew) > 60000) { ["trialEnd", "subEnd", "stuEnd"].forEach(function (k) { if (me[k]) me[k] += skew; }); } me.now = 0; }
    A.me = me; ls.set(K_ME, me ? JSON.stringify(me) : "");
    changed();
  }
  // ---------- حساب على الموبايل (لو السيرفر لسه مافيهوش حسابات) ----------
  function localAcct() { try { return JSON.parse(ls.get(K_LOCAL) || "null"); } catch (e) { return null; } }
  function localMe() { var a = localAcct(); return a ? { email: a.email, name: a.name || "", trialEnd: 0, subEnd: 0, stuEnd: 0, local: true } : null; }
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
        a = { email: email, name: name, pw: hp, created: Date.now() };
        ls.set(K_LOCAL, JSON.stringify(a)); return { token: "local", me: localMe() };
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
  A.refresh = refreshMe;
  function left(ms) {
    if (ms <= 0) return "خلصت";
    var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), d = Math.floor(h / 24);
    if (d >= 1) return d.toLocaleString("ar-EG") + (d === 1 ? " يوم" : d === 2 ? " يومين" : d <= 10 ? " أيام" : " يوم");
    if (h >= 1) return h.toLocaleString("ar-EG") + " س " + (m ? m.toLocaleString("ar-EG") + " د" : "");
    return Math.max(1, m).toLocaleString("ar-EG") + " دقيقة";
  }
  function fmtDate(t) { try { return new Date(t).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return ""; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function N(x) { return Number(x).toLocaleString("ar-EG"); }
  function say(t) { try { toast(t); } catch (e) { } }

  // ---------- الشكل ----------
  var css = ".nc-gate{position:fixed;inset:0;z-index:60;overflow:auto;background:var(--bg,#0e0e13);display:flex;align-items:flex-start;justify-content:center;padding:max(20px,env(safe-area-inset-top)) 16px 32px}" +
    ".nc-gate[hidden]{display:none}.nc-gbox{position:relative;width:100%;max-width:460px;margin-top:2vh}" +
    ".nc-close{position:absolute;top:0;inset-inline-end:0;z-index:3;width:40px;height:40px;border-radius:50%;border:1px solid var(--line,#2a2a35);background:var(--card,#16161d);color:var(--ink,#fff);font-size:18px;cursor:pointer}" +
    ".nc-brand{text-align:center;margin-bottom:14px}.nc-brand b{display:block;font-size:28px;font-weight:800;background:linear-gradient(90deg,var(--a1,#2563eb),var(--a2,#7c3aed));-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:.5px}.nc-brand span{color:var(--muted,#999);font-size:14px}" +
    ".nc-card{background:var(--card,#16161d);border:1px solid var(--line,#2a2a35);border-radius:24px;padding:20px;box-shadow:0 20px 40px -24px rgba(0,0,0,.35)}" +
    ".nc-card h2{margin:0 0 6px;font-size:20px}.nc-card>p{margin:0 0 12px;color:var(--muted,#999);font-size:14px}" +
    ".nc-card label{display:block;font-size:13px;font-weight:600;margin:10px 0 6px}.nc-card input{margin:0}" +
    ".nc-card .btn.wide{width:100%;margin-top:14px;padding:14px;font-size:16px}" +
    ".nc-msg{min-height:20px;margin-top:10px;font-size:13.5px;color:#e03131;text-align:center}.nc-msg.ok{color:#0c8a63}" +
    ".nc-switch{margin-top:12px;text-align:center;font-size:14px;color:var(--muted,#999)}.nc-switch button,.nc-link{font:inherit;color:var(--accent,#2563eb);background:none;border:0;padding:4px;cursor:pointer;font-weight:600;text-decoration:underline;text-underline-offset:3px}" +
    ".nc-gift{display:flex;gap:10px;align-items:center;margin-top:14px;padding:12px 14px;border-radius:16px;background:var(--accent-soft,rgba(37,99,235,.12));font-size:13.5px}.nc-gift i{font-style:normal;font-size:22px}" +
    /* كروت الخطط */
    ".nc-plans{display:grid;gap:10px;margin:12px 0 4px}" +
    ".nc-pl{position:relative;display:block;width:100%;text-align:start;font:inherit;color:inherit;cursor:pointer;padding:14px 16px;border-radius:18px;border:1.5px solid var(--line,#2a2a35);background:var(--bg2,#1c1c25);transition:border-color .2s,transform .15s}" +
    ".nc-pl:active{transform:scale(.99)}.nc-pl[aria-pressed=true]{border-color:var(--accent,#2563eb);box-shadow:0 0 0 3px var(--accent-soft,rgba(37,99,235,.15))}" +
    ".nc-pl .ph{display:flex;align-items:center;justify-content:space-between;gap:8px}.nc-pl .pn{font-weight:800;font-size:16px}.nc-pl .pp{font-weight:800;font-size:20px}.nc-pl .pp small{font-size:12px;font-weight:500;color:var(--muted,#999)}" +
    ".nc-pl ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:4px;font-size:13px;color:var(--muted,#999)}.nc-pl li::before{content:'✓';color:#0c8a63;font-weight:800;margin-inline-end:6px}" +
    ".nc-pl .tag{position:absolute;top:-10px;inset-inline-end:14px;background:linear-gradient(135deg,var(--a1,#2563eb),var(--a2,#7c3aed));color:#fff;font-size:11.5px;font-weight:700;padding:2px 10px;border-radius:999px}" +
    ".nc-pl.cur{border-style:dashed}.nc-pl .now{font-size:11.5px;font-weight:700;color:#0c8a63;background:rgba(12,138,99,.12);padding:2px 8px;border-radius:999px}" +
    ".nc-pm{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:12px;font-size:12px;color:var(--muted,#999)}.nc-pm span{border:1px solid var(--line,#2a2a35);border-radius:999px;padding:3px 10px}" +
    ".nc-wait{display:grid;justify-items:center;gap:10px;text-align:center;padding:10px 0}.nc-wait i{width:44px;height:44px;border-radius:50%;border:4px solid var(--line,#2a2a35);border-top-color:var(--accent,#2563eb);animation:ncspin 1s linear infinite}@keyframes ncspin{to{transform:rotate(360deg)}}" +
    ".nc-done{font-size:64px;line-height:1;animation:ncpop .5s ease}@keyframes ncpop{0%{transform:scale(.3);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}" +
    ".nc-chip{display:inline-flex;align-items:center;gap:6px;font:inherit;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:999px;border:1px solid var(--line,#2a2a35);background:var(--bg2,#1c1c25);color:var(--ink,#fff);cursor:pointer;white-space:nowrap}" +
    ".nc-chip.trial{background:rgba(245,159,0,.14);border-color:rgba(245,159,0,.4);color:#c77700}.nc-chip.sub{background:rgba(12,138,99,.13);border-color:rgba(12,138,99,.35);color:#0c8a63}" +
    ".nc-rows{display:grid;gap:8px;margin:10px 0 4px;font-size:14px}.nc-rows div{display:flex;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg,#0e0e13)}.nc-rows span{color:var(--muted,#999)}" +
    ".nc-trialbar{position:sticky;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:14;margin:14px auto 0;max-width:560px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-radius:16px;background:var(--card,#16161d);border:1px solid rgba(245,159,0,.45);font-size:13.5px;backdrop-filter:blur(14px)}" +
    ".nc-trialbar .btn{padding:8px 14px;font-size:13px}" +
    ".nc-crew{position:relative;display:flex;justify-content:center;align-items:flex-end;gap:70px;height:150px;padding-top:30px;margin:-4px 0 -18px;z-index:1;pointer-events:none}" +
    ".nc-crew img{height:120px;width:auto;filter:drop-shadow(0 10px 10px rgba(0,0,0,.25));animation:ncbob 1.6s ease-in-out infinite}.nc-crew img:last-child{animation-delay:-.8s}" +
    ".nc-bub{position:absolute;top:0;left:50%;transform:translateX(-50%);background:#fff;color:#111;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:14px;box-shadow:0 6px 16px rgba(0,0,0,.18);white-space:nowrap}" +
    "@keyframes ncbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}" +
    /* صفحة الحساب */
    ".nc-acc{display:grid;gap:14px;margin-top:6px}" +
    ".nc-prof{display:flex;align-items:center;gap:14px}.nc-av{flex:none;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;font-size:24px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--a1,#2563eb),var(--a2,#7c3aed))}" +
    ".nc-prof b{display:block;font-size:18px}.nc-prof small{color:var(--muted,#999);font-size:13px}" +
    ".nc-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.nc-btns .btn{flex:1;min-width:120px}" +
    ".nc-tier{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;padding:4px 12px;border-radius:999px;background:var(--accent-soft,rgba(37,99,235,.12));color:var(--accent,#2563eb)}" +
    ".nc-meter{height:10px;border-radius:999px;background:var(--line,#2a2a35);overflow:hidden;margin-top:8px}.nc-meter i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--a1,#2563eb),var(--a2,#7c3aed))}" +
    ".nc-note{padding:12px 14px;border-radius:16px;background:rgba(12,138,99,.1);border:1px solid rgba(12,138,99,.3);font-size:13.5px}" +
    ".nc-sec{font-size:15px;font-weight:800;margin:6px 2px -4px}" +
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
  A.close = hideGate;
  var BRAND = '<div class="nc-brand"><b>NewsCast 360</b><span>خليك محاوط الخبر</span></div>';
  var CREW = '<div class="nc-crew" aria-hidden="true"><img src="nc-girl.webp" alt=""><span class="nc-bub">أهلاً بيك 👋</span><img src="nc-boy.webp" alt=""></div>';
  var X = '<button type="button" class="nc-close x" aria-label="إغلاق">✕</button>';
  function openGate(html) {
    ensureGate(); lockScroll(true); gate.hidden = false; gate.innerHTML = '<div class="nc-gbox">' + X + html + '</div>';
    gate.querySelector(".nc-close").onclick = hideGate;
  }

  // ---------- دخول / حساب جديد (اختياري) ----------
  function showAuth(mode, msg, after) {
    var reg = (mode || "register") === "register", trialD = (A.plan && A.plan.trialDays) || 1;
    var trialTxt = A.enforce ? '<div class="nc-gift"><i>🎁</i><div><b>هدية: خطة المحترف ' + (trialD === 1 ? "يوم كامل" : N(trialD) + " أيام") + ' ببلاش</b><br>أول ما تعمل حسابك، ومن غير ما تدفع أي حاجة.</div></div>'
      : '<div class="nc-gift"><i>💾</i><div>الحساب بيحفظ اسمك وخطتك، وتقدر تكمّل من غيره عادي.</div></div>';
    openGate(BRAND + CREW + '<form class="nc-card" id="ncAuth" novalidate>' +
      '<h2>' + (reg ? "اعمل حسابك" : "سجّل دخولك") + '</h2><p>' + (reg ? "اختياري — التطبيق شغال معاك من غير حساب." : "أهلاً بيك تاني 👋") + '</p>' +
      (reg ? '<label for="ncName">الاسم</label><input id="ncName" autocomplete="name" placeholder="اسمك">' : "") +
      '<label for="ncEmail">الإيميل</label><input id="ncEmail" type="email" inputmode="email" autocomplete="email" dir="ltr" placeholder="name@example.com">' +
      '<label for="ncPw">كلمة السر</label><input id="ncPw" type="password" autocomplete="' + (reg ? "new-password" : "current-password") + '" dir="ltr" placeholder="٦ حروف أو أرقام على الأقل">' +
      '<button class="btn wide" type="submit" id="ncGo">' + (reg ? "اعمل الحساب" : "دخول") + '</button>' +
      '<div class="nc-msg" id="ncMsg">' + esc(msg || "") + '</div>' + (reg ? trialTxt : "") +
      '<div class="nc-switch">' + (reg ? 'عندك حساب؟ <button type="button" id="ncSw">سجّل دخول</button>' : 'أول مرة؟ <button type="button" id="ncSw">اعمل حساب جديد</button>') +
      '<br><button type="button" class="nc-link" id="ncSkip">مش دلوقتي</button></div></form>');
    var f = gate.querySelector("#ncAuth"), m = gate.querySelector("#ncMsg");
    gate.querySelector("#ncSw").onclick = function () { showAuth(reg ? "login" : "register", "", after); };
    gate.querySelector("#ncSkip").onclick = hideGate;
    f.onsubmit = function (e) {
      e.preventDefault();
      var email = f.querySelector("#ncEmail").value.trim(), pw = f.querySelector("#ncPw").value, name = reg ? f.querySelector("#ncName").value.trim() : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { m.className = "nc-msg"; m.textContent = "اكتب إيميل صحيح."; return; }
      if (pw.length < 6) { m.className = "nc-msg"; m.textContent = "كلمة السر لازم تكون ٦ حروف أو أرقام على الأقل."; return; }
      var b = f.querySelector("#ncGo"); b.disabled = true; m.className = "nc-msg ok"; m.textContent = "لحظة…";
      (A.local ? localAuth(reg, email.toLowerCase(), pw, name) : api(reg ? "/auth/register" : "/auth/login", reg ? { email: email, password: pw, name: name, device: deviceId() } : { email: email, password: pw })).then(function (j) {
        b.disabled = false;
        if (j.token) {
          A.token = j.token; ls.set(K_TOK, j.token); setMe(j.me); hideGate();
          say(reg ? (A.enforce && !j.trialUsed ? "أهلاً بيك! خطة المحترف مفتوحة لك يوم ببلاش 🎁" : "اتعمل الحساب ✓") : "أهلاً بيك تاني ✓");
          if (after) after();
          return;
        }
        m.className = "nc-msg";
        m.textContent = ({ exists: "الإيميل ده عليه حساب بالفعل. سجّل دخول بدل كده.", bad_login: "الإيميل أو كلمة السر غلط.", bad_email: "اكتب إيميل صحيح.", weak_password: "كلمة السر قصيرة." })[j.error] || "حصلت مشكلة. اتأكد من النت وجرّب تاني.";
      }).catch(function () { b.disabled = false; m.className = "nc-msg"; m.textContent = "مفيش اتصال بالإنترنت. اتأكد من النت وجرّب تاني."; });
    };
    setTimeout(function () { var i = gate && gate.querySelector(reg ? "#ncName" : "#ncEmail"); if (i) try { i.focus({ preventScroll: true }); } catch (e) { } }, 50);
  }
  A.showAuth = showAuth;

  // كروت الخطط (بتتستخدم في شاشة الاشتراك وصفحة الحساب)
  function planCards(sel, cur, withFree) {
    return '<div class="nc-plans">' + ["free", "student", "pro"].filter(function (t) { return withFree || t !== "free"; }).map(function (t) {
      var P = PLANS[t], pr = price(t);
      return '<button type="button" class="nc-pl' + (t === cur ? " cur" : "") + '" data-plan="' + t + '" aria-pressed="' + (t === sel) + '">' +
        (t === "pro" ? '<span class="tag">الأقوى</span>' : t === "student" ? '<span class="tag">الأنسب للطلاب</span>' : "") +
        '<div class="ph"><span class="pn">' + P.i + " " + P.n + (t === cur ? ' <span class="now">خطتك</span>' : "") + '</span><span class="pp">' + (pr ? N(pr) + ' <small>ج / شهر</small>' : "ببلاش") + '</span></div>' +
        '<ul>' + P.f.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul></button>';
    }).join("") + '</div>';
  }
  A.planCards = planCards;

  // ---------- شاشة الاشتراك ----------
  function showPaywall(need, why, pick) {
    need = need || "student";
    var cur = A.realTier(), sel = pick || (RANK[need] > RANK[cur] ? need : cur === "student" ? "pro" : need);
    if (sel === "free") sel = "student";
    var head = why === "quota" ? "خلصت الـ" + N(freeDaily()) + " استخدامات المجانية بتاعة النهارده" : why === "tool" ? "الأداة دي في خطة " + PLANS[need].n : "اختار خطتك";
    var sub = why === "quota" ? "استنى لبكره، أو اشترك وكمّل من غير حدود." : why === "tool" ? "اشترك وافتحها هي وكل اللي معاها." : "كل خطة بتفتح مميزات أكتر. تقدر تغيّر في أي وقت.";
    var loggedIn = !!A.token && !A.local;
    openGate(BRAND + '<div class="nc-card" id="ncPay"><h2>' + head + '</h2><p>' + sub + '</p>' + planCards(sel, cur, false) +
      (A.enforce ? '<label for="ncPhone">رقم الموبايل <small style="font-weight:400;color:var(--muted)">(للدفع بالمحفظة)</small></label><input id="ncPhone" type="tel" inputmode="tel" dir="ltr" placeholder="01xxxxxxxxx" value="' + esc(ls.get(K_PHONE)) + '">' : "") +
      '<button class="btn wide" type="button" id="ncBuy"></button>' +
      '<div class="nc-pm"><span>💳 كارت بنك</span><span>📱 فودافون كاش والمحافظ</span><span>🔒 دفع آمن عن طريق Paymob</span></div>' +
      '<div class="nc-msg" id="ncMsg"></div><div class="nc-switch"><button type="button" class="nc-link" id="ncLater">مش دلوقتي</button></div></div>');
    var m = gate.querySelector("#ncMsg"), buy = gate.querySelector("#ncBuy");
    function paint() {
      [].forEach.call(gate.querySelectorAll(".nc-pl"), function (b) { b.setAttribute("aria-pressed", b.dataset.plan === sel); });
      buy.textContent = !A.enforce ? "الاشتراكات هتتفعّل قريب" : !loggedIn ? "اعمل حساب وكمّل للدفع" : "اشترك في «" + PLANS[sel].n + "» بـ " + N(price(sel)) + " ج";
    }
    [].forEach.call(gate.querySelectorAll(".nc-pl"), function (b) { b.onclick = function () { sel = b.dataset.plan; paint(); }; });
    paint();
    gate.querySelector("#ncLater").onclick = hideGate;
    buy.onclick = function () {
      if (!A.enforce) { m.className = "nc-msg ok"; m.textContent = "الدفع الأونلاين هيتفعّل قريب جداً. لحد كده كل المميزات مفتوحة ببلاش."; return; }
      if (!loggedIn) { showAuth("register", "", function () { if (RANK[A.realTier()] >= RANK[sel]) say("خطة «" + PLANS[A.realTier()].n + "» شغالة معاك بالفعل ✓"); else showPaywall(need, "", sel); }); return; }
      var phone = gate.querySelector("#ncPhone").value.replace(/[^\d+]/g, "");
      if (phone && !/^(\+?20)?0?1[0125]\d{8}$/.test(phone)) { m.className = "nc-msg"; m.textContent = "اكتب رقم موبايل مصري صحيح، أو سيبه فاضي لو هتدفع بالكارت."; return; }
      if (phone) ls.set(K_PHONE, phone);
      buy.disabled = true; m.className = "nc-msg ok"; m.textContent = "بيجهّز صفحة الدفع…";
      api("/pay/start", { plan: sel, phone: phone ? (phone.indexOf("+") === 0 ? phone : "+2" + phone.replace(/^20/, "").replace(/^(?!0)/, "0")) : "" }).then(function (j) {
        buy.disabled = false;
        if (j.url) { lastPayURL = j.url; openPay(j.url); showWaiting(); return; }
        m.className = "nc-msg";
        m.textContent = j.error === "pay_not_ready" ? "الدفع لسه مش متفعّل من عندنا. جرّب كمان شوية." : j.__status === 401 ? "سجّل دخول تاني." : "مقدرناش نفتح صفحة الدفع. جرّب تاني.";
      }).catch(function () { buy.disabled = false; m.className = "nc-msg"; m.textContent = "مفيش اتصال بالإنترنت."; });
    };
  }
  A.showPaywall = showPaywall;
  var lastPayURL = "";
  function openPay(u) {
    if (window.MihbaraUI) { location.href = u; return; }
    var a = document.createElement("a"); a.href = u; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
  }
  var pollT = null, pollUntil = 0, startSnap = "";
  function snap() { var me = A.me || {}; return (me.subEnd || 0) + "|" + (me.stuEnd || 0); }
  function stopPoll() { if (pollT) { clearInterval(pollT); pollT = null; } }
  function showWaiting() {
    startSnap = snap();
    openGate(BRAND + '<div class="nc-card"><div class="nc-wait"><i></i><h2>مستنيين الدفع…</h2>' +
      '<p>كمّل الدفع في الصفحة اللي اتفتحت. أول ما الفلوس توصل الخطة هتتفعّل هنا لوحدها في ثواني.</p></div>' +
      '<a class="btn ghost" id="ncReopen" href="' + esc(lastPayURL) + '" target="_blank" rel="noopener" style="display:block;text-align:center;text-decoration:none;margin-top:6px">صفحة الدفع مافتحتش؟ افتحها من هنا</a>' +
      '<div class="nc-switch"><button type="button" class="nc-link" id="ncChk">دفعت؟ اتأكد دلوقتي</button> · <button type="button" class="nc-link" id="ncCancel">رجوع</button></div></div>');
    gate.querySelector(".nc-close").onclick = function () { stopPoll(); hideGate(); };
    gate.querySelector("#ncChk").onclick = checkPaid;
    gate.querySelector("#ncReopen").onclick = function (e) { if (window.MihbaraUI) { e.preventDefault(); location.href = lastPayURL; } };
    gate.querySelector("#ncCancel").onclick = function () { stopPoll(); showPaywall(); };
    stopPoll(); pollUntil = Date.now() + 20 * 60000;
    pollT = setInterval(function () { if (Date.now() > pollUntil) { stopPoll(); return; } checkPaid(); }, 2000);
  }
  function checkPaid() { refreshMe().then(function (me) { if (me && snap() !== startSnap) { stopPoll(); showSuccess(); } }); }
  function showSuccess() {
    var t = A.realTier(), me = A.me || {}, end = t === "student" ? me.stuEnd : me.subEnd;
    openGate(BRAND + '<div class="nc-card" style="text-align:center"><div class="nc-done">✅</div><h2>خطة ' + PLANS[t].n + ' اتفعّلت!</h2>' +
      '<p>شغالة لحد ' + fmtDate(end) + '. استمتع بكل الأدوات.</p><button class="btn wide" type="button" id="ncGoOn">يلا نبدأ</button></div>');
    gate.querySelector("#ncGoOn").onclick = hideGate;
    say("الاشتراك اتفعّل ✓");
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && pollT) checkPaid(); });

  // ---------- صفحة «الحساب» ----------
  A.renderPage = function (el) {
    if (!el) return;
    var me = A.token ? (A.me || {}) : null, t = A.realTier(), mode = modeOf(me);
    var name = me ? (me.name || me.email.split("@")[0]) : "زائر";
    var prof = '<div class="nc-card"><div class="nc-prof"><span class="nc-av">' + esc(me ? name.trim().charAt(0).toUpperCase() : "👤") + '</span><div><b>' + esc(name) + '</b><small dir="' + (me ? "ltr" : "rtl") + '">' + esc(me ? me.email : "بتستخدم التطبيق من غير حساب") + '</small></div></div>' +
      (me ? "" : '<div class="nc-btns"><button class="btn" type="button" data-a="reg">اعمل حساب</button><button class="btn ghost" type="button" data-a="login">سجّل دخول</button></div>') + '</div>';
    var rows = "";
    if (A.enforce) {
      rows += '<div><span>خطتك</span><b>' + PLANS[t].i + " " + PLANS[t].n + (mode === "trial" ? " (تجربة)" : "") + '</b></div>';
      if (me && (me.subEnd || 0) > Date.now()) rows += '<div><span>المحترف شغال لحد</span><b>' + fmtDate(me.subEnd) + '</b></div>';
      if (me && (me.stuEnd || 0) > Date.now()) rows += '<div><span>الطالب شغال لحد</span><b>' + fmtDate(me.stuEnd) + '</b></div>';
      if (mode === "trial") rows += '<div><span>باقي على التجربة</span><b>' + left(me.trialEnd - Date.now()) + '</b></div>';
    }
    var usage = "";
    if (A.enforce && t === "free") {
      var used = Math.min(A.usedToday(), freeDaily());
      usage = '<div style="margin-top:12px;font-size:14px">استخدامات الأدوات الذكية النهارده: <b>' + N(used) + " من " + N(freeDaily()) + '</b><div class="nc-meter"><i style="width:' + Math.round(used / freeDaily() * 100) + '%"></i></div></div>';
    }
    var status = A.enforce ? '<div class="nc-card"><span class="nc-tier">' + PLANS[t].i + " خطة " + PLANS[t].n + '</span><div class="nc-rows">' + rows + '</div>' + usage + '</div>'
      : '<div class="nc-note">🎉 <b>كل المميزات مفتوحة ببلاش دلوقتي.</b><br>الخطط والاشتراك هيتفعّلوا قريب، وساعتها هتقدر تختار الخطة اللي تناسبك.</div>';
    el.innerHTML = '<div class="nc-tabhead"><h2>الحساب</h2><p>بياناتك وخطتك</p></div><div class="nc-acc">' + prof + status +
      '<div class="nc-sec">الخطط</div>' + planCards(t === "free" ? "student" : t, A.enforce ? t : "", true) +
      (me ? '<div class="nc-switch"><button type="button" class="nc-link" data-a="out">تسجيل خروج</button> · <button type="button" class="nc-link" data-a="del" style="color:#e03131">حذف الحساب</button></div>' : "") + '</div>';
    var on = function (a, fn) { var b = el.querySelector('[data-a="' + a + '"]'); if (b) b.onclick = fn; };
    on("reg", function () { showAuth("register"); }); on("login", function () { showAuth("login"); });
    on("out", function () { logout(false); });
    on("del", showDelete);
    [].forEach.call(el.querySelectorAll(".nc-pl"), function (b) {
      b.onclick = function () { var p = b.dataset.plan; if (p === "free") { say("الخطة المجانية شغالة على طول ✓"); return; } showPaywall(p, "", p); };
    });
  };

  // حذف الحساب نهائياً (مطلوب لـ Google Play)
  function showDelete() {
    openGate(BRAND + '<form class="nc-card" id="ncDel" novalidate><h2>حذف الحساب</h2><p>هيتحذف اسمك وإيميلك وكلمة السر وبيانات اشتراكك نهائيًا، ومش هينفع ترجّعه. التطبيق هيفضل شغال معاك من غير حساب.</p>' +
      '<label for="ncDelPw">اكتب كلمة السر للتأكيد</label><input id="ncDelPw" type="password" dir="ltr" autocomplete="current-password">' +
      '<button class="btn wide" type="submit" id="ncDelGo" style="background:#e03131">احذف حسابي نهائيًا</button><div class="nc-msg" id="ncMsg"></div>' +
      '<div class="nc-switch"><button type="button" class="nc-link" id="ncLater">رجوع</button></div></form>');
    var f = gate.querySelector("#ncDel"), m = gate.querySelector("#ncMsg");
    gate.querySelector("#ncLater").onclick = hideGate;
    f.onsubmit = function (e) {
      e.preventDefault();
      var pw = f.querySelector("#ncDelPw").value, b = f.querySelector("#ncDelGo");
      if (!pw) { m.className = "nc-msg"; m.textContent = "اكتب كلمة السر."; return; }
      b.disabled = true; m.className = "nc-msg ok"; m.textContent = "لحظة…";
      var done = function () { A.token = ""; ls.set(K_TOK, ""); setMe(null); hideGate(); say("اتحذف الحساب ✓"); };
      if (A.local) {
        var a = localAcct();
        pwHashLocal(pw, a ? a.email : "").then(function (hp) { b.disabled = false; if (!a || a.pw !== hp) { m.className = "nc-msg"; m.textContent = "كلمة السر غلط."; return; } ls.set(K_LOCAL, ""); done(); });
        return;
      }
      api("/auth/delete", { password: pw }).then(function (j) {
        b.disabled = false;
        if (j.ok) { done(); return; }
        m.className = "nc-msg"; m.textContent = j.error === "bad_login" ? "كلمة السر غلط." : "حصلت مشكلة. جرّب تاني.";
      }).catch(function () { b.disabled = false; m.className = "nc-msg"; m.textContent = "مفيش اتصال بالإنترنت."; });
    };
  }
  A.showDelete = showDelete;

  function logout(expired) {
    A.token = ""; ls.set(K_TOK, ""); setMe(null);
    say(expired ? "الجلسة خلصت. سجّل دخول تاني من «الحساب»." : "اتسجّل الخروج ✓");
  }
  A.logout = logout;

  // شارة صغيرة في الهيدر بتوديك لتبويب الحساب
  function paintChip() {
    if (!A.enforce || !A.token) { if (chip) chip.remove(); chip = null; return; }
    if (!chip) {
      var hdr = document.querySelector("header"); if (!hdr) return;
      chip = document.createElement("button"); chip.type = "button"; chip.className = "nc-chip";
      chip.onclick = function () { try { open("account"); } catch (e) { } };
      var gear = hdr.querySelector(".gear,.iconbtn"); var host = gear ? gear.parentNode : hdr; host.insertBefore(chip, gear || null);
    }
    var mode = modeOf(A.me), t = A.realTier();
    chip.className = "nc-chip " + (mode === "trial" ? "trial" : t !== "free" ? "sub" : "");
    chip.textContent = mode === "trial" ? "🎁 تجربة · " + left(A.me.trialEnd - Date.now()) : PLANS[t].i + " " + PLANS[t].n;
  }
  function paintBar() {
    var mode = A.enforce && A.token ? modeOf(A.me) : "none";
    if (mode !== "trial" || (A.me && ((A.me.subEnd || 0) > Date.now() || (A.me.stuEnd || 0) > Date.now()))) { if (bar) bar.remove(); bar = null; return; }
    if (!bar) { bar = document.createElement("div"); bar.className = "nc-trialbar"; (document.querySelector("main") || document.body).appendChild(bar); }
    bar.innerHTML = '<span>🎁 تجربة المحترف · باقي <b>' + left(A.me.trialEnd - Date.now()) + '</b></span><button class="btn" type="button">شوف الخطط</button>';
    bar.querySelector("button").onclick = function () { showPaywall("pro"); };
  }
  setInterval(function () { if (A.token) changed(); }, 60000);

  // ---------- البداية: مفيش أي شاشة بتظهر إجباري ----------
  function boot() {
    if (A.local && A.token === "local") A.me = localMe();
    changed();
    if (!SERVER) return;
    api("/status").then(function (s) {
      if (s.plan) A.plan = Object.assign({}, DEF_PLAN, s.plan);
      var server = !!s.auth, wasLocal = A.local;
      A.local = !server; A.enforce = server && !!s.pay;
      ls.set(K_ON, server ? "1" : ""); ls.set(K_PAY, A.enforce ? "1" : "");
      if (server && wasLocal && A.token === "local") { A.token = ""; ls.set(K_TOK, ""); A.me = null; }
      if (server && A.token) refreshMe().then(changed); else changed();
    }).catch(function () { });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 0); }); else boot();
})();
