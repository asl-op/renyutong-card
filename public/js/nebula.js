/**
 * nebula.js —— 全屏星云粒子背景（原生 Canvas，无第三方库、无外部图片）
 * 效果（对标真实哈勃星系的静谧质感）：
 *   1. 入场动画：粒子从屏幕外四散状态缓慢「汇聚成型」（约 4 秒，慢入慢出）
 *   2. 环境态：星尘缓慢漂移 + 极慢的整体星系自转
 *   3. 视差：粒子按深度呈现「近大远小、近亮远暗」
 *   4. 星芒：预渲染柔光贴图，低性能消耗、帧率稳定
 * 实现：requestAnimationFrame + 离屏柔光 Sprite，柔和内敛、无爆炸闪光
 */
(function () {
  const canvas = document.getElementById('nebula');
  if (!canvas) return;                 // 页面没有该画布时直接跳过
  const ctx = canvas.getContext('2d');

  // 是否偏好减少动画（无障碍）
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2); // 限制像素比，兼顾清晰度与性能

  // 星空配色（RGB，紫色调浅、偏银紫）—— 星光亮白为主，银紫星云点缀
  const PALETTE = [
    [248, 251, 255],   // 星光亮白 #F8FBFF（多数）
    [255, 255, 255],   // 星点高光 #FFFFFF
    [248, 251, 255],
    [176, 166, 216],   // 淡银紫 #B0A6D8（soft）
    [138, 116, 196],   // 银紫 #8A74C4
    [51, 37, 92],      // 暗星云紫 #33255C（少量）
  ];

  // 粒子数量：随屏幕自适应，封顶保证性能
  const COUNT = Math.min(200, Math.max(120, Math.floor(window.innerWidth * 0.12)));
  const CONVERGE_MS = 4200;            // 汇聚动画时长（毫秒）

  // 预渲染每颗颜色的柔光 Sprite（避免逐帧画径向渐变，性能更好）
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
  const sprites = PALETTE.map(makeSprite);

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

  // 高斯随机：让锚点更偏向中心，形成松散的星云团
  function gauss() {
    return (Math.random() + Math.random() + Math.random()) / 3 - 0.5;
  }

  // 生成单个粒子
  function makeParticle(scattered) {
    const p = {
      ci: (Math.random() * PALETTE.length) | 0, // 颜色索引
      z: Math.random(),                          // 深度 0~1：越大越近
      size: 0.6 + Math.random() * 2.2,           // 近大远小（半径基数）
      alpha: 0.10 + Math.random() * 0.28,        // 近亮远暗（基础透明度）
      orbitR: 20 + Math.random() * 240,          // 自转轨道半径（深层更靠外，视差更强）
      orbitA: Math.random() * Math.PI * 2,       // 自转相位
      orbitV: (Math.random() - 0.5) * 0.08,      // 自转角速度（极慢）
      driftX: (Math.random() - 0.5) * 0.05,      // 漂移速度
      driftY: (Math.random() - 0.5) * 0.05,
      dx: 0, dy: 0,                              // 漂移累计位移
    };

    // 汇聚起点：屏幕外较远处（四散状态）
    if (scattered) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.max(W, H) * (0.6 + Math.random() * 0.9);
      p.sx = W / 2 + Math.cos(a) * d;
      p.sy = H / 2 + Math.sin(a) * d;
    } else {
      p.sx = Math.random() * W;
      p.sy = Math.random() * H;
    }
    // 最终锚点：偏向中心
    p.tx = W / 2 + gauss() * W * 0.9;
    p.ty = H / 2 + gauss() * H * 0.9;
    return p;
  }

  const ps = [];
  for (let i = 0; i < COUNT; i++) ps.push(makeParticle(true));

  // 慢入慢出缓动
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // ---------- 星光（跟随鼠标，柔缓点状星光） ----------
  const starlights = [];
  const MOUSE_SPAWN_DIST = 34;   // 鼠标每移动约 34px 生成一簇星光
  const MAX_STARLIGHT = 22;      // 同时最多 22 颗
  let mouseX = -9999, mouseY = -9999, mouseAcc = 0;

  function spawnStarlight(x, y, dx, dy) {
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len, ny = dy / len;
    const baseAngle = Math.atan2(-ny, -nx);   // 尾巴方向（运动反方向）
    const n = 3 + Math.floor(Math.random() * 3); // 每簇 3~5 颗
    for (let i = 0; i < n; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 0.9; // 尾巴方向轻微散布
      starlights.push({
        x: x + (Math.random() - 0.5) * 40,   // 聚集在光标附近
        y: y + (Math.random() - 0.5) * 40,
        tx: Math.cos(a),
        ty: Math.sin(a),
        tail: 10 + Math.random() * 14,       // 尾巴长度（拉长一点）
        r: 0.8 + Math.random() * 1.3,        // 星光半径（更小更细）
        color: Math.random() < 0.72 ? '201,189,240' : '176,166,216', // 淡银紫 / 银紫
        life: 0,
        maxLife: 0.8 + Math.random() * 0.7,  // 存活时长（秒）
      });
    }
    while (starlights.length > MAX_STARLIGHT) starlights.shift();
  }

  function onMove(x, y) {
    if (reduced) return;
    if (mouseX === -9999) { mouseX = x; mouseY = y; return; }
    const dx = x - mouseX, dy = y - mouseY;
    mouseAcc += Math.hypot(dx, dy);
    if (mouseAcc >= MOUSE_SPAWN_DIST) {
      spawnStarlight(x, y, dx, dy);
      mouseAcc = 0;
    }
    mouseX = x; mouseY = y;
  }

  window.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  function updateStarlight(dt) {
    for (let i = starlights.length - 1; i >= 0; i--) {
      const s = starlights[i];
      s.life += dt;
      if (s.life >= s.maxLife) { starlights.splice(i, 1); continue; }
      const t = s.life / s.maxLife;
      const alpha = Math.sin(Math.PI * t) * 0.95;  // 柔缓淡入 → 淡出（更亮）
      const hx = s.x, hy = s.y;
      const tx = s.x + s.tx * s.tail, ty = s.y + s.ty * s.tail;
      // 尾巴：头部亮 → 尾部渐变黯淡
      const lineGrad = ctx.createLinearGradient(hx, hy, tx, ty);
      lineGrad.addColorStop(0, 'rgba(' + s.color + ',' + alpha + ')');
      lineGrad.addColorStop(1, 'rgba(' + s.color + ',0)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = s.r * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      // 头部亮点（更亮）
      const R = s.r * 2.0;
      const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
      grad.addColorStop(0, 'rgba(' + s.color + ',' + alpha + ')');
      grad.addColorStop(0.35, 'rgba(' + s.color + ',' + (alpha * 0.4) + ')');
      grad.addColorStop(1, 'rgba(' + s.color + ',0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(hx, hy, R, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const start = performance.now();
  let lastNow = start;

  function frame(now) {
    const elapsed = now - start;
    const dt = Math.min((now - lastNow) / 1000, 0.1); // 帧间隔（秒），限制上限防跳帧
    lastNow = now;
    // 汇聚进度 0→1；完成后自然退化为环境漂移
    const k = reduced ? 1 : easeInOutCubic(Math.min(1, elapsed / CONVERGE_MS));
    // 全局自转角：极慢（约 14 分钟转一圈），营造星系自转
    const spin = elapsed * 0.00012;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.orbitA += p.orbitV * 0.0004;
      p.dx += p.driftX;
      p.dy += p.driftY;

      // 汇聚插值：起点 → 锚点
      const lx = p.sx + (p.tx - p.sx) * k;
      const ly = p.sy + (p.ty - p.sy) * k;
      // 自转偏移（随汇聚逐渐成形）
      const ox = Math.cos(p.orbitA + spin) * p.orbitR * k;
      const oy = Math.sin(p.orbitA + spin) * p.orbitR * k;
      // 缓慢漂移
      const x = lx + ox + p.dx;
      const y = ly + oy + p.dy;

      // 柔和包裹回屏，避免粒子突然消失
      const m = 90;
      const px = ((((x + m) % (W + m * 2)) + (W + m * 2)) % (W + m * 2)) - m;
      const py = ((((y + m) % (H + m * 2)) + (H + m * 2)) % (H + m * 2)) - m;

      // 汇聚过程中渐亮，成型后的星云更柔和明亮
      const r = p.size * 3.4;
      ctx.globalAlpha = p.alpha * (0.4 + 0.6 * k);
      ctx.drawImage(sprites[p.ci], px - r, py - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;

    // 星光（跟随鼠标，柔缓点状）
    if (!reduced) updateStarlight(dt);

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 窗口缩放时重新计算尺寸（粒子锚点不重算，保持环境稳定）
  window.addEventListener('resize', resize);
})();
