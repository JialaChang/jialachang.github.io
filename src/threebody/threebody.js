console.log("「太陽快落下去了，你們的孩子居然不害怕？」\n「當然不害怕，她知道明天太陽還會升起來的。」")
// ============================================================================
// 引用模組與基本設定
// ============================================================================
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {specialSolutions} from './solutions.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer({antialias: true});
const controls = new OrbitControls(camera, renderer.domElement);

renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.display = 'block';
document.body.appendChild(renderer.domElement);
camera.position.set(0, 0, 3);


// ============================================================================
// 設置後期處理
// ============================================================================
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,  // 強度
  1.2,  // 半徑
  0.1   // 閾值
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);


// ============================================================================
// 設定物理參數
// ============================================================================
const Gconst = 1;      // 萬有引力常數
const dt = 0.005;      // 時間步長
const epsilon = 1e-6;  // 軟化係數
let pointsMax = 1800;  // 最大軌跡點數
const stepInterval = 1 / 120;  // 渲染每步在真實時間中佔多少秒

const starInitConfig = [
  { // 橘星
    color: 0xff6600,
    mass: 1.0,
    pos: [-1, 0, 0],
    vel: [0.505639,  0.289239,  0.00634784]
  },
  { // 藍星
    color: 0x66ccff,
    mass: 1.0,
    pos: [1, 0, 0],
    vel: [0.505639,  0.289239, -0.00634784]
  },
  { // 白星
    color: 0xfff0b3,
    mass: 1.1,
    pos: [0, 0, 0.617173],
    vel: [-0.919344, -0.525889, 0]
  },
];

const starPrefixes = ['star1', 'star2', 'star3'];


// ============================================================================
// UI 控制與事件綁定
// ============================================================================
const refreshBtn  = document.querySelector('.refresh-button');
const pauseBtn    = document.querySelector('.pause-button');
const pauseIcon   = pauseBtn?.querySelector('#pause-icon path');
const PAUSE_PATH_D = 'M6 19h4V5H6v14zm8-14v14h4V5h-4z';
const PLAY_PATH_D  = 'M8 5v14l11-7z';
const settingBtn  = document.querySelector('.setting-button');
const homeBtn     = document.querySelector('.home-button');
const settingPanel = document.querySelector('.setting-panel');
const solutionList = document.querySelector('.solution-list');

let isPause = false;

pauseBtn?.addEventListener('click', () => {
  isPause = !isPause;
  pauseIcon.setAttribute('d', isPause ? PLAY_PATH_D : PAUSE_PATH_D);
});

settingBtn?.addEventListener('click', () => {
  settingPanel.classList.toggle('show');
});

homeBtn?.addEventListener('click', () => {
  window.location.href = "../../index.html";
});

// 分頁切換
const tabs = [
  { btn: document.querySelector('.value-button'),    tab: document.querySelector('.value-tab')    },
  { btn: document.querySelector('.solution-button'), tab: document.querySelector('.solution-tab') },
  { btn: document.querySelector('.analyze-button'),  tab: document.querySelector('.analyze-tab')  },
];

tabs.forEach(({ btn, tab }) => {
  btn?.addEventListener('click', () => {
    tabs.forEach(t => {
      t.btn.classList.toggle('show',   t.tab === tab);
      t.tab.classList.toggle('active', t.tab === tab);
    });
  });
});

const analyzeTab = tabs[2].tab;


// ============================================================================
// 數據同步與參數控制
// ============================================================================
const pointInput   = document.querySelector('#point-time-input');
const pointTooltip = document.querySelector('.range-tooltip');

// 快取監測面板的 DOM 節點，避免在 animate() 迴圈內重複查詢
const monitorDoms = starPrefixes.map((_, i) => ({
  pos: document.getElementById(`monitor-s${i + 1}-pos`),
  vel: document.getElementById(`monitor-s${i + 1}-vel`),
}));

/**
 * 更新軌跡長度拉桿的 Tooltip 顯示位置與數值
 */
function updateRangeTooltip() {
  const val = parseInt(pointInput.value) || 0;
  const min = parseInt(pointInput.min)   || 0;
  const max = parseInt(pointInput.max)   || 60;
  // 計算百分比並修正 thumb 偏移，使 tooltip 對齊滑塊中心
  const percent = (val - min) / (max - min);
  pointTooltip.textContent = val;
  pointTooltip.style.left = `calc(${percent * 100}% + ${8 - percent * 16}px)`;
}

pointInput?.addEventListener('input', (e) => {
  updateRangeTooltip();
  pointsMax = parseInt(e.target.value) / stepInterval;

  stars.forEach(s => {
    // 若軌跡點數超出新的上限，原地左移捨棄最舊的多餘點
    if (s.pointCount > pointsMax) {
      const excess = s.pointCount - pointsMax;
      s.positionArr.copyWithin(0, excess * 3, s.pointCount * 3);
      s.pointCount = pointsMax;
    }

    // 若新的上限超過現有容量，重新分配更大的 TypedArray
    if (s.positionArr.length < pointsMax * 3) {
      const newPositionArr = new Float32Array(pointsMax * 3);
      newPositionArr.set(s.positionArr);
      s.positionArr = newPositionArr;
      // 替換 BufferAttribute 讓 WebGL 知道緩衝區大小已改變
      s.lineGeo.setAttribute('position', new THREE.BufferAttribute(s.positionArr, 3));

      const newColorArr = new Float32Array(pointsMax * 3);
      newColorArr.fill(1.0);
      newColorArr.set(s.colorArr);
      s.colorArr = newColorArr;
      s.lineGeo.setAttribute('color', new THREE.BufferAttribute(s.colorArr, 3));
    }
    s.lineGeo.setDrawRange(0, s.pointCount);
  });
});

/**
 * 將當前的星體物理狀態 (質量、位置、速度) 反向同步至 UI 輸入面板
 */
function syncInputVar() {
  pointInput.value = Math.floor(pointsMax * stepInterval);
  updateRangeTooltip();

  stars.forEach((s, i) => {
    const prefix = starPrefixes[i];
    document.getElementById(`${prefix}-mass-input`).value = s.mass;

    ['X', 'Y', 'Z'].forEach((axis, j) => {
      document.getElementById(`${prefix}-pos${axis}-input`).value = s.currPos.getComponent(j);
      document.getElementById(`${prefix}-vel${axis}-input`).value = s.velocity.getComponent(j);
    });
  });
}

specialSolutions.forEach(solution => {
  const btn = document.createElement('button');
  btn.textContent = solution.name;

  btn.addEventListener('click', () => {
    solution.stars.forEach((starData, i) => {
      const prefix = starPrefixes[i];
      document.getElementById(`${prefix}-mass-input`).value = starData.mass;

      ['X', 'Y', 'Z'].forEach((axis, j) => {
        document.getElementById(`${prefix}-pos${axis}-input`).value = starData.pos[j];
        document.getElementById(`${prefix}-vel${axis}-input`).value = starData.vel[j];
      });
    });
    // 觸發重整按鈕的點擊事件來套用參數並重啟動畫
    refreshBtn.click();
  });
  solutionList?.appendChild(btn);
});

refreshBtn?.addEventListener('click', () => {
  isPause = true;

  stars.forEach((s, i) => {
    const prefix = starPrefixes[i];

    const m  = parseFloat(document.getElementById(`${prefix}-mass-input`).value) || 1.0;
    const px = parseFloat(document.getElementById(`${prefix}-posX-input`).value) || 0;
    const py = parseFloat(document.getElementById(`${prefix}-posY-input`).value) || 0;
    const pz = parseFloat(document.getElementById(`${prefix}-posZ-input`).value) || 0;
    const vx = parseFloat(document.getElementById(`${prefix}-velX-input`).value) || 0;
    const vy = parseFloat(document.getElementById(`${prefix}-velY-input`).value) || 0;
    const vz = parseFloat(document.getElementById(`${prefix}-velZ-input`).value) || 0;

    s.mass = m;
    s.currPos.set(px, py, pz);
    s.velocity.set(vx, vy, vz);

    // 重置為初始動量狀態 S₀ = S - v * dt
    s.oldPos.copy(s.currPos).sub(s.velocity.clone().multiplyScalar(dt));

    s.pointCount = 0;
    s.updateTick = 0;
    // 清理 GPU Buffer
    s.lineGeo.setDrawRange(0, 0);
  });

  syncCenterMass();
  syncInputVar();

  camera.position.set(0, 0, 3);
  settingPanel.classList.remove('show');

  setTimeout(() => {
    isPause = false;
    pauseIcon.setAttribute('d', PAUSE_PATH_D);
  }, 100);
});

const tmpVelMonitor = new THREE.Vector3();
let lastAnalyzeTime = 0;
/**
 * 實時更新數據監測面板的資料
 * 只有該分頁啟動時才會執行
 */
function syncAnalyzeData(timestamp) {
  // 效能優化：面板未開啟時提前返回
  if (!analyzeTab.classList.contains('active')) return;
  if (timestamp - lastAnalyzeTime < 50) return;  // 每 100ms 更新一次
  lastAnalyzeTime = timestamp;

  const formatVec = (v) => `${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}`;

  stars.forEach((s, i) => {
    // 由於使用 Verlet 積分，真實瞬時速度需藉由: v = (currPos - oldPos) / dt 推導
    tmpVelMonitor.subVectors(s.currPos, s.oldPos).divideScalar(dt);
    monitorDoms[i].pos.textContent = formatVec(s.currPos);
    monitorDoms[i].vel.textContent = formatVec(tmpVelMonitor);
  });
}


// ============================================================================
// 核心物理類別: 星體
// ============================================================================
// 宣告全域暫存向量，避免在迴圈或渲染週期內頻繁 GC (Garbage Collection)
const tmpPos = new THREE.Vector3();
const capPos = new THREE.Vector3();

/**
 * 代表模擬中的一顆星體，管理其物理狀態（位置、速度）與視覺呈現（球體網格、軌跡線）。
 */
class Star {
  /**
   * @param {number} color - 星體顏色（十六進位色碼）
   * @param {number} mass - 質量
   * @param {number[]} position - 初始位置 [x, y, z]
   * @param {number[]} velocity - 初始速度 [x, y, z]
   */
  constructor(color, mass, position, velocity) {
    this.lineColor = new THREE.Color(color);
    this.mass = mass;

    this.velocity = new THREE.Vector3(...velocity);
    this.currPos  = new THREE.Vector3(...position);
    this.oldPos   = this.currPos.clone().sub(this.velocity.clone().multiplyScalar(dt));
    this.nextAcc  = new THREE.Vector3(0, 0, 0);

    // 預先分配 TypedArray 作為軌跡顏色 (RGB 三個單位決定) 的記憶體區塊
    this.colorArr = new Float32Array(pointsMax * 3);
    this.colorArr.fill(1.0);  // 1.0 對應 RGB 白色

    // 預先分配 TypedArray 作為軌跡頂點位置的記憶體區塊
    this.positionArr = new Float32Array(pointsMax * 3);
    this.pointCount = 0;

    // 建立視覺化球體 (Mesh)
    const starGeo = new THREE.SphereGeometry(0.05, 32, 32);
    const starMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 2.5,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.9,
    });
    this.mesh = new THREE.Mesh(starGeo, starMat);
    this.mesh.position.copy(this.currPos);
    scene.add(this.mesh);

    // 初始化軌跡線段 (BufferGeometry 提升效能)
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(this.positionArr, 3));
    this.lineGeo.setAttribute('color', new THREE.BufferAttribute(this.colorArr, 3));
    this.lineGeo.setDrawRange(0, 0);
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });
    this.line = new THREE.Line(this.lineGeo, lineMat);
    scene.add(this.line);
    // 關閉視錐體裁剪，避免軌跡在相機視角邊緣消失
    this.line.frustumCulled = false;

    this.updateTick = 0;
  }

  /**
   * 更新星體物理狀態，基於韋爾萊積分法
   * @param {THREE.Vector3} acc - 當前作用於該星體的加速度向量
   */
  update(acc) {
    this.updateTick++;
    tmpPos.copy(this.currPos);

    capPos.subVectors(this.currPos, this.oldPos);
    // Verlet 積分推導: x_next = x_now + (x_now - x_prev) + a * dt²
    this.currPos.add(capPos).add(acc.multiplyScalar(dt * dt));

    this.oldPos.copy(tmpPos);
    this.mesh.position.copy(this.currPos);

    if (this.pointCount < pointsMax) {
      // 緩衝區尚未填滿：直接寫入下一個插槽
      this.positionArr[this.pointCount * 3]     = this.currPos.x;
      this.positionArr[this.pointCount * 3 + 1] = this.currPos.y;
      this.positionArr[this.pointCount * 3 + 2] = this.currPos.z;
      this.pointCount++;
    } else {
      // 緩衝區已滿：原地左移捨棄最舊的點，新點寫入尾端
      this.positionArr.copyWithin(0, 3, this.pointCount * 3);
      this.positionArr[(this.pointCount - 1) * 3]     = this.currPos.x;
      this.positionArr[(this.pointCount - 1) * 3 + 1] = this.currPos.y;
      this.positionArr[(this.pointCount - 1) * 3 + 2] = this.currPos.z;
    }
    this.lineGeo.attributes.position.needsUpdate = true;
    this.lineGeo.setDrawRange(0, this.pointCount);

    // 軌跡尾巴漸變淡出運算
    if (this.updateTick >= 10) {  // 降低頻率以優化效能
      const pointCount = this.pointCount;
      for (let i = 0; i < pointCount; ++i) {
        const part = i / (pointCount - 1);
        const ratio = (part < 0.2) ? (0.1 + 0.9 * (part / 0.2)) : 1.0;
        this.colorArr[i * 3]     = this.lineColor.r * ratio;
        this.colorArr[i * 3 + 1] = this.lineColor.g * ratio;
        this.colorArr[i * 3 + 2] = this.lineColor.b * ratio;
      }
      // 標記為需更新，觸發 Three.js 重新提交資料至 GPU
      this.lineGeo.attributes.color.needsUpdate = true;
      this.updateTick = 0;
    }
  }
}


// ============================================================================
// 應用實例化
// ============================================================================
let stars = starInitConfig.map(cfg => new Star(cfg.color, cfg.mass, cfg.pos, cfg.vel));


// ============================================================================
// 物理模擬主迴圈
// ============================================================================
const vector       = new THREE.Vector3();  // 位移矢量
const accG         = new THREE.Vector3();  // 加速度
const centerMassPos = new THREE.Vector3(); // 質心位置
const tmpCMCalc    = new THREE.Vector3();  // 質心計算暫存

let lastTime = null;

/**
 * 主渲染與物理迴圈，每影格呼叫一次：以固定步長 stepInterval 累積時間並執行
 * N 體重力積分，再驅動控制器與後製渲染。
 * @param {number} timestamp - requestAnimationFrame 提供的時間戳記（毫秒）
 */
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (lastTime === null) {lastTime = timestamp;}
  const elapsed = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (!isPause) {
    let accumulator = elapsed;
    while (accumulator >= stepInterval) {
      // N-Body 萬有引力計算 (O(N²) 複雜度)
      stars.forEach((a, i) => {
        a.nextAcc.set(0, 0, 0);

        stars.forEach((b, j) => {
          if (i === j) return;

          vector.subVectors(b.currPos, a.currPos);
          const distSq     = vector.lengthSq();
          const epsilonSq  = epsilon * epsilon;

          // 萬有引力向量化公式: a = (GM / r³) * r⭢
          const invDistCube = 1 / Math.pow(distSq + epsilonSq, 1.5);
          accG.copy(vector).multiplyScalar(Gconst * b.mass * invDistCube);
          a.nextAcc.add(accG);
        });
      });

      stars.forEach(s => s.update(s.nextAcc));
      syncCenterMass();
      accumulator -= stepInterval;
    }
  }

  controls.update();
  composer.render();
  syncAnalyzeData(timestamp);
}

/**
 * 系統質心修正
 * 避免因為數值積分誤差導致整個多體系統朝特定方向漂移
 */
function syncCenterMass() {
  let totalMass = 0;
  centerMassPos.set(0, 0, 0);
  stars.forEach(s => {
    totalMass += s.mass;
    tmpCMCalc.copy(s.currPos).multiplyScalar(s.mass);
    centerMassPos.add(tmpCMCalc);
  });
  centerMassPos.divideScalar(totalMass);
  stars.forEach(s => {
    s.currPos.sub(centerMassPos);
    s.oldPos.sub(centerMassPos);
    s.mesh.position.copy(s.currPos);
  });
}

syncCenterMass();
syncInputVar();

stars.forEach(s => { s.pointCount = 0; s.lineGeo.setDrawRange(0, 0); });
requestAnimationFrame(animate);


// ============================================================================
// 背景星空系統
// ============================================================================
const maxStarNum = 5000;
/**
 * 以 Canvas 動態繪製一張圓形漸層貼圖，作為星點 sprite 使用。
 */
const createStarSpriteTexture = () => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0,   'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,1)');
  gradient.addColorStop(1,   'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

/**
 * 產生大量隨機分布的背景星點並加入場景。
 */
const createBackgroundStars = () => {
  const array = [];
  for (let i = 0; i < maxStarNum; ++i) {
    let x, y, z;
    do {
      x = (Math.random() - 0.5) * 2000;
      y = (Math.random() - 0.5) * 2000;
      z = (Math.random() - 0.5) * 2000;
    } while (Math.abs(x) < 100 && Math.abs(y) < 100 && Math.abs(z) < 100);
    array.push(x, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(array, 3));

  const starTexture = createStarSpriteTexture();

  // 使用 Points 材質進行大規模粒子渲染
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    map: starTexture,
    sizeAttenuation: true,  // 開啟透視尺寸衰減
    transparent: true,
    alphaTest: 0.5,         // 捨棄透明度低於此閾值的像素
  });
  const backgroundStars = new THREE.Points(geometry, material);
  scene.add(backgroundStars);
};
createBackgroundStars();


// ============================================================================
// 視窗事件監聽
// ============================================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});