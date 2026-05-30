// --- ゲームデータ ---
let gameState = {
    money: 15,
    kitchen: { lv: 1, stock: 0, timer: 0, baseCost: 10, speed: 1.0, cap: 1 },
    serve: { lv: 1, stock: 0, timer: 0, baseCost: 15, speed: 1.5, cap: 1 },
    cash: { lv: 1, stock: 0, timer: 0, baseCost: 20, speed: 2.0, cap: 1 }
};
const RAMEN_PRICE = 800;

// --- Three.js 3Dセットアップ ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e1e24);

const aspect = container.clientWidth / container.clientHeight;
const d = 6;
const camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 0.1, 1000);
camera.position.set(8, 8, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// 照明
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// --- 3Dオブジェクト作成 ---
const floorGeo = new THREE.BoxGeometry(10, 0.2, 5);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x424242 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.position.y = -0.1;
scene.add(floor);

const kitchenMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 2), new THREE.MeshStandardMaterial({ color: 0xe53935 }));
kitchenMesh.position.set(-3.5, 0.5, 0);
scene.add(kitchenMesh);

const counterMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 3), new THREE.MeshStandardMaterial({ color: 0xa1887f }));
counterMesh.position.set(0, 0.4, 0);
scene.add(counterMesh);

const cashMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.5), new THREE.MeshStandardMaterial({ color: 0x1e88e5 }));
cashMesh.position.set(3.5, 0.5, 0);
scene.add(cashMesh);

const cartMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xfdd835 }));
cartMesh.position.set(-2.5, 0.3, 1.5);
scene.add(cartMesh);

const ramenInstances = [];
const ramenGeo = new THREE.CylinderGeometry(0.18, 0.12, 0.15, 8);
const ramenMat = new THREE.MeshStandardMaterial({ color: 0xffb300 });

function updateRamenVisuals() {
    ramenInstances.forEach(mesh => scene.remove(mesh));
    ramenInstances.length = 0;

    for(let i=0; i<Math.min(gameState.kitchen.stock, 5); i++) {
        const mesh = new THREE.Mesh(ramenGeo, ramenMat);
        mesh.position.set(-3.5, 1.1 + (i*0.18), 0);
        scene.add(mesh);
        ramenInstances.push(mesh);
    }

    for(let i=0; i<Math.min(gameState.serve.stock, 6); i++) {
        const mesh = new THREE.Mesh(ramenGeo, ramenMat);
        let row = i % 2;
        let col = Math.floor(i / 2);
        mesh.position.set(-0.2 + (row*0.4), 0.9, -0.8 + (col*0.5));
        scene.add(mesh);
        ramenInstances.push(mesh);
    }
}

function updateLabelPosition(mesh, elementId) {
    const vector = new THREE.Vector3();
    mesh.updateMatrixWorld();
    vector.setFromMatrixPosition(mesh.matrixWorld);
    vector.y += 1.2;
    vector.project(camera);

    const x = (vector.x * .5 + .5) * container.clientWidth;
    const y = (vector.y * -.5 + .5) * container.clientHeight;

    const el = document.getElementById(elementId);
    if(el) {
        el.style.display = 'block';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
    }
}

// --- メインループ ---
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // 1. 厨房
    if (gameState.kitchen.stock < 50) {
        gameState.kitchen.timer += dt;
        if (gameState.kitchen.timer >= gameState.kitchen.speed) {
            gameState.kitchen.stock += gameState.kitchen.cap;
            gameState.kitchen.timer = 0;
            kitchenMesh.scale.set(1.1, 1.2, 1.1);
        }
    }
    kitchenMesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);

    // 2. 配膳
    if (gameState.kitchen.stock > 0 && gameState.serve.stock < 50) {
        gameState.serve.timer += dt;
        let progress = gameState.serve.timer / gameState.serve.speed;
        
        if (progress <= 0.5) {
            cartMesh.position.x = THREE.MathUtils.lerp(-2.5, -0.8, progress * 2);
        } else {
            cartMesh.position.x = THREE.MathUtils.lerp(-0.8, -2.5, (progress - 0.5) * 2);
        }

        if (gameState.serve.timer >= gameState.serve.speed) {
            let takeAmount = Math.min(gameState.kitchen.stock, gameState.serve.cap);
            gameState.kitchen.stock -= takeAmount;
            gameState.serve.stock += takeAmount;
            gameState.serve.timer = 0;
        }
    } else {
        cartMesh.position.x = -2.5;
        gameState.serve.timer = 0;
    }

    // 3. レジ
    if (gameState.serve.stock > 0) {
        gameState.cash.timer += dt;
        if (gameState.cash.timer >= gameState.cash.speed) {
            let eatAmount = Math.min(gameState.serve.stock, gameState.cash.cap);
            gameState.serve.stock -= eatAmount;
            gameState.money += eatAmount * RAMEN_PRICE;
            gameState.cash.timer = 0;
            cashMesh.scale.set(1.2, 1.2, 1.2);
        }
    } else {
        gameState.cash.timer = 0;
    }
    cashMesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);

    updateRamenVisuals();
    updateUI();

    updateLabelPosition(kitchenMesh, 'label-kitchen');
    updateLabelPosition(counterMesh, 'label-serve');
    updateLabelPosition(cashMesh, 'label-cash');

    renderer.render(scene, camera);
}

function updateUI() {
    document.getElementById('money').innerText = `¥${gameState.money.toLocaleString()}`;
    document.getElementById('label-kitchen').innerText = `出来上がり: ${gameState.kitchen.stock}杯`;
    document.getElementById('label-serve').innerText = `カウンター: ${gameState.serve.stock}杯`;
    document.getElementById('label-cash').innerText = gameState.serve.stock > 0 ? `会計中...` : `空き席`;

    updateCard('kitchen', '速度: ' + gameState.kitchen.speed.toFixed(2) + '秒');
    updateCard('serve', '速度: ' + gameState.serve.speed.toFixed(2) + '秒');
    updateCard('cash', '速度: ' + gameState.cash.speed.toFixed(2) + '秒');
}

function getCost(type) {
    return Math.floor(gameState[type].baseCost * Math.pow(1.3, gameState[type].lv - 1));
}

function updateCard(type, statsText) {
    let cost = getCost(type);
    document.getElementById(`lvl-${type}`).innerText = `Lv.${gameState[type].lv}`;
    document.getElementById(`stats-${type}`).innerText = statsText;
    
    let btn = document.getElementById(`btn-${type}`);
    btn.innerText = `強化: ¥${cost.toLocaleString()}`;
    btn.disabled = gameState.money < cost;
}

window.upgrade = function(type) {
    let cost = getCost(type);
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState[type].lv += 1;

        if (type === 'kitchen') {
            gameState.kitchen.speed = Math.max(0.1, 1.0 - (gameState.kitchen.lv * 0.03));
            if (gameState.kitchen.lv % 3 === 0) gameState.kitchen.cap += 1;
        } 
        else if (type === 'serve') {
            gameState.serve.speed = Math.max(0.1, 1.5 - (gameState.serve.lv * 0.04));
            if (gameState.serve.lv % 3 === 0) gameState.serve.cap += 1;
        } 
        else if (type === 'cash') {
            gameState.cash.speed = Math.max(0.1, 2.0 - (gameState.cash.lv * 0.05));
            if (gameState.cash.lv % 2 === 0) gameState.cash.cap += 1;
        }
        updateUI();
    }
}

// ボタンのクリックイベント登録
document.getElementById('btn-kitchen').addEventListener('click', () => window.upgrade('kitchen'));
document.getElementById('btn-serve').addEventListener('click', () => window.upgrade('serve'));
document.getElementById('btn-cash').addEventListener('click', () => window.upgrade('cash'));

// 起動
animate();
