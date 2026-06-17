# Starle Web

個人作品集網站，以純 HTML / CSS / JS 建構

**網站連結**：[jialachang.github.io](https://jialachang.github.io/)

<p align="center">
  <img src="./docs/index.png" width="48%" alt="主頁">
  <img src="./docs/threebody.png" width="48%" alt="三體模擬器">
</p>

## 專案結構

```
index.html
src/
  index/           ← 主頁 (視差、流星、時鐘、導覽)
    index.js
    main.js
    index.css
    main.css
  threebody/       ← 三體模擬器
    threebody.html
    threebody.js
    threebody.css
    solutions.js   ← 特殊解初始條件資料模組
  poem/            ← 詩詞推薦頁
    poem.html
    poem.css
```

## 外部依賴

所有依賴皆透過 CDN 載入，無需本地安裝：

| 依賴 | 用途 |
|------|------|
| Three.js r160 | 三體模擬器 3D 渲染 |
| Google Fonts — Montserrat | 主頁英文字型 |
| Google Fonts — LXGW WenKai Mono TC | 主頁中文字型 |
| Google Fonts — Noto Serif TC | 詩詞頁字型 |

## 本地預覽

```bash
python3 -m http.server 8080
# or
npx serve .
```