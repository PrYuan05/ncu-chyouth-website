"""Build the site from src/ into the repository root (GitHub Pages serves the root).

python3 build.py                 -> index.html + assets/ at the repository root
python3 build.py OUT --local     -> GSAP/Lenis from OUT/assets/vendor (needs src/vendor, for offline testing)
python3 build.py OUT --inline    -> one self-contained OUT/index.html (CSS/JS inlined) for previews

Each src/sections/NN-name.html starts with a line like
<!-- title: 主視覺 | body: is-ink | plugins: SplitText -->
and {{icon:name}} tokens are swapped for inline Lucide SVG. {{mascot}} inlines the flat 小章
(src/mascot.svg); its poses are also written out as assets/mascot/xiaozhang-<pose>.svg.
"""
import base64, json, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
OUT = pathlib.Path(ARGS[0]) if ARGS else ROOT
LOCAL = "--local" in sys.argv
INLINE = "--inline" in sys.argv

ICONS = {
    "search": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    "flask": '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    "chef-hat": '<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
    "palette": '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    "check": '<path d="M20 6 9 17l-5-5"/>',
    "phone": '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    "mail": '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    "arrow-down": '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    "shield": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "utensils": '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    "lock": '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "image": '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    "clock": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "clipboard": '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    "external": '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"/>',
    "map-pin": '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
    "backpack": '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M8 10h8"/><path d="M8 18h8"/><path d="M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    "briefcase": '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
    "school": '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    "home": '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    "users": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
}

FONTS = ("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600"
         "&family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@700;900&family=Huninn&display=swap")


def icon(m):
    name, _, cls = m.group(1).partition(" ")
    cls = ("icon " + cls).strip()
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


def parse(path):
    text = path.read_text()
    meta_line, body = text.split("\n", 1)
    meta = dict(
        (k.strip(), v.strip())
        for k, v in (p.split(":", 1) for p in meta_line.strip("<!-> \n").split("|"))
    )
    body = re.sub(r"\{\{icon:([a-z\- ]+)\}\}", icon, body)
    body = re.sub(r"\{\{asset:([\w./-]+)\}\}", lambda m: asset(m.group(1)), body)
    body = body.replace("{{mascot}}", mascot("wave", inline=True))
    return meta, body


GSAP = ["gsap", "ScrollTrigger", "ScrambleTextPlugin", "Draggable", "InertiaPlugin", "SplitText", "Flip"]
CDN_GSAP = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/"
CDN_LENIS = "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js"
CDN_MATTER = "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"
POSES = ["wave", "magnify", "glint", "surprise", "celebrate"]

TITLE = "2027 中央大學彰友會第21屆返鄉服務隊"
DESC = "名偵探柯南——真相與科學探險記｜2027/1/27–1/29 於彰化縣田中鎮新民國小，48 位大專志工陪伴 48 位學童，學員全程免費。"

LENS = """<svg class="lens" viewBox="0 0 120 120" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><circle cx="50" cy="50" r="34"/><path d="M75 75 L106 106" stroke-width="9"/></svg>"""

SHELL_TOP = """<a class="skip" href="#main" data-scroll="#main">跳到主要內容</a>
<div class="preloader" aria-hidden="true">
  <div class="row"><span>CASE No.21 · 新民國小</span><span>NCU · CHANGHUA</span></div>
  <div class="mid"><img class="xz" src="{{asset:mascot/xiaozhang-magnify.svg}}" alt="" width="240" height="228"><div class="num">000</div><p class="say">調查中</p></div>
  <div class="flash"></div>
  <div><div class="line"><i></i></div><div class="row" style="margin-top:12px"><span>INVESTIGATING</span><span>2027.01.27–29</span></div></div>
</div>
<header class="site-head">
  <div class="bar">
    <a class="brand" data-role="home">{{icon:search icon-sm}}中央彰友會返服 <b>第21屆</b></a>
    <nav class="site-nav" aria-label="網站頁面"><ul>
      <li><a data-role="home">首頁</a></li>
      <li><a data-role="parents">家長專區</a></li>
      <li><a data-role="sponsor">企業夥伴</a></li>
      <li><a data-role="school">校方專區</a></li>
    </ul></nav>
    <div class="status">
      <span class="live" aria-hidden="true"><i></i>TPE <span data-clock>--:--:--</span></span>
      <span class="form">同意書 1/15 截止</span>
      <span class="dday" data-dday title="距離營期開始">D-97</span>
    </div>
  </div>
</header>
<div class="progress-top" aria-hidden="true"><i></i><b class="ptag">調查進度 <span>0</span>%</b></div>
"""

SHELL_BOTTOM = """<footer class="site-foot">
  <div class="foot-play" aria-hidden="true" data-cursor="抓起來丟 DRAG"><p>CASE 21 · 線索散落一地，抓起來丟丟看</p></div>
  <p>© 2027 <strong>國立中央大學彰化校友會第 21 屆返鄉服務隊</strong> 版權所有</p>
  <p>服務學校：彰化縣田中鎮新民國民小學｜活動企劃執行：中央彰友會返服籌備團隊</p>
  <p>本活動已投保特定活動平安險與公共意外責任險</p>
  <p class="follow">追蹤彰友會：<a href="https://www.facebook.com/ncuch" target="_blank" rel="noopener">Facebook</a> · <a href="https://www.instagram.com/ncu.ch/" target="_blank" rel="noopener">Instagram</a></p>
  <div class="top-wrap"><img class="xz-top" src="{{asset:mascot/xiaozhang-wave.svg}}" alt="" width="120" height="114"><a class="top" href="#top" data-scroll="top">{{icon:arrow-down icon-sm}}回到頂端</a></div>
</footer>
<div class="curtain" aria-hidden="true">
  <div class="lens">
    <div class="in">
      <svg class="sil" viewBox="0 0 120 150"><path d="M60 8c19 0 33 15 33 34 0 13-7 24-17 30 21 6 36 22 40 44 2 12-6 24-19 24H23c-13 0-21-12-19-24 4-22 19-38 40-44-10-6-17-17-17-30C27 23 41 8 60 8z"/><ellipse class="eye" cx="48" cy="42" rx="7" ry="4.5"/><ellipse class="eye" cx="72" cy="42" rx="7" ry="4.5"/></svg>
      <p class="k">CASE FILE</p><div style="overflow:hidden"><p class="t"></p></div>
    </div>
  </div>
  <svg class="rim"><circle/><line/></svg>
</div>
<div class="cursor" aria-hidden="true"><svg class="ring" viewBox="0 0 52 52"><circle cx="20" cy="20" r="14"/><path d="M30.5 30.5 44 44"/></svg><div class="dot"></div><div class="label"></div></div>
"""

INTRO_FLAG = """<script>
(function () {
  var d = document.documentElement;
  try { if (!sessionStorage.getItem("cc-intro") && !matchMedia("(prefers-reduced-motion: reduce)").matches) d.classList.add("intro"); } catch (e) {}
  setTimeout(function () { d.classList.remove("intro"); if (window.CC) CC.releaseIntro(); }, 6000);
})();
</script>"""


def mascot(pose, inline=False):
    """The flat 小章 master SVG set to one pose; inline copies are decorative (the button carries the label)."""
    svg = (SRC / "mascot.svg").read_text().replace('data-pose="wave"', f'data-pose="{pose}"', 1)
    if inline:
        svg = svg.replace(' role="img" aria-label="小章"', ' aria-hidden="true" focusable="false"', 1)
    return svg


def asset(path):
    """assets/ path, or a data URI in the single-file preview build."""
    if not INLINE:
        return "assets/" + path
    m = re.fullmatch(r"mascot/xiaozhang-(\w+)\.svg", path)
    data = mascot(m.group(1)).encode() if m else (ROOT / "assets" / path).read_bytes()
    mime = {".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg"}[pathlib.Path(path).suffix]
    return f"data:{mime};base64," + base64.b64encode(data).decode()


def icons(text):
    text = re.sub(r"\{\{asset:([\w./-]+)\}\}", lambda m: asset(m.group(1)), text)
    return re.sub(r"\{\{icon:([a-z\- ]+)\}\}", icon, text).replace("LENS", LENS)


def lib_tags():
    # 頁尾的線索掉落要用 Matter.js，只在桌機捲到頁尾時才載入，這裡只記下網址。
    matter = "assets/vendor/matter.min.js" if LOCAL else CDN_MATTER
    later = f'<script>window.CC_LIBS = {{ matter: "{matter}" }};</script>'
    if LOCAL:
        return "\n".join([f'<script src="assets/vendor/{n}.min.js"></script>' for n in GSAP + ["lenis"]] + [later])
    tags = [f'<script src="{CDN_GSAP}{n}.min.js"></script>' for n in GSAP]
    return "\n".join(tags + [f'<script src="{CDN_LENIS}"></script>', later])


def main():
    css_base = (SRC / "common.css").read_text()
    css_site = (SRC / "site.css").read_text()
    js_common = (SRC / "common.js").read_text()
    js_site = (SRC / "site.js").read_text()
    bodies = []
    for path in sorted((SRC / "sections").glob("*.html")):
        _, body = parse(path)
        bodies.append(body.strip())

    js_mascot = (SRC / "mascot.js").read_text()
    js_game_data = (SRC / "game-data.js").read_text()
    js_game_zhuyin = (SRC / "game-zhuyin.js").read_text()
    js_game = (SRC / "game.js").read_text()
    game_html = icons((SRC / "game.html").read_text())

    if INLINE:
        sprites = {f"mascot/xiaozhang-{n}.svg": asset(f"mascot/xiaozhang-{n}.svg") for n in POSES}
        styles = f"<style>\n{css_base}\n{css_site}\n</style>"
        common = f"<script>\nwindow.CC_ASSETS = {json.dumps(sprites)};\n{js_common}\n{js_mascot}\n</script>"
        site = (f"<script>\n{js_site}\n</script>\n"
                f"<script>\n{js_game_data}\n</script>\n<script>\n{js_game_zhuyin}\n</script>\n"
                f"<script>\n{js_game}\n</script>")
    else:
        styles = ('<link rel="stylesheet" href="assets/css/base.css">\n'
                  '<link rel="stylesheet" href="assets/css/site.css">')
        common = '<script src="assets/js/common.js"></script>\n<script src="assets/js/mascot.js"></script>'
        site = ('<script src="assets/js/site.js"></script>\n'
                '<script src="assets/js/game-data.js"></script>\n<script src="assets/js/game-zhuyin.js"></script>\n'
                '<script src="assets/js/game.js"></script>')

    page = f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#0F172A">
<link rel="icon" type="image/png" href="{asset("mascot/favicon.png")}">
<meta property="og:type" content="website">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
{INTRO_FLAG}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
{styles}
{lib_tags()}
{common}
</head>
<body>
{icons(SHELL_TOP)}<main id="main" class="pages" tabindex="-1">
{chr(10).join(bodies)}
</main>
{icons(SHELL_BOTTOM)}{game_html}
{site}
</body>
</html>
"""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(page)
    if not INLINE:
        for sub in ("css", "js"):
            (OUT / "assets" / sub).mkdir(parents=True, exist_ok=True)
        (OUT / "assets/css/base.css").write_text(css_base)
        (OUT / "assets/css/site.css").write_text(css_site)
        (OUT / "assets/js/common.js").write_text(js_common)
        (OUT / "assets/js/site.js").write_text(js_site)
        (OUT / "assets/js/mascot.js").write_text(js_mascot)
        (OUT / "assets/js/game-data.js").write_text(js_game_data)
        (OUT / "assets/js/game-zhuyin.js").write_text(js_game_zhuyin)
        (OUT / "assets/js/game.js").write_text(js_game)
        (OUT / "assets/mascot").mkdir(parents=True, exist_ok=True)
        for n in POSES:
            (OUT / f"assets/mascot/xiaozhang-{n}.svg").write_text(mascot(n))
        if OUT != ROOT:
            shutil.copytree(ROOT / "assets/mascot", OUT / "assets/mascot", dirs_exist_ok=True)
        if LOCAL:
            shutil.copytree(SRC / "vendor", OUT / "assets/vendor", dirs_exist_ok=True)
    print("built site ->", OUT / "index.html", f"({len(page) // 1024} KB)")


if __name__ == "__main__":
    main()
