// ---------- 全域狀態與事件綁定 ----------
const wrapper = document.querySelector('.main-wrapper');
const sections = document.querySelectorAll('.page-section');
const totalPages = sections.length;
let currPage = 0;
let isScrolling = false;

// 監聽滾輪事件，實作全螢幕分頁切換
window.addEventListener('wheel', (e) => {
  e.preventDefault();

  if (isScrolling) return;

  if (e.deltaY > 0 && currPage < totalPages - 1) {
    currPage++;
  }
  else if (e.deltaY < 0 && currPage > 0) {
    currPage--;
  }
  else {
    return;
  }
  isScrolling = true;

  if (wrapper) {
    wrapper.style.transform = `translate3d(0, -${currPage * 100}vh, 0)`;
  }

  // 防抖機制，避免一次滾輪觸發多次翻頁
  setTimeout(() => {
    isScrolling = false;
  }, 1200);
}, {passive: false});  // passive: false 允許呼叫 preventDefault
