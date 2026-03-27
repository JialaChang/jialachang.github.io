// ====== 1. 引用模組與基本設定 ======
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
// 後期處理模組
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';

// 建立場景物件
const scene = new THREE.Scene();
// 建立相機物件 (POV, 長寬比, 近剪裁面, 遠剪裁面)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
// 建立渲染器物件 (反鋸齒)
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


// ====== 2. UI 交互 ======
const pauseBtn = document.querySelector('.pause-button');
const pauseIcon = pauseBtn?.querySelector('.material-icons');
const settingBtn = document.querySelector('.setting-button');
const homeBtn = document.querySelector('.home-button');

let isPause = false;

// 按鈕交互
pauseBtn?.addEventListener('click', () => {
    isPause = !isPause;
    pauseIcon.textContent = isPause ? 'play_arrow' : 'pause';
});

homeBtn?.addEventListener('click', () => {
    window.location.href = "../index.html";
});

// ====== 3. 物理參數 ======
// 萬有引力常數
const Gconst = 1;
// 時間步長
const dt = 0.003;

// 星體參數
const star1Mass = 1; 
const star1Pos = [-1.2, 0, 0.3];
const star1Vel = [0.4, 0.2, 0];

const star2Mass = 1;
const star2Pos = [1.2, 0.5, 0];
const star2Vel = [0, -0.2, -0.3];

const star3Mass = 1;
const star3Pos = [0.5, 0, -2];
const star3Vel = [0.2, 0, 0.1];

// 最大軌跡數
const pointsMax = 5000;


// ====== 4. 添加背景星星 ======
const maxStarNum = 5000;  // 星星數量
const createBackgroundStars = () => {
    // 儲存星星座標
    const array = [];
    for (let i = 0; i < maxStarNum; ++i) {
        let x, y, z;
        do {
            x = (Math.random() - 0.5) * 2000;
            y = (Math.random() - 0.5) * 2000;
            z = (Math.random() - 0.5) * 2000;
        } while (
            Math.abs(x) < 100 && Math.abs(y) < 100 && Math.abs(x) < 100
        );
        array.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    // GPU 加速
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(array, 3));

    // 使用圓形貼圖
    const loader = new THREE.TextureLoader();
    const starTexture = loader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/disc.png');

    // 渲染星星
    const material = new THREE.PointsMaterial({
        color: 0xffffff,        // 白色
        size: 1.5,
        map: starTexture,
        sizeAttenuation: true,  // 尺寸衰減
        transparent: true,
        alphaTest: 0.5,         // 設定渲染門檻
    });
    const backgroundStars = new THREE.Points(geometry, material);
    scene.add(backgroundStars);
};
createBackgroundStars();


// ====== 5. 星體建構及更新加速度 ======
// 建立全域變數，避免一直 new 新物件
const tmpPos = new THREE.Vector3();
const capPos = new THREE.Vector3();

class Star {

    // 建構子
    constructor(color, mass ,position, velocity) {
        this.mass = mass;
        // 擴展運算子 ... => 將矩陣轉成獨立數字
        this.velocity = new THREE.Vector3(...velocity);
        // 現在的位置
        this.currPos = new THREE.Vector3(...position);
        // 前一幀的位置 => S₀ = S - v * dt
        this.oldPos = this.currPos.clone().sub(this.velocity.clone().multiplyScalar(dt))
        // 預先宣告變數
        this.nextAcc = new THREE.Vector3(0, 0, 0);

        // 建立 3D 球體
        // 球體骨架 (半徑, 水平分段數, 垂直分段數)
        const starGeo = new THREE.SphereGeometry(0.05, 32, 32);
        // 球體皮膚
        const starMat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2.5,
            transparent: true,
            alphaTest: 0.9,
        });
        // 融合骨架和皮膚並設定位置
        this.mesh = new THREE.Mesh(starGeo, starMat);
        this.mesh.position.copy(this.currPos);
        // 將球體放入場景
        scene.add(this.mesh);
        
        // 儲存位置的陣列
        this.points = [];
        // 建立軌跡線
        this.lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8
        });
        this.line = new THREE.Line(this.lineGeo, lineMat);
        scene.add(this.line);
        // 永久渲染軌跡線
        this.line.frustumCulled = false;
    }

    // 更新速度與位置
    update(acc) {
        // 暫存位置
        tmpPos.copy(this.currPos);
        // ∆x = x_now - x_prev
        capPos.subVectors(this.currPos, this.oldPos);
        // Verlet 公式: x_next = 2x_now - x_prev + a * dt²
        // => x_now + (x_now - x_prev) + a * dt²
        this.currPos.add(capPos).add(acc.multiplyScalar(dt * dt));
        // 更新舊位置
        this.oldPos.copy(tmpPos);
        // 更新星體位置
        this.mesh.position.copy(this.currPos);

        // 儲存軌跡
        this.points.push(this.currPos.clone())
        if (this.points.length > pointsMax) this.points.shift();
        // 把陣列放入軌跡線
        this.lineGeo.setFromPoints(this.points);
    }

}


// ====== 6. 初始化星體 ======
const stars = [
    new Star(0xff6600, star1Mass, star1Pos, star1Vel),  // 橘星
    new Star(0x66ccff, star2Mass, star2Pos, star2Vel),  // 藍星
    new Star(0xfff0b3, star3Mass, star3Pos, star3Vel)   // 白星
];


// ====== 7. 設置後期處理 ======
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


// ====== 8. 動畫與物理計算的迴圈 ======
const vector = new THREE.Vector3();         // 位移矢量
const accG = new THREE.Vector3();           // 加速度
const centerMassPos = new THREE.Vector3();  // 質心位置
const tmpCMCalc = new THREE.Vector3();      // 質心計算暫存

function animate() {
    // 在下一次繪製螢幕時會執行這個函式 => 無限迴圈
    requestAnimationFrame(animate);

    if (!isPause) {
        // 計算星體間的萬有引力
        stars.forEach((a, i) => {
            stars.forEach((b, j) => {
                if (i == j) return;

                // 位移矢量 r⭢
                vector.subVectors(b.currPos, a.currPos);
                // 距離平方 r²
                const DistSq = vector.lengthSq();
                // 軟化常數平方 ε² => 避免距離太小時數值溢出
                const epsilonSq = 1e-12;

                // 重力加速度 a = GM / r² = (GM / r²) * r^ = (GM / r²) * (r⭢ / r) = (GM / r³) * r⭢
                // 先算出 1 / (r² + ε²) ^ 1.5 ≈ 1 / r³
                const invDistCube = 1 / Math.pow(DistSq + epsilonSq, 1.5);
                // 乘上 GMr⭢
                accG.copy(vector).multiplyScalar(Gconst * b.mass * invDistCube);
                a.nextAcc.add(accG);
            });
        });

        // 等全部都算好再套用
        stars.forEach(s => s.update(s.nextAcc));

        // 計算質心 Rcm⭢ = Σ(m * r⭢) / Σm
        let totalMass = 0;
        centerMassPos.set(0, 0, 0);
        stars.forEach(s => {
            totalMass += s.mass;
            tmpCMCalc.copy(s.currPos).multiplyScalar(s.mass);
            centerMassPos.add(tmpCMCalc);
        });
        centerMassPos.divideScalar(totalMass)
        // 質心修正
        stars.forEach(s => {
            s.currPos.sub(centerMassPos);
            s.oldPos.sub(centerMassPos);
            s.mesh.position.copy(s.currPos);
        });
    }
    
    // 讓滑鼠能拖曳視角
    controls.update();
    // 執行渲染
    composer.render();
}

// 執行質心修正
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
// 把軌跡清空
stars.forEach(s => s.points = []);
// 開始動畫
animate();


// ====== 9. 處理視窗縮放 =====
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // 更新後期處理的分辨率
    composer.setSize(window.innerWidth, window.innerHeight);
    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
});