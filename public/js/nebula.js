/**
 * nebula.js —— 全屏星云粒子背景
 * 效果：
 *  1. 银河星尘粒子缓慢漂移（低性能消耗）
 *  2. 鼠标移动产生视差（越深层的粒子移动越明显）
 *  3. 鼠标附近的粒子受到轻微「引力扰动」，柔和聚拢
 * 实现：纯原生 Canvas，无第三方库、无外部图片
 */
(function () {
  const canvas = document.getElementById('nebula');
  if (!canvas) return;                 // 页面没有该画布时直接跳过
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;                    // 视口宽高
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5); // 限制像素比，兼顾清晰度与性能

  // 自适应画布尺寸（高清屏下放大物理像素）
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

  // ---------- 粒子配置 ----------
  const COUNT = 150;                   // 粒子数量（控制性能与密度）
  // 星尘配色：白 / 青 / 紫 / 靛蓝，都是低饱和柔和色
  const COLORS = [
    [255, 255, 255],   // 星尘白
    [150, 185, 220],   // 星尘青
    [175, 150, 220],   // 星云紫
    [120, 140, 200],   // 暗靛蓝
  ];

  // 把颜色数组转成 rgba 字符串
  function color(n, a) {
    const c = COLORS[n % COLORS.length];
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  // 鼠标状态（位置 + 相对中心的偏移 -1..1）
  const mouse = { x: -9999, y: -9999, offX: 0, offY: 0, active: false };

  // 生成所有粒子
  const ps = [];
  for (let i = 0; i < COUNT; i++) {
    ps.push({
      x: Math.random() * W,             // 横坐标
      y: Math.random() * H,             // 纵坐标
      depth: 0.15 + Math.random() * 0.85, // 深度：决定视差强度
      r: 0.4 + Math.random() * 1.5,     // 半径
      a: 0.12 + Math.random() * 0.5,    // 基础透明度
      vx: (Math.random() - 0.5) * 0.05, // 漂移速度 x
      vy: (Math.random() - 0.5) * 0.05, // 漂移速度 y
      c: Math.floor(Math.random() * COLORS.length), // 颜色索引
      tw: Math.random() * Math.PI * 2,  // 闪烁初始相位
    });
  }

  // 更新单个粒子：漂移 + 边界循环 + 鼠标引力扰动
  function step(p) {
    p.x += p.vx;
    p.y += p.vy;

    // 超出边界后从另一侧回来，形成无限星尘
    if (p.x < -30) p.x = W + 30;
    if (p.x > W + 30) p.x = -30;
    if (p.y < -30) p.y = H + 30;
    if (p.y > H + 30) p.y = -30;

    // 鼠标附近的粒子被轻微吸引（引力扰动，柔和）
    if (mouse.active) {
      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const d2 = dx * dx + dy * dy;
      const R = 130;                   // 影响半径
      if (d2 < R * R) {
        const d = Math.sqrt(d2) || 1;
        const f = (1 - d / R) * 0.16 * p.depth; // 越近引力越强，深层粒子更敏感
        p.x += (dx / d) * f;
        p.y += (dy / d) * f;
      }
    }
  }

  // 绘制单个粒子：视差偏移 + 呼吸闪烁
  function draw(p, t) {
    // 视差：鼠标偏离中心越远，深层粒子偏移越大
    const px = p.x + mouse.offX * p.depth * 28;
    const py = p.y + mouse.offY * p.depth * 28;
    // 呼吸闪烁：透明度随时间缓慢起伏
    const alpha = p.a * (0.55 + 0.45 * Math.sin(t * 0.0009 + p.tw));
    ctx.fillStyle = color(p.c, alpha);
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 主循环
  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < ps.length; i++) {
      step(ps[i]);
      draw(ps[i], t);
    }
    requestAnimationFrame(frame);
  }

  // 监听鼠标移动与离开
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.offX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.offY = (e.clientY / window.innerHeight - 0.5) * 2;
    mouse.active = true;
  });
  window.addEventListener('mouseleave', function () {
    mouse.active = false;
  });

  // 窗口缩放时重新计算尺寸
  window.addEventListener('resize', resize);

  // 开始渲染
  requestAnimationFrame(frame);
})();
