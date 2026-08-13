/**
 * 星云粒子背景 —— 全屏舒缓动态星云 + 视差星尘
 * ------------------------------------------------------------
 * 纯原生 Canvas 手写，无第三方库、无外部图片。
 * 设计目标：
 *   1. 模拟真实银河星尘流动：粒子有远近大小 / 明暗视差；
 *   2. 缓慢漂移旋转，节奏舒缓内敛，不抢文字阅读优先级；
 *   3. 低性能消耗：requestAnimationFrame + 限制像素比 + 粒子数量随屏幕面积自适应。
 */
(function () {
  const canvas = document.getElementById('starfield');
  if (!canvas) return; // 没有该画布（理论上每个页面都有）则直接退出

  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = 1; // devicePixelRatio，限制最高 2 倍，平衡清晰度与性能

  const stars = [];   // 星尘粒子数组
  const nebulas = []; // 星云斑块数组（柔和的大片渐变）

  // 调色板：低饱和宇宙色系（与 style.css 的变量保持一致的视觉感受）
  // 每个元素为 [r, g, b]
  const PALETTE = [
    [110, 130, 180], // 暗蓝
    [140, 120, 200], // 星云紫
    [105, 150, 165], // 星尘青
    [175, 105, 125], // 淡胭脂红
    [215, 218, 232], // 银白（星星的主体色）
  ];

  /* ---------- 画布尺寸自适应 ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // 最高 2 倍，避免高分屏开销过大
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 之后一律用 CSS 像素坐标绘制
    build();
  }

  /* ---------- 生成粒子与星云 ---------- */
  function build() {
    stars.length = 0;

    // 粒子数量随屏幕面积自适应，避免大屏过多、小屏过密
    const count = Math.min(420, Math.floor((width * height) / 2200));

    for (let i = 0; i < count; i++) {
      const z = Math.random(); // z=0 近处，z=1 远处，用于制造视差
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: z,
        // 近处更大更亮，远处更小更暗 → 远近层次
        size: 0.4 + z * 0.3 + Math.random() * (1 - z) * 1.2,
        alpha: 0.22 + (1 - z) * 0.55 + Math.random() * 0.2,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        phase: Math.random() * Math.PI * 2, // 每颗星独立的相位，避免同步闪烁
        twinkle: Math.random() * 0.12,      // 闪烁幅度（极微弱）
        speed: 0.0005 + (1 - z) * 0.0015,   // 公转速度：近处更快 → 视差
      });
    }

    // 星云斑块：若干片大而柔和的径向渐变，缓慢漂移
    nebulas.length = 0;
    const nebCount = 7;
    for (let i = 0; i < nebCount; i++) {
      nebulas.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: (0.25 + Math.random() * 0.4) * Math.max(width, height),
        color: PALETTE[Math.floor(Math.random() * 4)], // 只取前 4 个彩色，银白留给星星
        alpha: 0.035 + Math.random() * 0.05,           // 很低的不透明度，柔和
        driftX: (Math.random() - 0.5) * 0.12,          // 水平漂移速度
        driftY: (Math.random() - 0.5) * 0.12,
        spin: (Math.random() - 0.5) * 0.0001,          // 极慢自旋
      });
    }
  }

  /* ---------- 每一帧的绘制 ---------- */
  let t = 0; // 帧计数器（仅作相位，不用真实时间，避免 Date 开销）

  function frame() {
    t += 1;
    ctx.clearRect(0, 0, width, height);

    // 1) 先画星云斑块（在最底层）
    for (const n of nebulas) {
      n.x += n.driftX;
      n.y += n.driftY;
      // 漂出画布后从另一侧回绕，形成无限流动
      if (n.x < -n.r) n.x = width + n.r;
      if (n.x > width + n.r) n.x = -n.r;
      if (n.y < -n.r) n.y = height + n.r;
      if (n.y > height + n.r) n.y = -n.r;

      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
      const [r, gg, b] = n.color;
      g.addColorStop(0, `rgba(${r},${gg},${b},${n.alpha})`);
      g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2) 再画星尘粒子（加色混合，产生柔和的星光叠加感）
    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars) {
      // 每颗星绕画面中心极其缓慢地公转，近处转得快 → 视差效果
      const a = t * s.speed + s.phase * 0.02;
      const x = s.x + Math.cos(a) * 3 * (1 - s.z);
      const y = s.y + Math.sin(a) * 3 * (1 - s.z);

      // 极微弱的呼吸闪烁（不刺眼、非廉价闪光）
      const flicker = 1 + Math.sin(t * 0.02 + s.phase) * s.twinkle;
      const alpha = Math.min(1, s.alpha * flicker);

      const [r, gg, b] = s.color;
      ctx.fillStyle = `rgba(${r},${gg},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, s.size, 0, Math.PI * 2);
      ctx.fill();

      // 仅对较大的亮星加一圈极淡的光晕（数量少，开销可控）
      if (s.size > 1.4) {
        const halo = ctx.createRadialGradient(x, y, 0, x, y, s.size * 5);
        halo.addColorStop(0, `rgba(${r},${gg},${b},${alpha * 0.3})`);
        halo.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, s.size * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize(); // 初始化
  frame();  // 启动动画循环
})();
