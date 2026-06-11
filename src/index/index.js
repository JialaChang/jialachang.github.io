// ============================================================================
// 全域狀態與事件綁定 (State Management & Event Binding)
// ============================================================================
const wrapper = document.querySelector('.main-wrapper'); 
const sections = document.querySelectorAll('.page-section');
const totalPages = sections.length;
let currPage = 0;
let isScrolling = false;

// 監聽滾輪事件，實作全螢幕分頁切換 (Full-page Scroll)
window.addEventListener('wheel', (e) => {
    e.preventDefault(); // 阻斷瀏覽器預設的捲動行為

    if (isScrolling) return; // 處於冷卻狀態時忽略事件

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
    
    // 觸發 CSS Transform 進行視圖平移
    if (wrapper) {
        wrapper.style.transform = `translate3d(0, -${currPage * 100}vh, 0)`;
    }

    // 滾動防抖 (Debounce) 機制，避免一次滾輪觸發多次翻頁
    setTimeout(() => {
        isScrolling = false;
    }, 1200);
}, {passive: false});  // passive: false 允許呼叫 preventDefault
