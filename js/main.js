/* ============================================
   main.js — V2 主逻辑入口
   包含：Three.js 增强 3D / 导航 / Tab / 对话打字机 / 滚动动画
   ============================================ */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
import { SVGLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/SVGLoader.min.js';

// ============================================
// 1. Three.js C4D 风格 3D 场景（P0: 增强版）
// ============================================
function initHeroScene() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 2.5, 13);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  // P0: 启用阴影
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // --- 环境贴图（P0: 增加反射） ---
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0xd4c8e8);
  // 添加柔和光照到环境场景，模拟 HDR
  const envLight1 = new THREE.DirectionalLight(0xffeedd, 1);
  envLight1.position.set(5, 10, 5);
  envScene.add(envLight1);
  const envLight2 = new THREE.DirectionalLight(0xddeeff, 0.8);
  envLight2.position.set(-5, 5, -5);
  envScene.add(envLight2);
  const envTexture = pmremGenerator.fromScene(envScene, 0.04).texture;
  pmremGenerator.dispose();

  // --- 光照系统 ---
  const ambientLight = new THREE.AmbientLight(0xe8d5f0, 0.6);
  scene.add(ambientLight);

  // 主光（阴影光源）
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(6, 10, 8);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;
  dirLight.shadow.bias = -0.001;
  dirLight.shadow.radius = 4;
  scene.add(dirLight);

  // 补光
  const fillLight = new THREE.DirectionalLight(0xc8b0e8, 0.5);
  fillLight.position.set(-4, 3, -3);
  scene.add(fillLight);

  // 底部反弹光
  const bounceLight = new THREE.DirectionalLight(0xe8d0c8, 0.3);
  bounceLight.position.set(0, -3, 2);
  scene.add(bounceLight);

  // --- 材质工厂 ---
  function clayMat(color, opts = {}) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: opts.roughness ?? 0.65,
      metalness: opts.metalness ?? 0.0,
      clearcoat: opts.clearcoat ?? 0.4,
      clearcoatRoughness: 0.3,
      envMap: envTexture,
      envMapIntensity: opts.envMapIntensity ?? 0.8,
    });
  }

  function glassMat(color) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: 0.1,
      metalness: 0.0,
      transmission: 0.85,
      thickness: 0.5,
      clearcoat: 1.0,
      ior: 1.4,
      opacity: 0.6,
      transparent: true,
      envMap: envTexture,
      envMapIntensity: 1.2,
    });
  }

  // 金属材质
  function metalMat(color) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: 0.25,
      metalness: 0.9,
      clearcoat: 0.5,
      envMap: envTexture,
      envMapIntensity: 1.5,
    });
  }

  // 木纹模拟材质
  function woodMat(color) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      roughness: 0.8,
      metalness: 0.0,
      clearcoat: 0.15,
      envMap: envTexture,
      envMapIntensity: 0.3,
    });
  }

  // --- 浮岛组 ---
  const islandGroup = new THREE.Group();
  // 记录基础旋转，避免 P0-bug 的 rotation 冲突
  let baseRotY = 0;

  // --- 主平台：多层浮岛 ---
  const platformGeo = new THREE.CylinderGeometry(3.2, 3.5, 0.5, 48);
  const platform = new THREE.Mesh(platformGeo, clayMat('#d4bce8', { roughness: 0.75 }));
  platform.position.y = -0.5;
  platform.castShadow = true;
  platform.receiveShadow = true;
  islandGroup.add(platform);

  // 第二层浮岛（增加纵深）
  const plat2Geo = new THREE.CylinderGeometry(1.8, 2.0, 0.4, 32);
  const plat2 = new THREE.Mesh(plat2Geo, clayMat('#c8b0d8', { roughness: 0.7 }));
  plat2.position.set(-3.8, -0.15, 1.2);
  plat2.castShadow = true;
  plat2.receiveShadow = true;
  islandGroup.add(plat2);

  // 第三层浮岛
  const plat3Geo = new THREE.CylinderGeometry(1.4, 1.6, 0.35, 24);
  const plat3 = new THREE.Mesh(plat3Geo, clayMat('#e8c8b8', { roughness: 0.7 }));
  plat3.position.set(4.2, 0.1, -0.8);
  plat3.castShadow = true;
  plat3.receiveShadow = true;
  islandGroup.add(plat3);

  // 后方小浮岛（增加 Z 深度）
  const plat4Geo = new THREE.CylinderGeometry(1.0, 1.1, 0.3, 20);
  const plat4 = new THREE.Mesh(plat4Geo, clayMat('#b8d4e8'));
  plat4.position.set(1.5, 0.3, -3);
  plat4.castShadow = true;
  plat4.receiveShadow = true;
  islandGroup.add(plat4);

  // --- 笔记本电脑（更精细版） ---
  const laptopGroup = new THREE.Group();

  // 底座（圆角模拟用多层）
  const baseGeo = new THREE.BoxGeometry(2.2, 0.1, 1.5);
  const base = new THREE.Mesh(baseGeo, metalMat('#8888aa'));
  base.castShadow = true;
  laptopGroup.add(base);

  // 键盘面板
  const kbGeo = new THREE.BoxGeometry(1.8, 0.02, 1.1);
  const kb = new THREE.Mesh(kbGeo, clayMat('#555566'));
  kb.position.set(0, 0.06, 0.05);
  laptopGroup.add(kb);

  // 触控板
  const tpGeo = new THREE.BoxGeometry(0.6, 0.01, 0.4);
  const tp = new THREE.Mesh(tpGeo, clayMat('#666677'));
  tp.position.set(0, 0.065, 0.45);
  laptopGroup.add(tp);

  // 屏幕
  const screenGeo = new THREE.BoxGeometry(2.1, 1.4, 0.06);
  const screen = new THREE.Mesh(screenGeo, clayMat('#333344'));
  screen.position.set(0, 0.78, -0.72);
  screen.rotation.x = -0.12;
  screen.castShadow = true;
  laptopGroup.add(screen);

  // 屏幕发光面（加入自发光 emissive 效果，成为视觉焦点）
  const displayGeo = new THREE.PlaneGeometry(1.85, 1.15);
  const displayMat = new THREE.MeshStandardMaterial({
    color: 0x110820,           // 极暗甚至接近黑的屏幕底色
    emissive: 0x5a2bc0,        // 赛博紫蓝色呼吸光
    emissiveIntensity: 0.8,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const display = new THREE.Mesh(displayGeo, displayMat);
  display.position.set(0, 0.78, -0.688);
  display.rotation.x = -0.12;
  display.renderOrder = 1;
  laptopGroup.add(display);

  laptopGroup.position.set(-0.3, 0.1, 0.2);
  laptopGroup.rotation.y = 0.15;
  islandGroup.add(laptopGroup);

  // --- XPENG Logo 3D 挤出体（用 SVGLoader 加载飞翼标并做成 3D） ---
  const svgLoader = new SVGLoader();

  // 加载飞翼 Logo
  svgLoader.load('assets/xpeng-logo.svg', (data) => {
    const paths = data.paths;
    const logoGroup = new THREE.Group();

    paths.forEach((path) => {
      const shapes = SVGLoader.createShapes(path);
      shapes.forEach((shape) => {
        // 挤出成 3D 体
        const extGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 6,
          bevelEnabled: true,
          bevelThickness: 1.5,
          bevelSize: 1,
          bevelSegments: 3,
        });
        // 带有微量发光的金属质感，从背景黏土中脱离
        const meshMat = new THREE.MeshStandardMaterial({
          color: 0xccddee,
          emissive: 0x223366,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.8,
        });
        const mesh = new THREE.Mesh(extGeo, meshMat);
        mesh.castShadow = true;
        logoGroup.add(mesh);
      });
    });

    // SVG 坐标系 Y 轴翻转 + 缩放到合适大小
    const scaleFactor = 0.009;
    logoGroup.scale.set(scaleFactor, -scaleFactor, scaleFactor);
    // 调高并朝镜头拉近，避免被书本模型遮挡
    logoGroup.position.set(
      -129.96 * scaleFactor / 2 + 1.2,  
      2.0,   // Height
      -1.5   // Z depth (拉近)
    );
    islandGroup.add(logoGroup);
  });

  // 加载 XPENG 文字
  svgLoader.load('assets/xpeng-text.svg', (data) => {
    const paths = data.paths;
    const textGroup = new THREE.Group();

    paths.forEach((path) => {
      const shapes = SVGLoader.createShapes(path);
      shapes.forEach((shape) => {
        const extGeo = new THREE.ExtrudeGeometry(shape, {
          depth: 4,
          bevelEnabled: true,
          bevelThickness: 1,
          bevelSize: 0.8,
          bevelSegments: 2,
        });
        // 配合全局 Dark Mode 的高科技质感
        const textMat = new THREE.MeshStandardMaterial({
          color: 0xeef0f5,
          emissive: 0x442288,
          emissiveIntensity: 0.5,
          roughness: 0.3,
          metalness: 0.6,
        });
        const mesh = new THREE.Mesh(extGeo, textMat);
        mesh.castShadow = true;
        textGroup.add(mesh);
      });
    });

    // SVG viewBox 是 252.09 x 23.27，缩放到约 1.5 宽度
    const scaleFactor = 0.006;
    textGroup.scale.set(scaleFactor, -scaleFactor, scaleFactor);
    // 置于地球仪右前侧上方，避免被透明罩遮挡
    textGroup.position.set(
      -252.09 * scaleFactor / 2 - 2.5,  
      1.6,   // Height
      2.5    // Z depth (更靠外)
    );
    islandGroup.add(textGroup);
  });

  // --- 代码括号 </> ---
  const bracketGeo = new THREE.TorusGeometry(0.28, 0.07, 12, 24, Math.PI);
  const bracket1 = new THREE.Mesh(bracketGeo, clayMat('#88ccaa'));
  bracket1.position.set(-2, 0.8, 0.8);
  bracket1.rotation.z = Math.PI / 2;
  bracket1.castShadow = true;
  islandGroup.add(bracket1);

  const bracket2 = new THREE.Mesh(bracketGeo.clone(), clayMat('#88ccaa'));
  bracket2.position.set(-1.4, 0.8, 0.8);
  bracket2.rotation.z = -Math.PI / 2;
  bracket2.castShadow = true;
  islandGroup.add(bracket2);

  // 斜杠（/）
  const slashGeo = new THREE.BoxGeometry(0.06, 0.45, 0.06);
  const slash = new THREE.Mesh(slashGeo, clayMat('#77bb99'));
  slash.position.set(-1.7, 0.8, 0.8);
  slash.rotation.z = -0.4;
  slash.castShadow = true;
  islandGroup.add(slash);

  // --- 火箭（更精细） ---
  const rocketGroup = new THREE.Group();
  const rocketBodyGeo = new THREE.CapsuleGeometry(0.22, 0.7, 12, 24);
  const rocketBody = new THREE.Mesh(rocketBodyGeo, clayMat('#e88888'));
  rocketBody.castShadow = true;
  rocketGroup.add(rocketBody);

  // 鼻锥
  const noseGeo = new THREE.ConeGeometry(0.22, 0.35, 24);
  const nose = new THREE.Mesh(noseGeo, clayMat('#ee9999'));
  nose.position.y = 0.6;
  nose.castShadow = true;
  rocketGroup.add(nose);

  // 窗口
  const windowGeo = new THREE.SphereGeometry(0.08, 16, 16);
  const rocketWindow = new THREE.Mesh(windowGeo, glassMat('#99ccff'));
  rocketWindow.position.set(0, 0.2, 0.2);
  rocketGroup.add(rocketWindow);

  // 尾翼
  const finGeo = new THREE.BoxGeometry(0.14, 0.22, 0.04);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(finGeo, clayMat('#cc7777'));
    const angle = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(angle) * 0.22, -0.4, Math.sin(angle) * 0.22);
    fin.rotation.y = angle;
    fin.castShadow = true;
    rocketGroup.add(fin);
  }

  // 火焰粒子效果
  const flameGeo = new THREE.ConeGeometry(0.12, 0.3, 12);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff9944,
    opacity: 0.7,
    transparent: true,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.y = -0.65;
  flame.rotation.x = Math.PI;
  rocketGroup.add(flame);

  rocketGroup.position.set(4.2, 1.5, -0.8);
  rocketGroup.rotation.z = -0.25;
  islandGroup.add(rocketGroup);

  // --- 地球仪 ---
  const globeGeo = new THREE.SphereGeometry(0.5, 32, 32);
  const globe = new THREE.Mesh(globeGeo, clayMat('#88aade', { clearcoat: 0.6 }));
  globe.position.set(-3.8, 0.8, 1.2);
  globe.castShadow = true;
  islandGroup.add(globe);

  // 地球仪经纬线
  const ringGeo = new THREE.TorusGeometry(0.6, 0.03, 8, 48);
  const ring1 = new THREE.Mesh(ringGeo, metalMat('#aabbee'));
  ring1.position.copy(globe.position);
  ring1.rotation.x = Math.PI / 3;
  islandGroup.add(ring1);

  const ring2 = new THREE.Mesh(ringGeo.clone(), metalMat('#aabbee'));
  ring2.position.copy(globe.position);
  ring2.rotation.x = Math.PI / 3;
  ring2.rotation.y = Math.PI / 2;
  islandGroup.add(ring2);

  // 底座
  const globeStandGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.15, 16);
  const globeStand = new THREE.Mesh(globeStandGeo, metalMat('#9999bb'));
  globeStand.position.set(-3.8, 0.15, 1.2);
  globeStand.castShadow = true;
  islandGroup.add(globeStand);

  // --- 沙发（C4D 风简化家具） ---
  const sofaGroup = new THREE.Group();
  // 座垫
  const seatGeo = new THREE.BoxGeometry(1.2, 0.3, 0.6);
  const seat = new THREE.Mesh(seatGeo, clayMat('#c8a8dd', { roughness: 0.85 }));
  seat.castShadow = true;
  sofaGroup.add(seat);
  // 靠背
  const backGeo = new THREE.BoxGeometry(1.2, 0.5, 0.15);
  const back = new THREE.Mesh(backGeo, clayMat('#c8a8dd', { roughness: 0.85 }));
  back.position.set(0, 0.25, -0.22);
  back.castShadow = true;
  sofaGroup.add(back);
  // 扶手
  const armGeo = new THREE.BoxGeometry(0.15, 0.35, 0.6);
  const armL = new THREE.Mesh(armGeo, clayMat('#b898cc'));
  armL.position.set(-0.52, 0.1, 0);
  armL.castShadow = true;
  sofaGroup.add(armL);
  const armR = new THREE.Mesh(armGeo.clone(), clayMat('#b898cc'));
  armR.position.set(0.52, 0.1, 0);
  armR.castShadow = true;
  sofaGroup.add(armR);
  sofaGroup.position.set(2.2, 0.05, 1.2);
  sofaGroup.rotation.y = -0.5;
  islandGroup.add(sofaGroup);

  // --- 咖啡杯 ---
  const cupGroup = new THREE.Group();
  const cupGeo = new THREE.CylinderGeometry(0.12, 0.1, 0.22, 16);
  const cup = new THREE.Mesh(cupGeo, clayMat('#f0e8d8', { roughness: 0.5 }));
  cup.castShadow = true;
  cupGroup.add(cup);
  // 把手
  const handleGeo = new THREE.TorusGeometry(0.06, 0.02, 8, 16, Math.PI);
  const handle = new THREE.Mesh(handleGeo, clayMat('#e8d8c8'));
  handle.position.set(0.12, 0.02, 0);
  handle.rotation.y = Math.PI / 2;
  cupGroup.add(handle);
  // 咖啡液面
  const coffeeGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16);
  const coffee = new THREE.Mesh(coffeeGeo, new THREE.MeshBasicMaterial({ color: 0x4a3020 }));
  coffee.position.y = 0.09;
  cupGroup.add(coffee);
  cupGroup.position.set(1.5, 0.04, 1.8);
  islandGroup.add(cupGroup);

  // --- 盆栽植物 ---
  const plantGroup = new THREE.Group();
  const potGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.25, 16);
  const pot = new THREE.Mesh(potGeo, clayMat('#cc9966'));
  pot.castShadow = true;
  plantGroup.add(pot);
  // 泥土
  const soilGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.04, 16);
  const soil = new THREE.Mesh(soilGeo, clayMat('#8B6914'));
  soil.position.y = 0.12;
  plantGroup.add(soil);
  // 叶片
  for (let i = 0; i < 5; i++) {
    const leafGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const leaf = new THREE.Mesh(leafGeo, clayMat('#66bb77', { roughness: 0.7 }));
    const angle = (i / 5) * Math.PI * 2;
    const radius = 0.12 + Math.random() * 0.08;
    leaf.position.set(
      Math.cos(angle) * radius,
      0.2 + Math.random() * 0.18,
      Math.sin(angle) * radius
    );
    leaf.scale.set(1, 0.6, 1);
    leaf.castShadow = true;
    plantGroup.add(leaf);
  }
  plantGroup.position.set(-1.5, 0.05, -1.5);
  islandGroup.add(plantGroup);

  // --- 后方书籍堆 ---
  const booksGroup = new THREE.Group();
  const bookColors = ['#dd8888', '#88aadd', '#aabb88', '#ddaa88'];
  for (let i = 0; i < 4; i++) {
    const bookGeo = new THREE.BoxGeometry(0.4 + Math.random() * 0.15, 0.08, 0.3);
    const book = new THREE.Mesh(bookGeo, clayMat(bookColors[i]));
    book.position.y = i * 0.08;
    book.rotation.y = (Math.random() - 0.5) * 0.2;
    book.castShadow = true;
    booksGroup.add(book);
  }
  booksGroup.position.set(1.5, 0.55, -3);
  islandGroup.add(booksGroup);

  // --- 玻璃球装饰 ---
  const glassSphereGeo = new THREE.SphereGeometry(0.25, 24, 24);
  const glassSphere = new THREE.Mesh(glassSphereGeo, glassMat('#c8b8e8'));
  glassSphere.position.set(3, 0.3, 1.5);
  glassSphere.castShadow = true;
  islandGroup.add(glassSphere);

  // --- 小装饰球体 ---
  const decoSphereGeo = new THREE.SphereGeometry(0.15, 16, 16);
  const decoData = [
    { pos: [1.2, 0.3, 2.2], color: '#e8c888', s: 0.8 },
    { pos: [-0.5, 0.25, 2.5], color: '#88e8c8', s: 0.6 },
    { pos: [3.5, 0.4, -2], color: '#c888e8', s: 0.7 },
    { pos: [-2.5, 1.0, -0.5], color: '#e8a8b8', s: 0.9 },
    { pos: [0.5, 0.2, -2.5], color: '#a8c8e8', s: 0.5 },
    { pos: [-4.5, 0.6, 2.5], color: '#e8d8a8', s: 0.65 },
  ];
  decoData.forEach(({ pos, color, s }) => {
    const sphere = new THREE.Mesh(decoSphereGeo.clone(), clayMat(color));
    sphere.position.set(...pos);
    sphere.scale.setScalar(s);
    sphere.castShadow = true;
    islandGroup.add(sphere);
  });

  // --- 玻璃圆柱装饰 ---
  const glassCylGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 24);
  const glassCyl = new THREE.Mesh(glassCylGeo, glassMat('#c8b8e8'));
  glassCyl.position.set(-4.8, 0.3, 0);
  glassCyl.castShadow = true;
  islandGroup.add(glassCyl);

  // --- 阴影接收面（透明地面） ---
  const shadowPlaneGeo = new THREE.PlaneGeometry(20, 20);
  const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.15 });
  const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.75;
  shadowPlane.receiveShadow = true;
  islandGroup.add(shadowPlane);

  scene.add(islandGroup);

  // --- 鼠标视差分层（要点4: 前景-中景3D-背景标题字 三层视差） ---
  let mouseX = 0, mouseY = 0;
  let rafPending = false;
  const heroBgTitle = document.querySelector('.hero-bg-title');

  document.addEventListener('mousemove', (e) => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;

      // 背景标题视差：移动方向相反、幅度较小（产生深度感）
      if (heroBgTitle) {
        const bgX = -mouseX * 15; // 背景层移动更慢，方向反
        const bgY = -mouseY * 8;
        heroBgTitle.style.setProperty('--parallax-x', `${bgX}px`);
        heroBgTitle.style.setProperty('--parallax-y', `${bgY}px`);
      }

      rafPending = false;
    });
  });

  // --- 动画循环（P0: 修复 rotation 冲突） ---
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // 缓慢自转 + 鼠标视差分离处理（取消自动自转，仅跟随鼠标运动）
    const targetRotY = mouseX * 0.25;
    const targetRotX = -mouseY * 0.08;
    islandGroup.rotation.y += (targetRotY - islandGroup.rotation.y) * 0.06;
    islandGroup.rotation.x += (targetRotX - islandGroup.rotation.x) * 0.06;

    // 物件浮动
    rocketGroup.position.y = 1.5 + Math.sin(t * 1.5) * 0.15;
    globe.position.y = 0.8 + Math.sin(t * 1.2 + 1) * 0.1;
    glassCyl.position.y = 0.3 + Math.sin(t * 1.8 + 2) * 0.08;
    glassSphere.position.y = 0.3 + Math.sin(t * 1.3 + 3) * 0.06;

    // 火箭火焰闪烁
    flame.scale.y = 0.8 + Math.sin(t * 8) * 0.3;
    flame.material.opacity = 0.5 + Math.sin(t * 6) * 0.2;

    renderer.render(scene, camera);
  }
  animate();

  // --- 窗口适配 ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================
// 2. 全局导航栏（P1: 新增）
// ============================================
function initNavigation() {
  const nav = document.getElementById('site-nav');
  const progress = document.getElementById('nav-progress');
  const links = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section[id]');

  if (!nav || !progress) return;

  let prevScroll = 0;

  // 滚动时：显隐导航 + 进度条 + 高亮当前 section
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollY / docHeight) * 100;

    // 进度条
    progress.style.width = scrollPercent + '%';

    // 滚动方向：下滑隐藏，上滑显示
    if (scrollY > 80 && scrollY > prevScroll) {
      nav.classList.add('hidden');
    } else {
      nav.classList.remove('hidden');
    }
    prevScroll = scrollY;

    // 高亮当前 section
    let currentSection = '';
    sections.forEach(sec => {
      if (scrollY >= sec.offsetTop - 200) {
        currentSection = sec.id;
      }
    });
    links.forEach(link => {
      link.classList.toggle('active', link.dataset.section === currentSection);
    });
  });
}

// ============================================
// 3. 工具区 Tab 切换（P1: slide + fade 过渡）
// ============================================
function initToolTabs() {
  const tabs = document.querySelectorAll('.feature-tab');
  const panels = document.querySelectorAll('.feature-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => {
        p.classList.remove('active');
        p.style.animation = 'none';
      });
      tab.classList.add('active');
      const panel = document.getElementById(`panel-${tab.dataset.tab}`);
      if (panel) {
        panel.classList.add('active');
        // 重新触发动画
        void panel.offsetWidth;
        panel.style.animation = 'panelIn 0.4s var(--ease-out-expo)';
      }
    });
  });
}

// ============================================
// 4. 对话式 UI Coding 演示（P0: 打字机 + loading 态）
// ============================================
const chatData = [
  { // ① 提示词技巧
    messages: [
      { role: 'user', text: '帮我做一个科技感的导航栏，顶部固定，带 logo 和 4 个菜单项，右侧有一个登录按钮。' },
      { role: 'ai', text: '好的！给你一个具有磨砂玻璃效果的顶部导航栏。<code>backdrop-filter: blur(20px)</code> + 柔和阴影，滚动时自动吸附。' },
    ],
    preview: '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 24px;background:rgba(255,255,255,0.7);backdrop-filter:blur(12px);border-radius:12px;border:1px solid rgba(0,0,0,0.06);font-family:system-ui;font-size:13px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin: 20px;"><span style="font-weight:700; font-size: 16px;">LOGO</span><div style="display:flex;gap:20px;color:#555; font-weight: 500;"><span>首页</span><span>产品</span><span>关于</span><span>联系</span></div><button style="padding:8px 20px;border-radius:100px;border:none;background:#222;color:white;font-size:13px;cursor:pointer; font-weight: 600;">登录</button></div>'
  },
  { // ② 交互设计
    messages: [
      { role: 'user', text: '菜单项鼠标悬停时需要有下划线动画效果，从左到右展开。' },
      { role: 'ai', text: '使用 <code>::after</code> 伪元素 + <code>transform: scaleX(0→1)</code> 就可以实现优雅的下划线展开效果，<code>transform-origin: left</code> 让它从左侧开始。' },
    ],
    preview: '<style>.demo-link{position:relative;text-decoration:none;color:#555;font-family:system-ui;font-size:15px;font-weight:500;padding:6px 0;}.demo-link::after{content:"";position:absolute;bottom:0;left:0;width:100%;height:3px;background:linear-gradient(90deg, #6b9, #38c);transform:scaleX(0);transform-origin:left;transition:transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);}.demo-link:hover::after{transform:scaleX(1);}</style><div style="display:flex;gap:32px;padding:30px;justify-content:center;margin-top:20px;"><a class="demo-link" href="#">首页</a><a class="demo-link" href="#">产品</a><a class="demo-link" href="#">关于</a></div>'
  },
  { // ③ 动效设计
    messages: [
      { role: 'user', text: '页面内容块在滚动到视口时，需要有从下方淡入的进场动画。' },
      { role: 'ai', text: '使用 <code>IntersectionObserver</code> 监听元素进入视口，然后添加 <code>opacity: 0→1</code> + <code>translateY(30px→0)</code> 的过渡。配合 <code>ease-out-expo</code> 缓动，效果更自然。' },
    ],
    preview: '<style>@keyframes fUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}.f-card{padding:20px;background:white;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);font-family:system-ui;font-size:15px;color:#333;display:flex;align-items:center;gap:12px;}</style><div style="display:flex;flex-direction:column;gap:16px;padding:20px;background:#f8f9fa;border-radius:12px; margin: 20px;"><div class="f-card" style="animation:fUp 0.8s cubic-bezier(0.16,1,0.3,1) both;"><span style="font-size:24px">✨</span> 这个卡片会优雅地从下方淡入</div><div class="f-card" style="animation:fUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.15s both;"><span style="font-size:24px">🎯</span> 带有延迟的交错效果</div></div>'
  },
  { // ④ 反馈与修改
    messages: [
      { role: 'user', text: '这个按钮颜色太深了，改成薄荷绿。圆角再大一点。' },
      { role: 'ai', text: '已调整！按钮背景色改为 <code>oklch(0.78 0.12 160)</code>，圆角从 8px → 16px。现在看起来更柔和了。' },
    ],
    preview: '<div style="display:flex;gap:24px;align-items:center;padding:30px;font-family:system-ui;justify-content:center; margin-top:20px;"><button style="padding:12px 28px;border-radius:8px;border:none;background:#334155;color:white;font-size:14px;font-weight:500;box-shadow:0 4px 6px rgba(0,0,0,0.1);">修改前</button><span style="font-size:24px;color:#94a3b8;">→</span><button style="padding:12px 28px;border-radius:100px;border:none;background:linear-gradient(135deg, #34d399, #10b981);color:white;font-size:14px;font-weight:600;box-shadow:0 10px 20px rgba(16,185,129,0.3);transition:transform 0.3s;cursor:pointer;" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'none\'">修改后</button></div>'
  },
  { // ⑤ 占位图替换
    messages: [
      { role: 'user', text: '把 Hero 区域的占位图替换成一张真实的产品图，可以用 Unsplash 的图片。' },
      { role: 'ai', text: '直接在 <code>src</code> 属性中使用 Unsplash 的随机图片 API，或者上传图片到图床（如 SM.MS），然后替换 URL 即可。' },
    ],
    preview: '<div style="display:flex;gap:20px;padding:30px;font-family:system-ui;justify-content:center;align-items:center;"><div style="width:160px;height:100px;background:#e2e8f0;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:500;border:2px dashed #cbd5e1;">占位图</div><span style="display:flex;align-items:center;font-size:24px;color:#94a3b8;">→</span><div style="width:160px;height:100px;border-radius:12px;background:url(\'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop\') center/cover;box-shadow:0 10px 20px rgba(0,0,0,0.15);"></div></div>'
  },
  { // ⑥ 部署上线
    messages: [
      { role: 'user', text: '代码写好了，怎么部署到网上？' },
      { role: 'ai', text: '最简单的方式：推送代码到 GitHub → 去 Vercel.com 导入仓库 → 自动构建部署 → 获得一个 .vercel.app 的免费域名。全程 3 分钟。' },
    ],
    preview: '<div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:40px;font-family:system-ui;font-size:14px;font-weight:500;"><div style="padding:12px 16px;background:#f1f5f9;border-radius:10px;color:#475569;box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">📁 代码</div><span style="color:#cbd5e1;">→</span><div style="padding:12px 16px;background:#f8fafc;border-radius:10px;color:#0f172a;box-shadow:0 4px 12px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">🐙 GitHub</div><span style="color:#cbd5e1;">→</span><div style="padding:12px 16px;background:black;color:white;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,0.2);">▲ Vercel 构建</div></div>'
  }
];

function initChatDemo() {
  const stepBtns = document.querySelectorAll('.step-btn');
  const messagesEl = document.getElementById('chat-messages');
  const previewEl = document.getElementById('preview-box');
  const autoplayBtn = document.getElementById('btn-autoplay');

  let isPlaying = false;
  let autoplayTimer = null;
  let currentStep = 0;

  // 打字机效果核心函数
  function typeText(el, html, callback) {
    // 分离 HTML 标签和纯文本
    const parts = [];
    const tagRegex = /(<code>.*?<\/code>|<[^>]+>)/g;
    let lastIdx = 0;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      if (match.index > lastIdx) {
        // 纯文本片段
        parts.push({ type: 'text', content: html.slice(lastIdx, match.index) });
      }
      parts.push({ type: 'tag', content: match[0] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < html.length) {
      parts.push({ type: 'text', content: html.slice(lastIdx) });
    }

    let partIdx = 0;
    let charIdx = 0;
    let output = '';

    function tick() {
      if (partIdx >= parts.length) {
        callback?.();
        return;
      }

      const part = parts[partIdx];
      if (part.type === 'tag') {
        output += part.content;
        el.innerHTML = output;
        partIdx++;
        requestAnimationFrame(tick);
      } else {
        output += part.content[charIdx];
        el.innerHTML = output;
        charIdx++;
        if (charIdx >= part.content.length) {
          partIdx++;
          charIdx = 0;
        }
        // 每个字符间隔 25ms
        setTimeout(tick, 25);
      }
    }
    tick();
  }

  // 显示 "AI 正在输入..." 指示器
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(10px)';
    indicator.style.animation = 'bubbleIn 0.3s var(--ease-out-expo) forwards';
    messagesEl.appendChild(indicator);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  // 显示某一步的对话（P2: 加 preview fade 过渡，返回 Promise 以便 autoplay 同步）
  function showStep(index) {
    return new Promise((resolve) => {
      currentStep = index;
      stepBtns.forEach(b => b.classList.remove('active'));
      stepBtns[index]?.classList.add('active');

      if (!messagesEl || !previewEl) { resolve(); return; }
      messagesEl.innerHTML = '';
      const data = chatData[index];
      if (!data) { resolve(); return; }

      // P2: preview fade out
      previewEl.classList.add('fading');
      previewEl.innerHTML = '<span class="preview-box-label">预览效果</span>';

      let msgIdx = 0;

      function showNextMessage() {
        if (msgIdx >= data.messages.length) {
          // 所有消息显示完毕，渲染预览
          previewEl.innerHTML = '<span class="preview-box-label">预览效果</span>' + data.preview;
          previewEl.classList.remove('fading');
          resolve();
          return;
        }

        const msg = data.messages[msgIdx];
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-bubble--${msg.role === 'user' ? 'user' : 'ai'}`;

        if (msg.role === 'user') {
          bubble.innerHTML = msg.text;
          bubble.style.animationDelay = '0s';
          messagesEl.appendChild(bubble);
          messagesEl.scrollTop = messagesEl.scrollHeight;
          msgIdx++;
          setTimeout(() => {
            showTypingIndicator();
            setTimeout(() => {
              removeTypingIndicator();
              showNextMessage();
            }, 800);
          }, 400);
        } else {
          bubble.style.opacity = '1';
          bubble.style.transform = 'translateY(0)';
          bubble.style.animation = 'none';
          messagesEl.appendChild(bubble);
          typeText(bubble, msg.text, () => {
            msgIdx++;
            messagesEl.scrollTop = messagesEl.scrollHeight;
            setTimeout(showNextMessage, 300);
          });
        }
      }

      showNextMessage();
    });
  }

  stepBtns.forEach((btn, i) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      stopAutoplay();
      showStep(i);
    });
  });

  // 自动播放模式（P0: 培训现场可自动演示）
  function startAutoplay() {
    isPlaying = true;
    autoplayBtn.classList.add('playing');
    autoplayBtn.textContent = '⏸ 暂停';
    playNext();
  }

  function stopAutoplay() {
    isPlaying = false;
    autoplayBtn.classList.remove('playing');
    autoplayBtn.textContent = '▶ 自动演示';
    clearTimeout(autoplayTimer);
  }

  // P2: autoplay 与打字机同步——等待 showStep 完成后再切换
  async function playNext() {
    if (!isPlaying) return;
    await showStep(currentStep);
    if (!isPlaying) return; // 可能在 showStep 期间被停止
    autoplayTimer = setTimeout(() => {
      currentStep = (currentStep + 1) % chatData.length;
      playNext();
    }, 3000); // 打字完成后等 3 秒再切换
  }

  autoplayBtn?.addEventListener('click', () => {
    if (isPlaying) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  // 默认显示第一步
  showStep(0);
}

// Deploy toggles 逻辑已被移除

// ============================================
// 6. GSAP 滚动动画（P0-bug: 安全降级）
// ============================================
function initScrollAnimations() {
  const fadeElements = document.querySelectorAll('.fade-up');

  // 先确保所有元素在无 JS 时可见（安全降级）
  if (fadeElements.length === 0) return;

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    try {
      gsap.registerPlugin(ScrollTrigger);

      fadeElements.forEach(el => {
        gsap.fromTo(el,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'expo.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              once: true,
            },
          }
        );
      });
    } catch (e) {
      console.warn('GSAP 初始化失败，使用降级方案', e);
      fallbackObserver(fadeElements);
    }
  } else {
    fallbackObserver(fadeElements);
  }
}

// 降级方案：IntersectionObserver
function fallbackObserver(elements) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );
    elements.forEach(el => observer.observe(el));
  } else {
    // 终极降级：直接显示所有元素
    elements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
}

// ============================================
// 初始化（P0-bug: 错误边界）
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // 每个模块独立 try-catch，避免一个失败全部中断
  try { initHeroScene(); } catch (e) { console.error('Hero 3D 场景初始化失败:', e); }
  try { initNavigation(); } catch (e) { console.error('导航初始化失败:', e); }
  try { initToolTabs(); } catch (e) { console.error('Tab 切换初始化失败:', e); }
  try { initChatDemo(); } catch (e) { console.error('对话演示初始化失败:', e); }
  try { initScrollAnimations(); } catch (e) { console.error('滚动动画初始化失败:', e); }
});
