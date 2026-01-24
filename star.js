// -- 1. 星空隨機生成 --

const starsContainer = document.querySelector('.stars');    // 選擇 HTML 中的星星容器
let starsArray = [];    // 儲存星星的座標
const numStars = 150;   // 星星的數量

for (let i = 0; i < numStars; i++) {

    let x = Math.random() * 100;   // 隨機生成 X 座標
    let y = Math.random() * 100;  // 隨機生成 Y 座標
    let size = Math.random() * 1 + 0.3;  // 隨機生成星星大小
    let opacity = Math.random() * 0.5 + 0.5; // 隨機生成星星透明度

    // 將每一顆星星組合成 CSS 的 box-shadow 格式
    // 格式：x偏移 y偏移 模糊半徑(越小越亮) 擴散半徑 顏色
    starsArray.push(`${x}vw ${y}vh ${size}px 0px rgba(255, 255, 255, ${opacity})`);

}

// -- 2. 背景視差移動 --

// 將所有星星的 box-shadow 屬性合併成一個字串，並設置到星星容器的樣式中
starsContainer.style.boxShadow = starsArray.join(', ');

// 監聽滑鼠在視窗上的移動事件
window.addEventListener('mousemove', (e) => {

    // 計算滑鼠位置相對於螢幕中心的偏移量
    // e.clientX 是滑鼠橫向位置，window.innerWidth / 2 是螢幕中心點
    let mouseX = e.clientX - window.innerWidth / 2;
    let mouseY = e.clientY - window.innerHeight / 2;

    // 設定移動係數（數值越小，移動越細微，感覺越遠）
    const starSpeed = 0.02;   // 星星
    const nebulaSpeed = 0.01; // 星雲

    // 透過 transform 改變位置
    // 使用反向移動 (-mouseX)，滑鼠往右，星星往左偏
    const stars = document.querySelector('.stars');
    if (stars) {
        stars.style.transform = `translate(${-mouseX * starSpeed}px, ${-mouseY * starSpeed}px)`;
    }

    const nebula = document.querySelector('.nebula');
    if (nebula) {
        nebula.style.transform = `translate(${-mouseX * nebulaSpeed}px, ${-mouseY * nebulaSpeed}px)`;
    }

});

// -- 3. 流星隨機生成 --

function createShootingStar() {

    // 建立一個新的 div 標籤，並套用剛剛寫好的 .shooting-star 樣式
    const sstar = document.createElement('div');
    sstar.className = 'shootingstars'

    // 隨機決定起點
    let startTop = Math.random() * window.innerHeight * 0.5;    // 只出現在螢幕上半部
    let startLeft = Math.random() * window.innerWidth + 200;    // 稍微偏右，因為它是往左滑

    sstar.style.top = `${startTop}px`;
    sstar.style.left = `${startLeft}px`;

    // 隨機動畫速度
    let duration = Math.random() * 2 + 1;
    sstar.style.animationDuration = `${duration}s`;

    // 把這顆流星塞回網頁 body 裡面
    document.body.appendChild(sstar);

    // 資源回收
    setTimeout(() => {
        sstar.remove();
    }, duration * 1000);    // duration 是秒，要乘以 1000 變成毫秒

}

// 流星生成循環
function sstarLoop() {

    const amount = Math.floor(Math.random() * 3) + 1;   // 每次生成 1~3 顆流星

    for (let i = 0; i < amount; i++) {  // 產生多顆流星

        // 基礎時間 (i * 400) 加上一個正負 200ms 的隨機抖動
        let jitter = (Math.random() - 0.5) * 400; 
        let finalDelay = (i * 400) + jitter;

        setTimeout(() => {
            createShootingStar();
        }, Math.max(0, finalDelay));    // 每顆流星間隔一點時間產生

    }

    let delay = Math.random() * 2000 + 4000;    // 下一次生成的延遲時間，介於 4~6 秒之間

    setTimeout(sstarLoop, delay);   // 遞迴呼叫自己

}

sstarLoop();

// -- 4. 標題點擊產生流星雨 --

const title = document.querySelector('h1');  // 選取標題元素

title.addEventListener('click', () => {

    // 觸發標題旁的星星符號 (切換 class)
    title.classList.add('active'); // 顯示星星符號
    title.classList.add('keep-scale');  // 讓標題保持放大

    // 噴發流星雨
    const meteorDuration = 2000; // 流星雨噴發過程 2 秒
    for (let i = 0; i < 20; i++) {  // 20 顆流星
        let randomDelay = Math.random() * meteorDuration;
        setTimeout(() => { createShootingStar(); }, randomDelay);
    }

    // 點擊反饋效果    
    title.classList.add('clicked');
    setTimeout(() => { title.classList.remove('clicked'); }, 100);

    // 設定流星雨結束後的恢復時間
    setTimeout(() => {
        title.classList.remove('active');     // 移除星星
        title.classList.remove('keep-scale'); // 移除強行放大，交還給 CSS 控制
    }, 3500);

});