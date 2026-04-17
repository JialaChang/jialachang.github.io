const wrapper = document.querySelector('.main-wrapper'); 
const sections = document.querySelectorAll('.page-section');
const totalPages = sections.length;
let currPage = 0;
let isScrolling = false;

window.addEventListener('wheel', (e) => {
    // 攔截原生滾動
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
    
    // 執行位移
    wrapper.style.transform = `translate3d(0, -${currPage * 100}vh, 0)`;

    // 冷卻時間
    setTimeout(() => {
        isScrolling = false;
    }, 1200);
});
