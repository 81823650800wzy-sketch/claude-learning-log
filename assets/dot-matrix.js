/**
 * 动态点阵伪3D背景 — Particle Starfield
 * 透视投影 + 视差鼠标 + 邻近连线 + 缓动动画
 */
(function () {
  const CONFIG = {
    particleCount: 160,       // 粒子数量
    connectDist: 100,         // 连线距离阈值
    mouseParallax: 0.015,    // 鼠标视差强度
    baseSpeed: 0.12,          // 基础漂移速度
    perspective: 600,         // 透视距离
    depthRange: 400,          // Z轴深度范围
    dotMinRadius: 0.8,
    dotMaxRadius: 2.5,
    lineOpacity: 0.08,        // 连线透明度
    dotOpacity: 0.55,         // 点透明度
    accentColor: '#f0833a',   // 强调色
    accentRatio: 0.12,        // 强调色粒子比例
    bgColor: '#f5f2ed',
  };

  const canvas = document.createElement('canvas');
  canvas.id = 'dotMatrixBg';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, centerX, centerY;
  let mouseX = 0.5, mouseY = 0.5;    // 归一化鼠标位置
  let targetMouseX = 0.5, targetMouseY = 0.5;

  // ── 粒子数组 ──
  let particles = [];

  function rand(min, max) { return min + Math.random() * (max - min); }

  function createParticle() {
    return {
      x: rand(-W * 0.8, W * 0.8),
      y: rand(-H * 0.8, H * 0.8),
      z: rand(-CONFIG.depthRange, CONFIG.depthRange),  // Z轴深度
      vx: rand(-0.3, 0.3),
      vy: rand(-0.3, 0.3),
      vz: rand(-0.15, 0.15),
      radius: rand(CONFIG.dotMinRadius, CONFIG.dotMaxRadius),
      isAccent: Math.random() < CONFIG.accentRatio,
    };
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < CONFIG.particleCount; i++) {
      particles.push(createParticle());
    }
  }

  // ── 3D → 2D 透视投影 ──
  function project(x, y, z) {
    const scale = CONFIG.perspective / (CONFIG.perspective + z);
    return {
      sx: centerX + x * scale,
      sy: centerY + y * scale,
      scale: scale,
    };
  }

  // ── 更新粒子位置 ──
  function updateParticles() {
    for (const p of particles) {
      // 鼠标视差偏移
      const parallaxX = (targetMouseX - 0.5) * CONFIG.mouseParallax * (p.z + CONFIG.depthRange);
      const parallaxY = (targetMouseY - 0.5) * CONFIG.mouseParallax * (p.z + CONFIG.depthRange);

      p.x += p.vx * CONFIG.baseSpeed + parallaxX * 0.3;
      p.y += p.vy * CONFIG.baseSpeed + parallaxY * 0.3;
      p.z += p.vz * CONFIG.baseSpeed;

      // Z轴边界回弹
      if (Math.abs(p.z) > CONFIG.depthRange) {
        p.vz *= -1;
        p.z = Math.sign(p.z) * CONFIG.depthRange;
      }

      // XY边界环绕
      const margin = W * 0.5;
      if (Math.abs(p.x) > margin) { p.vx *= -1; p.x = Math.sign(p.x) * margin; }
      if (Math.abs(p.y) > margin) { p.vy *= -1; p.y = Math.sign(p.y) * margin; }

      // 随机微扰
      p.vx += rand(-0.02, 0.02);
      p.vy += rand(-0.02, 0.02);
      p.vx *= 0.999;
      p.vy *= 0.999;
    }
  }

  // ── 绘制粒子 ──
  function drawParticle(p, proj) {
    const alpha = CONFIG.dotOpacity * proj.scale;
    const r = p.radius * proj.scale;

    ctx.beginPath();
    ctx.arc(proj.sx, proj.sy, r, 0, Math.PI * 2);

    if (p.isAccent) {
      // 强调色粒子 — 暖橙发光
      ctx.fillStyle = `rgba(240,131,58,${alpha * 1.6})`;
      ctx.shadowColor = 'rgba(240,131,58,0.6)';
      ctx.shadowBlur = r * 3;
    } else {
      const gray = Math.floor(80 + proj.scale * 80);
      ctx.fillStyle = `rgba(${gray},${gray},${gray + 20},${alpha})`;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── 绘制连线 ──
  function drawLines(projected) {
    for (let i = 0; i < projected.length; i++) {
      for (let j = i + 1; j < projected.length; j++) {
        const a = projected[i];
        const b = projected[j];
        const dx = a.sx - b.sx;
        const dy = a.sy - b.sy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.connectDist) {
          const alpha = (1 - dist / CONFIG.connectDist) * CONFIG.lineOpacity * a.scale * b.scale;
          const isAccentLine = particles[i].isAccent || particles[j].isAccent;

          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          if (isAccentLine) {
            ctx.strokeStyle = `rgba(240,131,58,${alpha * 2.5})`;
            ctx.lineWidth = 0.6;
          } else {
            ctx.strokeStyle = `rgba(100,110,130,${alpha})`;
            ctx.lineWidth = 0.35;
          }
          ctx.stroke();
        }
      }
    }
  }

  // ── 主渲染循环 ──
  function render() {
    ctx.clearRect(0, 0, W, H);

    // 鼠标缓动
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;

    updateParticles();

    // 投影所有粒子并按Z排序（远先近后）
    const projected = particles.map(p => {
      const proj = project(p.x + (mouseX - 0.5) * 60, p.y + (mouseY - 0.5) * 60, p.z);
      return { ...proj, particle: p };
    }).sort((a, b) => b.scale - a.scale);  // 近的粒子在上面

    // 先画连线
    drawLines(projected);

    // 再画粒子
    for (const item of projected) {
      drawParticle(item.particle, item);
    }

    requestAnimationFrame(render);
  }

  // ── 鼠标事件 ──
  function onMouseMove(e) {
    targetMouseX = e.clientX / window.innerWidth;
    targetMouseY = e.clientY / window.innerHeight;
  }

  // ── 触摸事件（移动端） ──
  function onTouchMove(e) {
    if (e.touches.length > 0) {
      targetMouseX = e.touches[0].clientX / window.innerWidth;
      targetMouseY = e.touches[0].clientY / window.innerHeight;
    }
  }

  // ── 响应式处理 ──
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    centerX = W / 2;
    centerY = H / 2;
  }

  function onResize() {
    resize();
    // 重新分布粒子
    for (const p of particles) {
      p.x = rand(-W * 0.8, W * 0.8);
      p.y = rand(-H * 0.8, H * 0.8);
    }
  }

  // ── 初始化 ──
  function init() {
    resize();
    initParticles();
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('resize', onResize);
    render();
  }

  // 页面加载后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
