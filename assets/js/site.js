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
    home: ["s1", "s2", "s12", "s11", "s6", "s13", "s10"],
    parents: ["h-parents", "s9", "s3", "s4", "s5", "s10"],
    sponsor: ["h-sponsor", "s13", "s8", "s7", "s6", "s10"],
    school: ["h-school", "s3", "s4", "s5", "s7", "s13", "s10"]
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
    var k = curtain.querySelector(".k"), t = curtain.querySelector(".t"), inner = curtain.querySelector(".in");
    var ink = curtain.querySelector(".ink"), swim = curtain.querySelector(".swim"), sil = curtain.querySelector(".sil");
    var drops = curtain.querySelectorAll(".drop");
    var kText = "CASE FILE " + NAMES[role][0] + " / 04";
    t.textContent = NAMES[role][1];
    // Scale the ink until it reaches the farthest corner of the screen.
    var W = window.innerWidth, H = window.innerHeight, size = 0.4 * Math.max(W, H);
    var cx = W / 2, cy = H * 0.88 - size / 2;
    var far = Math.max(Math.hypot(cx, cy), Math.hypot(cx, H - cy));
    var cover = (2 * far / size) * 1.1;
    if (lenis) lenis.stop();
    gsap.timeline({ onComplete: function () { if (lenis) lenis.start(); } })
      .set(curtain, { autoAlpha: 1 })
      .set(inner, { autoAlpha: 0, y: 0 })
      .set(ink, { scale: 0, rotation: 0 })
      .fromTo(swim, { yPercent: 110, rotation: -8, scale: 1 }, { yPercent: -12, rotation: 6, duration: 0.42, ease: "back.out(1.6)" })
      .to(swim, { scaleY: 0.8, scaleX: 1.12, transformOrigin: "50% 100%", duration: 0.12, ease: "power2.in" })
      .addLabel("squirt")
      .to(swim, { scaleX: 1, scaleY: 1, yPercent: 130, rotation: -10, duration: 0.45, ease: "power2.in" }, "squirt")
      .to(ink, { scale: cover, rotation: 50, duration: 0.6, ease: "power3.in" }, "squirt")
      .fromTo(drops, { x: 0, y: 0, scale: 0.6, autoAlpha: 1 }, {
        x: function (i) { return [-0.32, 0.3, -0.16, 0.2][i] * W; },
        y: function (i) { return -[0.42, 0.5, 0.7, 0.62][i] * H; },
        scale: function (i) { return 1.4 + i * 0.5; }, duration: 0.5, ease: "power2.out"
      }, "squirt")
      .set(drops, { autoAlpha: 0 })
      .set(inner, { autoAlpha: 1 })
      .fromTo(sil, { scale: 0.3, autoAlpha: 0, y: 24 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.42, ease: "back.out(2)" })
      .fromTo(t, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: "power3.out" }, "<0.05")
      .to(k, { duration: 0.6, scrambleText: { text: kText, chars: "0123456789ABCDEF" } }, "<")
      .add(function () { swap(role); })
      .to(inner, { autoAlpha: 0, y: -24, duration: 0.3, ease: "power2.in" }, "+=0.15")
      .to(ink, { scale: 0, rotation: 100, duration: 0.6, ease: "power3.inOut" }, "<0.05")
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
    var xz = pre.querySelector(".xz"), flash = pre.querySelector(".flash");
    new Image().src = CC.sprite("glint");
    var n = { v: 0 };
    // 小章拿放大鏡掃過畫面，數到 100 推眼鏡、鏡片一閃。
    gsap.timeline()
      .fromTo(xz, { x: -window.innerWidth * 0.35, rotation: -12, autoAlpha: 0 }, { x: window.innerWidth * 0.12, rotation: 8, autoAlpha: 1, duration: 0.8, ease: "power2.out" })
      .to(xz, { x: 0, rotation: 0, duration: 0.55, ease: "power2.inOut" })
      .to(n, { v: 100, duration: 1.4, ease: "power2.inOut", onUpdate: function () { num.textContent = String(Math.round(n.v)).padStart(3, "0"); } }, 0)
      .to(line, { scaleX: 1, duration: 1.4, ease: "power2.inOut" }, 0)
      .add(function () { xz.src = CC.sprite("glint"); }, 1.35)
      .fromTo(flash, { opacity: 0 }, { opacity: 0.55, duration: 0.07, yoyo: true, repeat: 1 }, 1.35)
      .fromTo(xz, { scale: 1 }, { scale: 1.12, duration: 0.14, yoyo: true, repeat: 1, ease: "power2.out" }, 1.35)
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

  /* ---------- Scroll progress: 小章's tentacle on wide screens, a thin bar elsewhere ---------- */
  var tent = document.querySelector(".tentacle"), pbar = document.querySelector(".progress-top i");
  var tentMQ = window.matchMedia("(min-width: 1240px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  var tPath = null, tLine = null, tTip = null, tSuck = [], tLen = 0, tLast = 0;
  var SVGNS = "http://www.w3.org/2000/svg";
  function buildTentacle() {
    tPath = null;
    if (!tent || !tentMQ.matches) return;
    var h = tent.clientHeight;
    if (!h) return;
    var d = "M20 0";
    for (var y = 12; y <= h; y += 12) d += " L" + (20 + Math.sin(y / 70) * 7).toFixed(1) + " " + y;
    tent.innerHTML = '<svg viewBox="0 0 40 ' + h + '"><path class="o" fill="none" stroke="#7A4316" stroke-width="14" stroke-linecap="round"/>' +
      '<path class="b" fill="none" stroke="#E88B66" stroke-width="10" stroke-linecap="round"/><g></g>' +
      '<circle class="tip" r="7" fill="#E88B66" stroke="#7A4316" stroke-width="2"/></svg>';
    tLine = tent.querySelector(".o"); tPath = tent.querySelector(".b"); tTip = tent.querySelector(".tip");
    tLine.setAttribute("d", d); tPath.setAttribute("d", d);
    tLen = tPath.getTotalLength();
    tLine.style.strokeDasharray = tPath.style.strokeDasharray = tLen;
    var g = tent.querySelector("g");
    tSuck = [];
    for (var l = 36; l < tLen - 10; l += 42) {
      var pt = tPath.getPointAtLength(l), c = document.createElementNS(SVGNS, "circle");
      c.setAttribute("cx", pt.x.toFixed(1)); c.setAttribute("cy", pt.y.toFixed(1)); c.setAttribute("r", "2.6");
      c.setAttribute("fill", "#FBD3C2"); c.setAttribute("stroke", "#C9643F"); c.setAttribute("stroke-width", "1");
      c.dataset.at = l; c.style.opacity = 0;
      g.appendChild(c); tSuck.push(c);
    }
    paintProgress();
  }
  function paintProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (pbar) pbar.style.transform = "scaleX(" + p + ")";
    if (!tPath) return;
    var l = Math.max(0.5, p * tLen);
    tLine.style.strokeDashoffset = tPath.style.strokeDashoffset = tLen - l;
    var pt = tPath.getPointAtLength(l);
    tTip.setAttribute("cx", pt.x); tTip.setAttribute("cy", pt.y);
    tSuck.forEach(function (c) { c.style.opacity = +c.dataset.at < l - 6 ? 1 : 0; });
    tLast = l;
  }
  var pRaf = 0;
  window.addEventListener("scroll", function () { if (!pRaf) pRaf = requestAnimationFrame(function () { pRaf = 0; paintProgress(); }); }, { passive: true });
  window.addEventListener("resize", function () { clearTimeout(buildTentacle.t); buildTentacle.t = setTimeout(buildTentacle, 200); });
  document.addEventListener("cc:page", function () { setTimeout(paintProgress, 50); });
  buildTentacle();
  // 經過每個區塊標題時，觸手尖端「吸」一下。
  if ("IntersectionObserver" in window && !reduce) {
    var suckIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || !tTip) return;
        gsap.fromTo(tTip, { attr: { r: 7 } }, { attr: { r: 12 }, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" });
        tSuck.forEach(function (c) {
          if (Math.abs(+c.dataset.at - tLast) < 90) gsap.fromTo(c, { attr: { r: 2.6 } }, { attr: { r: 4.2 }, duration: 0.16, yoyo: true, repeat: 1 });
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll(".sec-title, .sec h1, .sec h2").forEach(function (h) { suckIO.observe(h); });
  }

  /* ---------- Back to top: 小章 gets launched upward ---------- */
  var topBtn = document.querySelector(".site-foot .top"), xzTop = document.querySelector(".xz-top");
  if (topBtn && xzTop && !reduce) {
    topBtn.addEventListener("pointerenter", function () { gsap.fromTo(xzTop, { y: 0 }, { y: -10, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" }); });
    topBtn.addEventListener("click", function () {
      gsap.killTweensOf(xzTop);
      gsap.timeline()
        .to(xzTop, { scaleY: 0.72, scaleX: 1.15, transformOrigin: "50% 100%", duration: 0.14, ease: "power2.in" })
        .to(xzTop, { scaleY: 1.12, scaleX: 0.92, y: -window.innerHeight * 0.9, rotation: -14, autoAlpha: 0, duration: 0.6, ease: "power2.in" })
        .set(xzTop, { y: 30, scale: 1, rotation: 0 })
        .to(xzTop, { y: 0, autoAlpha: 1, duration: 0.5, ease: "back.out(2)", delay: 0.8 });
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
