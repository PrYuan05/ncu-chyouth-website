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
  // Runs fn only when motion is allowed; returns true if gsap is present.
  motion: function (fn) {
    if (!window.gsap) return false;
    var mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", fn);
    return true;
  }
};
