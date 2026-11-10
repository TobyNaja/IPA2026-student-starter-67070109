/* IPA2026 Bot Explorer — UI only. All content lives in data/*.js */
(function () {
  "use strict";

  var D = window.PROJECT_DATA;
  var QZ = window.QUIZ_DATA;
  var SRC = window.SOURCE_SNIPPETS || { functions: {}, files: {} };
  var view = document.getElementById("view");

  // ------------------------------------------------------------------ utils
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem("ipa-study." + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem("ipa-study." + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ }
    },
    del: function (k) { try { localStorage.removeItem("ipa-study." + k); } catch (e) { /* ignore */ } },
  };
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  var fnById = {};
  D.functions.forEach(function (f) { fnById[f.id] = f; });
  function shortName(f) { return f.name.replace(/\([\s\S]*$/, "()"); }
  function bareName(f) { return shortName(f).replace(/\(\)$/, "").split(".").pop(); }

  var PART_LABEL = { P1: "Part 1", P2: "Part 2", P3: "Part 3", P4: "Part 4" };
  var GROUP_TITLES = {
    entry: "Entry Point & Event Handling", webex: "Webex Integration", integration: "Request Processing",
    validation: "Validation (Part 1)", planning: "Planning", backend: "Router Backends (Part 3)", util: "Utility & Error Handling",
    deploy: "Deployment & Webhook Registration",
  };
  var GROUP_ORDER = ["entry", "webex", "integration", "validation", "planning", "backend", "util", "deploy"];
  var TYPE_LABEL = {
    direct: "เรียกตรง", event: "ผ่าน event", framework: "framework", injected: "ส่งเป็น callable", test: "tests",
  };
  // where a function runs: the bot's request path, the separate registrar service, or Part 1 / tests only
  function runtimeBadge(f, short) {
    if (f.group === "deploy") return badge("info", "service registrar");
    if (f.runtime) return short ? "" : badge("accent", "อยู่ใน runtime");
    return badge("muted", short ? "Part 1/tests" : "ใช้เฉพาะ Part 1 / tests");
  }
  function fnDot(f) { return f.status === "todo" ? "todo" : f.group === "deploy" ? "config" : !f.runtime ? "test" : ""; }

  function badge(kind, text) { return '<span class="badge badge-' + kind + '">' + esc(text) + "</span>"; }
  function statusBadge(s) {
    var m = { done: ["ok", "เขียนแล้ว"], todo: ["warn", "TODO: ทำตาม spec"], partial: ["warn", "เขียนแล้วบางส่วน"], config: ["info", "config"], extra: ["muted", "ส่วนเสริม"] }[s] || ["muted", s];
    return badge(m[0], m[1]);
  }

  // wrap identifiers, paths and JSON snippets in <code>
  var FMT_RE = /(\{&quot;[^{}]*?\})|(\b(?:app|specs|specs-th|tests|sample-tests|ansible|scripts)\/[\w./*-]+|\.github\/[\w./-]+)|(\b(?:compose\.yaml|Dockerfile|requirements\.txt)\b)|(\b[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*\([^()]*\))|(\b[\w-]+\.(?:py|ya?ml|md|ini|txt)\b)|(\b[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)+\b)|(\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b)|(\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b)/g;
  function fmt(text) {
    return esc(text).replace(FMT_RE, function (m) { return "<code>" + m + "</code>"; });
  }

  function fnLink(id, label) {
    var f = fnById[id];
    if (!f) return esc(label || id);
    return '<a class="fn-link' + (f.status === "todo" ? " is-todo" : "") + '" href="#/functions/' + encodeURIComponent(id) + '">' + esc(label || shortName(f)) + "</a>";
  }
  function srcLoc(id) {
    var s = SRC.functions[id];
    if (s) return s.file + ":" + s.line;
    return (fnById[id] || {}).file || "";
  }
  function refLink(ref) {
    for (var i = 0; i < D.functions.length; i++) {
      var f = D.functions[i];
      if (ref.indexOf(f.file) === 0 && ref.indexOf(bareName(f)) > -1) {
        return '<a href="#/functions/' + encodeURIComponent(f.id) + '"><code>' + esc(ref) + "</code></a>";
      }
    }
    return "<code>" + esc(ref) + "</code>";
  }

  // ------------------------------------------------------------------ syntax highlight
  var PY_RE = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|\bf?"(?:\\.|[^"\\\n])*"|\bf?'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|try|except|finally|raise|with|as|import|from|lambda|pass|yield)\b|(@[\w.]+)|\b(\d+)\b/g;
  function hlPython(code) {
    var out = "", last = 0, m;
    PY_RE.lastIndex = 0;
    while ((m = PY_RE.exec(code))) {
      out += esc(code.slice(last, m.index));
      var cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : m[4] ? "d" : "n";
      out += '<span class="tok-' + cls + '">' + esc(m[0]) + "</span>";
      last = PY_RE.lastIndex;
    }
    return out + esc(code.slice(last));
  }
  function hlYaml(code) {
    return code.split("\n").map(function (line) {
      var ci = line.search(/(^|\s)#/);
      var body = ci >= 0 ? line.slice(0, ci) : line;
      var comment = ci >= 0 ? line.slice(ci) : "";
      var km = body.match(/^(\s*-?\s*)([^:#"'{}\[\]]+?)(:)(\s.*|)$/);
      var html = km
        ? esc(km[1]) + '<span class="tok-k">' + esc(km[2]) + "</span>" + esc(km[3]) + '<span class="tok-s">' + esc(km[4]) + "</span>"
        : esc(body);
      return html + (comment ? '<span class="tok-c">' + esc(comment) + "</span>" : "");
    }).join("\n");
  }
  function hlDocker(code) {
    return code.split("\n").map(function (line) {
      var m = line.match(/^([A-Z]+)(\b.*)$/);
      return m ? '<span class="tok-k">' + esc(m[1]) + "</span>" + esc(m[2]) : esc(line);
    }).join("\n");
  }
  function langOf(path) {
    if (/\.py$/.test(path)) return "python";
    if (/\.ya?ml$/.test(path)) return "yaml";
    if (/Dockerfile$/.test(path)) return "docker";
    return "plain";
  }
  function codeBlock(code, lang, title) {
    var body = lang === "python" ? hlPython(code) : lang === "yaml" ? hlYaml(code) : lang === "docker" ? hlDocker(code) : esc(code);
    return '<div class="code"><div class="code-head"><span>' + esc(title || "") + '</span><button class="copy" type="button" data-copy>คัดลอก</button></div><pre><code>' + body + "</code></pre></div>";
  }

  // ------------------------------------------------------------------ theme
  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  var themeBtn = document.getElementById("themeBtn");
  function paintThemeBtn() {
    var t = document.documentElement.getAttribute("data-theme");
    themeBtn.textContent = "โหมดสี: " + (t === "dark" ? "มืด" : t === "light" ? "สว่าง" : "อัตโนมัติ");
  }
  themeBtn.addEventListener("click", function () {
    var t = document.documentElement.getAttribute("data-theme");
    var next = t === "light" ? "dark" : t === "dark" ? null : "light";
    if (next) { document.documentElement.setAttribute("data-theme", next); store.set("theme", next); }
    else { document.documentElement.removeAttribute("data-theme"); store.del("theme"); }
    paintThemeBtn();
    configureMermaid();
    route();
  });
  paintThemeBtn();

  // ------------------------------------------------------------------ mermaid (loaded lazily so the site works offline)
  var MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
  var mermaidState = "idle";
  var mermaidWaiters = [];
  function loadMermaid() {
    if (mermaidState === "ready") return Promise.resolve(true);
    if (mermaidState === "failed") return Promise.resolve(false);
    return new Promise(function (resolve) {
      mermaidWaiters.push(resolve);
      if (mermaidState === "loading") return;
      mermaidState = "loading";
      var s = document.createElement("script");
      s.src = MERMAID_URL;
      s.async = true;
      var timer = setTimeout(function () { done(false); }, 15000);
      function done(ok) {
        clearTimeout(timer);
        if (mermaidState !== "loading") return;
        mermaidState = ok && window.mermaid ? "ready" : "failed";
        if (mermaidState === "ready") configureMermaid();
        mermaidWaiters.splice(0).forEach(function (fn) { fn(mermaidState === "ready"); });
      }
      s.onload = function () { done(true); };
      s.onerror = function () { done(false); };
      document.head.appendChild(s);
    });
  }
  function configureMermaid() {
    if (!window.mermaid) return;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: isDark() ? "dark" : "neutral",
      fontFamily: getComputedStyle(document.body).fontFamily,
      flowchart: { htmlLabels: true, curve: "basis", useMaxWidth: false, nodeSpacing: 36, rankSpacing: 44 },
      sequence: { useMaxWidth: false, mirrorActors: false },
    });
  }
  var mmCount = 0;
  function renderDiagram(el, def, nodeMap, onNode) {
    el.innerHTML = '<div class="mm-loading">กำลังวาดแผนภาพ…</div>';
    return loadMermaid().then(function (ok) {
      if (!el.isConnected) return;
      if (!ok) {
        el.innerHTML = '<div class="callout warn"><b>โหลด Mermaid ไม่ได้</b> (ต้องต่ออินเทอร์เน็ตเพื่อวาดแผนภาพ) ลำดับขั้นแบบรายการยังดูได้ในแท็บ Data Flow</div>' +
          '<details style="margin-top:10px"><summary>Mermaid source ของแผนภาพนี้</summary><pre class="plain">' + esc(def) + "</pre></details>";
        return;
      }
      mmCount += 1;
      return window.mermaid.render("mm" + mmCount, def).then(function (res) {
        if (!el.isConnected) return;
        el.innerHTML = res.svg;
        if (nodeMap && onNode) bindNodes(el, nodeMap, onNode);
        return el.querySelector("svg");
      }).catch(function (e) {
        el.innerHTML = '<div class="callout err">วาดแผนภาพไม่สำเร็จ: ' + esc(e && e.message ? e.message : e) + "</div>";
      });
    });
  }
  function bindNodes(el, nodeMap, onNode) {
    el.querySelectorAll("g.node").forEach(function (g) {
      var key = g.getAttribute("data-id");
      if (!key || !nodeMap[key]) {
        var m = (g.id || "").match(/flowchart-(.+?)-\d+$/);
        key = m && m[1];
      }
      if (!key || !nodeMap[key]) return;
      g.classList.add("mm-click");
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      var go = function () {
        el.querySelectorAll(".mm-click.selected").forEach(function (n) { n.classList.remove("selected"); });
        g.classList.add("selected");
        onNode(nodeMap[key], key);
      };
      g.addEventListener("click", go);
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
  }

  // ------------------------------------------------------------------ navigation
  var ICONS = {
    overview: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    functions: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>',
    workflow: '<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="12" r="2.5"/><circle cx="6" cy="19" r="2.5"/><path d="M6 7.5v9M8.3 6l7.4 4.8M8.3 18l7.4-4.8"/>',
    files: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    yaml: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    review: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  };
  var PAGES = [
    { id: "overview", title: "Project Overview", group: "เรียนรู้" },
    { id: "functions", title: "Function Explorer", group: "เรียนรู้" },
    { id: "workflow", title: "Workflow Visualization", group: "เรียนรู้" },
    { id: "files", title: "File Explorer", group: "เรียนรู้" },
    { id: "yaml", title: "YAML Configuration", group: "เรียนรู้" },
    { id: "review", title: "สรุปก่อนสอบ", group: "ทบทวน" },
    { id: "quiz", title: "Quiz", group: "ทบทวน" },
  ];
  function renderNav(active) {
    var html = "", lastGroup = "";
    PAGES.forEach(function (p) {
      if (p.group !== lastGroup) { html += '<div class="nav-label">' + esc(p.group) + "</div>"; lastGroup = p.group; }
      html += '<a href="#/' + p.id + '" class="' + (p.id === active ? "active" : "") + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[p.id] + "</svg>" + esc(p.title) + "</a>";
    });
    document.getElementById("nav").innerHTML = html;
    var page = PAGES.filter(function (p) { return p.id === active; })[0];
    document.getElementById("topTitle").textContent = page ? page.title : "IPA2026 Bot Explorer";
  }
  function renderSide() {
    var hist = store.get("quizHistory", []);
    var best = hist.reduce(function (m, h) { return Math.max(m, h.pct); }, 0);
    document.getElementById("sideProgress").innerHTML = hist.length
      ? "ทำข้อสอบแล้ว <b>" + hist.length + "</b> ครั้ง<br>คะแนนดีที่สุด <b>" + best + "%</b>"
      : "ยังไม่เคยทำข้อสอบ<br>อ่านเนื้อหาแล้วลองทำ Quiz ได้เลย";
    document.getElementById("sideMeta").innerHTML = "วิเคราะห์จาก commit <code>" + esc(D.meta.commit) + "</code><br>" + esc(D.meta.analyzedOn);
  }

  var sidebar = document.getElementById("sidebar");
  var scrim = document.getElementById("scrim");
  function closeMenu() { sidebar.classList.remove("open"); scrim.classList.remove("show"); }
  document.getElementById("menuBtn").addEventListener("click", function () { sidebar.classList.add("open"); scrim.classList.add("show"); });
  scrim.addEventListener("click", closeMenu);
  document.getElementById("nav").addEventListener("click", closeMenu);

  // copy buttons (delegated)
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]");
    if (!b) return;
    var code = b.closest(".code").querySelector("pre").textContent;
    var done = function () { b.textContent = "คัดลอกแล้ว"; setTimeout(function () { b.textContent = "คัดลอก"; }, 1400); };
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, function () {});
  });

  // ------------------------------------------------------------------ router
  var lastPage = "";
  function route() {
    var parts = (location.hash.replace(/^#\/?/, "") || "overview").split("/");
    var page = parts[0];
    var arg = parts.slice(1).map(decodeURIComponent).join("/");
    if (!PAGES.some(function (p) { return p.id === page; })) page = "overview";
    renderNav(page);
    renderSide();
    var samePage = page === lastPage;
    lastPage = page;
    switch (page) {
      case "functions": renderFunctions(arg, samePage); break;
      case "workflow": renderWorkflow(arg); break;
      case "files": renderFiles(arg, samePage); break;
      case "yaml": renderYaml(arg); break;
      case "quiz": renderQuiz(); break;
      case "review": renderReview(); break;
      default: renderOverview();
    }
    if (!samePage) window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ================================================================== OVERVIEW
  function renderOverview() {
    var m = D.meta;
    var runtimeFns = D.functions.filter(function (f) { return f.runtime; }).length;
    var todoFns = D.functions.filter(function (f) { return f.status === "todo"; }).length;
    var html = '<section class="hero">' +
      '<div class="eyebrow">Project Overview</div>' +
      "<h1>" + esc(m.name) + "</h1>" +
      "<p>" + fmt(m.oneLiner) + "</p>" +
      '<div class="stats">' +
      stat(D.functions.length, "Function หลักที่อธิบาย") +
      stat(runtimeFns, "อยู่ใน runtime ของ bot") +
      stat(m.testRun.passed + "/" + (m.testRun.passed + m.testRun.failed), "pytest ผ่าน (ล่าสุด)") +
      stat(QZ.questions.length, "ข้อสอบใน Quiz") +
      "</div></section>";

    if (todoFns || m.testRun.failed) {
      html += '<div class="callout warn section"><b>สถานะสำคัญ:</b> ' +
        fmt("ยังมี " + todoFns + " ฟังก์ชันที่เป็น TODO และ pytest ไม่ผ่าน " + m.testRun.failed + " ข้อ" + (m.testRun.failedFile ? "ใน " + m.testRun.failedFile : "")) + "</div>";
    }
    if (D.changes && D.changes.length) {
      html += '<div class="callout info section"><b>อัปเดตตาม commit ล่าสุด (' + esc(m.commit) + "):</b> " +
        fmt("ทุก Part เขียนครบและ pytest ผ่าน " + m.testRun.passed + " ข้อ") + '<ul class="clean" style="margin-top:8px">' +
        D.changes.map(function (c) { return "<li><code>" + esc(c.commit) + "</code> " + fmt(c.what) + "</li>"; }).join("") +
        '</ul><div class="small" style="margin-top:6px">สรุปทั้งหมดอยู่ที่ <a href="#/review">สรุปก่อนสอบ</a> และแผนภาพ deploy อยู่ที่ <a href="#/workflow/deploy">Workflow → Startup &amp; Deploy</a></div></div>';
    }

    html += '<section class="section"><h2>งานแบ่งเป็น 4 Part</h2><div class="grid grid-4">';
    D.parts.forEach(function (p) {
      html += '<div class="card part-card"><div class="badges" style="margin-bottom:8px">' + statusBadge(p.status) + "</div><h3>" + esc(p.title) + "</h3><p class=\"small\">" + fmt(p.what) + '</p><div class="files">' + p.files.map(esc).join("<br>") + '</div><div class="small muted" style="margin-top:8px">spec: ' + p.spec.map(function (s) { return esc(s.replace("specs/", "")); }).join(", ") + "</div></div>";
    });
    html += "</div></section>";

    html += '<section class="section"><h2>ระบบเริ่มต้นทำงานอย่างไร</h2><div class="card"><ol class="timeline">';
    D.startup.forEach(function (s) {
      html += '<li><div class="t">' + esc(s.title) + (s.todo ? " " + badge("warn", "ตาม spec") : "") + "</div><div>" + fmt(s.body) + "</div>" +
        (fnById[s.ref] ? '<div class="small">ดู: ' + fnLink(s.ref) + "</div>" : '<div class="small muted">' + fmt(s.ref) + "</div>") + "</li>";
    });
    html += "</ol></div></section>";

    html += '<section class="section"><h2>ภาพรวมการทำงานเมื่อผู้ใช้ @mention bot</h2><p class="muted">ลำดับเวลาตั้งแต่ส่งข้อความจนได้คำตอบ ดูแผนภาพแบบกดได้ที่ <a href="#/workflow">Workflow Visualization</a></p><div class="mm-wrap fit" id="seq"></div></section>';

    html += '<section class="section"><h2>4 Actions และ method ที่รองรับ</h2><div class="grid grid-2">' +
      '<div class="table-wrap"><table><thead><tr><th>action</th><th>ความหมาย</th><th>เปลี่ยน router</th><th>ผล</th></tr></thead><tbody>' +
      D.actions.map(function (a) { return "<tr><td><code>" + esc(a.action) + "</code></td><td>" + fmt(a.meaning) + "</td><td>" + esc(a.changes) + "</td><td>" + fmt(a.result) + "</td></tr>"; }).join("") +
      "</tbody></table></div>" + matrixTable() + "</div>" +
      '<p class="small muted" style="margin-top:8px">ตารางนี้คือ <code>SUPPORTED_ACTIONS</code> ใน <code>app/core.py</code> และ <code>BACKENDS</code> ใน <code>app/dispatcher.py</code> ถ้าคู่ไม่รองรับจะได้ <code>invalid_action</code></p></section>';

    html += '<section class="section"><h2>โครงสร้างไฟล์ (จัดกลุ่มตามหน้าที่)</h2><div class="card tree grid grid-2">';
    D.fileGroups.forEach(function (g) {
      html += '<div class="tree-group"><div class="g">' + esc(g.title) + '</div><div class="small muted" style="font-family:var(--font)">' + esc(g.desc) + "</div>";
      g.files.forEach(function (p) {
        var info = D.files[p] || {};
        html += '<div><a href="#/files/' + encodeURIComponent(p) + '"><span class="dot ' + dotClass(info.status) + '"></span>' + esc(p) + "</a></div>";
      });
      html += "</div>";
    });
    html += '</div><div class="legend"><span><span class="dot" style="display:inline-block"></span> เขียนแล้ว</span>' + (todoFns ? '<span><span class="dot todo" style="display:inline-block"></span> TODO</span>' : "") + '<span><span class="dot config" style="display:inline-block"></span> config</span><span><span class="dot test" style="display:inline-block"></span> ส่วนเสริม</span></div></section>';

    view.innerHTML = html;
    renderDiagram(document.getElementById("seq"), D.overviewSequence);
  }
  function stat(v, l) { return '<div class="stat"><div class="v">' + esc(v) + '</div><div class="l">' + esc(l) + "</div></div>"; }
  function dotClass(s) { return s === "todo" ? "todo" : s === "config" ? "config" : s === "extra" ? "test" : ""; }
  function matrixTable() {
    var mx = D.matrix;
    return '<div class="table-wrap"><table class="matrix"><thead><tr><th>method</th>' + mx.actions.map(function (a) { return "<th>" + esc(a) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      mx.rows.map(function (r) {
        return "<tr><td><code>" + esc(r.method) + "</code></td>" + mx.actions.map(function (a) {
          return r.yes.indexOf(a) > -1 ? '<td class="yes">✓</td>' : '<td class="no">—</td>';
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  // ================================================================== FUNCTIONS
  var fnFilter = { q: "", part: "all", runtime: false };
  function fnMatches(f) {
    if (fnFilter.part !== "all" && f.part !== fnFilter.part) return false;
    if (fnFilter.runtime && !f.runtime) return false;
    if (!fnFilter.q) return true;
    var hay = (f.name + " " + f.file + " " + f.summary + " " + f.id).toLowerCase();
    return hay.indexOf(fnFilter.q.toLowerCase()) > -1;
  }
  function orderedFunctions() {
    var out = [];
    GROUP_ORDER.forEach(function (g) { D.functions.forEach(function (f) { if (f.group === g) out.push(f); }); });
    return out;
  }
  function renderFunctions(id, samePage) {
    var sel = fnById[id] ? id : null;
    if (!samePage || !document.getElementById("fnList")) {
      view.innerHTML = '<div class="page-head"><div class="eyebrow">Function Explorer</div><h1>Function หลักของโปรเจกต์</h1>' +
        "<p>เฉพาะฟังก์ชันหลักที่ README และ specs/ กำหนด เลือกฟังก์ชันเพื่อดู Input / Process / Output และความสัมพันธ์กับฟังก์ชันอื่น</p></div>" +
        '<div class="split"><div class="card list-panel">' +
        '<input id="fnSearch" class="search" type="search" placeholder="ค้นหา เช่น plan, core.py, router" value="' + esc(fnFilter.q) + '">' +
        '<div class="chips" id="fnParts"></div>' +
        '<label class="small" style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="fnRuntime"' + (fnFilter.runtime ? " checked" : "") + "> แสดงเฉพาะที่อยู่ใน runtime ของ bot</label>" +
        '<div class="list-scroll" id="fnList"></div></div><div id="fnDetail"></div></div>';
      document.getElementById("fnSearch").addEventListener("input", function (e) { fnFilter.q = e.target.value.trim(); paintFnList(); });
      document.getElementById("fnRuntime").addEventListener("change", function (e) { fnFilter.runtime = e.target.checked; paintFnList(); });
      paintFnParts();
    }
    paintFnList(sel);
    var detail = document.getElementById("fnDetail");
    detail.innerHTML = sel ? fnDetailHTML(fnById[sel]) : fnIndexHTML();
    if (sel && samePage && window.innerWidth <= 920) detail.scrollIntoView({ behavior: "smooth", block: "start" });
    if (sel && samePage && window.innerWidth > 920) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function paintFnParts() {
    var el = document.getElementById("fnParts");
    var opts = [["all", "ทั้งหมด"], ["P1", "Part 1"], ["P2", "Part 2"], ["P3", "Part 3"], ["P4", "Part 4"]];
    el.innerHTML = opts.map(function (o) { return '<button type="button" class="chip' + (fnFilter.part === o[0] ? " active" : "") + '" data-part="' + o[0] + '">' + o[1] + "</button>"; }).join("");
    el.onclick = function (e) {
      var b = e.target.closest("[data-part]");
      if (!b) return;
      fnFilter.part = b.getAttribute("data-part");
      paintFnParts();
      paintFnList();
    };
  }
  function paintFnList(sel) {
    var el = document.getElementById("fnList");
    if (!el) return;
    sel = sel || (location.hash.split("/")[2] ? decodeURIComponent(location.hash.split("/")[2]) : "");
    var html = "", count = 0;
    GROUP_ORDER.forEach(function (g) {
      var items = D.functions.filter(function (f) { return f.group === g && fnMatches(f); });
      if (!items.length) return;
      html += '<div class="list-group-title">' + esc(GROUP_TITLES[g]) + "</div>";
      items.forEach(function (f) {
        count++;
        var dot = fnDot(f);
        html += '<a class="list-item' + (f.id === sel ? " active" : "") + '" href="#/functions/' + encodeURIComponent(f.id) + '"><div class="n"><span class="dot ' + dot + '"></span>' + esc(shortName(f)) + '</div><div class="s">' + esc(f.file.replace("app/", "")) + "</div></a>";
      });
    });
    el.innerHTML = html || '<p class="muted small" style="padding:8px">ไม่พบฟังก์ชันที่ตรงกับการค้นหา</p>';
    if (!count) return;
  }
  function fnIndexHTML() {
    var html = '<div class="card"><h2>เลือกฟังก์ชันจากรายการ</h2><p class="muted">หรือเริ่มตามลำดับการทำงานจริงด้านล่าง (เรียงจากต้นทางถึงปลายทาง)</p><div class="table-wrap"><table><thead><tr><th>Function</th><th>หน้าที่</th><th>สถานะ</th></tr></thead><tbody>';
    orderedFunctions().forEach(function (f) {
      html += "<tr><td>" + fnLink(f.id) + '<div class="small muted mono">' + esc(f.file) + "</div></td><td>" + fmt(f.summary) + "</td><td>" + statusBadge(f.status) + " " + runtimeBadge(f, true) + "</td></tr>";
    });
    html += "</tbody></table></div>" + typeLegend() + "</div>";
    return html;
  }
  function typeLegend() {
    return '<div class="legend">ชนิดความสัมพันธ์: ' + Object.keys(TYPE_LABEL).map(function (k) { return '<span class="type type-' + k + '">' + esc(TYPE_LABEL[k]) + "</span>"; }).join(" ") + "</div>";
  }
  function relItem(r) {
    var label = r.ref && fnById[r.ref] ? fnLink(r.ref, r.label || null) : fmt(r.label || r.ref || "");
    if (r.ref && fnById[r.ref] && r.label) label = fnLink(r.ref) + ' <span class="small muted">' + fmt(r.label) + "</span>";
    return '<div class="rel-item"><span class="lbl">' + label + '</span><span class="type type-' + r.type + '">' + esc(TYPE_LABEL[r.type] || r.type) + "</span></div>";
  }
  function relList(list) {
    return list && list.length ? list.map(relItem).join("") : '<div class="rel-empty">ไม่มี</div>';
  }
  function inlineRefs(list) {
    if (!list || !list.length) return '<span class="muted">ไม่มี</span>';
    return list.map(function (r) {
      return (r.ref && fnById[r.ref] ? fnLink(r.ref) : fmt(r.label || "")) + ' <span class="type type-' + r.type + '">' + esc(TYPE_LABEL[r.type]) + "</span>";
    }).join("<br>");
  }
  function fnDetailHTML(f) {
    var list = orderedFunctions();
    var i = list.indexOf(f);
    var prev = list[i - 1], next = list[i + 1];
    var html = '<article class="card">';
    html += '<div class="fn-head"><div><div class="eyebrow">' + esc(PART_LABEL[f.part]) + " · " + esc(GROUP_TITLES[f.group]) + "</div><h2>" + esc(f.name) + '</h2><div class="fn-file">' + esc(srcLoc(f.id)) + '</div></div><div class="badges">' + statusBadge(f.status) + runtimeBadge(f) + "</div></div>";
    html += '<p class="lead">' + fmt(f.summary) + "</p>";
    if (f.status === "todo") {
      html += '<div class="callout warn"><b>ยังไม่ได้เขียน:</b> ' + fmt("โค้ดจริงตอนนี้คือ raise NotImplementedError รายละเอียดด้านล่างอธิบายพฤติกรรมที่ specs/integration-spec-v1.md และ tests/test_part4_webhook.py กำหนด") + "</div>";
    }

    html += '<section class="detail-sec"><h3>A. ข้อมูลพื้นฐาน</h3><div class="table-wrap"><table><tbody>' +
      '<tr><td class="k">Function</td><td><code>' + esc(f.signature) + "</code></td></tr>" +
      '<tr><td class="k">File</td><td><code>' + esc(srcLoc(f.id)) + "</code></td></tr>" +
      '<tr><td class="k">หน้าที่</td><td>' + fmt(f.summary) + "</td></tr>" +
      '<tr><td class="k">เริ่มทำงานเมื่อ</td><td>' + fmt(f.trigger) + "</td></tr>" +
      '<tr><td class="k">ถูกเรียกจาก</td><td>' + inlineRefs(f.calledBy) + "</td></tr>" +
      '<tr><td class="k">เรียกต่อ</td><td>' + inlineRefs(f.calls) + "</td></tr>" +
      "</tbody></table></div></section>";

    html += '<section class="detail-sec"><h3>B. การทำงานภายใน Function</h3><ol class="steps">' + f.steps.map(function (s) { return "<li>" + fmt(s) + "</li>"; }).join("") + "</ol>";
    if (f.errors && f.errors.length) html += '<p style="margin-top:12px"><b>เงื่อนไข / Error Handling</b></p><ul class="clean">' + f.errors.map(function (s) { return "<li>" + fmt(s) + "</li>"; }).join("") + "</ul>";
    html += "</section>";

    html += '<section class="detail-sec"><h3>C. Input / Process / Output</h3><div class="table-wrap"><table><thead><tr><th>หัวข้อ</th><th>รายละเอียด</th></tr></thead><tbody>' +
      '<tr><td class="k">Input</td><td>' + fmt(f.ipo.input) + "</td></tr>" +
      '<tr><td class="k">Process</td><td>' + fmt(f.ipo.process) + "</td></tr>" +
      '<tr><td class="k">Output</td><td>' + fmt(f.ipo.output) + "</td></tr>" +
      '<tr><td class="k">Next Function</td><td>' + fmt(f.ipo.next) + "</td></tr>" +
      '<tr><td class="k">Source File</td><td><code>' + esc(f.file) + "</code></td></tr>" +
      "</tbody></table></div></section>";

    html += '<section class="detail-sec"><h3>D. ความสัมพันธ์กับ Function อื่น</h3><div class="rel">' +
      '<div class="rel-col"><div class="rel-title">ผู้เรียก / ทำงานก่อน</div>' + relList(f.calledBy) + "</div>" +
      '<div class="rel-center"><span class="rel-arrow h">→</span><div class="rel-node">' + esc(shortName(f)) + '</div><span class="rel-arrow h">→</span></div>' +
      '<div class="rel-col"><div class="rel-title">เรียกต่อ / ทำงานถัดไป</div>' + relList(f.calls) + "</div></div>" +
      '<p class="small" style="margin-top:12px"><b>หลังทำงานเสร็จ:</b> ' + fmt(f.ipo.next) + "</p>" + typeLegend() + "</section>";

    if (f.note) html += '<div class="callout info section" style="margin-top:18px">' + fmt(f.note) + "</div>";

    var src = SRC.functions[f.id];
    if (src) {
      html += '<details class="src"><summary>ดูโค้ดจริงจาก repo (' + esc(src.file) + ")</summary>" +
        src.pieces.map(function (p) { return codeBlock(p.code, "python", src.file + ":" + p.start + "–" + p.end + "  " + p.name); }).join("") + "</details>";
    }
    html += '<div class="pager">' + (prev ? '<a class="btn" href="#/functions/' + encodeURIComponent(prev.id) + '">← ' + esc(shortName(prev)) + "</a>" : "<span></span>") +
      (next ? '<a class="btn" href="#/functions/' + encodeURIComponent(next.id) + '">' + esc(shortName(next)) + " →</a>" : "") + "</div>";
    html += "</article>";
    return html;
  }

  // ================================================================== WORKFLOW
  function renderWorkflow(arg) {
    var tabs = D.diagrams.map(function (d) { return { id: d.id, title: d.title }; });
    tabs.push({ id: "dataflow", title: "Data Flow ทีละขั้น" });
    var parts = (arg || "").split("/");
    var tab = tabs.some(function (t) { return t.id === parts[0]; }) ? parts[0] : "main";
    var html = '<div class="page-head"><div class="eyebrow">Workflow Visualization</div><h1>การไหลของงานและข้อมูล</h1><p>แผนภาพใช้ชื่อฟังก์ชันและไฟล์จริง กดกล่องฟังก์ชันเพื่อดูรายละเอียด หรือเลือก Data Flow เพื่อไล่ทีละขั้นว่าข้อมูลอะไรถูกส่งต่อ</p></div>';
    html += '<div class="tabs">' + tabs.map(function (t) { return '<a class="tab' + (t.id === tab ? " active" : "") + '" href="#/workflow/' + t.id + '">' + esc(t.title) + "</a>"; }).join("") + "</div>";
    if (tab === "dataflow") {
      view.innerHTML = html + '<div id="dfView"></div>';
      renderDataflow(parts[1]);
      return;
    }
    var d = D.diagrams.filter(function (x) { return x.id === tab; })[0];
    var clickable = Object.keys(d.nodeMap || {}).length > 0;
    html += '<div class="wf-layout"><div><div class="toolbar"><p class="muted small" style="margin:0;flex:1;min-width:220px">' + esc(d.desc) + '</p>' +
      '<div class="btn-row zoom" id="zoomBar"><button class="btn" type="button" data-z="out" aria-label="ย่อ">−</button><span class="zoom-val" id="zoomVal"></span><button class="btn" type="button" data-z="in" aria-label="ขยาย">+</button><button class="btn" type="button" data-z="fit">พอดีจอ</button></div></div><div class="mm-wrap" id="mm"></div>';
    if (tab === "main") {
      html += '<div class="legend"><span>▭ ฟังก์ชัน (กดได้)</span><span>◇ จุดตัดสินใจ</span><span>▱ ผลลัพธ์ JSON / HTTP</span><span>▱ สีแดงมี ↩ = error ที่ handle_event() ส่งกลับห้องด้วย send_message() ทันที</span><span>เส้นประระหว่างกล่อง = เรียกผ่าน wrapper</span></div>';
    }
    html += '</div><aside class="node-info" id="nodeInfo">' + (clickable
      ? '<div class="card"><h3>รายละเอียดขั้นตอน</h3><p class="muted small">กดกล่องฟังก์ชันในแผนภาพเพื่อดูว่ารับอะไร ทำอะไร และส่งต่อไปที่ไหน</p></div>'
      : '<div class="card"><h3>อ่านแผนภาพ</h3><p class="muted small">แผนภาพนี้ไม่มีกล่องให้กด ดูโค้ดได้ที่ ' + (tab === "validation" ? fnLink("validate_request") : fnLink("error_from_exception")) + "</p></div>") + "</aside></div>";
    view.innerHTML = html;
    var mm = document.getElementById("mm");
    // zoom: number = scale of natural size, "fit" = shrink to container width
    var zoom = tab === "main" ? 0.85 : "fit";
    var svgEl = null;
    function applyZoom() {
      document.getElementById("zoomVal").textContent = zoom === "fit" ? "พอดีจอ" : Math.round(zoom * 100) + "%";
      if (!svgEl) return;
      var natural = parseFloat(svgEl.getAttribute("width")) || svgEl.getBoundingClientRect().width;
      if (zoom === "fit") { mm.classList.add("fit"); svgEl.style.width = ""; svgEl.style.height = ""; }
      else { mm.classList.remove("fit"); svgEl.style.width = natural * zoom + "px"; svgEl.style.height = "auto"; svgEl.style.maxWidth = "none"; }
    }
    document.getElementById("zoomBar").addEventListener("click", function (e) {
      var b = e.target.closest("[data-z]");
      if (!b) return;
      var z = b.getAttribute("data-z");
      var cur = zoom === "fit" ? (svgEl ? svgEl.getBoundingClientRect().width / (parseFloat(svgEl.getAttribute("width")) || 1) : 1) : zoom;
      if (z === "fit") zoom = "fit";
      else zoom = Math.max(0.3, Math.min(2, Math.round((cur + (z === "in" ? 0.15 : -0.15)) * 100) / 100));
      applyZoom();
    });
    applyZoom();
    renderDiagram(mm, d.def, d.nodeMap, function (target) {
      document.getElementById("nodeInfo").innerHTML = nodeInfoHTML(target);
      if (window.innerWidth <= 1100) document.getElementById("nodeInfo").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }).then(function (svg) { svgEl = svg || null; applyZoom(); });
  }
  function nodeInfoHTML(target) {
    var ids = Array.isArray(target) ? target : [target];
    return ids.map(function (id) {
      var f = fnById[id];
      if (!f) return "";
      return '<div class="card"><div class="badges" style="margin-bottom:6px">' + statusBadge(f.status) + "</div><h3 class=\"mono\" style=\"font-size:.95rem;overflow-wrap:anywhere\">" + esc(shortName(f)) + '</h3><div class="fn-file">' + esc(srcLoc(f.id)) + '</div><p class="small" style="margin-top:8px">' + fmt(f.summary) + '</p><div class="small"><b>Input:</b> ' + fmt(f.ipo.input) + '</div><div class="small"><b>Output:</b> ' + fmt(f.ipo.output) + '</div><div class="small"><b>ถัดไป:</b> ' + fmt(f.ipo.next) + '</div><div style="margin-top:10px">' + fnLink(f.id, "เปิดใน Function Explorer →") + "</div></div>";
    }).join("");
  }

  var dfStep = 0;
  function renderDataflow(scId) {
    var sc = D.scenarios.filter(function (s) { return s.id === scId; })[0] || D.scenarios[0];
    var el = document.getElementById("dfView");
    var html = '<div class="chips" style="margin-bottom:16px">' + D.scenarios.map(function (s) {
      return '<a class="chip' + (s.id === sc.id ? " active" : "") + '" href="#/workflow/dataflow/' + s.id + '">' + esc(s.title) + "</a>";
    }).join("") + "</div>";
    html += '<div class="grid grid-2" style="align-items:start"><div>' + codeBlock(sc.yaml, "yaml", "YAML ที่แนบมา") +
      '<div class="card" style="margin-top:12px" id="dfActive"></div></div>' +
      '<div class="card"><h3>' + esc(sc.title) + '</h3><ol class="stepper" id="dfSteps"></ol><div class="btn-row" style="margin-top:12px"><button class="btn" type="button" id="dfPrev">← ก่อนหน้า</button><button class="btn btn-primary" type="button" id="dfNext">ถัดไป →</button></div>' +
      (sc.after ? '<div class="callout info" style="margin-top:14px">' + fmt(sc.after) + "</div>" : "") + "</div></div>";
    el.innerHTML = html;
    dfStep = 0;
    function paint() {
      document.getElementById("dfSteps").innerHTML = sc.steps.map(function (st, i) {
        var f = fnById[st.fn];
        return '<li class="step' + (i === dfStep ? " active" : i < dfStep ? " done" : "") + '" data-i="' + i + '"><span class="num">' + (i + 1) + "</span><div>" +
          "<div>" + (f ? '<b class="mono">' + esc(shortName(f)) + "</b>" : esc(st.fn)) + (st.todo ? " " + badge("warn", "TODO") : "") + '</div><div class="io"><b>รับ:</b> ' + fmt(st.data) + '</div><div class="io"><b>ได้:</b> ' + fmt(st.out) + "</div></div></li>";
      }).join("");
      var st = sc.steps[dfStep], f = fnById[st.fn];
      document.getElementById("dfActive").innerHTML = '<div class="eyebrow">ขั้นที่ ' + (dfStep + 1) + " / " + sc.steps.length + "</div>" +
        (f ? "<h3 class=\"mono\" style=\"overflow-wrap:anywhere\">" + esc(shortName(f)) + '</h3><div class="fn-file">' + esc(srcLoc(f.id)) + '</div><p class="small" style="margin-top:8px">' + fmt(f.summary) + "</p>" : "<h3>" + esc(st.fn) + "</h3>") +
        '<div class="table-wrap"><table><tbody><tr><td class="k">ข้อมูลที่รับ</td><td>' + fmt(st.data) + '</td></tr><tr><td class="k">ผลที่ส่งต่อ</td><td>' + fmt(st.out) + "</td></tr></tbody></table></div>" +
        (f ? '<div style="margin-top:10px">' + fnLink(f.id, "ดูรายละเอียดฟังก์ชัน →") + "</div>" : "");
      document.getElementById("dfPrev").disabled = dfStep === 0;
      document.getElementById("dfNext").disabled = dfStep === sc.steps.length - 1;
    }
    document.getElementById("dfSteps").addEventListener("click", function (e) {
      var li = e.target.closest("[data-i]");
      if (li) { dfStep = +li.getAttribute("data-i"); paint(); }
    });
    document.getElementById("dfPrev").addEventListener("click", function () { if (dfStep > 0) { dfStep--; paint(); } });
    document.getElementById("dfNext").addEventListener("click", function () { if (dfStep < sc.steps.length - 1) { dfStep++; paint(); } });
    paint();
  }

  // ================================================================== FILES
  function renderFiles(path, samePage) {
    var sel = D.files[path] ? path : null;
    if (!samePage || !document.getElementById("fileList")) {
      view.innerHTML = '<div class="page-head"><div class="eyebrow">File Explorer</div><h1>สรุปการทำงานแยกตามไฟล์</h1><p>จัดกลุ่มตามหน้าที่จริงของโปรเจกต์ เลือกไฟล์เพื่อดู function ภายใน ใครเรียกไฟล์นี้ ไฟล์นี้เรียกใคร และความสัมพันธ์กับ YAML</p></div>' +
        '<div class="split"><div class="card list-panel"><div class="list-scroll" id="fileList"></div></div><div id="fileDetail"></div></div>';
    }
    var html = "";
    D.fileGroups.forEach(function (g) {
      html += '<div class="list-group-title">' + esc(g.title) + "</div>";
      g.files.forEach(function (p) {
        var info = D.files[p] || {};
        html += '<a class="list-item' + (p === sel ? " active" : "") + '" href="#/files/' + encodeURIComponent(p) + '"><div class="n"><span class="dot ' + dotClass(info.status) + '"></span>' + esc(p) + "</div></a>";
      });
    });
    document.getElementById("fileList").innerHTML = html;
    var detail = document.getElementById("fileDetail");
    detail.innerHTML = sel ? fileDetailHTML(sel) : '<div class="card"><h2>เลือกไฟล์จากรายการ</h2><p class="muted">เริ่มที่ ' + '<a href="#/files/' + encodeURIComponent("app/webhook_server.py") + '"><code>app/webhook_server.py</code></a> ซึ่งเป็นจุดเริ่มของโปรแกรม แล้วไล่ไปตามกลุ่มจากบนลงล่าง</p>' + matrixTable() + "</div>";
    if (sel && samePage && window.innerWidth <= 920) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function fileDetailHTML(path) {
    var info = D.files[path];
    var group = D.fileGroups.filter(function (g) { return g.files.indexOf(path) > -1; })[0];
    var html = '<article class="card"><div class="fn-head"><div><div class="eyebrow">' + esc(group ? group.title : "") + "</div><h2>" + esc(path) + '</h2></div><div class="badges">' + statusBadge(info.status) + "</div></div>";
    html += '<p class="lead">' + fmt(info.role) + "</p>";

    var fns = (info.functions || []).map(function (id) { return fnById[id]; }).filter(Boolean);
    if (fns.length) {
      html += '<section class="detail-sec"><h3>Function ภายในไฟล์</h3><div class="table-wrap"><table><tbody>' + fns.map(function (f) {
        return "<tr><td>" + fnLink(f.id) + '<div class="small muted mono">' + esc(srcLoc(f.id)) + "</div></td><td>" + fmt(f.summary) + "</td><td>" + statusBadge(f.status) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";

      // computed from function relations
      var incoming = [], outgoing = [];
      fns.forEach(function (f) {
        (f.calledBy || []).forEach(function (r) {
          var g = r.ref && fnById[r.ref];
          if (g && g.file !== path && !incoming.some(function (x) { return x.from === g.id && x.to === f.id; })) incoming.push({ from: g.id, to: f.id, type: r.type });
        });
        (f.calls || []).forEach(function (r) {
          var g = r.ref && fnById[r.ref];
          if (g && g.file !== path && !outgoing.some(function (x) { return x.from === f.id && x.to === g.id; })) outgoing.push({ from: f.id, to: g.id, type: r.type });
        });
      });
      html += '<section class="detail-sec"><h3>ความสัมพันธ์กับไฟล์อื่น</h3><div class="grid grid-2">' +
        '<div><p><b>Function จากไฟล์อื่นที่เรียกไฟล์นี้</b></p>' + (incoming.length ? incoming.map(function (x) {
          return '<div class="rel-item" style="margin-bottom:6px"><span class="lbl">' + fnLink(x.from) + ' <span class="muted">→</span> ' + fnLink(x.to) + '<div class="small muted mono">' + esc(fnById[x.from].file) + '</div></span><span class="type type-' + x.type + '">' + esc(TYPE_LABEL[x.type]) + "</span></div>";
        }).join("") : '<div class="rel-empty">ไม่มีใน app/ (ดูรายการด้านล่าง)</div>') + "</div>" +
        '<div><p><b>Function ในไฟล์อื่นที่ไฟล์นี้เรียก</b></p>' + (outgoing.length ? outgoing.map(function (x) {
          return '<div class="rel-item" style="margin-bottom:6px"><span class="lbl">' + fnLink(x.from) + ' <span class="muted">→</span> ' + fnLink(x.to) + '<div class="small muted mono">' + esc(fnById[x.to].file) + '</div></span><span class="type type-' + x.type + '">' + esc(TYPE_LABEL[x.type]) + "</span></div>";
        }).join("") : '<div class="rel-empty">ไม่มี</div>') + "</div></div></section>";
    }

    html += '<section class="detail-sec"><h3>เรียกใช้ / ถูกใช้โดย</h3><div class="grid grid-2"><div><p><b>ไฟล์นี้ใช้</b></p>' + listOrNone(info.uses) + "</div><div><p><b>ถูกใช้โดย</b></p>" + listOrNone(info.usedBy) + "</div></div></section>";
    html += '<section class="detail-sec"><h3>ความสัมพันธ์กับ YAML / Config</h3>' + listOrNone(info.yaml) + (info.yamlId ? '<p style="margin-top:10px"><a class="btn" href="#/yaml/' + info.yamlId + '">ดูคำอธิบายทีละ key →</a></p>' : "") + "</section>";
    if (info.order && info.order.length) html += '<section class="detail-sec"><h3>ลำดับการทำงานภายในไฟล์</h3><ol class="steps">' + info.order.map(function (s) { return "<li>" + fmt(s) + "</li>"; }).join("") + "</ol></section>";
    if (SRC.files[path]) html += '<section class="detail-sec"><h3>เนื้อหาไฟล์</h3>' + codeBlock(SRC.files[path], langOf(path), path) + "</section>";
    html += "</article>";
    return html;
  }
  function listOrNone(arr) {
    return arr && arr.length ? '<ul class="clean">' + arr.map(function (s) { return "<li>" + fmt(s) + "</li>"; }).join("") + "</ul>" : '<p class="muted">ไม่มี</p>';
  }

  // ================================================================== YAML
  function renderYaml(id) {
    var y = D.yaml.filter(function (x) { return x.id === id; })[0] || D.yaml[0];
    var html = '<div class="page-head"><div class="eyebrow">YAML Configuration</div><h1>YAML และไฟล์ตั้งค่า</h1><p>อธิบายเฉพาะ key ที่มีอยู่จริงในไฟล์ พร้อมเส้นทาง: YAML → ใครอ่าน → ฟังก์ชันที่ใช้ค่า → ผลต่อระบบ</p></div>';
    html += '<div class="tabs">' + D.yaml.map(function (x) { return '<a class="tab' + (x.id === y.id ? " active" : "") + '" href="#/yaml/' + x.id + '">' + esc(x.title) + "</a>"; }).join("") + "</div>";
    html += '<div class="card"><div class="fn-head"><div><h2>' + esc(y.title) + '</h2><div class="fn-file">' + esc(y.path) + "</div></div></div>";
    html += '<p class="lead">' + fmt(y.purpose) + "</p>";
    html += '<div class="detail-sec"><h3>เส้นทางของค่า</h3><div class="flow-chain">' + y.chain.map(function (c, i) { return (i ? '<span class="arr">→</span>' : "") + '<span class="pill">' + esc(c) + "</span>"; }).join("") + '</div><p class="small" style="margin-top:10px"><b>ผู้อ่านไฟล์:</b> ' + fmt(y.readBy) + "</p></div>";
    html += '<div class="detail-sec"><h3>เนื้อหาไฟล์จริง</h3>' + (SRC.files[y.sourceFile] ? codeBlock(SRC.files[y.sourceFile], langOf(y.sourceFile), y.sourceFile) : "");
    (y.extraSources || []).forEach(function (p) {
      if (SRC.files[p]) html += "<details><summary>" + esc(p) + "</summary>" + codeBlock(SRC.files[p], langOf(p), p) + "</details>";
    });
    html += "</div>";
    html += '<div class="detail-sec"><h3>คำอธิบายแต่ละ Key</h3><div class="table-wrap"><table class="keys"><thead><tr><th>Key</th><th>ค่าที่ใช้ได้</th><th>ใครใช้ค่านี้</th><th>ผลต่อระบบ</th></tr></thead><tbody>' +
      y.keys.map(function (k) { return "<tr><td><code>" + esc(k.key) + "</code></td><td>" + fmt(k.rule || "—") + "</td><td>" + fmt(k.usedBy) + "</td><td>" + fmt(k.effect) + "</td></tr>"; }).join("") + "</tbody></table></div></div>";
    if (y.notes && y.notes.length) html += '<div class="callout info" style="margin-top:16px"><ul class="clean">' + y.notes.map(function (n) { return "<li>" + fmt(n) + "</li>"; }).join("") + "</ul></div>";
    html += "</div>";

    html += '<section class="section"><h2>Environment Variables</h2><p class="muted">ค่าที่ไม่ควรอยู่ในโค้ด ถูกส่งผ่าน compose.yaml / .env แล้ว Python อ่านตอนรัน</p><div class="table-wrap"><table><thead><tr><th>ตัวแปร</th><th>มาจาก</th><th>ใครใช้</th><th>ถ้าผิดหรือไม่มี</th></tr></thead><tbody>' +
      D.envVars.map(function (v) { return "<tr><td><code>" + esc(v.name) + "</code></td><td>" + fmt(v.from) + "</td><td>" + fmt(v.usedBy) + "</td><td>" + fmt(v.ifWrong) + "</td></tr>"; }).join("") + "</tbody></table></div></section>";
    view.innerHTML = html;
  }

  // ================================================================== REVIEW
  function renderReview() {
    var html = '<div class="page-head"><div class="eyebrow">Documentation</div><h1>สรุปก่อนสอบ</h1><p>ตอบคำถามหลักของโปรเจกต์ในหน้าเดียว อ่านจบแล้วลองทำ <a href="#/quiz">Quiz</a> พิมพ์หน้านี้ได้ (Ctrl+P)</p></div>';
    html += '<div class="card qa">';
    D.review.forEach(function (r, i) {
      html += '<div class="qa-item"><div class="qa-num">' + (i + 1) + "</div><div><h3>" + esc(r.q) + "</h3>";
      if (r.a) html += '<ul class="clean">' + r.a.map(function (s) { return "<li>" + fmt(s) + "</li>"; }).join("") + "</ul>";
      if (r.table === "functions") {
        html += '<div class="table-wrap"><table><thead><tr><th>Function</th><th>ไฟล์</th><th>หน้าที่</th></tr></thead><tbody>' + orderedFunctions().map(function (f) {
          return "<tr><td>" + fnLink(f.id) + (f.status === "todo" ? " " + badge("warn", "TODO") : "") + " " + runtimeBadge(f, true) + '</td><td class="mono small">' + esc(f.file) + "</td><td>" + fmt(f.summary) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      }
      if (r.table === "changes") {
        html += '<p class="small muted">วิเคราะห์ครั้งแรกที่ commit 1e0b242 (ตอนนั้น webhook_server.py ยังเป็น stub) ตอนนี้อยู่ที่ ' + esc(D.meta.commit) + ' ทุกหน้าในเว็บอัปเดตตามโค้ดล่าสุดแล้ว</p>' +
          '<div class="table-wrap"><table><thead><tr><th>commit</th><th>ไฟล์</th><th>เปลี่ยนอะไร</th></tr></thead><tbody>' + D.changes.map(function (c) {
          return '<tr><td class="mono small"><b>' + esc(c.commit) + "</b><div class=\"muted\">" + esc(c.title) + "</div></td><td>" + c.files.map(function (p) { return D.files[p] ? '<a href="#/files/' + encodeURIComponent(p) + '"><code>' + esc(p) + "</code></a>" : "<code>" + esc(p) + "</code>"; }).join("<br>") + "</td><td>" + fmt(c.what) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      }
      if (r.table === "dataShapes") {
        html += '<div class="table-wrap"><table><thead><tr><th>ขั้น</th><th>รูปแบบข้อมูล</th><th>ผู้ส่ง → ผู้รับ</th></tr></thead><tbody>' + D.dataShapes.map(function (s) {
          return "<tr><td>" + fmt(s.stage) + "</td><td>" + fmt(s.shape) + "</td><td>" + fmt(s.producer) + " → " + fmt(s.consumer) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      }
      if (r.table === "troubleshooting") {
        html += '<div class="table-wrap"><table><thead><tr><th>อาการ</th><th>ตรวจอะไร</th><th>ส่วนที่เกี่ยวข้อง</th></tr></thead><tbody>' + D.troubleshooting.map(function (t) {
          return "<tr><td><b>" + fmt(t.symptom) + "</b></td><td>" + fmt(t.check) + "</td><td>" + fmt(t.where) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      }
      html += "</div></div>";
    });
    html += "</div>";

    html += '<section class="section"><h2>รหัสผลลัพธ์ทั้งหมด และใครเป็นผู้ตอบ</h2><div class="table-wrap"><table><thead><tr><th>result</th><th>status</th><th>มาจาก</th><th>ความหมาย</th></tr></thead><tbody>' +
      D.resultCodes.map(function (c) { return "<tr><td><code>" + esc(c.code) + "</code></td><td>" + badge(c.kind === "ok" ? "ok" : "err", c.kind) + "</td><td>" + fmt(c.where) + "</td><td>" + fmt(c.meaning) + "</td></tr>"; }).join("") +
      "</tbody></table></div></section>";
    html += '<section class="section"><h2>Capability matrix</h2>' + matrixTable() + "</section>";
    view.innerHTML = html;
  }

  // ================================================================== QUIZ
  var qById = {};
  QZ.questions.forEach(function (q) { qById[q.id] = q; });
  var catById = {};
  QZ.categories.forEach(function (c) { catById[c.id] = c; });
  var LETTERS = ["A", "B", "C", "D"];
  var MODES = {
    practice: { t: "Practice Mode", d: "ตอบทีละข้อ ดูเฉลยและคำอธิบายทันที" },
    exam: { t: "Exam Mode", d: "ทำให้ครบก่อน แล้วจึงแสดงคะแนนและเฉลย" },
    random: { t: "Random Mode", d: "สุ่มคำถามจากทุกหัวข้อ ตอบแล้วดูเฉลยทันที" },
  };
  var setup = { mode: "practice", cats: QZ.categories.map(function (c) { return c.id; }), count: 15 };
  var qs = null; // running session

  function renderQuiz() {
    if (qs && !qs.finished) return paintQuestion();
    if (qs && qs.finished) return paintResults();
    paintSetup();
  }
  function catMastery(catId, stats) {
    var items = QZ.questions.filter(function (q) { return q.cat === catId; });
    var seen = 0, ok = 0;
    items.forEach(function (q) { var s = stats[q.id]; if (s) { seen += s.seen; ok += s.correct; } });
    return { total: items.length, pct: seen ? Math.round((ok / seen) * 100) : null };
  }
  function paintSetup() {
    var stats = store.get("quizStats", {});
    var hist = store.get("quizHistory", []);
    var html = '<div class="page-head"><div class="eyebrow">Interactive Quiz</div><h1>ทดสอบความเข้าใจโปรเจกต์</h1><p>' + QZ.questions.length + " ข้อ แบ่งเป็น 4 ด้าน เน้นหน้าที่ของฟังก์ชัน ลำดับการทำงาน การส่งข้อมูล และการแก้ปัญหา ไม่ถาม syntax</p></div>";
    html += '<div class="card"><h3>1. เลือกโหมด</h3><div class="mode-cards" id="modeCards">' + Object.keys(MODES).map(function (k) {
      return '<button type="button" class="mode-card' + (setup.mode === k ? " active" : "") + '" data-mode="' + k + '"><span class="t">' + MODES[k].t + '</span><span class="d">' + MODES[k].d + "</span></button>";
    }).join("") + "</div>";
    if (setup.mode === "random") {
      html += '<h3 style="margin-top:20px">2. จำนวนข้อที่สุ่ม</h3><div class="chips" id="countChips">' + [10, 15, 20, QZ.questions.length].map(function (n) {
        return '<button type="button" class="chip' + (setup.count === n ? " active" : "") + '" data-count="' + n + '">' + (n === QZ.questions.length ? "ทั้งหมด (" + n + ")" : n + " ข้อ") + "</button>";
      }).join("") + '</div><p class="small muted" style="margin-top:8px">Random Mode สุ่มจากทุกหัวข้อเสมอ</p>';
    } else {
      html += '<h3 style="margin-top:20px">2. เลือกหัวข้อ</h3><div class="cat-list" id="catList">' + QZ.categories.map(function (c) {
        var m = catMastery(c.id, stats);
        return '<label class="cat-opt"><input type="checkbox" value="' + c.id + '"' + (setup.cats.indexOf(c.id) > -1 ? " checked" : "") + '><span style="flex:1"><span class="t">' + esc(c.title) + '</span> <span class="small muted">(' + m.total + ' ข้อ)</span><br><span class="d">' + esc(c.desc) + '</span><span class="bar"><span style="width:' + (m.pct || 0) + '%"></span></span><span class="d">' + (m.pct == null ? "ยังไม่เคยทำ" : "ตอบถูกสะสม " + m.pct + "%") + "</span></span></label>";
      }).join("") + "</div>";
    }
    html += '<div class="btn-row" style="margin-top:20px"><button type="button" class="btn btn-primary" id="startBtn">เริ่มทำข้อสอบ</button></div>' +
      '<p class="small muted" style="margin-top:10px">คีย์ลัด: <span class="kbd">1</span>–<span class="kbd">4</span> หรือ <span class="kbd">A</span>–<span class="kbd">D</span> เลือกคำตอบ, <span class="kbd">Enter</span> ข้อถัดไป</p></div>';

    html += '<section class="section"><h2>ประวัติการทำข้อสอบ</h2>';
    if (hist.length) {
      html += '<div class="table-wrap"><table><thead><tr><th>วันที่</th><th>โหมด</th><th>หัวข้อ</th><th>ถูก</th><th>ผิด</th><th>คะแนน</th></tr></thead><tbody>' + hist.slice().reverse().map(function (h) {
        return "<tr><td>" + esc(new Date(h.ts).toLocaleString("th-TH")) + "</td><td>" + esc(MODES[h.mode] ? MODES[h.mode].t : h.mode) + '</td><td class="small">' + esc(h.cats.map(function (c) { return catById[c] ? catById[c].short : c; }).join(", ")) + '</td><td class="yes">' + h.correct + "</td><td>" + (h.total - h.correct) + "</td><td><b>" + h.pct + "%</b> (" + h.correct + "/" + h.total + ")</td></tr>";
      }).join("") + '</tbody></table></div><div class="btn-row" style="margin-top:10px"><button class="btn btn-danger" type="button" id="clearHist">ล้างประวัติและสถิติ</button></div>';
    } else {
      html += '<p class="muted">ยังไม่มีประวัติ ผลการทำข้อสอบจะถูกบันทึกไว้ในเบราว์เซอร์นี้ (localStorage)</p>';
    }
    html += "</section>";
    view.innerHTML = html;

    document.getElementById("modeCards").addEventListener("click", function (e) {
      var b = e.target.closest("[data-mode]");
      if (b) { setup.mode = b.getAttribute("data-mode"); paintSetup(); }
    });
    var cc = document.getElementById("countChips");
    if (cc) cc.addEventListener("click", function (e) {
      var b = e.target.closest("[data-count]");
      if (b) { setup.count = +b.getAttribute("data-count"); paintSetup(); }
    });
    var cl = document.getElementById("catList");
    if (cl) cl.addEventListener("change", function () {
      setup.cats = Array.prototype.slice.call(cl.querySelectorAll("input:checked")).map(function (i) { return i.value; });
      document.getElementById("startBtn").disabled = !setup.cats.length;
    });
    document.getElementById("startBtn").disabled = setup.mode !== "random" && !setup.cats.length;
    document.getElementById("startBtn").addEventListener("click", function () { startQuiz(setup.mode, setup.cats, setup.count); });
    var ch = document.getElementById("clearHist");
    if (ch) ch.addEventListener("click", function () {
      if (confirm("ล้างประวัติและสถิติการทำข้อสอบทั้งหมด?")) { store.del("quizHistory"); store.del("quizStats"); renderSide(); paintSetup(); }
    });
  }

  function startQuiz(mode, cats, count, onlyIds) {
    var pool;
    if (onlyIds) pool = onlyIds.map(function (id) { return qById[id]; });
    else if (mode === "random") pool = shuffle(QZ.questions).slice(0, Math.min(count, QZ.questions.length));
    else pool = QZ.questions.filter(function (q) { return cats.indexOf(q.cat) > -1; });
    if (mode === "exam") pool = shuffle(pool);
    qs = {
      mode: mode,
      cats: onlyIds ? uniq(pool.map(function (q) { return q.cat; })) : mode === "random" ? QZ.categories.map(function (c) { return c.id; }) : cats.slice(),
      items: pool.map(function (q) { return { id: q.id, order: shuffle([0, 1, 2, 3]) }; }),
      idx: 0, answers: {}, revealed: {}, finished: false,
    };
    paintQuestion();
    window.scrollTo(0, 0);
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function instant() { return qs.mode !== "exam"; }

  function paintQuestion() {
    var it = qs.items[qs.idx], q = qById[it.id];
    var answered = Object.keys(qs.answers).length;
    var revealed = !!qs.revealed[qs.idx];
    var picked = qs.answers[qs.idx];
    var correctSoFar = Object.keys(qs.revealed).filter(function (i) { return qs.answers[i] === qById[qs.items[i].id].answer; }).length;
    var html = '<div class="card">';
    html += '<div class="q-meta"><span>' + esc(MODES[qs.mode].t) + " · ข้อ " + (qs.idx + 1) + " / " + qs.items.length + "</span>" +
      '<span class="badges">' + badge("accent", catById[q.cat].title) + (instant() ? badge("ok", "ถูก " + correctSoFar) + badge("err", "ผิด " + (Object.keys(qs.revealed).length - correctSoFar)) : badge("muted", "ตอบแล้ว " + answered + "/" + qs.items.length)) + "</span></div>";
    html += '<div class="progress"><span style="width:' + Math.round(((instant() ? Object.keys(qs.revealed).length : answered) / qs.items.length) * 100) + '%"></span></div>';
    html += '<div class="q-text">' + fmt(q.q) + "</div>";
    html += '<div class="choices" id="choices">' + it.order.map(function (orig, pos) {
      var cls = "choice";
      if (revealed) { if (orig === q.answer) cls += " correct"; else if (orig === picked) cls += " wrong"; }
      else if (orig === picked) cls += " picked";
      return '<button type="button" class="' + cls + '" data-orig="' + orig + '"' + (revealed ? " disabled" : "") + '><span class="letter">' + LETTERS[pos] + "</span><span>" + fmt(q.choices[orig]) + "</span></button>";
    }).join("") + "</div>";
    if (revealed) html += feedbackHTML(q, it, picked);

    html += '<div class="pager">';
    if (instant()) {
      html += '<button class="btn" type="button" id="quitBtn">ออก</button>';
      if (revealed) html += '<button class="btn btn-primary" type="button" id="nextBtn">' + (qs.idx === qs.items.length - 1 ? "ดูผลคะแนน" : "ข้อถัดไป →") + "</button>";
    } else {
      html += '<div class="btn-row"><button class="btn" type="button" id="prevBtn"' + (qs.idx === 0 ? " disabled" : "") + '>← ก่อนหน้า</button><button class="btn" type="button" id="nextBtn"' + (qs.idx === qs.items.length - 1 ? " disabled" : "") + ">ถัดไป →</button></div>" +
        '<div class="btn-row"><button class="btn" type="button" id="quitBtn">ออก</button><button class="btn btn-primary" type="button" id="submitBtn">ส่งคำตอบ</button></div>';
    }
    html += "</div>";
    if (!instant()) {
      html += '<div class="q-nav" id="qNav">' + qs.items.map(function (x, i) {
        return '<button type="button" data-go="' + i + '" class="' + (qs.answers[i] != null ? "answered" : "") + (i === qs.idx ? " current" : "") + '">' + (i + 1) + "</button>";
      }).join("") + "</div>";
    }
    html += "</div>";
    view.innerHTML = html;

    document.getElementById("choices").addEventListener("click", function (e) {
      var b = e.target.closest("[data-orig]");
      if (b) choose(+b.getAttribute("data-orig"));
    });
    var nb = document.getElementById("nextBtn");
    if (nb) nb.addEventListener("click", next);
    var pb = document.getElementById("prevBtn");
    if (pb) pb.addEventListener("click", function () { qs.idx--; paintQuestion(); });
    document.getElementById("quitBtn").addEventListener("click", function () {
      if (confirm("ออกจากข้อสอบนี้? คำตอบที่ทำไว้จะไม่ถูกบันทึก")) { qs = null; paintSetup(); }
    });
    var sb = document.getElementById("submitBtn");
    if (sb) sb.addEventListener("click", function () {
      var left = qs.items.length - Object.keys(qs.answers).length;
      if (left && !confirm("ยังไม่ได้ตอบ " + left + " ข้อ ต้องการส่งคำตอบเลยหรือไม่?")) return;
      finish();
    });
    var nav = document.getElementById("qNav");
    if (nav) nav.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (b) { qs.idx = +b.getAttribute("data-go"); paintQuestion(); }
    });
  }
  function choose(orig) {
    if (qs.revealed[qs.idx]) return;
    qs.answers[qs.idx] = orig;
    if (instant()) {
      qs.revealed[qs.idx] = true;
      var q = qById[qs.items[qs.idx].id];
      recordStat(q.id, orig === q.answer);
    }
    paintQuestion();
  }
  function next() {
    if (instant()) {
      if (!qs.revealed[qs.idx]) return;
      if (qs.idx === qs.items.length - 1) return finish();
    } else if (qs.idx === qs.items.length - 1) return;
    qs.idx++;
    paintQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function recordStat(id, ok) {
    var st = store.get("quizStats", {});
    var s = st[id] || { seen: 0, correct: 0 };
    s.seen++; if (ok) s.correct++;
    st[id] = s;
    store.set("quizStats", st);
  }
  function finish() {
    if (qs.mode === "exam") {
      qs.items.forEach(function (it, i) {
        qs.revealed[i] = true;
        if (qs.answers[i] != null) recordStat(it.id, qs.answers[i] === qById[it.id].answer);
      });
    }
    var correct = qs.items.filter(function (it, i) { return qs.answers[i] === qById[it.id].answer; }).length;
    var total = qs.items.length;
    qs.finished = true;
    qs.result = { correct: correct, total: total, answered: Object.keys(qs.answers).length };
    var hist = store.get("quizHistory", []);
    hist.push({ ts: Date.now(), mode: qs.mode, cats: qs.cats, total: total, correct: correct, pct: total ? Math.round((correct / total) * 100) : 0 });
    store.set("quizHistory", hist.slice(-50));
    renderSide();
    paintResults();
    window.scrollTo(0, 0);
  }
  function feedbackHTML(q, it, picked) {
    var ok = picked === q.answer;
    var posOf = function (orig) { return LETTERS[it.order.indexOf(orig)]; };
    var html = '<div class="feedback ' + (picked == null ? "err" : ok ? "ok" : "err") + '"><div class="fb-title">' + (picked == null ? "ไม่ได้ตอบ" : ok ? "✓ ถูกต้อง" : "✗ ยังไม่ถูก") + "</div>";
    html += "<div><b>คำตอบที่ถูก: " + posOf(q.answer) + ".</b> " + fmt(q.choices[q.answer]) + "</div>";
    html += '<p style="margin-top:8px">' + fmt(q.explain) + "</p>";
    var wrong = it.order.filter(function (o) { return o !== q.answer && q.why[o]; });
    if (wrong.length) html += '<div class="why"><b>ทำไมตัวเลือกอื่นไม่ใช่</b><ul>' + wrong.map(function (o) {
      return "<li" + (o === picked ? ' style="font-weight:600"' : "") + "><b>" + posOf(o) + ".</b> " + fmt(q.why[o]) + (o === picked ? " ← คำตอบของคุณ" : "") + "</li>";
    }).join("") + "</ul></div>";
    html += '<div class="refs"><span class="muted">อ้างอิง:</span> ' + q.refs.map(refLink).join(" ") + "</div></div>";
    return html;
  }
  function paintResults() {
    var r = qs.result;
    var pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
    var wrongIds = qs.items.filter(function (it, i) { return qs.answers[i] !== qById[it.id].answer; }).map(function (it) { return it.id; });
    var html = '<div class="card"><div class="result-head"><div class="score-ring" style="--p:' + pct + '"><div>' + pct + '%</div></div><div style="flex:1;min-width:220px"><div class="eyebrow">' + esc(MODES[qs.mode].t) + "</div><h2>" + (pct >= 80 ? "เข้าใจดีมาก" : pct >= 60 ? "ผ่านเกณฑ์ ทบทวนข้อที่ผิดอีกนิด" : "ลองทบทวนเนื้อหาแล้วทำใหม่") + '</h2><div class="kpis">' +
      '<div class="kpi"><div class="v">' + r.total + '</div><div class="l">ทั้งหมด</div></div>' +
      '<div class="kpi ok"><div class="v">' + r.correct + '</div><div class="l">ถูก</div></div>' +
      '<div class="kpi err"><div class="v">' + (r.answered - r.correct) + '</div><div class="l">ผิด</div></div>' +
      '<div class="kpi"><div class="v">' + (r.total - r.answered) + '</div><div class="l">ไม่ได้ตอบ</div></div></div></div></div>';

    html += '<div class="detail-sec"><h3>คะแนนแยกตามหัวข้อ</h3><div class="table-wrap"><table><thead><tr><th>หัวข้อ</th><th>ถูก / ทั้งหมด</th><th></th></tr></thead><tbody>';
    QZ.categories.forEach(function (c) {
      var idxs = qs.items.map(function (it, i) { return i; }).filter(function (i) { return qById[qs.items[i].id].cat === c.id; });
      if (!idxs.length) return;
      var ok = idxs.filter(function (i) { return qs.answers[i] === qById[qs.items[i].id].answer; }).length;
      var p = Math.round((ok / idxs.length) * 100);
      html += "<tr><td>" + esc(c.title) + "</td><td>" + ok + " / " + idxs.length + '</td><td style="width:40%"><div class="bar"><span style="width:' + p + '%"></span></div></td></tr>';
    });
    html += "</tbody></table></div></div>";
    html += '<div class="btn-row" style="margin-top:18px">' + (wrongIds.length ? '<button class="btn btn-primary" type="button" id="retryWrong">ทำใหม่เฉพาะข้อที่ผิด (' + wrongIds.length + ")</button>" : "") + '<button class="btn" type="button" id="newQuiz">ตั้งค่าข้อสอบใหม่</button><a class="btn" href="#/review">ไปหน้าสรุปก่อนสอบ</a></div></div>';

    html += '<section class="section"><h2>เฉลยทุกข้อ</h2><div class="chips" id="revFilter" style="margin-bottom:12px"><button type="button" class="chip active" data-f="all">ทั้งหมด</button><button type="button" class="chip" data-f="wrong">เฉพาะข้อที่ผิด / ไม่ได้ตอบ</button></div><div class="card" id="revList"></div></section>';
    view.innerHTML = html;

    function paintReview(filter) {
      document.getElementById("revList").innerHTML = qs.items.map(function (it, i) {
        var q = qById[it.id], picked = qs.answers[i];
        if (filter === "wrong" && picked === q.answer) return "";
        return '<div class="review-item"><div class="q-meta"><span>ข้อ ' + (i + 1) + "</span>" + badge("accent", catById[q.cat].short) + "</div><div class=\"q-text\" style=\"font-size:1rem\">" + fmt(q.q) + "</div>" +
          (picked != null ? '<div class="small">คำตอบของคุณ: <b>' + LETTERS[it.order.indexOf(picked)] + ".</b> " + fmt(q.choices[picked]) + "</div>" : "") + feedbackHTML(q, it, picked) + "</div>";
      }).join("") || '<p class="muted">ไม่มีข้อที่ผิด ยอดเยี่ยม!</p>';
    }
    paintReview("all");
    document.getElementById("revFilter").addEventListener("click", function (e) {
      var b = e.target.closest("[data-f]");
      if (!b) return;
      this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("active", c === b); });
      paintReview(b.getAttribute("data-f"));
    });
    var rw = document.getElementById("retryWrong");
    if (rw) rw.addEventListener("click", function () { startQuiz("practice", [], 0, wrongIds); });
    document.getElementById("newQuiz").addEventListener("click", function () { qs = null; paintSetup(); window.scrollTo(0, 0); });
  }

  // keyboard shortcuts for the quiz
  document.addEventListener("keydown", function (e) {
    if (!qs || qs.finished || lastPage !== "quiz") return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName)) return;
    var map = { "1": 0, "2": 1, "3": 2, "4": 3, a: 0, b: 1, c: 2, d: 3 };
    var k = e.key.toLowerCase();
    if (k in map && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var it = qs.items[qs.idx];
      if (!qs.revealed[qs.idx]) { e.preventDefault(); choose(it.order[map[k]]); }
    } else if (e.key === "Enter" || e.key === "ArrowRight") {
      if (instant() ? qs.revealed[qs.idx] : qs.idx < qs.items.length - 1) { e.preventDefault(); next(); }
    }
  });

  route();
})();
