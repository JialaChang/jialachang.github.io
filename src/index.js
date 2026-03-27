// ====== 1. DOM 元素選取 ======
const stars = document.querySelector('.stars');
const nebula = document.querySelector('.nebula');
const title = document.querySelector('h1');
const clock = document.querySelector('.clock');
const timeDisplay = document.querySelector('.time');
const dateDisplay = document.querySelector('.date');
const threeBody = document.querySelector('.three-body')


// ===== 2. 星空隨機生成 =====
const numStars = 100;
const starsArray = new Array(numStars);

for (let i = 0; i < numStars; i++) {

    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = Math.random() * 1 + 0.3;
    const opacity = Math.random() * 0.5 + 0.5;

    // 將每一顆星星組合成 CSS 的 box-shadow 格式
    // 格式 : x偏移 y偏移 模糊半徑(越小越亮) 擴散半徑 顏色
    starsArray[i] = (`${x}vw ${y}vh ${size}px 0px rgba(255, 255, 255, ${opacity})`);

}

// 將所有星星的 box-shadow 屬性合併成一個字串，並設置到星星容器的樣式中
stars.style.boxShadow = starsArray.join(', ');


// ===== 3.背景視差移動 =====
let lock = false;                            // 頻率鎖
function handleParallax(clientX, clientY) {  // 當滑鼠移動時觸發
    if (!lock) {
        // 使用 requestAnimationFrame 將頻率鎖定在螢幕刷新率
        window.requestAnimationFrame(() => {
            // 計算滑鼠位置相對於螢幕中心的偏移量
            // clientX 是滑鼠橫向位置，window.innerWidth / 2 是螢幕中心點
            let mouseX = clientX - window.innerWidth / 2;
            let mouseY = clientY - window.innerHeight / 2;

            // 設定移動係數
            const starSpeed = 0.02;
            const nebulaSpeed = 0.01;

            // 透過 transform 改變位置並反向移動 (-mouseX)
            if (stars) stars.style.transform = `translate3d(${-mouseX * starSpeed}px, ${-mouseY * starSpeed}px, 0)`;
            if (nebula) nebula.style.transform = `translate3d(${-mouseX * nebulaSpeed}px, ${-mouseY * nebulaSpeed}px, 0)`;

            lock = false;
        });
        lock = true;
    }
    
}

window.addEventListener('pointermove', (e) => handleParallax(e.clientX, e.clientY))


// ===== 4. 流星隨機生成 =====
function createShootingStar() {

    // 建立一個新的 div 標籤，並套用 .shooting-star 樣式
    const sstar = document.createElement('div');
    sstar.className = 'shootingstars'

    // 隨機決定起點
    let startTop = Math.random() * 50;        // 只出現在螢幕上半部
    let startLeft = Math.random() * 90 + 10;  // 稍微偏右

    sstar.style.top = `${startTop}vh`;
    sstar.style.left = `${startLeft}vw`;

    // 隨機動畫速度
    let duration = Math.random() * 2 + 1.5;
    sstar.style.animationDuration = `${duration}s`;

    // 把這顆流星塞回網頁 body 裡面
    document.body.appendChild(sstar);

    // 資源回收
    // duration 是秒，要乘以 1000 變成毫秒
    setTimeout(() => sstar.remove(), duration * 1000);

}

function sstarLoop() {

    const amount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < amount; i++) {

        // 基礎時間 (i * 400) 加上一個正負 200ms 內的隨機抖動
        let jitter = (Math.random() - 0.5) * 400; 
        let finalDelay = (i * 400) + jitter;

        setTimeout(() => {
            createShootingStar();
        }, Math.max(100, finalDelay));  // 讓最後時間不會小於 100ms

    }

    let delay = Math.random() * 2000 + 4000;  // 下一次生成的延遲時間

    setTimeout(sstarLoop, delay);  // 遞迴呼叫自己

}

sstarLoop();


// ===== 5. 標題點擊產生流星雨 =====
title?.addEventListener('click', () => {

    // 觸發標題旁的星星符號 (切換 class)
    title.classList.add('active');
    title.classList.add('keep-scale');

    // 噴發流星雨
    const meteorDuration = 5000;
    const meteorNums = 50
    for (let i = 0; i < meteorNums; i++) {
        let randomDelay = Math.random() * meteorDuration;
        setTimeout(() => { createShootingStar(); }, randomDelay);
    }

    // 點擊反饋效果
    title.classList.add('clicked');
    setTimeout(() => { title.classList.remove('clicked'); }, 100);

    // 設定流星雨結束後的恢復時間
    setTimeout(() => {
        title.classList.remove('active');
        title.classList.remove('keep-scale');
    }, 6000);

});


//  ===== 6. 實時時鐘顯示 =====
const weekDaysArr = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function updateClock() {
    
    const now = new Date();  // 取得目前時間

    // 格式化時間
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    timeDisplay.innerHTML = `${hours}:${minutes}:${seconds}`;

    // 格式化日期
    const year = now.getFullYear() - 1911;  // 中華民國萬歲
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    // getDate() 取出來的是數字 0~6
    const weekDays = weekDaysArr[now.getDay()];

    dateDisplay.innerHTML = `${year}.${month}.${day}&nbsp;&nbsp;${weekDays}`;

}

// 偵測點擊變換時鐘場景 (切換 class)
clock?.addEventListener('click', () => {

    clock.classList.toggle('expanded');
    document.querySelector('.glass-panel').classList.toggle('hidden');

})

// 每秒更新一次時鐘
setInterval(updateClock, 1000);
updateClock();


// ===== 6. 點擊三體圖案跳轉 =====
threeBody?.addEventListener('click', () => {
    window.location.href = "./src/threebody.html";
});