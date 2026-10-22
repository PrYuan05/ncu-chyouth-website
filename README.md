# 2027 中央大學彰友會第 21 屆返鄉服務隊 官網

《名偵探柯南——真相與科學探險記》寒假育樂營的官方網站，放在 GitHub Pages。

網站只有一個頁面檔 `index.html`，裡面分成四個專區，網址用 `#` 切換：

| 專區 | 網址結尾 |
| --- | --- |
| 首頁 | （無） |
| 家長專區 | `#parents` |
| 企業夥伴專區 | `#partners` |
| 校方專區 | `#school` |

## 修改內容

`index.html` 是自動產生的，**請改 `src/` 裡的檔案**，再重新產生：

```
python3 build.py
```

| 想改什麼 | 改哪個檔案 |
| --- | --- |
| 主視覺標題、營期資訊 | `src/sections/01-hero.html` |
| 家長快速查詢的問答 | `src/sections/00-head-parents.html` 裡的 `FAQ` |
| 同意書、相簿連結 | `src/sections/09-parents.html` 裡的 `LINKS` |
| FB、IG 連結 | `src/sections/10-contact.html` 裡的 `LINKS` |
| 營期照片 | `src/sections/06-legacy.html` 裡的 `PHOTOS`（Google 雲端檔案 id，檔案需設為「知道連結的任何人可檢視」） |
| 每個專區要顯示哪些區塊 | `src/site.js` 裡的 `PAGES` |
| 倒數的營期日期 | `src/site.js` 裡的 `CAMP` |

## 技術

- 動畫：GSAP 3.13（ScrollTrigger、ScrambleText、Draggable、Inertia、SplitText、Flip）與 Lenis 平滑捲動，都從 jsDelivr 載入。
- 開啟系統「減少動態效果」的訪客會看到完整的靜態內容，沒有開場、游標與捲動動畫。
- 自訂游標只在有滑鼠的裝置出現；手機與平板維持原生操作。
