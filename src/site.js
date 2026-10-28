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
  // 一般區塊依這頁的順序輪流換底色（沙色、灰綠、淡藍），相鄰兩段一定不同色；
  // 每頁開頭、跑馬燈、合作夥伴帶有自己的底色，不參與輪替。
  var TONES = ["sand", "paper", "sage"];
  function show(role) {
    var list = PAGES[role];
    sections.forEach(function (sec) {
      var i = list.indexOf(sec.id);
      sec.hidden = i < 0;
      sec.style.order = i;
    });
    var k = 0;
    list.forEach(function (id, i) {
      var sec = document.getElementById(id);
      if (!sec || i === 0 || id === "s13" || !sec.classList.contains("sec")) return;
      sec.dataset.tone = TONES[k++ % TONES.length];
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
  // 字型晚到、圖片撐開或版面換了，頁面高度一變就重算捲動觸發點，
  // 不然釘住的區塊會用舊位置，提早蓋到主視覺上。
  if (window.ScrollTrigger) {
    var stTimer = null, lastH = 0;
    var restick = function () { clearTimeout(stTimer); stTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 120); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(restick);
    window.addEventListener("load", restick);
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () {
        var h = main.offsetHeight;
        if (Math.abs(h - lastH) > 24) { lastH = h; restick(); }
      }).observe(main);
    }
  }
  // 最後一次點擊的位置：換頁的放大鏡從這裡打開（用鍵盤或上一頁時從畫面中央）。
  var tapAt = null;
  document.addEventListener("pointerdown", function (e) { tapAt = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  function transition(role) {
    if (!hasGsap || reduce) { swap(role); return; }
    var k = curtain.querySelector(".k"), t = curtain.querySelector(".t"), inner = curtain.querySelector(".in");
    var lens = curtain.querySelector(".lens"), sil = curtain.querySelector(".sil");
    var rim = curtain.querySelector(".rim circle"), handle = curtain.querySelector(".rim line");
    var kText = "CASE FILE " + NAMES[role][0] + " / 04";
    t.textContent = NAMES[role][1];
    var W = window.innerWidth, H = window.innerHeight;
    var p = tapAt && Date.now() - tapAt.t < 1500 ? tapAt : { x: W / 2, y: H / 2 };
    function reach(x, y) { return Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y)) + 40; }
    // 鏡框跟著半徑走；把手朝右下，鏡片越大把手越粗越長。
    function lensAt(x, y, r) {
      rim.setAttribute("cx", x); rim.setAttribute("cy", y); rim.setAttribute("r", Math.max(0, r));
      var c = Math.SQRT1_2, len = 18 + r * 0.55;
      handle.setAttribute("x1", x + (r + 8) * c); handle.setAttribute("y1", y + (r + 8) * c);
      handle.setAttribute("x2", x + (r + 8 + len) * c); handle.setAttribute("y2", y + (r + 8 + len) * c);
      handle.style.strokeWidth = Math.min(40, 10 + r * 0.12);
    }
    var a = { r: 0 }, b = { r: 0 }, open = reach(p.x, p.y), hole = reach(W / 2, H / 2);
    if (lenis) lenis.stop();
    gsap.timeline({ onComplete: function () { if (lenis) lenis.start(); } })
      .set(curtain, { autoAlpha: 1, "--hole": "0px", "--hx": W / 2 + "px", "--hy": H / 2 + "px" })
      .set(inner, { autoAlpha: 0, y: 0 })
      .set(lens, { clipPath: "circle(0px at " + p.x + "px " + p.y + "px)" })
      .set(rim.parentNode, { autoAlpha: 1 })
      .set(handle, { stroke: "#121617" })
      // 1. 放大鏡在點擊處冒出來，接著鏡片一路撐滿整個畫面。
      .to(a, { r: 34, duration: 0.24, ease: "back.out(2.4)", onUpdate: function () { lensAt(p.x, p.y, a.r); lens.style.clipPath = "circle(" + a.r + "px at " + p.x + "px " + p.y + "px)"; } })
      .to(a, { r: open, duration: 0.6, ease: "power3.in", onUpdate: function () { lensAt(p.x, p.y, a.r); lens.style.clipPath = "circle(" + a.r + "px at " + p.x + "px " + p.y + "px)"; } }, "+=0.06")
      .set(rim.parentNode, { autoAlpha: 0 })
      // 2. 鏡片裡是案件檔案：黑色剪影和頁面名稱。
      .set(inner, { autoAlpha: 1 })
      .fromTo(sil, { scale: 0.3, autoAlpha: 0, y: 24 }, { scale: 1, autoAlpha: 1, y: 0, duration: 0.42, ease: "back.out(2)" }, "-=0.08")
      .fromTo(t, { yPercent: 110 }, { yPercent: 0, duration: 0.45, ease: "power3.out" }, "<0.05")
      .to(k, { duration: 0.6, scrambleText: { text: kText, chars: "0123456789ABCDEF" } }, "<")
      .add(function () { swap(role); })
      // 3. 畫面中央再開一片鏡片，透過它看到新的頁面。
      .to(inner, { autoAlpha: 0, scale: 0.92, duration: 0.28, ease: "power2.in" }, "+=0.15")
      .set(rim.parentNode, { autoAlpha: 1 })
      .set(handle, { stroke: "#F58027" })
      .to(b, { r: hole, duration: 0.7, ease: "power3.inOut", onUpdate: function () { lensAt(W / 2, H / 2, b.r); curtain.style.setProperty("--hole", b.r + "px"); } }, "-=0.05")
      .set(curtain, { autoAlpha: 0 })
      .set(inner, { scale: 1 });
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

  /* ---------- Status: camp countdown and consent deadline ---------- */
  var CAMP = Date.UTC(2027, 0, 27) / 864e5; // 營期第一天（台灣日期）
  var FORM_DUE = Date.UTC(2027, 0, 15) / 864e5;
  var dday = document.querySelector("[data-dday]");
  var formTag = document.querySelector(".status .form");
  function tick() {
    var now = new Date();
    var tw = new Date(now.getTime() + 8 * 36e5);
    var day = Math.floor(tw.getTime() / 864e5);
    var diff = CAMP - day;
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
      // 從放大鏡的位置開洞，一路撐滿畫面。
      .add(function () {
        var r = xz.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
        var x = r.left + r.width * 0.86, y = r.top + r.height * 0.33;
        var far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
        pre.classList.add("is-opening");
        gsap.set(pre, { "--hx": x + "px", "--hy": y + "px", "--hole": "0px" });
        gsap.to(pre, { "--hole": far + 20 + "px", duration: 0.85, ease: "power3.in", onComplete: endIntro });
        CC.releaseIntro();
      }, "+=0.3");
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

  /* ---------- Scroll progress: a thin bar under the header ---------- */
  var pwrap = document.querySelector(".progress-top"), pbar = pwrap && pwrap.querySelector("i");
  var ptag = pwrap && pwrap.querySelector(".ptag"), pnum = ptag && ptag.querySelector("span"), pIdle = 0;
  function paintProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (pbar) pbar.style.transform = "scaleX(" + p + ")";
    if (ptag) {
      // 標籤貼著進度條的前端，但不超出畫面左右。
      pnum.textContent = Math.round(p * 100);
      var w = ptag.offsetWidth, x = Math.min(window.innerWidth - w - 8, Math.max(8, p * window.innerWidth - w / 2));
      ptag.style.transform = "translateX(" + x + "px)";
    }
  }
  var pRaf = 0;
  window.addEventListener("scroll", function () {
    if (!pRaf) pRaf = requestAnimationFrame(function () { pRaf = 0; paintProgress(); });
    if (pwrap) { pwrap.classList.add("is-on"); clearTimeout(pIdle); pIdle = setTimeout(function () { pwrap.classList.remove("is-on"); }, 1200); }
  }, { passive: true });
  document.addEventListener("cc:page", function () { setTimeout(paintProgress, 50); });
  paintProgress();

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

  /* ---------- 頁尾：線索貼紙從上面掉下來，可以用滑鼠抓起來丟（只有桌機） ---------- */
  var play = document.querySelector(".foot-play");
  if (play && finePointer && !reduce && window.CC_LIBS && window.matchMedia("(min-width: 1024px)").matches) {
    html.classList.add("has-play");
    var CLUES = [["木柴", "o"], ["營火", "y"], ["腳印 26cm", "m"], ["鈴鐺", ""], ["炭火", "o"], ["月亮", "b"], ["真相只有一個！", "y"], ["戲服", ""],
      ["麥克風", "b"], ["1/28 19:00", "m"], ["新民國小", ""], ["放大鏡", "o"], ["預告信", "b"], ["CASE 21", "m"], ["小章", "y"]];
    CC.onView(play, function () {
      if (window.Matter) { dropClues(); return; }
      var tag = document.createElement("script");
      tag.src = window.CC_LIBS.matter; tag.onload = dropClues;
      document.head.appendChild(tag);
    }, 0.4);
  }
  function dropClues() {
    var M = window.Matter;
    if (!M) return;
    var W = play.clientWidth, H = play.clientHeight;
    var engine = M.Engine.create(), world = engine.world;
    var wall = { isStatic: true };
    var floor = M.Bodies.rectangle(W / 2, H + 40, W * 3, 80, wall);
    var left = M.Bodies.rectangle(-40, -H, 80, H * 4, wall), right = M.Bodies.rectangle(W + 40, -H, 80, H * 4, wall);
    M.Composite.add(world, [floor, left, right]);
    var items = CLUES.map(function (c, i) {
      var el = document.createElement("span");
      el.className = "clue-tag " + c[1];
      el.textContent = c[0];
      play.appendChild(el);
      var w = el.offsetWidth, h = el.offsetHeight;
      var body = M.Bodies.rectangle(W * (0.1 + 0.8 * Math.random()), -60 - i * 55, w, h, {
        chamfer: { radius: h / 2 - 1 }, angle: (Math.random() - 0.5) * 0.8, restitution: 0.3, friction: 0.5, frictionAir: 0.012
      });
      return { el: el, body: body, w: w, h: h };
    });
    M.Composite.add(world, items.map(function (it) { return it.body; }));
    // 滑鼠可以抓貼紙；Matter 預設會吃掉滾輪和觸控，拿掉才不會擋住捲動頁面。
    var mouse = M.Mouse.create(play);
    ["wheel", "touchmove", "touchstart", "touchend"].forEach(function (n) {
      play.removeEventListener(n, n === "wheel" ? mouse.mousewheel : n === "touchmove" ? mouse.mousemove : n === "touchstart" ? mouse.mousedown : mouse.mouseup);
    });
    window.addEventListener("mouseup", mouse.mouseup);
    M.Composite.add(world, M.MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.18, damping: 0.1 } }));
    function step() {
      M.Engine.update(engine, 1000 / 60);
      for (var i = 0; i < items.length; i++) {
        var it = items[i], p = it.body.position;
        it.el.style.transform = "translate(" + (p.x - it.w / 2).toFixed(1) + "px," + (p.y - it.h / 2).toFixed(1) + "px) rotate(" + it.body.angle.toFixed(3) + "rad)";
      }
    }
    var on = false;
    function run(yes) { if (yes === on) return; on = yes; if (yes) gsap.ticker.add(step); else gsap.ticker.remove(step); }
    new IntersectionObserver(function (es) { run(es[0].isIntersecting); }).observe(play);
    run(true);
    window.addEventListener("resize", function () {
      W = play.clientWidth;
      M.Body.setPosition(floor, { x: W / 2, y: H + 40 });
      M.Body.setPosition(right, { x: W + 40, y: -H });
    });
  }

  /* ---------- 區塊標題：一行一行從遮罩裡升上來 ---------- */
  if (!reduce && window.SplitText && "IntersectionObserver" in window) {
    var titles = document.querySelectorAll(".sec-title");
    html.classList.add("t-reveal");
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        tio.unobserve(e.target);
        var el = e.target;
        // 進到畫面才切行（隱藏的頁面量不到行寬）。
        var split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "t-line" });
        el.classList.add("is-in");
        gsap.from(split.lines, { yPercent: 110, duration: 0.9, stagger: 0.12, ease: "power4.out", onComplete: function () { split.revert(); } });
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    titles.forEach(function (t) { tio.observe(t); });
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
