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
      [150, 150, 182],   // 银灰蓝
      [122, 114, 168],   // 银紫灰
      [172, 168, 204],   // 淡银紫
      [140, 134, 180],   // 银紫
      [190, 187, 216],   // 更淡银紫
      [104, 104, 150],   // 深银灰
    ],
  };

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  const COUNT = Math.min(200, Math.max(120, Math.floor(window.innerWidth * 0.12)));
  const CONVERGE_MS = 4200;   // 汇聚动画时长（毫秒）

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

  // 开场汇聚动画：仅首次访问播放（用 localStorage 记住）
  const INTRO_KEY = 'rt-intro-seen';
  let introSeen = false;
  try { introSeen = !!localStorage.getItem(INTRO_KEY); } catch (e) {}
  let introMarked = introSeen;

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
  for (let i = 0; i < COUNT; i++) ps.push(makeParticle(!introSeen));

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    // 汇聚进度：首次访问才走 0→1；非首次 / 减少动画则直接为 1
    const k = (reduced || introSeen) ? 1 : easeInOutCubic(Math.min(1, elapsed / CONVERGE_MS));
    const spin = elapsed * 0.00012;

    // 首次汇聚完成后，标记「已看过」，下次访问不再播放
    if (!introMarked && elapsed > CONVERGE_MS) {
      introMarked = true;
      try { localStorage.setItem(INTRO_KEY, '1'); } catch (e) {}
    }

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
      ctx.globalAlpha = p.alpha * (0.4 + 0.6 * k);
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
    sprites = palette.map(makeSprite);
    for (let i = 0; i < ps.length; i++) ps[i].ci = (Math.random() * palette.length) | 0;
  };

  window.addEventListener('resize', resize);
})();
