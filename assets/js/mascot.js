/* 平面小章（src/mascot.svg）的動作：待機時觸手慢慢擺、眨眼、偶爾拿放大鏡湊近看；眼睛跟著滑鼠。
 * 姿勢靠 <svg data-pose="..."> 切換（wave / magnify / glint / surprise / celebrate），
 * 擺動則改各部位 .xxx-a 群組的 transform，旋轉中心已經在 SVG 裡設好。 */
window.CCMascot = (function () {
  function mount(svg, opts) {
    opts = opts || {};
    var q = function (s) { return svg.querySelector(s); };
    var all = q(".all-a"), legs = q(".legs-a"), armL = q(".armL-a"), armR = q(".armR-a");
    var eyes = svg.querySelectorAll(".eye-a");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var base = opts.pose || "wave", until = 0, pop = 0;
    var aim = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    var t0 = performance.now(), clock = 0, raf = 0, onScreen = true;
    var nextIdle = 5 + Math.random() * 4;

    function set(p) { svg.setAttribute("data-pose", p); pop = 1; }
    // pose(p)：換成新的固定姿勢；pose(p, 秒)：做一下就回來。
    function pose(p, secs) {
      if (secs) { until = clock + secs; } else { base = p; until = 0; }
      set(p);
      if (reduce && secs) setTimeout(function () { if (until) { until = 0; set(base); } }, secs * 1000);
    }
    function frame(now) {
      raf = 0;
      clock = (now - t0) / 1000;
      if (until && clock > until) { until = 0; set(base); }
      if (!until && opts.idle !== false && clock > nextIdle) { pose("magnify", 1.9); nextIdle = clock + 8 + Math.random() * 5; }
      cur.x += (aim.x - cur.x) * 0.12; cur.y += (aim.y - cur.y) * 0.12;
      pop *= 0.86;
      var w = Math.sin(clock * 2.2);
      all.setAttribute("transform", "translate(0 " + (-8 * w).toFixed(1) + ") scale(" + (1 - 0.012 * w + 0.05 * pop).toFixed(3) + " " + (1 + 0.012 * w - 0.06 * pop).toFixed(3) + ")");
      legs.setAttribute("transform", "skewX(" + (Math.sin(clock * 1.7) * 2.6).toFixed(2) + ")");
      armL.setAttribute("transform", "rotate(" + (Math.sin(clock * 1.9 + 1) * 2.2).toFixed(2) + ")");
      armR.setAttribute("transform", "rotate(" + (Math.sin(clock * 1.5) * 2.2).toFixed(2) + ")");
      var blink = ((clock + 1.3) % 4.4) < 0.13 ? 0.1 : 1;
      for (var i = 0; i < eyes.length; i++) eyes[i].setAttribute("transform", "translate(" + (cur.x * 9).toFixed(1) + " " + (cur.y * 7).toFixed(1) + ") scale(1 " + blink + ")");
      if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function wake() { if (!raf && !reduce && onScreen && !document.hidden) raf = requestAnimationFrame(frame); }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; wake(); }).observe(svg);
    }
    document.addEventListener("visibilitychange", wake);
    svg.setAttribute("data-pose", base);
    wake();

    return {
      el: svg,
      pose: pose,
      // x、y 介於 -1 到 1：小章往那個方向看。
      look: function (x, y) { aim.x = Math.max(-1, Math.min(1, x)); aim.y = Math.max(-1, Math.min(1, y)); },
      glint: function () { pose("glint", 1.6); },
      investigate: function () { pose("magnify", 1.9); }
    };
  }
  return { mount: mount };
})();
