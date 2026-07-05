// ============================================================================
// 全域狀態與事件綁定
// ============================================================================
const wrapper = document.querySelector('.main-wrapper');
const sections = document.querySelectorAll('.page-section');
const totalPages = sections.length;
let currPage = 0;
let isScrolling = false;

/**
 * 依方向切換分頁並套用 translate3d 位移
 * @param {number} direction - 1 表示下一頁，-1 表示上一頁
 */
function goToPage(direction) {
  if (isScrolling) return;

  if (direction > 0 && currPage < totalPages - 1) {
    currPage++;
  }
  else if (direction < 0 && currPage > 0) {
    currPage--;
  }
  else {
    return;
  }
  isScrolling = true;

  if (wrapper) {
    wrapper.style.transform = `translate3d(0, -${currPage * 100}vh, 0)`;
  }

  // 防抖機制，避免一次操作觸發多次翻頁
  setTimeout(() => {
    isScrolling = false;
  }, 1200);
}

// 監聽滾輪事件，實作全螢幕分頁切換
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  goToPage(e.deltaY > 0 ? 1 : -1);
}, {passive: false});  // passive: false 允許呼叫 preventDefault

// 監聽觸控滑動事件 (CSS 設有 touch-action: none，需手動實作翻頁)
let touchStartY = 0;
const swipeThreshold = 50;  // 最小滑動距離 (px)，避免誤觸

window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, {passive: true});

window.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, {passive: false});

window.addEventListener('touchend', (e) => {
  const deltaY = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(deltaY) < swipeThreshold) return;
  goToPage(deltaY > 0 ? 1 : -1);
}, {passive: true});
