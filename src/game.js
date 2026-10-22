/* 解謎遊戲：小章事件簿「消失的營火晚會」。題目在 game-data.js，進度存在瀏覽器裡。 */
(function () {
  var DATA = window.CC_GAME;
  var root = document.getElementById("game");
  var fab = document.querySelector(".game-fab");
  if (!DATA || !root || !fab) return;

  var KEY = "cc-game-v1";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gs = !!window.gsap && !reduce;
  var map = root.querySelector(".g-map"), board = root.querySelector(".g-board"), cols = root.querySelector(".g-cols");
  var strings = root.querySelector(".g-strings"), truth = root.querySelector(".g-truth");
  var card = root.querySelector(".g-card"), panel = root.querySelector(".g-panel");
  var avatar = root.querySelector(".g-avatar"), status = root.querySelector("[data-game-status]");
  var count = root.querySelector(".g-count b"), pct = root.querySelector(".g-pct");
  var lastFocus = null, avatarAt = null, lastSpot = null;

  var spots = {};
  DATA.zones.forEach(function (z) { z.spots.forEach(function (s) { s.zone = z; spots[s.id] = s; }); });

  /* ---------- Progress ---------- */
  function fresh() { return { got: {}, spot: {}, zone: {}, final: false, name: "", seen: false }; }
  var st = fresh();
  try { st = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* storage blocked */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } }
  function got(id) { return st.got[id] || 0; }
  function cards() { var n = 0; for (var k in st.got) n += st.got[k]; return n; }
  function zoneReady(z) { return z.spots.every(function (s) { return st.spot[s.id]; }); }
  function allZones() { return DATA.zones.every(function (z) { return st.zone[z.id]; }); }
  function answerOf(o) { return o.options[o.answer]; }

  /* ---------- Map and board ---------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderMap() {
    map.querySelectorAll(".g-zone, .g-final").forEach(function (n) { n.remove(); });
    var no = 0;
    DATA.zones.forEach(function (z) {
      var zone = el("div", "g-zone"); zone.dataset.zone = z.id;
      var h = el("h3", null, z.name); h.appendChild(el("small", null, z.tag));
      if (st.zone[z.id]) h.appendChild(el("span", "g-solved", "✓ " + answerOf(z.big)));
      zone.appendChild(h);
      var list = el("div", "g-spots");
      z.spots.forEach(function (s) {
        no++;
        var b = el("button", "g-spot" + (st.spot[s.id] ? " is-done" : "")); b.type = "button"; b.dataset.spot = s.id;
        b.appendChild(el("span", "n", String(no)));
        var name = el("span", null, s.name);
        if (st.spot[s.id]) name.appendChild(el("b", null, "→ " + answerOf(s.deduce)));
        b.appendChild(name);
        var pips = el("span", "pips"); pips.setAttribute("aria-hidden", "true");
        for (var i = 0; i < 3; i++) pips.appendChild(el("i", i < got(s.id) ? "on" : ""));
        b.appendChild(pips);
        b.setAttribute("aria-label", s.name + "，已找到 " + got(s.id) + " / 3 張關鍵字卡" + (st.spot[s.id] ? "，已推理出" + answerOf(s.deduce) : ""));
        b.addEventListener("click", function () { goSpot(s, b); });
        list.appendChild(b);
      });
      zone.appendChild(list);
      if (zoneReady(z) && !st.zone[z.id]) {
        var big = el("button", "g-btn is-main g-bigbtn", "推理「" + z.name + "」消失的大東西"); big.type = "button";
        big.addEventListener("click", function () { ask("big", z); });
        zone.appendChild(big);
      }
      map.appendChild(zone);
    });
    var fin = el("button", "g-btn is-main g-final", st.final ? "再看一次破案認證" : "說出真相：真相只有一個！"); fin.type = "button";
    fin.disabled = !allZones();
    fin.addEventListener("click", function () { if (st.final) certificate(); else ask("final"); });
    map.appendChild(fin);
  }

  function renderBoard() {
    cols.innerHTML = "";
    DATA.zones.forEach(function (z) {
      var col = el("div", "g-col"); col.dataset.zone = z.id;
      var head = el("p", st.zone[z.id] ? "on" : "", st.zone[z.id] ? answerOf(z.big) : z.name + "：？");
      head.dataset.node = "zone-" + z.id;
      col.appendChild(head);
      z.spots.forEach(function (s) {
        var grp = el("div", "g-grp");
        var lab = el("span", "lab" + (st.spot[s.id] ? " on" : ""), st.spot[s.id] ? answerOf(s.deduce) : "？");
        lab.dataset.node = "spot-" + s.id;
        grp.appendChild(lab);
        var slots = el("div", "g-slots");
        s.clues.forEach(function (c, i) {
          var on = i < got(s.id);
          var slot = el("span", "g-slot" + (on ? " on" : ""), on ? c.card : "?");
          slot.dataset.node = "card-" + s.id + "-" + i;
          slots.appendChild(slot);
        });
        grp.appendChild(slots);
        col.appendChild(grp);
      });
      cols.appendChild(col);
    });
    truth.className = "g-truth" + (st.final ? " on" : "");
    truth.textContent = "真相只有一個：" + (st.final ? answerOf(DATA.final) : "？？？？");
    truth.dataset.node = "truth";
    var n = cards();
    count.textContent = n;
    var steps = n + Object.keys(st.spot).length + Object.keys(st.zone).length + (st.final ? 1 : 0);
    pct.textContent = Math.round(steps / 40 * 100) + "%";
    requestAnimationFrame(drawStrings);
  }

  // Red strings from cards to what they prove, like a detective's pin board.
  function drawStrings() {
    var box = board.getBoundingClientRect();
    strings.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
    function pt(node, edge) {
      var r = board.querySelector('[data-node="' + node + '"]');
      if (!r) return null;
      r = r.getBoundingClientRect();
      return [r.left - box.left + r.width / 2, edge === "top" ? r.top - box.top : r.bottom - box.top];
    }
    var d = "";
    function link(a, b) {
      if (!a || !b) return;
      var mid = (a[1] + b[1]) / 2 + 10;
      d += "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " Q" + ((a[0] + b[0]) / 2).toFixed(1) + " " + mid.toFixed(1) + " " + b[0].toFixed(1) + " " + b[1].toFixed(1) + " ";
    }
    DATA.zones.forEach(function (z) {
      z.spots.forEach(function (s) {
        if (st.spot[s.id]) for (var i = 0; i < 3; i++) link(pt("spot-" + s.id, "bottom"), pt("card-" + s.id + "-" + i, "top"));
        if (st.zone[z.id]) link(pt("zone-" + z.id, "bottom"), pt("spot-" + s.id, "top"));
      });
      if (st.final) link(pt("zone-" + z.id, "bottom"), pt("truth", "top"));
    });
    strings.innerHTML = d ? '<path d="' + d + '"/>' : "";
  }

  function refresh() { renderMap(); renderBoard(); }

  /* ---------- 小章 swims to the clicked spot ---------- */
  function goSpot(s, btn) {
    lastSpot = s.id;
    var m = map.getBoundingClientRect(), b = btn.getBoundingClientRect();
    var x = b.right - m.left - 70, y = b.top - m.top - 52;
    avatar.src = CC.sprite("magnify");
    if (gs) {
      var from = avatarAt || { x: x, y: y - 80 };
      gsap.timeline({ onComplete: function () { ask("clue", s); } })
        .fromTo(avatar, { x: from.x, y: from.y }, { x: x, y: y, duration: 0.55, ease: "sine.inOut" })
        .fromTo(avatar, { rotation: -8 }, { rotation: 8, duration: 0.14, yoyo: true, repeat: 3, ease: "sine.inOut" }, 0);
    } else {
      avatar.style.transform = "translate(" + x + "px," + y + "px)";
      ask("clue", s);
    }
    avatarAt = { x: x, y: y };
  }

  /* ---------- Question card ---------- */
  function openCard() {
    card.hidden = false;
    if (gs) gsap.fromTo(panel, { y: 30, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(1.8)" });
  }
  function closeCard() {
    card.hidden = true;
    panel.innerHTML = "";
    refresh();
    // 焦點回到剛才調查的地點（或右上角的關閉鈕），鍵盤才不會掉到頁面後面。
    var back = (lastSpot && map.querySelector('[data-spot="' + lastSpot + '"]')) || root.querySelector(".g-head .g-close");
    if (back && !root.hidden) back.focus();
  }
  function head(pose, step, q) {
    panel.innerHTML = "";
    var x = el("button", "g-close g-x", "×"); x.type = "button"; x.setAttribute("aria-label", "關閉題目");
    x.addEventListener("click", closeCard);
    panel.appendChild(x);
    var img = new Image(); img.className = "xz"; img.alt = ""; img.src = CC.sprite(pose);
    panel.appendChild(img);
    panel.appendChild(el("p", "g-step", step));
    var qq = el("p", "g-q", q); qq.id = "g-q";
    panel.appendChild(qq);
    return img;
  }

  // kind: "clue" (one spot's next pun), "big" (a zone), "final"
  var seq = 0;
  function ask(kind, target) {
    var item, step, onRight, my = ++seq;
    // 答對後的下一步會晚一點才跑；玩家若已關掉或換了題目就不跑。
    function later(fn, ms) { setTimeout(function () { if (my === seq && !card.hidden) fn(); }, ms); }
    if (kind === "clue") {
      var s = target, i = got(s.id);
      if (i >= 3) {
        if (st.spot[s.id]) { done(s); return; }
        item = s.deduce; step = "小推理 · " + s.name;
        onRight = function () { st.spot[s.id] = true; save(); say("推理成功：" + answerOf(item)); later(closeCard, 900); };
      } else {
        item = s.clues[i]; step = "線索 " + (i + 1) + " / 3 · " + s.zone.name + " · " + s.name;
        onRight = function () {
          st.got[s.id] = i + 1; save();
          say("拿到關鍵字卡：" + item.card);
          renderBoard();
          var slot = board.querySelector('[data-node="card-' + s.id + '-' + i + '"]');
          if (slot && gs) gsap.fromTo(slot, { scale: 1.6, rotation: -12 }, { scale: 1, rotation: -1.5, duration: 0.5, ease: "back.out(2.5)" });
          later(function () { ask("clue", s); }, 900);
        };
      }
    } else if (kind === "big") {
      item = target.big; step = "大推理 · " + target.name;
      onRight = function () { st.zone[target.id] = true; save(); say(target.name + "破案：" + answerOf(item)); later(closeCard, 1000); };
    } else {
      item = DATA.final; step = "最終推理 · 真相只有一個";
      onRight = function () { st.final = true; save(); renderBoard(); later(reveal, 700); };
    }
    var img = head(kind === "clue" && item !== target.deduce ? "magnify" : "glint", step, item.q);
    var hint = el("p", "g-hint"); hint.setAttribute("aria-live", "polite");
    var opts = el("div", "g-opts"); opts.setAttribute("role", "group"); opts.setAttribute("aria-labelledby", "g-q");
    item.options.forEach(function (o, k) {
      var b = el("button", "g-opt", o); b.type = "button";
      b.addEventListener("click", function () {
        if (opts.dataset.locked) return;
        if (k === item.answer) {
          opts.dataset.locked = "1";
          b.classList.add("is-right");
          img.src = CC.sprite("celebrate");
          hint.textContent = "答對了！";
          if (gs) gsap.fromTo(img, { y: 0 }, { y: -14, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
          onRight();
        } else {
          b.classList.add("is-wrong"); b.disabled = true;
          img.src = CC.sprite("surprise");
          hint.textContent = "小章：" + (item.hint || "再想想看，把題目念快一點試試！");
          if (gs) gsap.fromTo(b, { x: 0 }, { keyframes: { x: [-8, 8, -5, 5, 0] }, duration: 0.4 });
        }
      });
      opts.appendChild(b);
    });
    panel.appendChild(opts);
    panel.appendChild(hint);
    openCard();
    var first = opts.querySelector(".g-opt");
    if (first) first.focus();
  }

  function done(s) {
    head("glint", s.zone.name + " · " + s.name, "這裡已經破案了：三張關鍵字卡指向「" + answerOf(s.deduce) + "」。");
    var row = el("div", "g-row");
    var ok = el("button", "g-btn is-main", "去下一個地點"); ok.type = "button"; ok.addEventListener("click", closeCard);
    row.appendChild(ok); panel.appendChild(row);
    openCard(); ok.focus();
  }

  function say(text) { status.textContent = text; }

  /* ---------- Ending: confetti, reveal, certificate ---------- */
  function confetti() {
    if (!gs) return;
    var box = el("div", "g-confetti");
    var colors = ["#F58027", "#D69E2E", "#5E97DE", "#EF4444", "#22C55E", "#FFFBEB"];
    for (var i = 0; i < 70; i++) {
      var c = el("i"); c.style.left = Math.random() * 100 + "%"; c.style.background = colors[i % colors.length];
      box.appendChild(c);
      gsap.to(c, { y: window.innerHeight + 40, x: (Math.random() - 0.5) * 200, rotation: Math.random() * 720, duration: 1.8 + Math.random() * 1.4, delay: Math.random() * 0.5, ease: "power1.in" });
    }
    root.appendChild(box);
    setTimeout(function () { box.remove(); }, 4000);
  }
  function reveal() {
    confetti();
    head("celebrate", "CASE CLOSED · 破案", "真相只有一個：" + answerOf(DATA.final) + "！");
    panel.appendChild(el("p", "g-reveal", DATA.final.reveal));
    var row = el("div", "g-row");
    var c = el("button", "g-btn is-main", "領取名偵探認證"); c.type = "button"; c.addEventListener("click", certificate);
    row.appendChild(c); panel.appendChild(row);
    openCard(); c.focus();
  }

  function drawCert(canvas, name, done) {
    var W = 1200, H = 800, x = canvas.getContext("2d");
    canvas.width = W; canvas.height = H;
    var g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#FFF4E6"); g.addColorStop(0.6, "#FFFBEB"); g.addColorStop(1, "#E6EEF9");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "#1E293B"; x.lineWidth = 6; x.strokeRect(30, 30, W - 60, H - 60);
    x.strokeStyle = "#F58027"; x.lineWidth = 2; x.strokeRect(46, 46, W - 92, H - 92);
    x.fillStyle = "#A34A0B"; x.font = "600 26px 'IBM Plex Mono', monospace"; x.textAlign = "center";
    x.fillText("NCU CHANGHUA · 21ST · CASE CLOSED", W / 2, 120);
    x.fillStyle = "#1E293B"; x.font = "900 92px 'Noto Serif TC', serif";
    x.fillText("名偵探認證", W / 2, 232);
    x.font = "700 64px 'Noto Sans TC', sans-serif"; x.fillStyle = "#F58027";
    x.fillText(name || "小偵探", W / 2, 360);
    x.fillStyle = "#1E293B"; x.font = "500 32px 'Noto Sans TC', sans-serif";
    x.fillText("成功破解《小章事件簿：消失的營火晚會》", W / 2, 440);
    x.fillText("找齊 27 張關鍵字卡，說出了真相！", W / 2, 490);
    x.fillStyle = "#475569"; x.font = "500 24px 'Noto Sans TC', sans-serif";
    x.fillText("2027 中央大學彰友會第 21 屆返鄉服務隊 · 1/28（四）19:00 營火晚會見！", W / 2, 690);
    // Stamp
    x.save(); x.translate(960, 560); x.rotate(-0.2);
    x.strokeStyle = "#DC2626"; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 92, 0, Math.PI * 2); x.stroke();
    x.fillStyle = "#DC2626"; x.font = "900 30px 'Noto Serif TC', serif"; x.fillText("真相只有", 0, -6); x.fillText("一個", 0, 34);
    x.restore();
    var img = new Image();
    img.onload = function () { x.drawImage(img, 120, 470, 240, 224); done(); };
    img.onerror = done;
    img.src = CC.sprite("celebrate");
  }

  function certificate() {
    head("celebrate", "名偵探認證", "輸入你的名字，領一張破案認證！");
    var label = el("label", "sr-only", "你的名字"); label.htmlFor = "g-name";
    var input = el("input"); input.id = "g-name"; input.maxLength = 12; input.placeholder = "例如：小章"; input.value = st.name || "";
    var canvas = el("canvas"); canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", "名偵探認證圖卡預覽");
    var row = el("div", "g-row");
    var dl = el("a", "g-btn is-main", "下載認證圖卡"); dl.download = "名偵探認證.png"; dl.href = "#";
    var back = el("button", "g-btn", "回到地圖"); back.type = "button"; back.addEventListener("click", closeCard);
    row.appendChild(dl); row.appendChild(back);
    panel.appendChild(label); panel.appendChild(input); panel.appendChild(canvas); panel.appendChild(row);
    function paint() { drawCert(canvas, input.value.trim(), function () { try { dl.href = canvas.toDataURL("image/png"); } catch (e) { dl.hidden = true; } }); }
    input.addEventListener("input", function () { st.name = input.value.trim(); save(); paint(); });
    paint();
    openCard(); input.focus();
  }

  /* ---------- Intro ---------- */
  function intro() {
    head("wave", "CASE 21 · 新民國小", DATA.title);
    panel.appendChild(el("p", "g-reveal", DATA.intro));
    var tips = el("p", "g-hint", "點地圖上的地點，小章就會游過去調查。答錯沒關係，小章會給提示！");
    panel.appendChild(tips);
    var row = el("div", "g-row");
    var go = el("button", "g-btn is-main", "開始調查"); go.type = "button";
    go.addEventListener("click", function () { st.seen = true; save(); closeCard(); });
    row.appendChild(go); panel.appendChild(row);
    openCard(); go.focus();
  }

  /* ---------- Open / close ---------- */
  function open() {
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("game-open");
    refresh();
    if (gs) {
      gsap.fromTo(root.querySelector(".g-shell"), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: "power3.out" });
      gsap.fromTo(root.querySelector(".g-bg"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    }
    var first = map.querySelector(".g-spot");
    if (first && !avatarAt) {
      var m = map.getBoundingClientRect(), b = first.getBoundingClientRect();
      avatarAt = { x: b.right - m.left - 70, y: b.top - m.top - 52 };
      if (window.gsap) gsap.set(avatar, avatarAt); else avatar.style.transform = "translate(" + avatarAt.x + "px," + avatarAt.y + "px)";
    }
    if (!st.seen) intro(); else root.querySelector(".g-close").focus();
    var dot = fab.querySelector(".dot"); if (dot) dot.remove();
  }
  function close() {
    card.hidden = true;
    root.hidden = true;
    document.documentElement.classList.remove("game-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  fab.addEventListener("click", open);
  root.querySelector(".g-head .g-close").addEventListener("click", close);
  root.querySelector(".g-reset").addEventListener("click", function () {
    if (!window.confirm("要清除進度、從頭開始嗎？")) return;
    st = fresh(); st.seen = true; save(); avatarAt = null; refresh();
  });
  document.addEventListener("keydown", function (e) {
    if (root.hidden) return;
    if (e.key === "Escape") { if (!card.hidden) closeCard(); else close(); return; }
    if (e.key !== "Tab") return;
    // Keep focus inside the game (or inside the open question card).
    var scope = card.hidden ? root : card;
    var f = Array.prototype.filter.call(scope.querySelectorAll("button, a[href], input"), function (n) { return !n.disabled && n.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  window.addEventListener("resize", function () { if (!root.hidden) drawStrings(); });
  if (st.seen) { var d = fab.querySelector(".dot"); if (d) d.remove(); }
  if (gs) gsap.to(fab.querySelector("img"), { y: -5, duration: 1.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
  CC.openGame = open;
})();
