// ====== 1. 引用模組與基本設定 ======
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// 建立場景物件
const scene = new THREE.Scene();
// 建立相機物件 (POV, 長寬比, 近剪裁面, 遠剪裁面)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 10000);
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
camera.position.set(0, 0, 500);


// ====== 2. 星體類別 ======
class Star {

    // 建構子
    constructor(mass ,color, position, velocity) {
        this.mass = mass;
        // 擴展運算子 ... => 將矩陣轉成獨立數字
        this.velocity = new THREE.Vector3(...velocity);

        // 建立 3D 球體
        // 球體骨架 (半徑, 水平分段數, 垂直分段數)
        const starGeo = new THREE.SphereGeometry(8, 32, 32);
        // 球體皮膚
        const starMat = new THREE.MeshPhongMaterial({color: color, emissive: color, emissiveIntensity: 2});
        // 融合骨架和皮膚並設定位置
        this.mesh = new THREE.Mesh(starGeo, starMat);
        this.mesh.position.set(...position);
        // 建立發光物件跟隨球體
        this.light = new THREE.PointLight(color);
        this.mesh.add(this.light);
        // 將球體放入場景
        scene.add(this.mesh);
        
        // 儲存位置的陣列
        this.points = [];
        // 建立軌跡線
        this.lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5
        });
        this.line = new THREE.Line(this.lineGeo, lineMat);
        scene.add(this.line);
    }

    // 更新速度與位置
    update(acc) {
        // v = v₀ + at
        this.velocity.add(acc.multiplyScalar(dt));
        // s = s₀ + v * ∆t
        this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

        // 儲存軌跡
        const pointsMax = 5000;
        this.points.push(this.mesh.position.clone())
        if (this.points.length > pointsMax) this.points.shift();
        // 把陣列放入軌跡線
        this.lineGeo.setFromPoints(this.points);
    }

}


// ====== 3. 初始化星體與物理參數 ======
const stars = [
    new Star(100, 0xff4444, [200, 0, 0], [35, 45, 0]),    // 紅星
    new Star(100, 0x44ff44, [-200, 0, 0], [35, 45, 0]),  // 綠星
    new Star(100, 0x4444ff, [0, 0, 200], [-70, -90, 0])   // 藍星
];

const Gconst = 20000;  // 萬有引力常數
const dt = 0.005;  // 時間步長 


// ====== 4. 動畫與物理計算的迴圈 ======
function animate() {
    // 在下一次繪製螢幕時會執行這個函式 => 無限迴圈
    requestAnimationFrame(animate);

    // 計算星體間的萬有引力
    stars.forEach((a, i) => {
        let totalAcc = new THREE.Vector3(0, 0, 0);
        stars.forEach((b, j) => {
            if (i == j) return;

            // 位移矢量 r⭢
            const vector = new THREE.Vector3().subVectors(b.mesh.position, a.mesh.position);
            // 距離平方 r²
            const DistSq = vector.lengthSq();
            // 軟化常數平方 ε² => 避免距離太小時數值溢出
            const epsilonSq = 0.1;

            // 重力加速度 a = GM / r² = (GM / r²) * r^ = (GM / r²) * (r⭢ / r) = (GM / r³) * r⭢
            // 先算出 1 / (r² + ε²) ^ 1.5 ≈ 1 / r³
            const invDistCube = 1 / Math.pow(DistSq + epsilonSq, 1.5);
            // 乘上 GMr⭢
            const accG = vector.multiplyScalar(Gconst * b.mass * invDistCube);
            totalAcc.add(accG);
        });
        a.nextAcc = totalAcc;
    });

    // 等全部都算好再套用
    stars.forEach(s => s.update(s.nextAcc));
    // 讓滑鼠能拖曳視角
    controls.update();
    // 執行渲染
    renderer.render(scene, camera);
}

animate();


// --- 5. 處理視窗縮放 ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

