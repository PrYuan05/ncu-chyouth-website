"""產生小遊戲的注音表（src/game-zhuyin.js）。

改了 src/game-data.js、src/game.js 或 src/game.html 裡的中文之後，執行：
    pip install pypinyin
    python3 tools/zhuyin.py
pypinyin 依詞判斷破音字，但它是大陸讀音；台灣讀音與本調（一、不）在下面的 TW 表修正。
產生後請看一眼終端機列出的破音字，有讀錯就加進 TW 或 WORDS。
"""
import json, pathlib, re
from pypinyin import pinyin, Style

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
CJK = re.compile(r"[㐀-鿿]+")

# 單字一律改成台灣讀音（教育部《國語辭典》）。
TW = {
    "一": "ㄧ", "不": "ㄅㄨˋ",          # 課本標本調
    "著": "˙ㄓㄜ", "得": "˙ㄉㄜ",        # 遊戲裡都是助詞
    "和": "ㄏㄢˋ",                      # 連接詞
    "少": "ㄕㄠˋ",                      # 只出現在「少年」
    "肚": "ㄉㄨˋ", "町": "ㄉㄧㄥ", "熟": "ㄕㄡˊ", "曲": "ㄑㄩˇ",
}
# 只在某些詞裡改讀音：詞 → 每個字的注音（空白分隔）。
WORDS = {
    "東西": "ㄉㄨㄥ ˙ㄒㄧ", "木頭": "ㄇㄨˋ ˙ㄊㄡ", "石頭": "ㄕˊ ˙ㄊㄡ", "媽媽": "ㄇㄚ ˙ㄇㄚ",
    "眼睛": "ㄧㄢˇ ˙ㄐㄧㄥ", "衣服": "ㄧ ˙ㄈㄨ", "耳朵": "ㄦˇ ˙ㄉㄨㄛ", "鈴鐺": "ㄌㄧㄥˊ ˙ㄉㄤ",
    "名字": "ㄇㄧㄥˊ ˙ㄗ", "關係": "ㄍㄨㄢ ˙ㄒㄧ", "月亮": "ㄩㄝˋ ˙ㄌㄧㄤ", "晚上": "ㄨㄢˇ ˙ㄕㄤ",
    "這裡": "ㄓㄜˋ ˙ㄌㄧ", "哪裡": "ㄋㄚˇ ˙ㄌㄧ", "睡覺": "ㄕㄨㄟˋ ㄐㄧㄠˋ", "鑽石": "ㄗㄨㄢˋ ㄕˊ",
    "握把": "ㄨㄛˋ ㄅㄚˋ", "園子": "ㄩㄢˊ ㄗˇ", "看看": "ㄎㄢˋ ˙ㄎㄢ",
    "試試": "ㄕˋ ˙ㄕ", "想想": "ㄒㄧㄤˇ ˙ㄒㄧㄤ", "念念": "ㄋㄧㄢˋ ˙ㄋㄧㄢ",
}


def sources():
    texts = []
    data = (SRC / "game-data.js").read_text()
    texts += re.findall(r'"((?:[^"\\]|\\.)*)"', data)
    js = (SRC / "game.js").read_text()
    js = re.sub(r"//[^\n]*|/\*.*?\*/", "", js, flags=re.S)
    texts += re.findall(r'"((?:[^"\\]|\\.)*)"', js)
    html = (SRC / "game.html").read_text()
    html = re.sub(r"<style>.*?</style>", "", html, flags=re.S)
    texts += re.findall(r">([^<]+)<", html)
    runs = []
    for t in texts:
        runs += CJK.findall(t)
    return sorted(set(runs), key=lambda r: (-len(r), r))


def fix(sym):
    if sym.endswith("˙"):
        sym = "˙" + sym[:-1]
    return sym


def read(run):
    if run in WORDS:
        return WORDS[run].split()
    out = []
    for ch, py in zip(run, pinyin(run, style=Style.BOPOMOFO, errors=lambda x: [""] * len(x))):
        out.append(TW.get(ch, fix(py[0])))
    # 詞表裡較長的詞優先覆蓋。
    for w, r in sorted(WORDS.items(), key=lambda kv: -len(kv[0])):
        i = run.find(w)
        while i >= 0:
            out[i:i + len(w)] = r.split()
            i = run.find(w, i + len(w))
    return out


def main():
    runs = sources()
    readings = {r: read(r) for r in runs}
    # 每個字最常見的讀音當預設，跟預設不同的整段才另外記下來。
    count = {}
    for r, rs in readings.items():
        for ch, z in zip(r, rs):
            count.setdefault(ch, {}).setdefault(z, 0)
            count[ch][z] += 1
    chars = {ch: max(c.items(), key=lambda kv: kv[1])[0] for ch, c in count.items()}
    words = {r: " ".join(rs) for r, rs in readings.items() if any(chars[ch] != z for ch, z in zip(r, rs))}
    js = ("/* 小遊戲的注音：c 是每個字的預設讀音，w 是讀音跟預設不同的詞。由 tools/zhuyin.py 產生，請勿手改。 */\n"
          "window.CC_ZHUYIN = " + json.dumps({"c": chars, "w": words}, ensure_ascii=False, separators=(",", ":")) + ";\n")
    (SRC / "game-zhuyin.js").write_text(js)
    print(len(runs), "runs,", len(chars), "chars,", len(words), "words,", len(js.encode()) // 1024, "KB")
    multi = {ch: c for ch, c in count.items() if len(c) > 1}
    for ch, c in sorted(multi.items()):
        print("破音", ch, c, [r for r in runs if ch in r][:6])


if __name__ == "__main__":
    main()
