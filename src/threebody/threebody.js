// ============================================================================
// 引用模組與基本設定 
// ============================================================================

import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// 後期處理模組
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {specialSolutions} from './solutions.js';

// 建立場景物件
const scene = new THREE.Scene();
// 建立相機物件
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
// 建立渲染器物件
const renderer = new THREE.WebGLRenderer({antialias: true});
// 滑鼠控制視角
const controls = new OrbitControls(camera, renderer.domElement);

// 設定渲染器的桌布大小
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.display = 'block';
// 將渲染器的 <canvas> 標籤放回 <body>
document.body.appendChild(renderer.domElement);
// 相機位置
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

// 萬有引力常數
const Gconst = 1;
// 時間步長
const dt = 0.005;
// 軟化係數
const epsilon = 1e-6;
// 最大軌跡數 (每秒畫 1/dt 個點)
let pointsMax = 2000;

// 預設星體參數
const star1Mass = 1.0;
const star1Pos = [-1, 0, 0];
const star1Vel = [0.505639, 0.289239, 0.00634784];

const star2Mass = 1.0;
const star2Pos = [1, 0, 0];
const star2Vel = [0.505639, 0.289239, -0.00634784];

const star3Mass = 1.1;
const star3Pos = [0, 0, 0.617173];
const star3Vel = [-0.919344, -0.525889, 0];


// ============================================================================
// UI 控制與事件綁定 (UI Controls & Event Bindings)
// ============================================================================

const refreshBtn = document.querySelector('.refresh-button');
const pauseBtn = document.querySelector('.pause-button');
const pauseIcon = pauseBtn?.querySelector('.material-icons');
const settingBtn = document.querySelector('.setting-button');
const homeBtn = document.querySelector('.home-button');
const settingPanel = document.querySelector('.setting-panel');
const valueBtn = document.querySelector('.value-button');
const solutionBtn = document.querySelector('.solution-button');
const analyzeBtn = document.querySelector('.analyze-button');
const valueTab = document.querySelector('.value-tab');
const solutionTab = document.querySelector('.solution-tab');
const analyzeTab = document.querySelector('.analyze-tab');
const solutionList = document.querySelector('.solution-list');

let isPause = false;

// 頂部按鈕交互
pauseBtn?.addEventListener('click', () => {
    isPause = !isPause;
    pauseIcon.textContent = isPause ? 'play_arrow' : 'pause';
});

settingBtn?.addEventListener('click', () => {
    settingPanel.classList.toggle('show');
});

homeBtn?.addEventListener('click', () => {
    window.location.href = "../../index.html";
});

valueBtn?.addEventListener('click', () => {
    valueBtn.classList.add('show');
    solutionBtn.classList.remove('show');
    analyzeBtn.classList.remove('show');

    valueTab.classList.add('active');
    solutionTab.classList.remove('active');
    analyzeTab.classList.remove('active');
});

solutionBtn?.addEventListener('click', () => {
    solutionBtn.classList.add('show');
    valueBtn.classList.remove('show');
    analyzeBtn.classList.remove('show');

    solutionTab.classList.add('active');
    valueTab.classList.remove('active');
    analyzeTab.classList.remove('active');
});

analyzeBtn?.addEventListener('click', () => {
    analyzeBtn.classList.add('show');
    valueBtn.classList.remove('show');
    solutionBtn.classList.remove('show');

    analyzeTab.classList.add('active');
    valueTab.classList.remove('active');
    solutionTab.classList.remove('active');
});


// ============================================================================
// 數據同步與參數控制 (Data Synchronization)
// ============================================================================

const pointInput = document.querySelector('#point-time-input');
const pointTooltip = document.querySelector('.range-tooltip');

/**
 * 更新軌跡長度拉桿的 Tooltip 顯示位置與數值
 */
function updateRangeTooltip() {
    const val = parseInt(pointInput.value) || 0;
    const min = parseInt(pointInput.min) || 0;
    const max = parseInt(pointInput.max) || 60;
    // 計算百分比與 CSS 修正偏移
    const percent = (val - min) / (max - min);
    pointTooltip.textContent = val;
    pointTooltip.style.left = `calc(${percent * 100}% + ${8 - percent * 16}px)`;
}

// 軌跡長度拉桿監聽
pointInput?.addEventListener('input', (e) => {
    updateRangeTooltip();
    
    pointsMax = parseInt(e.target.value) / dt;
    
    // 即時裁切軌跡
    stars.forEach(s => {
        while (s.points.length > pointsMax) {
            s.points.shift();
        }
        // 如果新的最大軌跡點數大於現有的顏色陣列容量，則重新分配更大的空間
        if (s.colorArr.length < pointsMax * 3) {
            const newColorArr = new Float32Array(pointsMax * 3);
            newColorArr.fill(1.0);
            newColorArr.set(s.colorArr); // 複製並保留原有的顏色資料
            s.colorArr = newColorArr;
            // 替換為新的 BufferAttribute 讓 WebGL 知道緩衝區大小已改變
            s.lineGeo.setAttribute('color', new THREE.BufferAttribute(s.colorArr, 3));
        }
    });
});

/**
 * 將當前的星體物理狀態 (質量、位置、速度) 反向同步至 UI 輸入面板
 */
function syncInputVar() {
    pointInput.value = Math.floor(pointsMax * dt);
    updateRangeTooltip();

    const starData = [
        {prefix: 'star1', index: 0},
        {prefix: 'star2', index: 1},
        {prefix: 'star3', index: 2}
    ];
    starData.forEach(data => {
        const s = stars[data.index];

        const massIn = document.getElementById(`${data.prefix}-mass-input`);
        massIn.value = s.mass;

        const Axis = ['X', 'Y', 'Z'];
        Axis.forEach((axis, i) => {
            const posIn = document.getElementById(`${data.prefix}-pos${axis}-input`);
            posIn.value = s.currPos.getComponent(i);
            const velIn = document.getElementById(`${data.prefix}-vel${axis}-input`);
            velIn.value = s.velocity.getComponent(i);
        });
    });
}

// 動態生成特殊解選單的按鈕
specialSolutions.forEach(solution => {
    const btn = document.createElement('button');
    btn.textContent = solution.name;
    
    btn.addEventListener('click', () => {
        // 將預設資料填入對應的輸入框中
        solution.stars.forEach((starData, index) => {
            const prefix = `star${index + 1}`;
            document.getElementById(`${prefix}-mass-input`).value = starData.mass;
            
            ['X', 'Y', 'Z'].forEach((axis, i) => {
                document.getElementById(`${prefix}-pos${axis}-input`).value = starData.pos[i];
                document.getElementById(`${prefix}-vel${axis}-input`).value = starData.vel[i];
            });
        });
        // 觸發重整按鈕的點擊事件來套用參數並重啟動畫
        refreshBtn.click();
    });
    solutionList?.appendChild(btn);
});

// 重新載入模擬狀態
refreshBtn?.addEventListener('click', () => {
    
    isPause = true;
    const starConfings = [
        {prefix: 'star1', index: 0},
        {prefix: 'star2', index: 1},
        {prefix: 'star3', index: 2}
    ];

    // 調整星體參數
    starConfings.forEach(cfg => {
        const s = stars[cfg.index];

        const m = parseFloat(document.getElementById(`${cfg.prefix}-mass-input`).value) || 1.0;
        const px = parseFloat(document.getElementById(`${cfg.prefix}-posX-input`).value) || 0;
        const py = parseFloat(document.getElementById(`${cfg.prefix}-posY-input`).value) || 0;
        const pz = parseFloat(document.getElementById(`${cfg.prefix}-posZ-input`).value) || 0;
        const vx = parseFloat(document.getElementById(`${cfg.prefix}-velX-input`).value) || 0;
        const vy = parseFloat(document.getElementById(`${cfg.prefix}-velY-input`).value) || 0;
        const vz = parseFloat(document.getElementById(`${cfg.prefix}-velZ-input`).value) || 0;

        s.mass = m;
        s.currPos.set(px, py, pz);
        s.velocity.set(vx, vy, vz);

        // 重置為初始動量狀態 S₀ = S - v * dt
        s.oldPos.copy(s.currPos).sub(s.velocity.clone().multiplyScalar(dt));

        s.points = [];
        s.updateTick = 0;
        // 清理 GPU Buffer
        s.lineGeo.setFromPoints([]);
    });

    syncCenterMass();
    syncInputVar();
    
    camera.position.set(0, 0, 3);
    settingPanel.classList.remove('show');

    setTimeout(() => {
        isPause = false;
        pauseIcon.textContent = 'pause';
    }, 100);

});

const tmpVelMonitor = new THREE.Vector3();
/**
 * 實時更新數據監測面板的資料  
 * 只有該分頁啟動時才會執行以節省效能
 */
function syncAnalyzeData() {
    // 效能優化：如果沒有打開此面板，則直接 Return
    if (!analyzeTab.classList.contains('active')) return;

    const doms = [
        { pos: document.getElementById('monitor-s1-pos'), vel: document.getElementById('monitor-s1-vel') },
        { pos: document.getElementById('monitor-s2-pos'), vel: document.getElementById('monitor-s2-vel') },
        { pos: document.getElementById('monitor-s3-pos'), vel: document.getElementById('monitor-s3-vel') }
    ];

    // 將向量格式化為小數點後 3 位的字串
    const formatVec = (v) => `${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}`;

    stars.forEach((s, i) => {
        // 由於使用 Verlet 積分，真實瞬時速度需藉由: v = (currPos - oldPos) / dt 推導
        tmpVelMonitor.subVectors(s.currPos, s.oldPos).divideScalar(dt);
        
        doms[i].pos.textContent = formatVec(s.currPos);
        doms[i].vel.textContent = formatVec(tmpVelMonitor);
    });
}


// ============================================================================
// 核心物理類別: 星體 (Star Class Definition)
// ============================================================================
// 宣告全域暫存向量，避免在迴圈或渲染週期內頻繁 GC (Garbage Collection)
const tmpPos = new THREE.Vector3();
const capPos = new THREE.Vector3();

class Star {

    constructor(color, mass ,position, velocity) {
        this.lineColor = new THREE.Color(color);
        this.mass = mass;
        
        this.velocity = new THREE.Vector3(...velocity);
        this.currPos = new THREE.Vector3(...position);
        this.oldPos = this.currPos.clone().sub(this.velocity.clone().multiplyScalar(dt));
        this.nextAcc = new THREE.Vector3(0, 0, 0);
        
        // 預先分配 TypedArray 作為軌跡顏色 (RGB 三個單位決定) 的記憶體區塊
        this.colorArr = new Float32Array(pointsMax * 3);
        this.colorArr.fill(1.0);  // 將軌跡陣列填充為白色

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
        // 融合骨架和皮膚並設定位置
        this.mesh = new THREE.Mesh(starGeo, starMat);
        this.mesh.position.copy(this.currPos);
        scene.add(this.mesh);
        
        this.points = [];
        // 初始化軌跡線段 (BufferGeometry 提升效能)
        this.lineGeo = new THREE.BufferGeometry();
        this.lineGeo.setAttribute('color', new THREE.BufferAttribute(this.colorArr, 3));
        const lineMat = new THREE.LineBasicMaterial({
            vertexColors: true, 
            transparent: true,
            opacity: 0.8,
        });
        this.line = new THREE.Line(this.lineGeo, lineMat);
        scene.add(this.line);
        // 關閉視錐體裁剪，避免軌跡在相機視角邊緣消失
        this.line.frustumCulled = false;

        // 更新頻率計數器
        this.updateTick = 0;
    }

    /**
     * 更新星體物理狀態 (基於 Verlet Integration 韋爾萊積分法)
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

        this.points.push(this.currPos.clone());
        if (this.points.length > pointsMax) this.points.shift();
        this.lineGeo.setFromPoints(this.points);

        // 軌跡尾巴漸變淡出運算
        if (this.updateTick >= 10) {  // 降低頻率以優化效能
            const pointCount = this.points.length;

            for (let i = 0; i < pointCount; ++i) {
                // 目前的點在軌跡線的比例
                const part = i / (pointCount - 1);
                let ratio = (part < 0.2) ? (0.1 + (0.9) * (part / 0.2)) : 1.0;

                this.colorArr[i * 3] = this.lineColor.r * ratio;
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
// 應用實例化 (Instance Initialization)
// ============================================================================
let stars = [
    new Star(0xff6600, star1Mass, star1Pos, star1Vel),  // 橘星
    new Star(0x66ccff, star2Mass, star2Pos, star2Vel),  // 藍星
    new Star(0xfff0b3, star3Mass, star3Pos, star3Vel)   // 白星
];


// ============================================================================
// 物理模擬主迴圈 (Main Physics Loop)
// ============================================================================
const vector = new THREE.Vector3();         // 位移矢量
const accG = new THREE.Vector3();           // 加速度
const centerMassPos = new THREE.Vector3();  // 質心位置
const tmpCMCalc = new THREE.Vector3();      // 質心計算暫存

function animate() {
    requestAnimationFrame(animate);

    if (!isPause) {
        // N-Body 萬有引力計算 (O(N^2) 複雜度)
        stars.forEach((a, i) => {

            a.nextAcc.set(0, 0, 0);

            stars.forEach((b, j) => {
                if (i === j) return;

                vector.subVectors(b.currPos, a.currPos);
                const distSq = vector.lengthSq();
                const epsilonSq = epsilon * epsilon;

                // 萬有引力向量化公式: a = (GM / r³) * r⭢ 
                const invDistCube = 1 / Math.pow(distSq + epsilonSq, 1.5);
                accG.copy(vector).multiplyScalar(Gconst * b.mass * invDistCube);
                a.nextAcc.add(accG);
            });

        });

        stars.forEach(s => s.update(s.nextAcc));

        syncCenterMass();
    }
    
    controls.update();
    composer.render();

    // 更新數據監測面板
    syncAnalyzeData();
}

/**
 * 系統質心修正 (Center of Mass Drift Correction)  
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

stars.forEach(s => s.points = []);
animate();


// ============================================================================
// 背景星空系統 (Background Star System)
// ============================================================================
const maxStarNum = 5000;
const createBackgroundStars = () => {
    // 儲存星星座標
    const array = [];
    for (let i = 0; i < maxStarNum; ++i) {
        let x, y, z;
        do {
            // 生成分佈於 2000 單位立方體內的座標，但避開中心 100 單位區域以防穿模
            x = (Math.random() - 0.5) * 2000;
            y = (Math.random() - 0.5) * 2000;
            z = (Math.random() - 0.5) * 2000;
        } while (
            Math.abs(x) < 100 && Math.abs(y) < 100 && Math.abs(z) < 100
        );
        array.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(array, 3));

    const loader = new THREE.TextureLoader();
    const starTexture = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/disc.png');

    // 使用 Points 材質進行大規模粒子渲染
    const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        map: starTexture,
        sizeAttenuation: true,  // 開啟透視尺寸衰減
        transparent: true,
        alphaTest: 0.5,         // 捨棄透明度低於此閾值的像素以節省效能
    });
    const backgroundStars = new THREE.Points(geometry, material);
    scene.add(backgroundStars);
};
createBackgroundStars();


// ============================================================================
// 視窗事件監聽 (Window Events Binding)
// ============================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});