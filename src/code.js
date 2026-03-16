// ====== 1. DOM 元素選取 ======
const closeBtn = document.querySelector('.close-button');


// ====== 2. 終端機視窗控制 ======
closeBtn.addEventListener('click', () => {
    window.location.href = "../index.html";
});
