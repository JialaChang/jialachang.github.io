# Starle Web

個人作品集網站，以純 HTML / CSS / JS 建構

**網站連結**：[jialachang.github.io](https://jialachang.github.io/)

<p align="center">
  <img src="./docs/main.png" width="48%" alt="主頁">
  <img src="./docs/threebody.png" width="48%" alt="三體模擬器">
</p>

## 專案結構

```
StarleWeb/
├── index.html              ← 網站入口
├── docs/                   ← README 截圖
└── src/
    ├── index/              ← 主頁
    │   ├── index.js        ← 滾輪分頁切換
    │   ├── main.js         ← 星空、流星、視差與時鐘特效
    │   ├── index.css
    │   └── main.css
    ├── threebody/          ← 三體模擬器
    │   ├── threebody.html
    │   ├── threebody.js    ← 物理引擎與 3D 渲染
    │   ├── threebody.css
    │   └── solutions.js    ← 特殊解初始條件資料庫
    └── poem/               ← 詩詞推薦頁
        ├── poem.html
        ├── poem.js         ← 水平卡片捲動
        └── poem.css
```

## 外部依賴

所有依賴皆透過 CDN 載入，無需本地安裝：

| 依賴 | 用途 |
|------|------|
| Three.js r160 | 三體模擬器 3D 渲染 |
| Google Fonts — Montserrat | 主頁英文字型 |
| Google Fonts — LXGW WenKai Mono TC | 主頁中文字型 |
| Google Fonts — Noto Serif TC | 詩詞頁字型 |
| Material Icons | 三體模擬器 UI 圖示按鈕 |

## 本地預覽

三體模擬器使用 ES6 模組，需透過 HTTP 伺服器開啟（直接點開 `threebody.html` 會因瀏覽器安全限制無法載入）：

```bash
python3 -m http.server 8080
# or
npx serve .
```