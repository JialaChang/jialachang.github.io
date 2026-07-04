// ---------- DOM 節點參考 ----------
const stars = document.querySelector('.stars');
const nebula = document.querySelector('.nebula');
const sstarContainer = document.querySelector('.sstar-container');
const title = document.querySelector('h1');
const clock = document.querySelector('.clock');
const timeDisplay = document.querySelector('.time');
const dateDisplay = document.querySelector('.date');


// ---------- 星空隨機生成 ----------
const numStars = 100;
const starsArray = new Array(numStars);

for (let i = 0; i < numStars; i++) {
  const x = Math.random() * 100;
  const y = Math.random() * 100;
  const size = Math.random() * 1 + 0.3;
  const opacity = Math.random() * 0.5 + 0.5;
  starsArray[i] = `${x}vw ${y}vh ${size}px 0px rgba(255, 255, 255, ${opacity})`;
}

if (stars) {
  stars.style.boxShadow = starsArray.join(', ');
}


// ---------- 背景視差移動 ----------
let lock = false;  // 頻率鎖

/**
 * 處理背景星空與星雲的視差滾動效果
 * @param {number} clientX - 游標的 X 軸位置
 * @param {number} clientY - 游標的 Y 軸位置
 */
function handleParallax(clientX, clientY) {
  if (!lock) {
    // 使用 requestAnimationFrame 將頻率鎖定在螢幕刷新率
    window.requestAnimationFrame(() => {
      let mouseX = clientX - window.innerWidth / 2;
      let mouseY = clientY - window.innerHeight / 2;

      const starSpeed = 0.02;
      const nebulaSpeed = 0.01;

      // 反向移動 (-mouseX) 製造景深感
      stars?.style.setProperty('transform', `translate3d(${-mouseX * starSpeed}px, ${-mouseY * starSpeed}px, 0)`);
      nebula?.style.setProperty('transform', `translate3d(${-mouseX * nebulaSpeed}px, ${-mouseY * nebulaSpeed}px, 0)`);

      lock = false;
    });
    lock = true;
  }
}

window.addEventListener('pointermove', (e) => handleParallax(e.clientX, e.clientY));


// ---------- 流星隨機生成 ----------

/**
 * 生成單顆流星並插入 DOM，動畫結束後自動回收
 */
function createShootingStar() {
  const sstar = document.createElement('div');
  sstar.className = 'shootingstars';

  let startTop = Math.random() * 50;
  let startLeft = Math.random() * 90 + 10;

  sstar.style.top = `${startTop}vh`;
  sstar.style.left = `${startLeft}vw`;

  let duration = Math.random() * 2 + 1.5;
  sstar.style.animationDuration = `${duration}s`;

  sstarContainer?.appendChild(sstar);
  setTimeout(() => sstar.remove(), duration * 1000);
}

/**
 * 透過遞迴調用實作不規則間隔的流星雨生成器
 */
function sstarLoop() {
  const amount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < amount; i++) {
    // 基礎時間 (i * 400) 加上一個正負 200ms 內的隨機抖動
    let jitter = (Math.random() - 0.5) * 400;
    let finalDelay = (i * 400) + jitter;

    setTimeout(() => {
      createShootingStar();
    }, Math.max(100, finalDelay));  // 最短間隔 100ms
  }

  let delay = Math.random() * 2000 + 4000;
  setTimeout(sstarLoop, delay);
}

sstarLoop();


// ---------- 標題點擊產生流星雨 ----------
title?.addEventListener('click', () => {
  title.classList.add('active');
  title.classList.add('keep-scale');

  const meteorDuration = 5000;
  const meteorNums = 50;
  for (let i = 0; i < meteorNums; i++) {
    let randomDelay = Math.random() * meteorDuration;
    setTimeout(() => { createShootingStar(); }, randomDelay);
  }

  title.classList.add('clicked');
  setTimeout(() => { title.classList.remove('clicked'); }, 100);

  // 設定流星雨結束後的恢復時間
  setTimeout(() => {
    title.classList.remove('active');
    title.classList.remove('keep-scale');
  }, 6000);
});


// ---------- 實時時鐘顯示 ----------
const weekDaysArr = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * 更新時鐘與日期顯示
 */
function updateClock() {
  const now = new Date();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  if (timeDisplay) {
    timeDisplay.innerHTML = `${hours}:${minutes}:${seconds}`;
  }

  const year = now.getFullYear() - 1911;  // 中華民國萬歲
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekDays = weekDaysArr[now.getDay()];  // getDay() 返回 0–6，對應週日至週六

  if (dateDisplay) {
    dateDisplay.innerHTML = `${year}.${month}.${day}&nbsp;&nbsp;${weekDays}`;
  }
}

clock?.addEventListener('click', () => {
  clock.classList.toggle('expanded');
  document.querySelector('.glass-panel').classList.toggle('hidden');
});

setInterval(updateClock, 1000);
updateClock();
