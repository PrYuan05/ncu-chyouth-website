/* Shared helpers used by every section's own script. */
window.CC = window.CC || {
  onView: function (el, fn, threshold) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); fn(); }
      });
    }, { threshold: threshold == null ? 0.2 : threshold });
    io.observe(el);
  },
  // Plugins must register once <body> exists, so sections call this from their own script.
  register: function () {
    if (!window.gsap) return;
    ["Flip", "SplitText", "ScrollTrigger", "ScrambleTextPlugin", "Draggable", "InertiaPlugin"].forEach(function (n) { if (window[n]) gsap.registerPlugin(window[n]); });
  },
  // 網址上的頁面名稱：首頁沒有，其餘是 #parents、#partners、#school。
  PAGES: { home: "", parents: "parents", sponsor: "partners", school: "school" },
  // [data-role] 連結交給 site.js 的換頁轉場處理。
  roleLinks: function (root) {
    root.querySelectorAll("[data-role]").forEach(function (a) {
      var role = a.dataset.role;
      a.href = "#" + (CC.PAGES[role] || "top");
      a.addEventListener("click", function (e) {
        if (!CC.go) return;
        e.preventDefault();
        CC.go(role);
      });
    });
  },
  // 開場動畫結束後才執行（主視覺的進場動畫用）。
  _intro: [],
  introDone: false,
  intro: function (fn) { if (CC.introDone) fn(); else CC._intro.push(fn); },
  releaseIntro: function () {
    if (CC.introDone) return;
    CC.introDone = true;
    CC._intro.splice(0).forEach(function (fn) { fn(); });
  },
  // 圖檔路徑（單檔預覽版會換成內嵌圖）。
  asset: function (path) { return (window.CC_ASSETS && window.CC_ASSETS[path]) || "assets/" + path; },
  sprite: function (pose) { return CC.asset("mascot/xiaozhang-" + (pose || "wave") + ".webp"); },
  // 3D 小章：模組載入後掛到 el 上；瀏覽器不支援 WebGL 時改放靜態圖。
  mascot: function (el, opts, cb) {
    var done = false;
    function fallback() {
      if (done) return; done = true;
      var img = new Image();
      img.src = CC.sprite(opts && opts.pose); img.alt = ""; img.className = "xz-still";
      el.appendChild(img);
      if (cb) cb(null);
    }
    function go() {
      if (done) return; done = true;
      try { var api = window.CCMascot.mount(el, opts || {}); if (cb) cb(api); }
      catch (err) { done = false; fallback(); }
    }
    var gl = false;
    try { var c = document.createElement("canvas"); gl = !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (err) { /* no WebGL */ }
    if (!gl) { fallback(); return; }
    if (window.CCMascot) go();
    else { window.addEventListener("cc:mascot", go, { once: true }); setTimeout(fallback, 8000); }
  },
  // Runs fn only when motion is allowed; returns true if gsap is present.
  motion: function (fn) {
    if (!window.gsap) return false;
    var mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", fn);
    return true;
  }
};
