// ============================================================================
// DOM 節點參考
// ============================================================================
const track = document.querySelector('.poem-track');
const cards = [...document.querySelectorAll('.poem-card')];


// ============================================================================
// 卡片定位工具
// ============================================================================

/**
 * 取得目前最接近視窗中央的卡片索引
 * @returns {number} 卡片索引
 */
function nearestIndex() {
  const center = track.scrollLeft + track.clientWidth / 2;
  let best = 0;
  let bestDist = Infinity;

  cards.forEach((card, i) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const dist = Math.abs(cardCenter - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });
  return best;
}

/**
 * 平滑捲動至指定索引的卡片並置中
 * @param {number} index - 目標卡片索引（自動夾在合法範圍內）
 */
function scrollToCard(index) {
  const target = cards[Math.max(0, Math.min(cards.length - 1, index))];
  target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}


// ============================================================================
// 扇形密疊：依距中心的張數距離套用 CSS 效果
// ============================================================================
let arcLock = false;  // 頻率鎖

/** 依每張卡片與視窗中央的距離，套用扇形位移、旋轉與縮放 */
function updateArc() {
  const center = track.scrollLeft + track.clientWidth / 2;
  // 相鄰卡片的間距，作為一張的單位距離（版面已用負邊距重疊）
  const spacing = cards.length > 1
    ? cards[1].offsetLeft - cards[0].offsetLeft
    : track.clientWidth;

  cards.forEach((card) => {
    const t = (card.offsetLeft + card.offsetWidth / 2 - center) / spacing;

    const drop = t * t * 14;
    const angle = t * 8;
    const scale = 1 - Math.min(Math.abs(t) * 0.1, 0.3);

    card.style.transform = `translateY(${drop}px) rotate(${angle}deg) scale(${scale})`;
    card.style.opacity = 1 - Math.min(Math.abs(t) * 0.12, 0.4);
    card.style.zIndex = 100 - Math.round(Math.abs(t) * 2);
  });
}

track.addEventListener('scroll', () => {
  if (!arcLock) {
    window.requestAnimationFrame(() => {
      updateArc();
      arcLock = false;
    });
    arcLock = true;
  }
});

window.addEventListener('resize', updateArc);
updateArc();


// ============================================================================
// 滾輪換頁：垂直滾輪 → 水平切換卡片
// ============================================================================
let isScrolling = false;  // 冷卻鎖

window.addEventListener('wheel', (e) => {
  if (e.ctrlKey) return;  // 保留 Ctrl+滾輪縮放
  e.preventDefault();

  if (isScrolling || Math.abs(e.deltaY) < 4) return;
  isScrolling = true;

  scrollToCard(nearestIndex() + Math.sign(e.deltaY));
  setTimeout(() => { isScrolling = false; }, 400);
}, { passive: false });


// ============================================================================
// 滑鼠拖曳捲動
// ============================================================================
let isDragging = false;
let dragStartX = 0;
let dragStartScroll = 0;

track.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') return;  // 觸控裝置交給原生捲動與 snap

  isDragging = true;
  dragStartX = e.clientX;
  dragStartScroll = track.scrollLeft;
  track.classList.add('dragging');
  track.setPointerCapture(e.pointerId);
});

track.addEventListener('pointermove', (e) => {
  if (!isDragging) return;
  track.scrollLeft = dragStartScroll - (e.clientX - dragStartX);  // 軌道移動與拖動方向反向
});

/** 結束拖曳並吸附至最近的卡片 */
function endDrag(e) {
  if (!isDragging) return;
  isDragging = false;
  track.classList.remove('dragging');

  if (Math.abs(e.clientX - dragStartX) < 5) {  // 滑鼠移動距離太小判定為點擊
    const clicked = document.elementFromPoint(e.clientX, e.clientY)?.closest('.poem-card');
    if (clicked) {
      scrollToCard(cards.indexOf(clicked));
      return;
    }
  }
  scrollToCard(nearestIndex());
}

track.addEventListener('pointerup', endDrag);
track.addEventListener('pointercancel', endDrag);

// 觸控輕點側邊卡片也能切換
cards.forEach((card, i) => {
  card.addEventListener('click', (e) => {
    if (e.pointerType === 'mouse') return;
    scrollToCard(i);
  });
});


// ============================================================================
// 鍵盤方向鍵切換
// ============================================================================
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') scrollToCard(nearestIndex() + 1);
  if (e.key === 'ArrowLeft') scrollToCard(nearestIndex() - 1);
});
