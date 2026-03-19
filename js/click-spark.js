/* ============================================
   Click Spark — 全局点击火花粒子效果
   灵感来源：ReactBits Click Spark 组件
   纯 Vanilla JS + Canvas 2D 实现
   ============================================ */

(function () {
  'use strict';

  // 品牌色系火花颜色池（与设计令牌一致的紫色系）
  const SPARK_COLORS = [
    'oklch(0.65 0.20 285)',   // 品牌紫
    'oklch(0.70 0.18 290)',   // 淡紫
    'oklch(0.75 0.15 310)',   // 粉紫
    'oklch(0.80 0.12 250)',   // 天蓝紫
    'oklch(0.72 0.16 280)',   // 中紫
    'oklch(0.68 0.14 320)',   // 暖粉
  ];

  const PARTICLE_COUNT = 8;       // 每次点击的粒子数量
  const PARTICLE_LIFE = 600;      // 粒子生命周期 ms
  const PARTICLE_SPEED = 3;       // 粒子初始速度
  const PARTICLE_SIZE = 3;        // 粒子大小

  // 创建 Canvas 覆盖层
  const canvas = document.createElement('canvas');
  canvas.id = 'click-spark-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    pointer-events: none;
    z-index: 99999;
  `;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animating = false;

  // 高 DPI 适配
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 粒子工厂
  function createParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED * (0.5 + Math.random());
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: PARTICLE_LIFE,
      maxLife: PARTICLE_LIFE,
      size: PARTICLE_SIZE * (0.5 + Math.random() * 0.8),
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
    };
  }

  // 动画循环
  function animate() {
    if (particles.length === 0) {
      animating = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    animating = true;
    ctx.clearRect(0, 0, canvas.width / Math.min(window.devicePixelRatio, 2), canvas.height / Math.min(window.devicePixelRatio, 2));

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= 16; // 约 60fps
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      const progress = 1 - p.life / p.maxLife;

      // 物理：减速 + 重力
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.vy += 0.08; // 微弱重力
      p.x += p.vx;
      p.y += p.vy;

      // 渐隐 + 缩小
      const alpha = 1 - progress;
      const size = p.size * (1 - progress * 0.6);

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(animate);
  }

  // 监听点击事件
  document.addEventListener('click', (e) => {
    // 生成粒子
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(e.clientX, e.clientY));
    }

    if (!animating) {
      animate();
    }
  });
})();
