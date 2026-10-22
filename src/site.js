/* Site shell behaviour: smooth scroll, page routing with a curtain, live status,
 * custom cursor, click ripple, magnetic buttons and decoding labels. */
(function () {
  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = !!window.gsap;
  CC.register();

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (hasGsap && !reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function headerH() { return document.querySelector(".site-head").offsetHeight; }
  CC.scrollTo = function (target, immediate) {
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (lenis) {
      lenis.scrollTo(el == null ? 0 : el, { offset: typeof el === "number" ? 0 : -headerH(), immediate: !!immediate, force: true, duration: 1.2 });
      return;
    }
    var y = typeof el === "number" ? el : el ? el.getBoundingClientRect().top + window.scrollY - headerH() : 0;
    window.scrollTo({ top: y, behavior: immediate || reduce ? "auto" : "smooth" });
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-scroll]");
    if (!a) return;
    e.preventDefault();
    var sel = a.getAttribute("data-scroll") || a.getAttribute("href");
    CC.scrollTo(sel === "top" ? 0 : sel);
    var el = sel !== "top" && document.querySelector(sel);
    if (el && el.hasAttribute("tabindex")) el.focus({ preventScroll: true });
  });

  /* ---------- Pages ---------- */
  var PAGES = {
    home: ["s1", "s2", "s12", "s11", "s6", "s10"],
    parents: ["h-parents", "s9", "s3", "s4", "s5", "s10"],
    sponsor: ["h-sponsor", "s8", "s7", "s6", "s10"],
    school: ["h-school", "s3", "s4", "s5", "s7", "s10"]
  };
  var NAMES = { home: ["01", "首頁"], parents: ["02", "家長專區"], sponsor: ["03", "企業夥伴專區"], school: ["04", "校方專區"] };
  var SITE_TITLE = "2027 中央大學彰友會第21屆返鄉服務隊";
  var main = document.querySelector(".pages");
  var sections = Array.prototype.slice.call(main.children).filter(function (n) { return n.tagName === "SECTION"; });
  var navLinks = document.querySelectorAll(".site-nav [data-role]");
  var curtain = document.querySelector(".curtain");
  var current = null;

  // 網址 # 後面是頁面名稱就換頁；是區塊 id（例如 #s10）就不理會。
  function roleFromHash() {
    var h = location.hash.slice(1);
    if (!h || h === "top") return "home";
    for (var r in CC.PAGES) if (CC.PAGES[r] && CC.PAGES[r] === h) return r;
    return null;
  }
  function show(role) {
    var list = PAGES[role];
    sections.forEach(function (sec) {
      var i = list.indexOf(sec.id);
      sec.hidden = i < 0;
      sec.style.order = i;
    });
    navLinks.forEach(function (a) {
      if (a.dataset.role === role) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.title = role === "home" ? SITE_TITLE : NAMES[role][1] + "｜" + SITE_TITLE;
    current = role;
  }
  function swap(role) {
    show(role);
    CC.scrollTo(0, true);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    main.focus({ preventScroll: true });
    document.dispatchEvent(new CustomEvent("cc:page", { detail: role }));
  }
  function transition(role) {
    if (!hasGsap || reduce) { swap(role); return; }
    var k = curtain.querySelector(".k"), t = curtain.querySelector(".t");
    var kText = "CASE FILE " + NAMES[role][0] + " / 04";
    t.textContent = NAMES[role][1];
    if (lenis) lenis.stop();
    gsap.timeline({ onComplete: function () { if (lenis) lenis.start(); } })
      .set(curtain, { autoAlpha: 1, yPercent: 100 })
      .to(curtain, { yPercent: 0, duration: 0.5, ease: "power3.inOut" })
      .fromTo(t, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: "power3.out" }, "-=0.2")
      .to(k, { duration: 0.6, scrambleText: { text: kText, chars: "0123456789ABCDEF" } }, "<")
      .add(function () { swap(role); })
      .to(curtain, { yPercent: -100, duration: 0.55, ease: "power3.inOut" }, "+=0.15")
      .set(curtain, { autoAlpha: 0 });
  }
  CC.go = function (role) {
    if (role === current) { CC.scrollTo(0); return; }
    var h = CC.PAGES[role];
    try { history.pushState(null, "", h ? "#" + h : location.pathname + location.search); } catch (err) { /* sandboxed preview */ }
    transition(role);
  };
  function onUrl() { var r = roleFromHash(); if (r && r !== current) transition(r); }
  window.addEventListener("popstate", onUrl);
  window.addEventListener("hashchange", onUrl);
  CC.roleLinks(document.querySelector(".site-head"));
  show(roleFromHash() || "home");

  /* ---------- Live status: Taipei time and camp countdown ---------- */
  var CAMP = Date.UTC(2027, 0, 27) / 864e5; // 營期第一天（台灣日期）
  var FORM_DUE = Date.UTC(2027, 0, 15) / 864e5;
  var clock = document.querySelector("[data-clock]");
  var dday = document.querySelector("[data-dday]");
  var formTag = document.querySelector(".status .form");
  function tick() {
    var now = new Date();
    var tw = new Date(now.getTime() + 8 * 36e5);
    var day = Math.floor(tw.getTime() / 864e5);
    var diff = CAMP - day;
    if (clock) clock.textContent = tw.toISOString().slice(11, 19);
    if (dday) dday.textContent = diff > 0 ? "D-" + diff : diff > -3 ? "營期 DAY " + (1 - diff) : "第 21 屆圓滿結束";
    if (formTag) formTag.hidden = day > FORM_DUE;
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- First-visit preloader ---------- */
  var pre = document.querySelector(".preloader");
  function endIntro() {
    html.classList.remove("intro");
    try { sessionStorage.setItem("cc-intro", "1"); } catch (err) { /* storage blocked */ }
    if (lenis) lenis.start();
    CC.releaseIntro();
  }
  if (pre && html.classList.contains("intro") && hasGsap && !reduce) {
    if (lenis) lenis.stop();
    var num = pre.querySelector(".num"), say = pre.querySelector(".say"), line = pre.querySelector(".line i");
    var n = { v: 0 };
    gsap.timeline()
      .from(pre.querySelector(".lens"), { rotation: -40, scale: 0.6, autoAlpha: 0, duration: 0.6, ease: "back.out(2)" })
      .to(n, { v: 100, duration: 1.4, ease: "power2.inOut", onUpdate: function () { num.textContent = String(Math.round(n.v)).padStart(3, "0"); } }, 0)
      .to(line, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, 0)
      .to(say, { duration: 0.7, scrambleText: { text: "真相只有一個", chars: "調查中線索證據推理密碼" } }, 1.0)
      .add(function () { CC.releaseIntro(); }, "+=0.3")
      .to(pre, { yPercent: -100, duration: 0.75, ease: "power3.inOut" }, "<")
      .add(endIntro);
  } else {
    endIntro();
  }

  if (!hasGsap) return;

  /* ---------- Click ripple (all pointers) ---------- */
  if (!reduce) {
    document.addEventListener("pointerdown", function (e) {
      var r = document.createElement("span");
      r.className = "ripple";
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      gsap.fromTo(r, { scale: 0.2, autoAlpha: 0.9 }, { scale: 1.3, autoAlpha: 0, duration: 0.6, ease: "power2.out", onComplete: function () { r.remove(); } });
    });
  }

  /* ---------- Custom cursor with labels ---------- */
  if (finePointer && !reduce) {
    var cur = document.querySelector(".cursor");
    var dot = cur.querySelector(".dot"), ring = cur.querySelector(".ring"), label = cur.querySelector(".label");
    html.classList.add("has-cursor");
    gsap.set([dot, ring, label], { x: -100, y: -100 });
    var dx = gsap.quickTo(dot, "x", { duration: 0.06 }), dy = gsap.quickTo(dot, "y", { duration: 0.06 });
    var rx = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" }), ry = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });
    var lx = gsap.quickTo(label, "x", { duration: 0.25, ease: "power3" }), ly = gsap.quickTo(label, "y", { duration: 0.25, ease: "power3" });
    var INTERACTIVE = "a, button, [role='tab'], summary, label, input, textarea, select";
    var state = "";
    var ringScale = 1;
    function setState(el) {
      var hit = el && el.closest ? el : null;
      var next = "", text = "";
      if (hit && hit.closest(INTERACTIVE)) next = "hover";
      else if (hit && hit.closest("[data-cursor]")) { next = "label"; text = hit.closest("[data-cursor]").dataset.cursor; }
      if (next === state && text === label.textContent) return;
      state = next;
      if (text) label.textContent = text;
      ringScale = next === "hover" ? 1.7 : next === "label" ? 1.25 : 1;
      gsap.to(ring, { scale: ringScale, duration: 0.3, ease: "power3.out" });
      gsap.to(dot, { scale: next === "hover" ? 0 : 1, duration: 0.2 });
      gsap.to(label, { autoAlpha: next === "label" ? 0.6 : 0, duration: 0.25 });
    }
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      html.classList.remove("cursor-hidden");
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); lx(e.clientX); ly(e.clientY);
    });
    document.addEventListener("pointerover", function (e) { setState(e.target); });
    document.documentElement.addEventListener("mouseleave", function () { html.classList.add("cursor-hidden"); });
    window.addEventListener("pointerdown", function () { gsap.to(ring, { scale: ringScale * 0.7, duration: 0.12, ease: "power2.out" }); });
    window.addEventListener("pointerup", function () { gsap.to(ring, { scale: ringScale, duration: 0.4, ease: "back.out(3)" }); });

    // 區塊加上 data-cursor-href：點區塊空白處就捲到該段（例如「關於我們」→ 聯絡我們）
    document.addEventListener("click", function (e) {
      var zone = e.target.closest("[data-cursor-href]");
      if (!zone || e.target.closest(INTERACTIVE)) return;
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      CC.scrollTo(zone.dataset.cursorHref);
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduce) {
    document.querySelectorAll(".btn:not([aria-disabled='true'])").forEach(function (btn) {
      btn.classList.add("is-magnet");
      var xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
      var yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        xTo(((e.clientX - r.left) / r.width - 0.5) * 16);
        yTo(((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      btn.addEventListener("pointerleave", function () {
        xTo(0); yTo(0);
        gsap.to(btn, { scale: 1, duration: 0.3 });
      });
      btn.addEventListener("pointerdown", function () { gsap.to(btn, { scale: 0.95, duration: 0.1 }); });
      btn.addEventListener("pointerup", function () { gsap.to(btn, { scale: 1, duration: 0.4, ease: "back.out(3)" }); });
    });
  }

  /* ---------- Decoding labels ---------- */
  if (!reduce && window.ScrambleTextPlugin) {
    var DECODE = ".kicker, .who small, #s2 .value .no, #s6 .file .no, #s6 .album-head p, #s8 h3 .mono, [data-decode]";
    document.querySelectorAll(DECODE).forEach(function (el) {
      var text = el.textContent;
      CC.onView(el, function () {
        gsap.to(el, { duration: 1.1, scrambleText: { text: text, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", revealDelay: 0.35, speed: 0.6 } });
      }, 1);
    });
  }
})();
