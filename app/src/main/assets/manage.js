// NewsCast 360 — إدارة العمل الإعلامي: مميزات مبنية على مادة «مبادئ الإدارة» (RTV 314)
(function () {
  "use strict";
  const E = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const N = x => Number(x).toLocaleString("ar-EG");
  const T = m => { try { toast(m); } catch (e) { } };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const today = () => new Date().toISOString().slice(0, 10);
  const days = d => d ? Math.ceil((new Date(d + "T23:59:59") - Date.now()) / 864e5) : null;
  const fmtD = d => { try { return new Date(d + "T12:00:00").toLocaleDateString("ar-EG", { day: "numeric", month: "short" }); } catch (e) { return d; } };
  const KEY = "mihbara-mgmt";
  function load() { try { return Object.assign({ projects: [], team: [], org: {}, leader: [] }, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { return { projects: [], team: [], org: {}, leader: [] }; } }
  let D = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { } }
  const $$ = (r, s) => Array.prototype.slice.call(r.querySelectorAll(s));

  // ---------- الربط بالمادة ----------
  const LECT = { 1: "مفهوم الإدارة ووظائفها الأربع", 2: "المستويات الإدارية والرؤية والرسالة وSWOT", 3: "الفوارق بين المدير والقائد", 4: "صفات القائد الناجح", 5: "التفويض والمشاركة والذكاء العاطفي", 6: "التحفيز وبناء فريق الأحلام", 7: "التعيين وتقييم الموظفين", 8: "العمل الجماعي والتنافسية" };
  function concept(nums, text) {
    return `<details class="mg-concept"><summary>📘 من مادة مبادئ الإدارة · ${nums.map(n => "محاضرة " + N(n)).join(" و")}</summary><p>${E(text)}</p><small>${nums.map(n => N(n) + ") " + E(LECT[n])).join(" · ")}</small></details>`;
  }
  function head(box, title, lead, nums) {
    const h = document.createElement("div"); h.className = "slip mg-head";
    h.innerHTML = `<h2>${E(title)}</h2><p class="lead">${E(lead)}</p><div class="mg-lecs">${nums.map(n => `<span title="${E(LECT[n])}">📘 م${N(n)}: ${E(LECT[n])}</span>`).join("")}</div>`;
    box.append(h); return h;
  }
  function tabs(container, list, cur, on) {
    const t = document.createElement("div"); t.className = "seg2 mg-tabs";
    list.forEach(([k, l]) => { const b = document.createElement("button"); b.type = "button"; b.textContent = l; b.setAttribute("aria-pressed", String(cur === k)); b.onclick = () => on(k); t.append(b); });
    container.append(t); return t;
  }
  function aiBox(container, prompt, opts) {
    opts = opts || {};
    const out = document.createElement("div"); out.className = "mg-ai";
    out.innerHTML = `<div class="livesearch"><i></i><span>${E(opts.wait || "بيفكر…")}</span></div><div class="mg-ai-body"></div><div class="actions mg-ai-act" hidden><button class="btn ghost mini" type="button" data-a="copy">نسخ</button><button class="btn ghost mini" type="button" data-a="share">مشاركة</button><button class="btn ghost mini" type="button" data-a="close">إخفاء</button></div>`;
    const old = container.querySelector(":scope > .mg-ai"); if (old) old.remove();
    container.append(out); out.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const b = out.querySelector(".mg-ai-body"), w = out.querySelector(".livesearch"), act = out.querySelector(".mg-ai-act");
    let txt = "";
    act.onclick = e => { const a = e.target.dataset.a; if (a === "copy") { try { copyText(txt); } catch (x) { } } else if (a === "share") { try { shareText(txt); } catch (x) { } } else if (a === "close") out.remove(); };
    return sample(prompt, { onText: o => { w.hidden = true; b.innerHTML = md(o.text); } })
      .then(r => { txt = r.text; w.hidden = true; b.innerHTML = md(r.text); act.hidden = false; if (opts.history) { try { addHistory(opts.tool || "mproject", opts.history, r.text); } catch (x) { } } if (opts.done) opts.done(r.text); return r.text; })
      .catch(e => { w.hidden = true; b.innerHTML = `<p class="lv-err">${E((typeof ERR !== "undefined" && ERR[e && e.code]) || "مقدرتش أوصل للذكاء الاصطناعي دلوقتي. جرّب تاني.")}</p>`; });
  }
  function slot(btn) { const a = btn.closest(".actions") || btn.parentNode; let s = a.nextElementSibling; if (!s || !s.classList.contains("mg-slot")) { s = document.createElement("div"); s.className = "mg-slot"; a.after(s); } return s; }
  const STYLE = "اكتب بالعامية المصرية المبسطة، والمصطلحات الإدارية بالفصحى، وبنقط قصيرة وعناوين صغيرة. اربط كلامك بمفاهيم مادة «مبادئ الإدارة» واذكر رقم المحاضرة لما تستخدم مفهوم منها.";

  // =====================================================================
  // ١) إدارة مشروع إعلامي — وظائف الإدارة الأربع
  // =====================================================================
  const PTYPES = ["حلقة برنامج", "حلقة إذاعية / بودكاست", "حملة إعلامية", "تغطية حدث", "بودكاست / سلسلة فيديو", "مشروع تخرج"];
  const GOALC = ["واضح للفريق كله", "مشروع (قانوني وأخلاقي)", "واقعي حسب إمكانياتنا", "قابل للقياس والمتابعة", "مرن لو الظروف اتغيرت"];
  const CTRL = [["quality", "الجودة"], ["time", "الوقت"], ["cost", "التكلفة"], ["effort", "المجهود"]];
  let pv = { id: null, tab: "plan" };
  const getP = id => D.projects.find(p => p.id === id);
  function pStats(p) {
    const t = p.tasks || [], done = t.filter(x => x.done).length;
    const late = t.filter(x => !x.done && x.due && days(x.due) < 0).length;
    return { total: t.length, done, late, pct: t.length ? Math.round(done / t.length * 100) : 0, left: days(p.due) };
  }
  function owners() { return [["me", "أنا (المسؤول)"]].concat(D.team.map(m => [m.id, m.name + (m.role ? " · " + m.role : "")])); }
  const ownerName = id => id === "me" || !id ? "أنا" : ((D.team.find(m => m.id === id) || {}).name || "—");

  function offProject(box) {
    if (pv.id && !getP(pv.id)) pv.id = null;
    if (!pv.id) return projectList(box);
    projectView(box, getP(pv.id));
  }
  function projectList(box) {
    head(box, "إدارة مشروع إعلامي", "خطّط لحلقة أو عدد أو حملة بنفس ترتيب وظائف الإدارة: تخطيط ← تنظيم ← توجيه ← رقابة. المهام والمواعيد والتقدم كله في مكان واحد.", [1, 5]);
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = concept([1], "الإدارة هي تنفيذ الأعمال عن طريق الآخرين بالتخطيط والتنظيم والتوجيه والرقابة، لتحقيق أهداف المؤسسة بكفاءة وفاعلية. كل مشروع هنا ماشي على الأربع وظايف دول بالترتيب.") +
      `<h3 class="nf-sec">مشروع جديد</h3><label for="mgPN">اسم المشروع</label><input id="mgPN" placeholder="مثلاً: حلقة «شباب وسوشيال ميديا» لبرنامج المعهد">
      <label for="mgPT">نوعه</label><select id="mgPT">${PTYPES.map(t => `<option>${E(t)}</option>`).join("")}</select>
      <label for="mgPD">ميعاد التسليم</label><input id="mgPD" type="date">
      <div class="actions"><button class="btn" type="button" id="mgPAdd">ابدأ المشروع</button></div>`;
    box.append(c);
    c.querySelector("#mgPAdd").onclick = () => {
      const name = c.querySelector("#mgPN").value.trim(); if (!name) { T("اكتب اسم المشروع"); return; }
      const p = { id: uid(), name, type: c.querySelector("#mgPT").value, due: c.querySelector("#mgPD").value || "", start: today(), goal: "", checks: {}, term: "short", alts: "", res: "", tasks: [], log: [], review: {}, lessons: "", created: Date.now() };
      D.projects.unshift(p); save(); pv = { id: p.id, tab: "plan" }; renderOff("mproject");
    };
    if (D.projects.length) {
      const l = document.createElement("div"); l.className = "mg-list";
      l.innerHTML = `<h3 class="nf-sec">مشاريعك (${N(D.projects.length)})</h3>` + D.projects.map(p => {
        const s = pStats(p);
        return `<button type="button" class="mg-item" data-id="${p.id}"><span class="mg-it-top"><b>${E(p.name)}</b><small>${E(p.type)}</small></span>
        <span class="mg-bar"><i style="width:${s.pct}%"></i></span>
        <span class="mg-meta"><span>✓ ${N(s.done)}/${N(s.total)} مهمة</span>${s.late ? `<span class="mg-warn">⚠ ${N(s.late)} متأخرة</span>` : ""}${s.left != null ? `<span>${s.left >= 0 ? "📅 فاضل " + N(s.left) + " يوم" : "📅 الميعاد عدّى"}</span>` : ""}</span></button>`;
      }).join("");
      box.append(l);
      $$(l, ".mg-item").forEach(b => b.onclick = () => { pv = { id: b.dataset.id, tab: "plan" }; renderOff("mproject"); window.scrollTo(0, 0); });
    }
  }
  function projectView(box, p) {
    const s = pStats(p);
    const h = document.createElement("div"); h.className = "slip mg-head";
    h.innerHTML = `<button type="button" class="btn ghost mini" id="mgBack">→ كل المشاريع</button><h2>${E(p.name)}</h2><p class="lead">${E(p.type)}${p.due ? " · التسليم " + fmtD(p.due) : ""}</p>
      <div id="mgPHead"></div>`;
    box.append(h);
    pHead(p);
    h.querySelector("#mgBack").onclick = () => { pv.id = null; renderOff("mproject"); };
    tabs(h, [["plan", "١ التخطيط"], ["org", "٢ التنظيم"], ["dir", "٣ التوجيه"], ["ctrl", "٤ الرقابة"]], pv.tab, k => { pv.tab = k; renderOff("mproject"); });
    const body = document.createElement("div"); box.append(body);
    ({ plan: pPlan, org: pOrg, dir: pDir, ctrl: pCtrl })[pv.tab](body, p);
    const del = document.createElement("div"); del.className = "actions mg-del";
    del.innerHTML = `<button class="btn ghost mini" type="button">حذف المشروع</button>`;
    let armed = false;
    del.firstChild.onclick = function () { if (!armed) { armed = true; this.textContent = "متأكد؟ دوس تاني للحذف"; return; } D.projects = D.projects.filter(x => x.id !== p.id); save(); pv.id = null; renderOff("mproject"); T("اتحذف"); };
    box.append(del);
  }
  function pHead(p) {
    const e = document.getElementById("mgPHead"); if (!e) return; const s = pStats(p);
    e.innerHTML = `<div class="mg-bar big"><i style="width:${s.pct}%"></i></div><div class="mg-meta"><span>الإنجاز ${N(s.pct)}٪</span><span>✓ ${N(s.done)}/${N(s.total)}</span>${s.late ? `<span class="mg-warn">⚠ ${N(s.late)} متأخرة</span>` : ""}${s.left != null ? `<span>${s.left >= 0 ? "فاضل " + N(s.left) + " يوم" : "الميعاد عدّى"}</span>` : ""}</div>`;
  }
  function pPlan(body, p) {
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = concept([1, 2], "التخطيط هو التحديد المسبق لمسار العمل: ماذا نفعل؟ وكيف؟ ومتى؟ ومن يفعله؟ ولازم يكون ليه زمن (قصير أو طويل الأجل). الهدف الجيد: واضح، مشروع، واقعي، قابل للقياس، ومرن. ويفيد تحليل SWOT قبل ما تحدد الخطة.") +
      `<label for="mgGoal">الهدف (ماذا نريد أن نحقق؟)</label><textarea id="mgGoal" rows="3" placeholder="مثلاً: حلقة ٢٥ دقيقة عن تأثير التيك توك على الشباب، تتنشر على يوتيوب وتوصل ٢٠٠٠ مشاهدة في أسبوع">${E(p.goal)}</textarea>
      <p class="small">علّم على شروط الهدف الجيد اللي اتحققت:</p><ul class="mg-check">${GOALC.map((g, i) => `<li><label><input type="checkbox" data-g="${i}"${p.checks[i] ? " checked" : ""}> ${E(g)}</label></li>`).join("")}</ul>
      <div class="mg-row"><div><label for="mgStart">البداية</label><input id="mgStart" type="date" value="${E(p.start)}"></div><div><label for="mgDue">التسليم</label><input id="mgDue" type="date" value="${E(p.due)}"></div></div>
      <label>المدى الزمني</label><div class="lv-chips"><button type="button" class="lv-chip" data-term="short" aria-pressed="${p.term !== "long"}">قصير الأجل</button><button type="button" class="lv-chip" data-term="long" aria-pressed="${p.term === "long"}">طويل الأجل</button></div>
      <label for="mgAlts">البدائل (لو الخطة الأساسية ما نفعتش)</label><textarea id="mgAlts" rows="2" placeholder="مثلاً: لو الضيف اعتذر، عندنا ضيف بديل / نعمل الحلقة تقرير ميداني">${E(p.alts)}</textarea>
      <label for="mgRes">الموارد البشرية والمادية</label><textarea id="mgRes" rows="2" placeholder="مثلاً: مذيع، معد، مصور، كاميرا المعهد، استوديو يوم الأحد، ميزانية مواصلات">${E(p.res)}</textarea>
      <div class="actions"><button class="btn" type="button" id="mgPlanAI">راجع خطتي واقترح مهام</button></div>`;
    body.append(c);
    const sync = () => { p.goal = c.querySelector("#mgGoal").value.trim(); p.alts = c.querySelector("#mgAlts").value.trim(); p.res = c.querySelector("#mgRes").value.trim(); p.start = c.querySelector("#mgStart").value; p.due = c.querySelector("#mgDue").value; $$(c, "[data-g]").forEach(x => p.checks[x.dataset.g] = x.checked); save(); pHead(p); };
    c.addEventListener("input", sync); c.addEventListener("change", sync);
    $$(c, "[data-term]").forEach(b => b.onclick = () => { p.term = b.dataset.term; save(); $$(c, "[data-term]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    c.querySelector("#mgPlanAI").onclick = () => {
      sync(); if (!p.goal) { T("اكتب الهدف الأول"); return; }
      const prompt = `إنت مستشار إدارة إعلامية بتساعد طالب إعلام يخطط لمشروع.\n${STYLE}\n\nالمشروع: ${p.name} (${p.type})\nالهدف: ${p.goal}\nمن ${p.start || "—"} لحد ${p.due || "—"} (${p.term === "long" ? "طويل الأجل" : "قصير الأجل"})\nالبدائل: ${p.alts || "—"}\nالموارد: ${p.res || "—"}\n\nالمطلوب:\n١) قيّم الهدف حسب شروط الهدف الجيد (واضح، مشروع، واقعي، قابل للقياس، مرن) واقترح صياغة أحسن.\n٢) اقترح بديل واحد مهم لو مش موجود.\n٣) في الآخر اكتب عنوان «المهام المقترحة» وتحته من ٦ لـ ١٠ مهام مرتبة زمنياً، كل مهمة في سطر لوحدها بيبدأ بـ «- » ومفيهوش أي تنسيق تاني.`;
      aiBox(c, prompt, {
        wait: "بيراجع الخطة…", history: "خطة: " + p.name, done: txt => {
          const part = txt.split(/المهام المقترحة/).pop();
          const tasks = part.split("\n").filter(l => /^\s*[-*•]\s+/.test(l)).map(l => l.replace(/^\s*[-*•]\s+/, "").replace(/\*\*/g, "").trim()).filter(l => l && l.length < 160);
          if (!tasks.length) return;
          const bar = document.createElement("div"); bar.className = "actions";
          bar.innerHTML = `<button class="btn" type="button">ضيف الـ ${N(tasks.length)} مهام لقسم التنظيم</button>`;
          bar.firstChild.onclick = () => { tasks.forEach(t => p.tasks.push({ id: uid(), t, owner: "me", due: "", done: false, sens: false })); save(); T("اتضافت ✓ وزّعها على الفريق"); pv.tab = "org"; renderOff("mproject"); };
          c.querySelector(".mg-ai").append(bar);
        }
      });
    };
  }
  function pOrg(body, p) {
    const c = document.createElement("div"); c.className = "proof";
    const own = owners();
    c.innerHTML = concept([1, 4, 5], "التنظيم = توزيع المهام على الفريق حسب قدراتهم، وتحديد مين مسؤول عن إيه. والعدل في توزيع المهام من صفات القائد الناجح. ولما تفوّض مهمة: مافيش تفويض للمهام السرية أو الحساسة، والتفويض مابيعفيكش من المسؤولية.") +
      (D.team.length ? "" : `<p class="mg-hint">💡 ضيف أعضاء فريقك من «فريقي الإعلامي» عشان تقدر توزّع عليهم المهام.</p>`) +
      `<div class="mg-add"><input id="mgTT" placeholder="مهمة جديدة… مثلاً: التواصل مع الضيف وتأكيد الميعاد"><select id="mgTO" aria-label="المسؤول">${own.map(o => `<option value="${o[0]}">${E(o[1])}</option>`).join("")}</select><input id="mgTD" type="date" aria-label="الميعاد"><button class="btn" type="button" id="mgTAdd">ضيف</button></div>
      <ul class="mg-tasks" id="mgTasks"></ul><div id="mgLoad"></div>`;
    body.append(c);
    const ul = c.querySelector("#mgTasks");
    function draw() {
      ul.innerHTML = p.tasks.length ? p.tasks.map(t => {
        const dl = days(t.due), late = !t.done && t.due && dl < 0;
        const warn = t.sens && t.owner !== "me";
        return `<li class="${t.done ? "done" : ""}${late ? " late" : ""}" data-id="${t.id}"><label class="mg-tk"><input type="checkbox" data-a="done"${t.done ? " checked" : ""}><span>${E(t.t)}</span></label>
        <div class="mg-tk-meta"><select data-a="owner" aria-label="المسؤول">${own.map(o => `<option value="${o[0]}"${o[0] === (t.owner || "me") ? " selected" : ""}>${E(o[1])}</option>`).join("")}</select><input type="date" data-a="due" value="${E(t.due)}" aria-label="الميعاد">
        <button type="button" class="mg-x${t.sens ? " on" : ""}" data-a="sens" title="مهمة حساسة/سرية">🔒</button><button type="button" class="mg-x" data-a="del" aria-label="حذف">✕</button></div>
        ${late ? `<small class="mg-warn">⚠ متأخرة ${N(-dl)} يوم (انحراف عن الخطة)</small>` : ""}${warn ? `<small class="mg-warn">⚠ دي مهمة حساسة؛ المحاضرة الخامسة بتقول ماتتفوّضش. خليها معاك.</small>` : ""}</li>`;
      }).join("") : `<li class="mg-empty">لسه مفيش مهام. ضيف مهمة أو خلّي الذكاء الاصطناعي يقترح من قسم التخطيط.</li>`;
      pHead(p);
      // توزيع الحمل (العدل)
      const cnt = {}; p.tasks.filter(t => !t.done).forEach(t => { const k = t.owner || "me"; cnt[k] = (cnt[k] || 0) + 1; });
      const keys = Object.keys(cnt), max = Math.max(1, ...keys.map(k => cnt[k]));
      const L = c.querySelector("#mgLoad");
      L.innerHTML = keys.length > 1 || (keys.length === 1 && D.team.length) ? `<h3 class="nf-sec">توزيع الحمل على الفريق</h3><div class="mg-load">${keys.map(k => `<div><span>${E(ownerName(k))}</span><i style="width:${cnt[k] / max * 100}%"></i><b>${N(cnt[k])}</b></div>`).join("")}</div>${cnt.me && cnt.me > (p.tasks.filter(t => !t.done).length * .6) && D.team.length ? `<p class="mg-hint">💡 إنت شايل أغلب المهام. لو الشغل بيقف في غيابك يبقى محتاج تفوّض أكتر (محاضرة ٥).</p>` : ""}` : "";
    }
    draw();
    ul.addEventListener("change", e => { const li = e.target.closest("li[data-id]"); if (!li) return; const t = p.tasks.find(x => x.id === li.dataset.id); const a = e.target.dataset.a; if (a === "done") t.done = e.target.checked; if (a === "owner") t.owner = e.target.value; if (a === "due") t.due = e.target.value; save(); draw(); });
    ul.addEventListener("click", e => { const b = e.target.closest("button[data-a]"); if (!b) return; const li = b.closest("li"); const t = p.tasks.find(x => x.id === li.dataset.id); if (b.dataset.a === "del") p.tasks = p.tasks.filter(x => x !== t); else t.sens = !t.sens; save(); draw(); });
    const add = () => { const v = c.querySelector("#mgTT").value.trim(); if (!v) return; p.tasks.push({ id: uid(), t: v, owner: c.querySelector("#mgTO").value, due: c.querySelector("#mgTD").value, done: false, sens: false }); save(); c.querySelector("#mgTT").value = ""; draw(); };
    c.querySelector("#mgTAdd").onclick = add;
    c.querySelector("#mgTT").onkeydown = e => { if (e.key === "Enter") add(); };
  }
  function pDir(body, p) {
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = concept([1, 4, 6], "التوجيه = تحريك الفريق ناحية الهدف: قيادة، واتصال في الاتجاهين (مش أوامر بس)، وتغذية راجعة، وتحفيز. الاتصال في اتجاه واحد أثبت فشله، والتحفيز العابر أو بالأفضلية أو «كله ضرب ضرب» استراتيجيات غلط.") +
      `<label for="mgLogT">سجّل توجيه أو ملاحظة</label><textarea id="mgLogT" rows="2" placeholder="مثلاً: اتفقنا في الاجتماع إن التصوير يبقى الخميس ٤ العصر"></textarea>
      <div class="lv-chips" id="mgLogK"><button type="button" class="lv-chip" data-k="me" aria-pressed="true">توجيه مني للفريق</button><button type="button" class="lv-chip" data-k="team" aria-pressed="false">رأي/اقتراح من الفريق</button></div>
      <div class="actions"><button class="btn" type="button" id="mgLogAdd">سجّل</button></div>
      <div id="mgLogs"></div>
      <h3 class="nf-sec">مساعد التوجيه</h3><div class="actions"><button class="btn ghost" type="button" id="mgMotiv">رسالة تحفيز للفريق</button><button class="btn ghost" type="button" id="mgMeet">جدول اجتماع متابعة</button></div>`;
    body.append(c);
    let kind = "me";
    $$(c, "#mgLogK [data-k]").forEach(b => b.onclick = () => { kind = b.dataset.k; $$(c, "#mgLogK [data-k]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    const L = c.querySelector("#mgLogs");
    function draw() {
      const me = p.log.filter(x => x.k === "me").length, tm = p.log.filter(x => x.k === "team").length;
      L.innerHTML = (p.log.length ? `<p class="small">الاتصال: ${N(me)} توجيه منك · ${N(tm)} من الفريق${p.log.length >= 3 && tm === 0 ? ` <span class="mg-warn">— الاتصال ماشي في اتجاه واحد، اسمع من فريقك (محاضرة ٤)</span>` : ""}</p>` : "") +
        `<ul class="mg-log">${p.log.slice().reverse().map(x => `<li class="${x.k}"><small>${fmtD(x.d)} · ${x.k === "me" ? "توجيه" : "من الفريق"}</small>${E(x.t)}</li>`).join("")}</ul>`;
    }
    draw();
    c.querySelector("#mgLogAdd").onclick = () => { const v = c.querySelector("#mgLogT").value.trim(); if (!v) return; p.log.push({ d: today(), k: kind, t: v }); save(); c.querySelector("#mgLogT").value = ""; draw(); };
    const ctx = () => { const s = pStats(p); return `المشروع: ${p.name} (${p.type})\nالهدف: ${p.goal || "—"}\nالإنجاز: ${s.done} من ${s.total} مهمة، ${s.late} متأخرة، ${s.left == null ? "" : "فاضل " + s.left + " يوم"}\nالفريق: ${D.team.map(m => m.name + " (" + (m.role || "—") + ")").join("، ") || "—"}\nالمهام المفتوحة: ${p.tasks.filter(t => !t.done).map(t => t.t + " ← " + ownerName(t.owner)).join("؛ ") || "—"}`; };
    c.querySelector("#mgMotiv").onclick = () => aiBox(c, `اكتب رسالة تحفيز قصيرة (واتساب) لفريق عمل إعلامي من قائد الفريق.\nشروط من المحاضرة ٦: مش مدح عابر، ومن غير تفضيل حد على حد، ومن غير «كله ضرب ضرب»، وتنسب الإنجاز للفريق كله (قول «إحنا» مش «أنا» — محاضرة ٨)، واذكر إنجاز حقيقي ملموس وخطوة جاية واضحة.\nبالعامية المصرية، من ٤ لـ ٧ سطور. اكتب الرسالة بس.\n\n${ctx()}`, { wait: "بيكتب الرسالة…" });
    c.querySelector("#mgMeet").onclick = () => aiBox(c, `اعمل جدول أعمال لاجتماع متابعة مدته ٢٠ دقيقة لفريق إعلامي.\n${STYLE}\nخلّي فيه: مراجعة سريعة للتقدم، المتأخر وسببه، وقت لاقتراحات الفريق (اتصال في الاتجاهين)، توزيع المهام الجاية بعدل، وختام تحفيزي.\n\n${ctx()}`, { wait: "بيجهّز الجدول…", history: "اجتماع: " + p.name });
  }
  function pCtrl(body, p) {
    const s = pStats(p);
    const c = document.createElement("div"); c.className = "proof";
    p.review = p.review || {};
    c.innerHTML = concept([1, 7], "الرقابة = التأكد إن الأداء الفعلي مطابق للمخطط في الجودة والوقت والتكلفة والمجهود، وتوضيح أسباب الانحراف، ونتايجها بتستخدم في إعادة التخطيط. والتقييم يكون على الفرد والفريق، كمي وكيفي.") +
      `<div class="mg-kpis"><span><b>${N(s.pct)}٪</b>إنجاز</span><span><b>${N(s.late)}</b>مهام متأخرة</span><span><b>${s.left == null ? "—" : N(s.left)}</b>يوم للتسليم</span></div>
      ${s.late ? `<p class="mg-warn">⚠ فيه انحراف في الوقت: ${p.tasks.filter(t => !t.done && t.due && days(t.due) < 0).map(t => E(t.t) + " (" + E(ownerName(t.owner)) + ")").join("، ")}</p>` : (s.total ? `<p class="mg-ok">✓ مفيش مهام متأخرة لحد دلوقتي</p>` : "")}
      <h3 class="nf-sec">المخطط مقابل الفعلي</h3>
      <div class="mg-ctrl">${CTRL.map(([k, l]) => `<div><b>${l}</b><div class="lv-chips">${[["ok", "مطابق ✓"], ["under", "أقل من المخطط"], ["over", "أكتر من المخطط"]].map(([v, t]) => `<button type="button" class="lv-chip" data-c="${k}" data-v="${v}" aria-pressed="${p.review[k] === v}">${t}</button>`).join("")}</div></div>`).join("")}</div>
      <label for="mgLess">الدروس المستفادة / أسباب الانحراف</label><textarea id="mgLess" rows="3" placeholder="مثلاً: التصوير اتأخر يومين عشان الاستوديو كان محجوز؛ المرة الجاية نحجز قبلها بأسبوع">${E(p.lessons)}</textarea>
      <div class="actions"><button class="btn" type="button" id="mgRep">اكتب تقرير الرقابة</button></div>`;
    body.append(c);
    $$(c, "[data-c]").forEach(b => b.onclick = () => { p.review[b.dataset.c] = b.dataset.v; save(); $$(c, `[data-c="${b.dataset.c}"]`).forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
    c.querySelector("#mgLess").oninput = function () { p.lessons = this.value; save(); };
    c.querySelector("#mgRep").onclick = () => {
      const R = { ok: "مطابق", under: "أقل من المخطط", over: "أكتر من المخطط" };
      aiBox(c, `اكتب «تقرير رقابة» لمشروع إعلامي، زي ما بيتعمل في المؤسسات الإعلامية بعد الحلقة أو العدد.\n${STYLE}\nالأقسام: ملخص الأداء، الانحرافات وأسبابها، تقييم الأداء الفردي والجماعي (من غير لوم شخصي — انتقد السلوك مش الشخص، محاضرة ٧)، وتوصيات لإعادة التخطيط في المشروع الجاي.\n\nالمشروع: ${p.name} (${p.type})\nالهدف: ${p.goal || "—"}\nالإنجاز: ${s.done}/${s.total}، متأخر: ${s.late}\nالمهام: ${p.tasks.map(t => (t.done ? "[تم] " : "[لم يتم] ") + t.t + " ← " + ownerName(t.owner)).join("؛ ") || "—"}\nالمخطط مقابل الفعلي: ${CTRL.map(([k, l]) => l + ": " + (R[p.review[k]] || "مش محدد")).join("، ")}\nالدروس المستفادة: ${p.lessons || "—"}`, { wait: "بيكتب التقرير…", history: "تقرير رقابة: " + p.name });
    };
  }

  // =====================================================================
  // ٢) فريقي الإعلامي — التفويض، التحفيز، التعيين، التقييم، العمل الجماعي
  // =====================================================================
  const ROLES = ["مذيع/ة", "معد/ة", "محرر/ة", "مراسل/ة", "مصور/ة", "مونتير", "مخرج/ة", "مصمم/ة جرافيك", "مسؤول سوشيال ميديا", "منتج/ة"];
  const EVC = [["integ", "النزاهة والمصداقية", 7], ["smart", "الذكاء وحل المشكلات", 7], ["energy", "الطاقة والحماس", 7], ["time", "الالتزام بالمواعيد", 1], ["team", "التعاون مع الفريق", 8]];
  const TEAMLOSS = [["civ", "الكياسة: بنفكر في الأنفع للفريق كله مش لنفسنا بس"], ["resp", "المسؤولية المشتركة: لو حد اتأخر الباقي بيساعده"], ["mot", "الحافز: الزملاء بيشجعوا بعض"], ["vis", "رؤية مشتركة: كلنا عارفين الهدف الواحد"], ["creat", "الإبداع: الأفكار بتطلع من نقاش جماعي"], ["fun", "فيه وقت للمرح والتجمع خارج الشغل"], ["credit", "الإنجاز بيتنسب للفريق كله"]];
  let tv = { tab: "members", mid: null };
  function offTeam(box) {
    head(box, "فريقي الإعلامي", "أعضاء فريقك وأدوارهم، المهام اللي متفوّضة لهم، تقييم الأداء، رسائل التحفيز، ومقابلات التعيين — كله بقواعد المادة.", [5, 6, 7, 8]);
    tabs(box.lastChild, [["members", "الأعضاء"], ["hire", "مقابلة تعيين"], ["health", "صحة الفريق"]], tv.tab, k => { tv = { tab: k, mid: null }; renderOff("mteam"); });
    const body = document.createElement("div"); box.append(body);
    if (tv.tab === "hire") return tHire(body);
    if (tv.tab === "health") return tHealth(body);
    const m = tv.mid && D.team.find(x => x.id === tv.mid);
    m ? tMember(body, m) : tMembers(body);
  }
  function memberTasks(id) { const r = []; D.projects.forEach(p => (p.tasks || []).forEach(t => { if (t.owner === id) r.push({ p, t }); })); return r; }
  function lastEval(m) { return (m.evals || [])[m.evals.length - 1]; }
  function evalAvg(e) { if (!e) return null; const v = EVC.map(c => e.s[c[0]] || 0).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }
  function tMembers(body) {
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = concept([6], "«فريق الأحلام» بيبدأ باجتماع فردي مع كل عضو تعرف فيه نقاط قوته وضعفه وإزاي يساعد الفريق (نصيحة Sandhir). رضا العاملين هو اللي بيسعد الجمهور.") +
      `<h3 class="nf-sec">ضيف عضو</h3><div class="mg-row"><div><label for="mgMN">الاسم</label><input id="mgMN" placeholder="مثلاً: سارة"></div><div><label for="mgMR">الدور</label><input id="mgMR" list="mgRoles" placeholder="معد/ة"><datalist id="mgRoles">${ROLES.map(r => `<option value="${E(r)}">`).join("")}</datalist></div></div>
      <label for="mgMS">نقاط قوته</label><input id="mgMS" placeholder="مثلاً: علاقات كويسة مع الضيوف، سريع في الكتابة">
      <label for="mgMW">نقاط محتاجة تطوير</label><input id="mgMW" placeholder="مثلاً: بيتأخر في التسليم">
      <div class="actions"><button class="btn" type="button" id="mgMAdd">ضيف للفريق</button></div>`;
    body.append(c);
    c.querySelector("#mgMAdd").onclick = () => {
      const name = c.querySelector("#mgMN").value.trim(); if (!name) { T("اكتب الاسم"); return; }
      D.team.push({ id: uid(), name, role: c.querySelector("#mgMR").value.trim(), str: c.querySelector("#mgMS").value.trim(), weak: c.querySelector("#mgMW").value.trim(), notes: [], evals: [], since: today() }); save(); renderOff("mteam");
    };
    if (!D.team.length) return;
    const l = document.createElement("div"); l.className = "mg-list";
    l.innerHTML = `<h3 class="nf-sec">الفريق (${N(D.team.length)})</h3>` + D.team.map(m => {
      const tk = memberTasks(m.id), open = tk.filter(x => !x.t.done).length, e = lastEval(m), av = evalAvg(e);
      const since = e ? -days(e.d) : null;
      return `<button type="button" class="mg-item mg-mem" data-id="${m.id}"><span class="mg-av">${E(m.name.trim().charAt(0))}</span><span class="mg-it-top"><b>${E(m.name)}</b><small>${E(m.role || "—")}</small></span>
      <span class="mg-meta"><span>📋 ${N(open)} مهمة مفتوحة</span>${av ? `<span>⭐ ${N(av.toFixed(1))}/٥</span>` : `<span class="mg-warn">لسه ماتقيّمش</span>`}${since != null && since > 90 ? `<span class="mg-warn">آخر تقييم من ${N(since)} يوم</span>` : ""}</span></button>`;
    }).join("");
    body.append(l);
    $$(l, ".mg-mem").forEach(b => b.onclick = () => { tv.mid = b.dataset.id; renderOff("mteam"); window.scrollTo(0, 0); });
  }
  function tMember(body, m) {
    m.notes = m.notes || []; m.evals = m.evals || [];
    const tk = memberTasks(m.id), e = lastEval(m);
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = `<button type="button" class="btn ghost mini" id="mgMBack">→ كل الفريق</button>
      <div class="mg-mhead"><span class="mg-av big">${E(m.name.trim().charAt(0))}</span><div><h3>${E(m.name)}</h3><p class="small">${E(m.role || "—")} · في الفريق من ${fmtD(m.since || today())}</p></div></div>
      <div class="mg-row"><div><label>نقاط القوة</label><textarea data-f="str" rows="2">${E(m.str)}</textarea></div><div><label>محتاج يطوّر</label><textarea data-f="weak" rows="2">${E(m.weak)}</textarea></div></div>
      <h3 class="nf-sec">المهام المفوّضة له (${N(tk.length)})</h3>
      ${tk.length ? `<ul class="mg-mini">${tk.map(x => `<li class="${x.t.done ? "done" : ""}">${x.t.done ? "✓" : "○"} ${E(x.t.t)} <small>— ${E(x.p.name)}${x.t.due ? " · " + fmtD(x.t.due) : ""}</small></li>`).join("")}</ul>` : `<p class="small">مفيش مهام متفوّضة له. وزّع عليه من «إدارة مشروع إعلامي».</p>`}
      ${concept([5], "التفويض أفضل وسيلة للتدريب وبناء صف تاني، وبيكسر الملل. خطواته: حدد اللي ينفع يتفوّض ← اختار الشخص المناسب ← راعي رد فعله وطمّنه ← اتفقوا على خطة مع حرية في الأسلوب ← تابعه وكافئه.")}
      <div class="actions"><button class="btn ghost" type="button" id="mgDel">اقترح مهمة أفوّضها له</button></div>
      <h3 class="nf-sec">تقييم الأداء</h3>${concept([7], "وضّح معايير التقييم من أول يوم، وقيّم كل ٣ شهور على الأكثر، وقيّم الفترة كلها مش آخر موقف بس. ووارن بافيت بيدور على ٣ صفات: النزاهة والذكاء والطاقة، والنزاهة أهمهم.")}
      ${e ? `<p class="small">آخر تقييم ${fmtD(e.d)}: ⭐ ${N(evalAvg(e).toFixed(1))}/٥${-days(e.d) > 90 ? ` <span class="mg-warn">— عدّى أكتر من ٣ شهور، وقت تقييم جديد</span>` : ""}</p>` : ""}
      <div class="mg-eval">${EVC.map(([k, l, n]) => `<div><span>${E(l)} <small>م${N(n)}</small></span><div class="mg-stars" data-k="${k}">${[1, 2, 3, 4, 5].map(v => `<button type="button" data-v="${v}" aria-label="${v}">★</button>`).join("")}</div></div>`).join("")}</div>
      <textarea id="mgEvN" rows="2" placeholder="ملاحظة على الفترة كلها (مش آخر موقف بس)"></textarea>
      <div class="actions"><button class="btn" type="button" id="mgEvSave">احفظ التقييم</button></div>
      ${m.evals.length > 1 ? `<div class="mg-trend">${m.evals.slice(-6).map(x => `<span style="height:${evalAvg(x) / 5 * 100}%" title="${fmtD(x.d)}"></span>`).join("")}</div><p class="small" style="text-align:center">تطور التقييم</p>` : ""}
      <h3 class="nf-sec">تواصل</h3><div class="actions"><button class="btn ghost" type="button" id="mgMot">رسالة تحفيز تناسبه</button><button class="btn ghost" type="button" id="mgFix">ملاحظة على سلوك</button></div>
      <h3 class="nf-sec">ملاحظات الاجتماع الفردي</h3><textarea id="mgNote" rows="2" placeholder="إيه اللي اتكلمتوا فيه؟ محتاج إيه عشان يتطور؟"></textarea><div class="actions"><button class="btn ghost" type="button" id="mgNoteAdd">سجّل</button></div>
      <ul class="mg-log">${m.notes.slice().reverse().map(n => `<li><small>${fmtD(n.d)}</small>${E(n.t)}</li>`).join("")}</ul>
      <div class="actions mg-del"><button class="btn ghost mini" type="button" id="mgMRm">شيل من الفريق</button></div>`;
    body.append(c);
    c.querySelector("#mgMBack").onclick = () => { tv.mid = null; renderOff("mteam"); };
    $$(c, "[data-f]").forEach(x => x.oninput = () => { m[x.dataset.f] = x.value.trim(); save(); });
    const sc = {};
    $$(c, ".mg-stars").forEach(g => $$(g, "button").forEach(b => b.onclick = () => { sc[g.dataset.k] = +b.dataset.v; $$(g, "button").forEach(x => x.classList.toggle("on", +x.dataset.v <= sc[g.dataset.k])); }));
    c.querySelector("#mgEvSave").onclick = () => { if (Object.keys(sc).length < EVC.length) { T("قيّم كل المعايير الخمسة"); return; } m.evals.push({ d: today(), s: Object.assign({}, sc), n: c.querySelector("#mgEvN").value.trim() }); save(); T("اتحفظ التقييم ✓"); renderOff("mteam"); };
    c.querySelector("#mgNoteAdd").onclick = () => { const v = c.querySelector("#mgNote").value.trim(); if (!v) return; m.notes.push({ d: today(), t: v }); save(); renderOff("mteam"); };
    let armed = false;
    c.querySelector("#mgMRm").onclick = function () { if (!armed) { armed = true; this.textContent = "متأكد؟ دوس تاني"; return; } D.team = D.team.filter(x => x !== m); D.projects.forEach(p => (p.tasks || []).forEach(t => { if (t.owner === m.id) t.owner = "me"; })); save(); tv.mid = null; renderOff("mteam"); };
    const who = () => `العضو: ${m.name} — ${m.role || "—"}\nنقاط قوته: ${m.str || "—"}\nمحتاج يطوّر: ${m.weak || "—"}\nمهامه: ${tk.map(x => (x.t.done ? "[تم] " : "") + x.t.t).join("؛ ") || "—"}\nآخر تقييم: ${e ? EVC.map(([k, l]) => l + " " + e.s[k] + "/5").join("، ") : "—"}\nملاحظات الاجتماعات: ${m.notes.slice(-3).map(n => n.t).join("؛ ") || "—"}`;
    c.querySelector("#mgDel").onclick = () => aiBox(slot(c.querySelector("#mgDel")), `إنت مستشار إدارة في مؤسسة إعلامية. اقترح مهمتين ينفع المسؤول يفوّضهم للعضو ده، بحيث تنمّيه وتناسب نقاط قوته.\nلكل مهمة اكتب الخطوات الخمسة للتفويض (محاضرة ٥): ليه المهمة دي تنفع تتفوّض، ليه هو الشخص المناسب، ممكن يقلق من إيه وإزاي تطمّنه، خطة العمل المتفق عليها مع حرية في الأسلوب، وإزاي هتتابعه وتكافئه.\nوفكّر إن التفويض مابيعفيش المسؤول من المسؤولية.\n${STYLE}\n\n${who()}`, { wait: "بيفكر…", tool: "mteam", history: "خطة تفويض: " + m.name });
    c.querySelector("#mgMot").onclick = () => aiBox(slot(c.querySelector("#mgMot")), `اكتب رسالة تحفيز شخصية (واتساب) من قائد فريق إعلامي لعضو في الفريق.\nقواعد المحاضرة ٦: مش مدح عابر عام، اذكر شغل حقيقي محدد عمله، ومن غير «إنت ابن المكان» من غير مقابل، ومن غير مقارنة بزمايله. وراعي شخصيته (الذكاء العاطفي — محاضرة ٥).\nبالعامية المصرية، ٣ لـ ٥ سطور. اكتب الرسالة بس.\n\n${who()}`, { wait: "بيكتب…" });
    c.querySelector("#mgFix").onclick = () => {
      const box = slot(c.querySelector("#mgFix"));
      let f = box.querySelector(".mg-fixf");
      if (!f) { f = document.createElement("div"); f.className = "mg-fixf"; f.innerHTML = `<textarea rows="2" placeholder="إيه اللي حصل؟ مثلاً: اتأخر على تسليم التقرير مرتين الأسبوع ده"></textarea><button class="btn mini" type="button">صيغها باحترافية</button>`; box.prepend(f); }
      f.querySelector("button").onclick = () => { const v = f.querySelector("textarea").value.trim(); if (!v) { T("اكتب الموقف الأول"); return; } aiBox(f, `ساعد قائد فريق إعلامي يكتب ملاحظة لعضو في فريقه على سلوك غلط، حسب قواعد المحاضرة ٧:\n- الكلام يكون في السر مش قدام الفريق.\n- يبدأ بالاستماع لسببه الأول (يمكن السبب خارج عن إرادته).\n- ينتقد السلوك مش الشخص (مثلاً «التأخير سلوك مش منضبط» مش «إنت مش ملتزم»).\n- يوضح الخطوة الجاية وإجراءات التصعيد لو اتكرر، من غير عصبية، ويديله مهلة.\nاكتب: ١) جملة افتتاح وأسئلة استماع، ٢) الملاحظة نفسها، ٣) الاتفاق على الخطوة الجاية. بالعامية المصرية المحترمة.\n\n${who()}\nالموقف: ${v}`, { wait: "بيصيغ…" }); };
    };
  }
  function tHire(body) {
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = concept([6, 7], "«وظّف ببطء.. وافصل بسرعة». المرشح يتقيّم بأكتر من مقابلة وبيشارك الفريق في الاختيار، وأحسن حاجة يوم عمل تجريبي (تجربة شركة فيستو). ووارن بافيت بيدور على النزاهة والذكاء والطاقة، والنزاهة أهمهم لأن غيابها بيقتل باقي الصفات.") +
      `<label for="mgHR">الوظيفة</label><input id="mgHR" list="mgRoles2" placeholder="مثلاً: مراسل/ة ميداني"><datalist id="mgRoles2">${ROLES.map(r => `<option value="${E(r)}">`).join("")}</datalist>
      <label for="mgHC">عن المكان/المشروع (اختياري)</label><input id="mgHC" placeholder="مثلاً: إذاعة الكلية / قناة يوتيوب إخبارية للطلبة">
      <div class="actions"><button class="btn" type="button" id="mgHGo">جهّز المقابلة</button></div>`;
    body.append(c);
    c.querySelector("#mgHGo").onclick = () => {
      const r = c.querySelector("#mgHR").value.trim(); if (!r) { T("اكتب الوظيفة"); return; }
      aiBox(c, `جهّز مقابلة تعيين لوظيفة «${r}» في ${c.querySelector("#mgHC").value.trim() || "مؤسسة إعلامية طلابية"}.\n${STYLE}\nالمطلوب:\n١) ٣ أسئلة لقياس النزاهة (زي: موقف خسرت فيه عشان التزمت بالصح؟ لو مصدر طلب تذيع خبر مش متأكد منه مقابل سبق؟).\n٢) ٣ أسئلة لقياس الذكاء وحل المشكلات (اتكلم عن مسارك ١٠ دقايق، تجربة فشل وإيه اتعلمت).\n٣) ٢ أسئلة لقياس الطاقة والحماس.\n٤) «يوم تجريبي»: مهمة عملية واقعية في الوظيفة دي يعملها مع الفريق، وإيه اللي نلاحظه فيها (الالتزام والتعامل مع الفريق).\n٥) جدول تقييم بسيط من ٥ للصفات التلاتة.\n٦) علامات حمرا ترفض بسببها حتى لو المرشح شاطر.`, { wait: "بيجهّز المقابلة…", tool: "mteam", history: "مقابلة تعيين: " + r });
    };
  }
  function tHealth(body) {
    D.org.health = D.org.health || {};
    const H = D.org.health;
    const c = document.createElement("div"); c.className = "proof";
    c.innerHTML = concept([8], "دراسات جامعة Kent State: لما العمل الجماعي يغيب الفريق بيفقد الكياسة والمسؤولية المشتركة والحافز والرؤية المشتركة والإبداع، حتى لو كل واحد عامل واجبه. وستيف جولدستين بينصح: أشرك الفريق في حل المشاكل، ماتقولش «أنا» أبداً، واعمل وقت للمرح.") +
      `<p class="small">علّم على اللي موجود فعلاً في فريقك:</p><ul class="mg-check">${TEAMLOSS.map(([k, t]) => `<li><label><input type="checkbox" data-h="${k}"${H[k] ? " checked" : ""}> ${E(t)}</label></li>`).join("")}</ul>
      <div id="mgHRes"></div><div class="actions"><button class="btn" type="button" id="mgHAI">خطة لتقوية الفريق</button></div>`;
    body.append(c);
    const res = c.querySelector("#mgHRes");
    function draw() {
      const n = TEAMLOSS.filter(([k]) => H[k]).length, pct = Math.round(n / TEAMLOSS.length * 100);
      res.innerHTML = `<div class="mg-bar big"><i style="width:${pct}%"></i></div><p class="small"><b>صحة الفريق ${N(pct)}٪</b> — ${pct >= 85 ? "فريق متماسك 👏" : pct >= 55 ? "كويس بس فيه نقط محتاجة شغل" : "الفريق شغال كأفراد مش كفريق"}</p>`;
    }
    draw();
    $$(c, "[data-h]").forEach(x => x.onchange = () => { H[x.dataset.h] = x.checked; save(); draw(); });
    c.querySelector("#mgHAI").onclick = () => {
      const miss = TEAMLOSS.filter(([k]) => !H[k]).map(x => x[1]);
      aiBox(c, `فريق إعلامي طلابي (${D.team.map(m => m.role || m.name).join("، ") || "مذيع، معد، مصور، مونتير"}) ناقصه الحاجات دي:\n${miss.map(x => "- " + x).join("\n") || "- مفيش، الفريق كويس"}\n\nاقترح خطة عملية لمدة شهر (أسبوع بأسبوع) لتقوية العمل الجماعي في الفريق، مع الحفاظ على تنافس صحي. استخدم أفكار المحاضرة ٨ (إشراك الفريق في حل المشاكل، نسب الإنجاز للفريق، المرح) والمحاضرة ٦ (التحفيز الصح).\n${STYLE}`, { wait: "بيجهّز الخطة…", tool: "mteam", history: "خطة تقوية الفريق" });
    };
  }

  // =====================================================================
  // ٣) هوية مؤسستي ومنافسيها — الرؤية والرسالة، SWOT، الهيكل، المنافسة
  // =====================================================================
  const VC = ["واضحة وبسيطة وموجزة", "بتوصف مستقبل مشرق", "فيها تحفيز", "طموحات واقعية", "بتغطي من ٥ لـ ١٠ سنين"];
  const MC = ["بتوضح سبب وجود المؤسسة ومجالها", "بتوضح الوسائل", "بتحدد الجمهور المستفيد", "بتتكلم عن الحاضر"];
  let ov = "id";
  function O() { D.org = D.org || {}; const o = D.org; o.swot = o.swot || { s: "", w: "", o: "", t: "" }; o.lv = o.lv || { top: "", mid: "", sup: "" }; o.comp = o.comp || []; o.vc = o.vc || {}; o.mc = o.mc || {}; return o; }
  function orgCtx(o) { return `المؤسسة: ${o.name || "—"} (${o.kind || "—"})\nالرؤية: ${o.vision || "—"}\nالرسالة: ${o.mission || "—"}\nSWOT — قوة: ${o.swot.s || "—"} | ضعف: ${o.swot.w || "—"} | فرص: ${o.swot.o || "—"} | تهديدات: ${o.swot.t || "—"}`; }
  function offOrg(box) {
    const o = O();
    head(box, "هوية مؤسستي ومنافسيها", "ابني هوية قناتك أو إذاعتك أو صفحتك الطلابية: رؤية ورسالة، تحليل SWOT، هيكل إداري، ومقارنة بالمنافسين.", [2, 8]);
    tabs(box.lastChild, [["id", "الرؤية والرسالة"], ["swot", "SWOT"], ["lv", "الهيكل الإداري"], ["comp", "المنافسين"], ["card", "بطاقة الهوية"]], ov, k => { ov = k; renderOff("morg"); });
    const c = document.createElement("div"); c.className = "proof"; box.append(c);
    const nameRow = `<div class="mg-row"><div><label for="mgON">اسم المؤسسة</label><input id="mgON" value="${E(o.name)}" placeholder="مثلاً: راديو إعلام أونلاين"></div><div><label for="mgOK">نوعها</label><input id="mgOK" value="${E(o.kind)}" placeholder="قناة يوتيوب / راديو / صفحة أخبار"></div></div>`;
    const bindName = () => { const n = c.querySelector("#mgON"), k = c.querySelector("#mgOK"); if (n) n.oninput = () => { o.name = n.value.trim(); save(); }; if (k) k.oninput = () => { o.kind = k.value.trim(); save(); }; };
    if (ov === "id") {
      c.innerHTML = concept([2], "الرؤية = حلم المؤسسة في المستقبل البعيد (من ٥ لـ ١٠ سنين)، واضحة ومحفّزة وواقعية. الرسالة = سبب وجود المؤسسة دلوقتي: ماذا نفعل؟ ولمن؟ وكيف؟") + nameRow +
        `<label for="mgV">الرؤية</label><textarea id="mgV" rows="3" placeholder="مثلاً: أن نكون المنصة الصوتية الأولى لطلاب الجامعات المصرية بحلول ٢٠٣٢">${E(o.vision)}</textarea>
        <ul class="mg-check">${VC.map((x, i) => `<li><label><input type="checkbox" data-vc="${i}"${o.vc[i] ? " checked" : ""}> ${E(x)}</label></li>`).join("")}</ul>
        <label for="mgM">الرسالة</label><textarea id="mgM" rows="3" placeholder="مثلاً: نقدّم برامج صوتية قصيرة بتناقش قضايا الطلبة بلغتهم، عبر البودكاست والسوشيال ميديا">${E(o.mission)}</textarea>
        <ul class="mg-check">${MC.map((x, i) => `<li><label><input type="checkbox" data-mc="${i}"${o.mc[i] ? " checked" : ""}> ${E(x)}</label></li>`).join("")}</ul>
        <div class="actions"><button class="btn" type="button" id="mgVAI">راجعهم</button></div>`;
      bindName();
      c.querySelector("#mgV").oninput = function () { o.vision = this.value.trim(); save(); };
      c.querySelector("#mgM").oninput = function () { o.mission = this.value.trim(); save(); };
      $$(c, "[data-vc]").forEach(x => x.onchange = () => { o.vc[x.dataset.vc] = x.checked; save(); });
      $$(c, "[data-mc]").forEach(x => x.onchange = () => { o.mc[x.dataset.mc] = x.checked; save(); });
      c.querySelector("#mgVAI").onclick = () => { if (!o.vision && !o.mission) { T("اكتب الرؤية والرسالة الأول"); return; } aiBox(c, `قيّم الرؤية والرسالة دول لمؤسسة إعلامية حسب شروط المحاضرة ٢.\nشروط الرؤية: ${VC.join("، ")}.\nشروط الرسالة: ${MC.join("، ")}، وتجاوب على: ماذا نفعل؟ ولمن؟ وكيف؟\nقيّم كل شرط بـ ✓ أو ✗ مع سبب قصير، ونبّه لو فيه خلط بين الرؤية والرسالة، وبعدين اقترح صياغة محسّنة لكل واحدة.\n${STYLE}\n\n${orgCtx(o)}`, { wait: "بيراجع…", tool: "morg", history: "الرؤية والرسالة: " + (o.name || "مؤسستي") }); };
    } else if (ov === "swot") {
      const Q = { s: ["S · القوة", "داخلي +: مهارات الفريق، المعدات، اللي يميزنا"], w: ["W · الضعف", "داخلي −: خبرة، تكنولوجيا، موارد ناقصة"], o: ["O · الفرص", "خارجي +: منصات جديدة، رعاة، أحداث"], t: ["T · التهديدات", "خارجي −: منافسين، خوارزميات، قوانين"] };
      c.innerHTML = concept([2], "SWOT إطار لتقييم موقف المؤسسة التنافسي: القوة والضعف عوامل داخلية في إيدك، والفرص والتهديدات عوامل خارجية برّه سيطرتك.") + nameRow +
        `<div class="mg-swot">${Object.keys(Q).map(k => `<div class="mg-sw mg-sw-${k}"><b>${Q[k][0]}</b><textarea data-k="${k}" rows="4" placeholder="${E(Q[k][1])}">${E(o.swot[k])}</textarea></div>`).join("")}</div>
        <div class="actions"><button class="btn" type="button" id="mgSAI">حلّل واقترح قرارات</button></div>`;
      bindName();
      $$(c, "textarea[data-k]").forEach(x => x.oninput = () => { o.swot[x.dataset.k] = x.value.trim(); save(); });
      c.querySelector("#mgSAI").onclick = () => { if (!(o.swot.s || o.swot.w || o.swot.o || o.swot.t)) { T("املأ المربعات الأول"); return; } aiBox(c, `راجع تحليل SWOT ده لمؤسسة إعلامية حسب المحاضرة ٢:\n- نبّه لو فيه عامل في المربع الغلط (خارجي اتكتب داخلي أو العكس).\n- اقترح نقطتين ناقصين في كل مربع.\n- اعمل مصفوفة قرارات: SO (استغل القوة في الفرص)، WO، ST، WT — قرار واحد لكل نوع.\n${STYLE}\n\n${orgCtx(o)}`, { wait: "بيحلل…", tool: "morg", history: "SWOT: " + (o.name || "مؤسستي") }); };
    } else if (ov === "lv") {
      c.innerHTML = concept([2], "المستويات الإدارية التلاتة: الإدارة العليا (الأهداف والسياسات والتخطيط الاستراتيجي)، الإدارة الوسطى (تنفيذ الخطط وتفسير سياسات العليا للدنيا)، والإدارة الإشرافية (تدفق الشغل اليومي وجودة الإنتاج).") +
        `<div class="mg-pyr">${[["top", "الإدارة العليا", "مين بيحط الرؤية والسياسة؟ مثلاً: رئيس القناة"], ["mid", "الإدارة الوسطى", "رؤساء الأقسام: الأخبار، البرامج، الديجيتال"], ["sup", "الإدارة الإشرافية", "المنتج المنفذ، رئيس الوردية، مشرف السوشيال"]].map(([k, l, ph], i) => `<div class="mg-lv mg-lv${i}"><b>${l}</b><textarea data-lv="${k}" rows="2" placeholder="${E(ph)}">${E(o.lv[k])}</textarea></div>`).join("")}</div>
        ${D.team.length ? `<p class="small">💡 فريقك: ${D.team.map(m => E(m.name) + " (" + E(m.role || "—") + ")").join("، ")}</p>` : ""}
        <div class="actions"><button class="btn" type="button" id="mgLAI">راجع الهيكل ووضّح الأدوار</button></div>`;
      $$(c, "[data-lv]").forEach(x => x.oninput = () => { o.lv[x.dataset.lv] = x.value.trim(); save(); });
      c.querySelector("#mgLAI").onclick = () => aiBox(c, `دي هيكل إداري لمؤسسة إعلامية طلابية:\nالعليا: ${o.lv.top || "—"}\nالوسطى: ${o.lv.mid || "—"}\nالإشرافية: ${o.lv.sup || "—"}\nالفريق: ${D.team.map(m => m.name + " (" + (m.role || "—") + ")").join("، ") || "—"}\n\nراجع الهيكل حسب المحاضرة ٢: هل كل شخص في المستوى الصح؟ واكتب لكل مستوى ٣ مسؤوليات محددة في السياق الإعلامي، ومين بيرفع تقارير لمين (تسلسل القيادة)، ونبّه لو فيه حد مسؤول عن مستويين في نفس الوقت.\n${STYLE}\n\n${orgCtx(o)}`, { wait: "بيراجع…", tool: "morg", history: "الهيكل الإداري" });
    } else if (ov === "comp") {
      c.innerHTML = concept([8, 2], "التنافسية الصحية بتخلي المؤسسة تطوّر نفسها، والمنافسين جزء من «التهديدات» في SWOT. اعرف منافسك كويس: بيتميز في إيه؟ وفين الفجوة اللي تقدر تكسب فيها جمهورك؟") +
        `<div class="mg-add"><input id="mgCN" placeholder="اسم المنافس"><input id="mgCS" placeholder="بيتميز في…"><input id="mgCW" placeholder="ضعفه…"><button class="btn" type="button" id="mgCAdd">ضيف</button></div>
        <div class="mg-comp">${o.comp.length ? `<table><thead><tr><th>المنافس</th><th>قوته</th><th>ضعفه</th><th></th></tr></thead><tbody>${o.comp.map((x, i) => `<tr><td><b>${E(x.n)}</b></td><td>${E(x.s)}</td><td>${E(x.w)}</td><td><button type="button" class="mg-x" data-rm="${i}" aria-label="حذف">✕</button></td></tr>`).join("")}</tbody></table>` : `<p class="small">ضيف ٢ أو ٣ منافسين (قنوات أو إذاعات أو صفحات بتستهدف نفس جمهورك).</p>`}</div>
        <div class="actions"><button class="btn" type="button" id="mgCAI">قارن واقترح ميزة تنافسية</button></div>`;
      c.querySelector("#mgCAdd").onclick = () => { const n = c.querySelector("#mgCN").value.trim(); if (!n) { T("اكتب اسم المنافس"); return; } o.comp.push({ n, s: c.querySelector("#mgCS").value.trim(), w: c.querySelector("#mgCW").value.trim() }); save(); renderOff("morg"); };
      $$(c, "[data-rm]").forEach(b => b.onclick = () => { o.comp.splice(+b.dataset.rm, 1); save(); renderOff("morg"); });
      c.querySelector("#mgCAI").onclick = () => { if (!o.comp.length) { T("ضيف منافس واحد على الأقل"); return; } aiBox(c, `اعمل تحليل تنافسي لمؤسسة إعلامية قدام منافسيها.\n${STYLE}\nالمطلوب: جدول مقارنة (المحتوى، المنصات، الجمهور، الجودة)، الفجوات اللي المنافسين سايبينها، «ميزة تنافسية» واحدة واضحة نركز عليها، و٣ خطوات عملية للشهر الجاي. وفكّر إن التنافس يكون شريف ومايأثرش على المصداقية.\n\n${orgCtx(o)}\nالمنافسين:\n${o.comp.map(x => "- " + x.n + ": قوته " + (x.s || "—") + "، ضعفه " + (x.w || "—")).join("\n")}`, { wait: "بيقارن…", tool: "morg", history: "تحليل المنافسين" }); };
    } else {
      const sw = o.swot;
      const txt = `${o.name || "مؤسستي الإعلامية"}${o.kind ? " — " + o.kind : ""}\n\nالرؤية: ${o.vision || "—"}\nالرسالة: ${o.mission || "—"}\n\nSWOT\nالقوة: ${sw.s || "—"}\nالضعف: ${sw.w || "—"}\nالفرص: ${sw.o || "—"}\nالتهديدات: ${sw.t || "—"}\n\nالهيكل: العليا: ${o.lv.top || "—"} | الوسطى: ${o.lv.mid || "—"} | الإشرافية: ${o.lv.sup || "—"}\nالمنافسين: ${o.comp.map(x => x.n).join("، ") || "—"}`;
      c.innerHTML = `<div class="mg-idcard"><small>بطاقة هوية مؤسسة إعلامية</small><h3>${E(o.name || "مؤسستي الإعلامية")}</h3><p>${E(o.kind || "")}</p>
        <div><b>الرؤية</b><p>${E(o.vision || "—")}</p></div><div><b>الرسالة</b><p>${E(o.mission || "—")}</p></div>
        <div class="mg-swot mini">${[["s", "S"], ["w", "W"], ["o", "O"], ["t", "T"]].map(([k, l]) => `<div class="mg-sw mg-sw-${k}"><b>${l}</b><p>${E(sw[k] || "—")}</p></div>`).join("")}</div>
        <small>مبنية على مادة مبادئ الإدارة · المحاضرة ٢ و٨</small></div>
        <div class="actions"><button class="btn" type="button" id="mgIdShare">مشاركة</button><button class="btn ghost" type="button" id="mgIdSave">حفظ في السجل</button></div>`;
      c.querySelector("#mgIdShare").onclick = () => { try { shareText(txt); } catch (e) { } };
      c.querySelector("#mgIdSave").onclick = () => { try { addHistory("morg", "بطاقة هوية: " + (o.name || "مؤسستي"), txt); T("اتحفظ ✓"); } catch (e) { } };
    }
  }

  // =====================================================================
  // ٤) مقياس القائد الإعلامي
  // =====================================================================
  const DIMS = [
    ["vision", "الرؤية والابتكار", 3, "اكتب رؤية لفريقك وشاركهم فيها، وجرّب شكل جديد كل فترة (فيديو قصير، بودكاست)، وخد مخاطرة محسوبة."],
    ["comm", "الاتصال والعدل", 4, "اعمل اجتماع فردي مع كل عضو، وطبّق سياسة الباب المفتوح، وأعلن معايير توزيع المهام والترقية قدام الكل."],
    ["deleg", "التفويض والمشاركة", 5, "ابدأ تفوّض المهام الروتينية اللي بتنمّي فريقك، وأشركهم في القرارات بالعصف الذهني (زي تجربة تويوتا)."],
    ["ei", "الذكاء العاطفي والتحفيز", 6, "حفّز كل واحد حسب شخصيته بإنجاز محدد، وابعد عن المدح العابر والتفضيل، واحمي الفريق من الاحتراق بالراحة والمرونة."],
    ["team", "روح الفريق", 8, "انسب النجاح للفريق («إحنا» مش «أنا»)، وحوّل التنافس الداخلي لتعاون، واعمل وقت للمرح."]
  ];
  const ITEMS = [
    ["vision", "بقول لفريقي إحنا رايحين فين على المدى البعيد، مش بس المطلوب النهارده"],
    ["vision", "بحب أجرّب أفكار وأشكال إعلامية جديدة بدل ما أكرر اللي نجح قبل كده"],
    ["vision", "باخد مخاطرة محسوبة لو الفكرة تستاهل، بعد ما أفكر في نتايجها"],
    ["vision", "بفضّل أقلّد أسلوب برامج ناجحة بدل ما يبقى لي أسلوبي", 1],
    ["vision", "بعلّم اللي أصغر مني وببقى مبسوط لما يبقوا أشطر"],
    ["comm", "بسمع آراء الفريق قبل ما آخد القرار"],
    ["comm", "أي حد في الفريق يقدر يجيلي بفكرة أو مشكلة في أي وقت"],
    ["comm", "بوزّع المهام والفرص بعدل، مش على اللي بحبهم"],
    ["comm", "لما أغلط بعترف قدام الفريق"],
    ["deleg", "بفضّل أعمل كل حاجة بنفسي عشان تطلع مظبوطة", 1],
    ["deleg", "لو غبت يوم، الشغل بيكمل عادي"],
    ["deleg", "لما بفوّض مهمة بسيب للشخص حرية في الأسلوب"],
    ["deleg", "بشرك الفريق في حل المشاكل والعصف الذهني"],
    ["ei", "بعرف أحفّز كل واحد في الفريق بالطريقة اللي تناسبه"],
    ["ei", "لما حد يغلط بكلمه لوحده وعلى السلوك مش على شخصه"],
    ["ei", "باخد بالي لما حد في الفريق يكون مضغوط أو تعبان"],
    ["ei", "ساعات بعاقب أو بضغط عشان الشغل يمشي أسرع", 1],
    ["team", "لما الشغل ينجح بقول «الفريق عمل» مش «أنا عملت»"],
    ["team", "بشجع التعاون بين أعضاء الفريق أكتر من المنافسة بينهم"],
    ["team", "بنعمل حاجات مع بعض برّه الشغل (خروجة، أكل، لعب)"]
  ];
  const LIK = ["أبداً", "نادراً", "أحياناً", "غالباً", "دايماً"];
  let lv = { i: -1, a: [] };
  function lvlOf(p) { return p >= 80 ? ["قائد إعلامي 🌟", "عندك صفات القائد اللي المحاضرة التالتة بتتكلم عنها: رؤية وابتكار وفريق بيتبعك عن اقتناع."] : p >= 60 ? ["مدير في طريقه لقائد 🚀", "بتدير الشغل كويس، وفاضل تطوّر كام صفة عشان تبقى قائد فريقك بيحبه."] : p >= 40 ? ["مدير تقليدي 📋", "بتركز على إن المهام تخلص، بس محتاج تبني رؤية وتشرك فريقك أكتر."] : ["لسه في البداية 🌱", "ده طبيعي! كل القادة بدأوا من هنا، والصفات دي بتتعلم."]; }
  function offLeader(box) {
    head(box, "مقياس القائد الإعلامي", "٢٠ سؤال عن طريقتك في إدارة الفريق، تعرف منهم إنت أقرب للمدير ولا للقائد، وإيه الصفات اللي محتاج تطوّرها.", [3, 4, 5, 6, 8]);
    const c = document.createElement("div"); c.className = "proof"; box.append(c);
    if (lv.i < 0) {
      const hist = D.leader || [];
      c.innerHTML = concept([3], "ويليام أرودا (فوربس) حدد ٩ فروق بين المدير والقائد: القائد بيخلق رؤية والمدير بيحقق أهداف، القائد بيبتكر والمدير بيحافظ على الوضع، القائد بياخد مخاطرة محسوبة، بيفكر للمدى البعيد، بيتعلم باستمرار، بيبني علاقات، بيدرّب غيره، وليه تابعين مش موظفين.") +
        `<p>جاوب بصراحة عن نفسك — في فريق المعهد أو أي شغل جماعي عملته. مفيش إجابة صح وغلط.</p>
        <div class="actions"><button class="btn" type="button" id="mgLStart">ابدأ المقياس</button></div>
        ${hist.length ? `<h3 class="nf-sec">نتايجك السابقة</h3><ul class="mg-mini">${hist.slice().reverse().map(h => `<li>${fmtD(h.d)} — <b>${N(h.p)}٪</b> ${E(lvlOf(h.p)[0])}</li>`).join("")}</ul>` : ""}`;
      c.querySelector("#mgLStart").onclick = () => { lv = { i: 0, a: [] }; renderOff("mleader"); };
      return;
    }
    if (lv.i < ITEMS.length) {
      const it = ITEMS[lv.i], dim = DIMS.find(d => d[0] === it[0]);
      c.innerHTML = `<div class="mg-qmeta"><span>${N(lv.i + 1)} من ${N(ITEMS.length)}</span><span>${E(dim[1])}</span></div><div class="mg-bar"><i style="width:${lv.i / ITEMS.length * 100}%"></i></div>
        <h3 class="mg-q">${E(it[1])}</h3><div class="mg-lik">${LIK.map((l, k) => `<button type="button" data-v="${k + 1}"${lv.a[lv.i] === k + 1 ? " class='on'" : ""}>${l}</button>`).join("")}</div>
        ${lv.i ? `<div class="actions"><button class="btn ghost mini" type="button" id="mgLPrev">→ السابق</button></div>` : ""}`;
      $$(c, ".mg-lik button").forEach(b => b.onclick = () => { lv.a[lv.i] = +b.dataset.v; lv.i++; renderOff("mleader"); });
      const pb = c.querySelector("#mgLPrev"); if (pb) pb.onclick = () => { lv.i--; renderOff("mleader"); };
      return;
    }
    // النتيجة
    const sc = {}; DIMS.forEach(d => sc[d[0]] = [0, 0]);
    ITEMS.forEach((it, i) => { const v = it[2] ? 6 - lv.a[i] : lv.a[i]; sc[it[0]][0] += v - 1; sc[it[0]][1] += 4; });
    const per = DIMS.map(d => [d, Math.round(sc[d[0]][0] / sc[d[0]][1] * 100)]);
    const total = Math.round(per.reduce((a, x) => a + x[1], 0) / per.length);
    const sorted = per.slice().sort((a, b) => a[1] - b[1]), weak = sorted.slice(0, 2), strong = sorted[sorted.length - 1];
    const L = lvlOf(total);
    const report = `مقياس القائد الإعلامي — ${total}%: ${L[0]}\n${per.map(([d, p]) => "- " + d[1] + ": " + p + "%").join("\n")}\nأقوى صفة: ${strong[0][1]}\nمحتاج تطوّر: ${weak.map(w => w[0][1]).join(" و")}`;
    c.innerHTML = `<div class="mg-result"><div class="mg-big">${N(total)}٪</div><h3>${E(L[0])}</h3><p>${E(L[1])}</p></div>
      <div class="mg-dims">${per.map(([d, p]) => `<div><span>${E(d[1])} <small>م${N(d[2])}</small></span><i><b style="width:${p}%"></b></i><em>${N(p)}٪</em></div>`).join("")}</div>
      <p><b>💪 أقوى صفة عندك:</b> ${E(strong[0][1])}</p>
      <h3 class="nf-sec">تطوّر إزاي؟ (من المادة)</h3><ul class="mg-tips">${weak.map(([d]) => `<li><b>${E(d[1])} — محاضرة ${N(d[2])}:</b> ${E(d[3])}</li>`).join("")}</ul>
      <div class="actions"><button class="btn" type="button" id="mgLAI">خطة تطوير ٣٠ يوم</button><button class="btn ghost" type="button" id="mgLShare">مشاركة</button><button class="btn ghost" type="button" id="mgLAgain">أعيد المقياس</button></div>`;
    if (!lv.saved) { lv.saved = true; D.leader = (D.leader || []).concat([{ d: today(), p: total, s: per.map(x => x[1]) }]).slice(-10); save(); try { addHistory("mleader", "مقياس القائد الإعلامي: " + total + "%", report); } catch (e) { } }
    c.querySelector("#mgLShare").onclick = () => { try { shareText(report + "\n\nعملته على NewsCast 360 🎙️"); } catch (e) { } };
    c.querySelector("#mgLAgain").onclick = () => { lv = { i: 0, a: [] }; renderOff("mleader"); };
    c.querySelector("#mgLAI").onclick = () => aiBox(c, `طالب إعلام عمل مقياس القيادة وده نتيجته:\n${report}\n\nاعمله خطة تطوير لمدة ٣٠ يوم (٤ أسابيع) يطبقها في شغله مع فريق إعلامي طلابي (برنامج، إذاعة، صفحة)، بتركز على أضعف صفتين. كل أسبوع: هدف واحد، تمرين عملي، وإزاي يقيس إنه اتحسن. استخدم أمثلة من غرفة الأخبار والاستوديو.\n${STYLE}`, { wait: "بيجهّز الخطة…", tool: "mleader", history: "خطة تطوير قيادية" });
  }

  // ---------- CSS ----------
  const css = `.mg-head .lead{margin:2px 0 8px}.mg-lecs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.mg-lecs span{font-size:11.5px;padding:3px 9px;border-radius:999px;background:var(--tint-bg,rgba(11,114,133,.12));color:var(--ink);border:1px solid var(--line)}
.mg-tabs{flex-wrap:wrap;margin-top:6px}.mg-concept{border:1px dashed var(--accent);border-radius:14px;padding:6px 12px;margin-bottom:12px;background:var(--accent-soft,rgba(37,99,235,.06))}.mg-concept summary{cursor:pointer;font-weight:700;font-size:13.5px;padding:4px 0}.mg-concept p{margin:6px 0;line-height:1.8;font-size:14px}.mg-concept small{color:var(--muted);font-size:11.5px}
.mg-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mg-check{list-style:none;padding:0;margin:4px 0 12px;display:grid;gap:4px;font-size:13.5px}.mg-check input{width:auto;margin-inline-end:6px}
.mg-list{display:grid;gap:10px;margin-top:12px}.mg-item{display:grid;gap:6px;text-align:start;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:12px;cursor:pointer;box-shadow:var(--shadow)}.mg-it-top b{display:block;font-size:15px}.mg-it-top small{color:var(--muted)}
.mg-mem{grid-template-columns:auto 1fr;align-items:center}.mg-mem .mg-meta{grid-column:1/-1}.mg-av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--a1,#1E3A8A),var(--a2,#2563EB))}.mg-av.big{width:54px;height:54px;font-size:22px}.mg-mhead{display:flex;gap:12px;align-items:center;margin:10px 0}.mg-mhead h3{margin:0}
.mg-bar{display:block;height:7px;background:var(--surface2);border-radius:7px;overflow:hidden}.mg-bar.big{height:10px;margin:8px 0}.mg-bar i{display:block;height:100%;background:linear-gradient(90deg,#12B886,var(--accent));border-radius:7px;transition:width .5s}
.mg-meta{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12.5px;color:var(--muted)}.mg-warn{color:#c92a2a;font-size:12.5px}.mg-ok{color:#0ca678;font-size:13px}.mg-hint{font-size:13px;background:rgba(245,183,0,.14);border-radius:12px;padding:8px 10px}
.mg-add{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;margin-bottom:10px}.mg-add input,.mg-add select{margin:0}
.mg-tasks{list-style:none;padding:0;margin:0;display:grid;gap:8px}.mg-tasks li{border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--surface)}.mg-tasks li.done .mg-tk span{text-decoration:line-through;color:var(--muted)}.mg-tasks li.late{border-color:#fa5252}.mg-tasks small{display:block;margin-top:4px}
.mg-tk{display:flex;gap:8px;align-items:flex-start;font-weight:600;line-height:1.6}.mg-tk input{width:auto;margin-top:5px}.mg-tk-meta{display:flex;gap:6px;align-items:center;margin-top:6px}.mg-tk-meta select,.mg-tk-meta input{margin:0;padding:4px 6px;font-size:12.5px;width:auto;flex:1}
.mg-x{border:1px solid var(--line);background:var(--surface2);border-radius:8px;padding:3px 8px;cursor:pointer;color:var(--ink);font:inherit;font-size:12px;opacity:.75}.mg-x.on{opacity:1;border-color:#f08c00;background:rgba(245,183,0,.2)}.mg-empty{color:var(--muted);text-align:center}
.mg-load>div{display:grid;grid-template-columns:90px 1fr 24px;gap:8px;align-items:center;font-size:13px;margin:4px 0}.mg-load i{display:block;height:8px;border-radius:8px;background:var(--accent)}.mg-load span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mg-log{list-style:none;padding:0;display:grid;gap:6px;margin:8px 0}.mg-log li{padding:8px 10px;border-radius:12px;background:var(--surface2);line-height:1.7;font-size:14px}.mg-log li.team{background:rgba(18,184,134,.12)}.mg-log small{display:block;color:var(--muted);font-size:11.5px}
.mg-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.mg-kpis span{background:var(--surface2);border-radius:12px;padding:8px;text-align:center;font-size:12px;color:var(--muted)}.mg-kpis b{display:block;font-size:20px;color:var(--ink)}
.mg-ctrl{display:grid;gap:8px}.mg-ctrl>div>b{font-size:13.5px}.mg-ai{margin-top:12px;padding:12px;border-radius:14px;background:var(--surface2)}.mg-fixf{display:grid;gap:6px;margin-top:6px}.mg-del{justify-content:center;margin-top:16px;opacity:.8}
.mg-mini{padding-inline-start:18px;display:grid;gap:4px;font-size:14px;line-height:1.7}.mg-mini li.done{color:var(--muted)}.mg-mini small{color:var(--muted)}
.mg-eval{display:grid;gap:6px;margin:8px 0}.mg-eval>div{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px}.mg-eval small{color:var(--muted);font-size:11px}.mg-stars{display:flex;direction:ltr}.mg-stars button{border:0;background:none;font-size:22px;color:var(--line);cursor:pointer;padding:0 2px}.mg-stars button.on{color:#f59f00}
.mg-trend{display:flex;align-items:flex-end;gap:6px;height:60px;justify-content:center;margin-top:8px}.mg-trend span{width:18px;background:var(--accent);border-radius:6px 6px 0 0}
.mg-swot{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}.mg-sw{border-radius:14px;padding:8px}.mg-sw b{display:block;font-size:13px;margin-bottom:4px}.mg-sw textarea{width:100%;font-size:13px}.mg-sw p{margin:0;font-size:12.5px;line-height:1.6}
.mg-sw-s{background:rgba(18,184,134,.12)}.mg-sw-w{background:rgba(224,49,49,.08)}.mg-sw-o{background:rgba(37,99,235,.1)}.mg-sw-t{background:rgba(245,183,0,.14)}
.mg-pyr{display:grid;gap:8px;justify-items:center}.mg-lv{border-radius:14px;padding:8px 10px;background:var(--surface2);width:100%}.mg-lv0{width:60%;background:rgba(30,58,138,.14)}.mg-lv1{width:80%;background:rgba(37,99,235,.1)}.mg-lv b{display:block;font-size:13px;text-align:center}.mg-lv textarea{width:100%;font-size:13px}
.mg-comp{overflow-x:auto}.mg-comp table{width:100%;border-collapse:collapse;font-size:13px}.mg-comp th,.mg-comp td{border-bottom:1px solid var(--line);padding:6px;text-align:start;vertical-align:top}
.mg-idcard{border-radius:18px;padding:16px;background:linear-gradient(160deg,var(--surface) 60%,var(--accent-soft,rgba(37,99,235,.1)));border:1.5px solid var(--accent);display:grid;gap:8px}.mg-idcard h3{margin:0;font-family:var(--display)}.mg-idcard p{margin:2px 0;line-height:1.7}.mg-idcard small{color:var(--muted)}
.mg-qmeta{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px}.mg-q{font-size:18px;line-height:1.7;margin:14px 0}.mg-lik{display:grid;gap:8px}.mg-lik button{font:inherit;padding:12px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer}.mg-lik button.on{border-color:var(--accent);background:var(--accent-soft,rgba(37,99,235,.1))}
.mg-result{text-align:center}.mg-big{font-size:46px;font-weight:800;color:var(--accent)}.mg-result h3{margin:4px 0}.mg-dims{display:grid;gap:8px;margin:14px 0}.mg-dims>div{display:grid;grid-template-columns:minmax(120px,40%) 1fr 42px;gap:8px;align-items:center;font-size:13.5px}.mg-dims small{color:var(--muted);font-size:11px}.mg-dims i{display:block;height:10px;background:var(--surface2);border-radius:10px;overflow:hidden}.mg-dims b{display:block;height:100%;background:var(--accent);border-radius:10px}.mg-dims em{font-style:normal;font-weight:700}
.mg-tips{display:grid;gap:8px;line-height:1.75;padding-inline-start:18px}
@media(max-width:480px){.mg-row,.mg-swot{grid-template-columns:1fr}.mg-swot.mini{grid-template-columns:1fr 1fr}.mg-add{grid-template-columns:1fr 1fr}.mg-add input:first-child{grid-column:1/-1}.mg-lv0,.mg-lv1{width:100%}}`;
  const se = document.createElement("style"); se.textContent = css; document.head.appendChild(se);

  // ---------- الربط مع التطبيق ----------
  document.addEventListener("DOMContentLoaded", function () {
    try {
      ICONS.mproject = '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
      ICONS.mteam = '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>';
      ICONS.morg = '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M15 10h.01"/>';
      ICONS.mleader = '<path d="M12 2l3 7h7l-5.5 4.5L18.5 21 12 16.5 5.5 21l2-7.5L2 9h7z"/>';
      Object.assign(TINT, { mproject: "#1971c2", mteam: "#0ca678", morg: "#7048e8", mleader: "#e8590c" });
      EXTRA.mproject = { name: "إدارة مشروع إعلامي", desc: "خطط ونظّم وتابع حلقتك أو حملتك بوظائف الإدارة الأربع" };
      EXTRA.mteam = { name: "فريقي الإعلامي", desc: "الأدوار، التفويض، التقييم، التحفيز ومقابلات التعيين" };
      EXTRA.morg = { name: "هوية مؤسستي ومنافسيها", desc: "رؤية ورسالة، SWOT، هيكل إداري ومقارنة بالمنافسين" };
      EXTRA.mleader = { name: "مقياس القائد الإعلامي", desc: "إنت أقرب للمدير ولا للقائد؟ وخطة تطوير" };
      const K = ["mproject", "mteam", "morg", "mleader"];
      K.forEach(k => { OFF.push(k); NEWBIES.push(k); });
      GROUPS.unshift({ title: "إدارة العمل الإعلامي", sub: "مبنية على مادة مبادئ الإدارة: التخطيط والتنظيم والتوجيه والرقابة، والقيادة وفرق العمل", items: K });
      const prevOff = renderOff;
      renderOff = function (k) {
        const f = { mproject: offProject, mteam: offTeam, morg: offOrg, mleader: offLeader }[k];
        if (!f) return prevOff(k);
        if (k !== "mleader" && lv.i >= ITEMS.length) lv = { i: -1, a: [] };
        const box = document.getElementById("offBody"); box.innerHTML = ""; f(box);
      };
      const prevOpen = open;
      open = function (k) { if (k === "mleader" && lv.i >= ITEMS.length) lv = { i: -1, a: [] }; return prevOpen(k); };
      buildHome(); filterTools();
    } catch (e) { console.error("manage init", e); }
  });
})();
