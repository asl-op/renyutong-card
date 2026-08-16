/**
 * nebula.js —— 全屏星云粒子背景（原生 Canvas，无第三方库、无外部图片）
 * 效果：
 *   1. 入场动画：粒子从四散状态「汇聚成型」—— 仅在首次访问时播放一次
 *   2. 环境态：星尘缓慢漂移 + 极慢的整体星系自转
 *   3. 视差：粒子按深度呈现「近大远小、近亮远暗」
 *   4. 主题：随白天 / 黑夜切换粒子配色（由 theme.js 调用 applyTheme）
 * 实现：requestAnimationFrame + 离屏柔光 Sprite，柔和内敛
 */
(function () {
  const canvas = document.getElementById('nebula');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  // 两套粒子配色：黑夜（银紫深空）/ 白天（银灰淡紫）
  const PALETTES = {
    dark: [
      [248, 251, 255],   // 星光亮白（多数）
      [255, 255, 255],
      [248, 251, 255],
      [176, 166, 216],   // 淡银紫
      [138, 116, 196],   // 银紫
      [51, 37, 92],      // 暗星云紫（少量）
    ],
    light: [
      [214, 182, 226],   // 粉紫（星云，多数）
      [188, 152, 208],   // 粉紫（星点）
      [162, 128, 190],   // 深粉紫（星点，较明显）
      [200, 166, 216],   // 淡粉紫
      [140, 110, 176],   // 紫粉（深色星点）
      [228, 204, 240],   // 极淡粉紫（高光）
    ],
  };

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  const COUNT = Math.min(200, Math.max(120, Math.floor(window.innerWidth * 0.12)));
  const CONVERGE_MS = 4200;   // 汇聚动画时长（毫秒）
  // 汇聚动画只在主页播放，其他页面直接进入环境态
  const showIntro = location.pathname === '/' || location.pathname === '/index.html';

  // 预渲染柔光 Sprite
  function makeSprite(rgb) {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',1)');
    grad.addColorStop(0.3, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.45)');
    grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return c;
  }

  let palette = PALETTES[currentTheme()];
  let sprites = palette.map(makeSprite);
  let isLight = currentTheme() === 'light';

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();

  function gauss() {
    return (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  }

  function makeParticle(scattered) {
    const p = {
      ci: (Math.random() * palette.length) | 0,
      z: Math.random(),
      size: 0.6 + Math.random() * 2.2,
      alpha: 0.10 + Math.random() * 0.28,
      orbitR: 20 + Math.random() * 240,
      orbitA: Math.random() * Math.PI * 2,
      orbitV: (Math.random() - 0.5) * 0.08,
      driftX: (Math.random() - 0.5) * 0.05,
      driftY: (Math.random() - 0.5) * 0.05,
      dx: 0, dy: 0,
    };
    if (scattered) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.max(W, H) * (0.6 + Math.random() * 0.9);
      p.sx = W / 2 + Math.cos(a) * d;
      p.sy = H / 2 + Math.sin(a) * d;
    } else {
      p.sx = Math.random() * W;
      p.sy = Math.random() * H;
    }
    p.tx = W / 2 + gauss() * W * 0.9;
    p.ty = H / 2 + gauss() * H * 0.9;
    return p;
  }

  const ps = [];
  for (let i = 0; i < COUNT; i++) ps.push(makeParticle(showIntro));

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    // 汇聚进度：每次进入都播放入场汇聚动画（系统开启「减少动画」时直接进入环境态）
    const k = (reduced || !showIntro) ? 1 : easeInOutCubic(Math.min(1, elapsed / CONVERGE_MS));
    const spin = elapsed * 0.00012;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.orbitA += p.orbitV * 0.0004;
      p.dx += p.driftX;
      p.dy += p.driftY;

      const lx = p.sx + (p.tx - p.sx) * k;
      const ly = p.sy + (p.ty - p.sy) * k;
      const ox = Math.cos(p.orbitA + spin) * p.orbitR * k;
      const oy = Math.sin(p.orbitA + spin) * p.orbitR * k;
      const x = lx + ox + p.dx;
      const y = ly + oy + p.dy;

      const m = 90;
      const px = ((((x + m) % (W + m * 2)) + (W + m * 2)) % (W + m * 2)) - m;
      const py = ((((y + m) % (H + m * 2)) + (H + m * 2)) % (H + m * 2)) - m;

      const r = p.size * 3.4;
      const alphaMul = isLight ? 1.6 : 1.0;   // 白天模式下星点更明显
      ctx.globalAlpha = p.alpha * alphaMul * (0.4 + 0.6 * k);
      ctx.drawImage(sprites[p.ci], px - r, py - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 暴露给 theme.js：主题切换时更新粒子配色
  window.Card = window.Card || {};
  window.Card.applyTheme = function (theme) {
    palette = PALETTES[theme] || PALETTES.dark;
    isLight = theme === 'light';
    sprites = palette.map(makeSprite);
    for (let i = 0; i < ps.length; i++) ps[i].ci = (Math.random() * palette.length) | 0;
  };

  window.addEventListener('resize', resize);
})();
