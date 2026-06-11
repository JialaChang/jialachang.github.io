# Starle Web

**網頁連結**： [jialachang.github.io/](https://jialachang.github.io/)

Starle Web 是一個基於原生網頁技術與 Three.js 構建的互動式前端專案，主要包含個人化首頁展示、互動式星空背景，以及具備物理運算基礎的 3D 三體 (N-Body) 模擬器。

<p align="center">
  <img src="./docs/index.png" width="48%" alt="Starle Web 主頁展示">
  <img src="./docs/threebody.png" width="48%" alt="三體物理模擬展示">
</p>

## 專案特色 (Features)

- **3D 三體物理模擬器**
  - 使用 `Three.js` 進行 3D 場景渲染，並整合 Bloom 後期處理以實現星體發光效果。
  - 核心物理引擎採用韋爾萊積分法 (Verlet Integration) 進行萬有引力計算，確保多體運動的數值穩定性。
  - 支援即時動態調整星體質量、初始速度、座標參數與軌跡保留長度。
- **視覺化背景與互動系統**
  - 實現基於游標座標的背景視差滾動 (Parallax Scrolling)。
  - 以純 CSS 與 JavaScript 實作具備不規則生成週期的流星雨動畫系統。
- **現代化使用者介面**
  - 全螢幕動態分頁切換與防抖 (Debounce) 事件處理。
  - 採用毛玻璃 (Glassmorphism) 設計風格的主控面板與導覽列。
- **詩詞展示模組**
  - 結合中文字體排版 (Typography) 的古典詩詞獨立頁面。