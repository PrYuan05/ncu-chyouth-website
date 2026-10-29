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


/* 手機上中文照「詞」換行：在詞和詞之間插入 <wbr>，再由 CSS（html.wbr 時 word-break: keep-all）
 * 規定只能在這些位置斷行，避免「服務 ⏎ 隊」「破 ⏎ 冰」這種把一個詞拆開的情況。
 * 斷詞用瀏覽器內建的 Intl.Segmenter；單一個字會黏到隔壁的詞上，KEEP 裡的詞一定不拆。 */
CC.KEEP = ["國立中央大學彰化校友會", "國立中央大學彰友會", "國立中央大學", "營期", "中央大學", "彰化校友會", "彰友會", "返鄉服務隊", "返服", "名偵探柯南", "柯南", "新民國民小學", "新民國小",
  "彰化縣田中鎮", "田中鎮", "田中衛生所", "員榮醫院", "教育優先區", "課外活動組", "寒假育樂營", "育樂營", "營火晚會", "值星官", "司令台", "大地遊戲", "同意書", "小章",
  "新光吳氏基金會", "籌備團隊", "版權所有", "好奇心", "破冰", "解謎", "實境", "晚會", "營服", "膳費", "公輔組", "執行長", "營本部",
  "事件簿", "中央大學彰友會", "中央彰友會", "不舒服", "全螢幕", "粉絲專頁", "官方帳號", "贊助夥伴", "首兩日", "不舒服", "全螢幕", "粉絲專頁", "官方帳號", "贊助夥伴", "首兩日", "關鍵字卡", "線索", "真相", "目暮警部", "高木警官", "光彥", "灰原哀", "白馬探", "黑衣組織", "少年偵探團", "阿笠博士", "米花町"];
CC.HAN = /[㐀-鿿豈-﫿]/;
// 回傳可以換行的位置（字串索引）：只在兩個漢字中間、而且是詞和詞的交界。遊戲的注音字也用這個分詞。
CC.wordCuts = function (text) {
  if (!window.Intl || !Intl.Segmenter || !CC.HAN.test(text)) return [];
  var seg = CC._seg || (CC._seg = new Intl.Segmenter("zh-Hant", { granularity: "word" }));
  var HAN = CC.HAN, blocked = {}, keepEnd = {};
  CC.KEEP.forEach(function (w) {
    for (var at = text.indexOf(w); at !== -1; at = text.indexOf(w, at + 1)) {
      for (var k = at + 1; k < at + w.length; k++) blocked[k] = 1;
      keepEnd[at] = Math.max(keepEnd[at] || 0, at + w.length);
    }
  });
  // 「第 21 屆」「48 位」這類數字和量詞也不拆
  text.replace(/第[\s ]*(\d+|[一二三四五六七八九十兩]+)[\s ]*[屆天日條]|\d+[\s ]*(位|人|本|分鐘|天|日|年|月|號|元|張)/g, function (m) {
    var at = arguments[arguments.length - 2];
    for (var k = at + 1; k < at + m.length; k++) blocked[k] = 1;
    return m;
  });
  var toks = [];
  for (var it = seg.segment(text)[Symbol.iterator](), s = it.next(); !s.done; s = it.next()) toks.push({ a: s.value.index, b: s.value.index + s.value.segment.length });
  // KEEP 裡的詞先併成一個完整的詞，不參與下面的單字合併
  var merged = [];
  for (var q = 0; q < toks.length; q++) {
    var tk = toks[q], end = 0;
    for (var x = tk.a; x < tk.b; x++) if (keepEnd[x]) end = Math.max(end, keepEnd[x]);
    if (end) { while (q + 1 < toks.length && toks[q + 1].a < end) tk.b = toks[++q].b; tk.keep = true; }
    merged.push(tk);
  }
  toks = merged;
  // 連續的單字先併成一組（「柴|堆|旁」→「柴堆旁」）；只剩一個字的，黏到下一個詞，後面不是漢字才黏到上一個詞。
  // 「第」一律往後黏（第 21 屆）。
  function one(t) { return !t.keep && t.b - t.a === 1 && HAN.test(text[t.a]); }
  var runs = [];
  for (var i = 0; i < toks.length; i++) {
    var last = runs[runs.length - 1];
    if (one(toks[i]) && last && last.solo && last.b === toks[i].a && text[last.a] !== "第" && text[toks[i].a] !== "第") { last.b = toks[i].b; last.n++; continue; }
    runs.push({ a: toks[i].a, b: toks[i].b, solo: one(toks[i]), n: 1 });
  }
  var words = [];
  for (var r = 0; r < runs.length; r++) {
    var t = runs[r], single = t.solo && t.n === 1, next = runs[r + 1], prev = words[words.length - 1];
    if (single && next && (HAN.test(text[next.a]) || text[t.a] === "第")) { next.a = t.a; continue; }
    if (single && prev && HAN.test(text[prev.b - 1]) && text[t.a] !== "第") { prev.b = t.b; continue; }
    words.push(t);
  }
  var cuts = [];
  for (var j = 1; j < words.length; j++) {
    var p = words[j].a;
    if (HAN.test(text[p - 1]) && HAN.test(text[p]) && !blocked[p]) cuts.push(p);
  }
  return cuts;
};
CC.words = function (root) {
  if (!root || !window.Intl || !Intl.Segmenter) return;
  var done = CC._wbrDone || (CC._wbrDone = new WeakSet());
  var SKIP = "script,style,textarea,input,select,option,svg,title,code,[data-nowbr],.t-line,.zy-run";
  function ok(n) {
    if (done.has(n) || n.nodeValue.length < 5 || !CC.HAN.test(n.nodeValue)) return false;
    var el = n.parentElement;
    return !!el && !el.closest(SKIP);
  }
  var nodes = [];
  if (root.nodeType === 3) { if (ok(root)) nodes.push(root); }
  else {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { return ok(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
    while (walker.nextNode()) nodes.push(walker.currentNode);
  }
  nodes.forEach(function (n) {
    // 數字和中文之間的空白改成不換行空白，避免「48 ⏎ 位志工」
    var text = n.nodeValue.replace(/(\d)[ ]+(?=[㐀-鿿])/g, "$1 ").replace(/([㐀-鿿])[ ]+(?=\d)/g, "$1 ");
    var list = CC.wordCuts(text);
    if (!list.length) { if (text !== n.nodeValue) n.nodeValue = text; done.add(n); return; }
    var frag = document.createDocumentFragment(), last = 0;
    list.concat(text.length).forEach(function (p, k) {
      if (k) frag.appendChild(document.createElement("wbr"));
      var piece = document.createTextNode(text.slice(last, p));
      done.add(piece); frag.appendChild(piece); last = p;
    });
    if (n.parentNode) n.parentNode.replaceChild(frag, n);
  });
};
// 整頁先處理一次，之後畫面上新增的文字（遊戲、查詢結果等）也自動處理。
CC.wordsLive = function () {
  if (!window.Intl || !Intl.Segmenter || !document.body) return;
  document.documentElement.classList.add("wbr");
  CC.words(document.body);
  if (!("MutationObserver" in window)) return;
  var queue = [], timer = null;
  new MutationObserver(function (list) {
    list.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 || n.nodeType === 3) queue.push(n); }); });
    if (!timer) timer = setTimeout(function () { timer = null; queue.splice(0).forEach(function (n) { if (n.isConnected) CC.words(n); }); }, 60);
  }).observe(document.body, { childList: true, subtree: true });
};
