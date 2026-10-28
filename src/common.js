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
  sprite: function (pose) { return CC.asset("mascot/xiaozhang-" + (pose || "wave") + ".svg"); },
  // 平面小章：把頁面裡的 <svg class="xz-svg"> 交給 mascot.js 讓它動起來。
  mascot: function (svg, opts) { return svg && window.CCMascot ? window.CCMascot.mount(svg, opts) : null; },
  // Taste 旋鈕（1–10）：layout 版面變化、motion 動態強度、density 資訊密度。
  // layout 8 以上由 build.py 在 <html> 加 class="l-bold"，套用 site.css 最後一段的不對稱版面（只有桌機）。
  // density 6 以上加 class="d-dense"，區塊上下間距收緊一點。
  // motion 分級：6 以上有常駐小動態（遊戲按鈕漂浮）；7 以上有捲動故事（釘住區塊、橫向滑動、相簿）；
  // 8 以上再加主視覺視差和跑馬燈隨捲動變速變斜；9 以上按鈕磁吸；10 再加卡片立體傾斜和區塊標題捲動視差。
  TASTE: { layout: 8, motion: 10, density: 6 },
  // 被嵌進會自動撐高的 iframe（例如某些預覽器）時，視窗高度會等於整頁高度、頁面不會捲動，
  // 這時捲動連動的效果會卡在錯的位置，所以一律關掉。
  embedded: function () { return window.innerHeight > (window.screen && screen.height ? screen.height : 1200) * 1.5; },
  motionAt: function (n) { return CC.TASTE.motion >= n && !CC.embedded(); },
  rich: function () { return CC.motionAt(7); },
  // Runs fn only when motion is allowed; returns true if gsap is present.
  motion: function (fn) {
    if (!window.gsap) return false;
    var mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", fn);
    return true;
  }
};

// 單檔預覽版會拿掉 <html> 標籤上的 class，這裡再補一次。
if (CC.TASTE.layout >= 8) document.documentElement.classList.add("l-bold");
if (CC.TASTE.density >= 6) document.documentElement.classList.add("d-dense");
