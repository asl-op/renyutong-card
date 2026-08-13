/**
 * 径向圈层星图 —— 阅读页（/reads）的核心可视化
 * ------------------------------------------------------------
 * 纯原生 Canvas 手写，无第三方图表库、无外部图片。
 *
 * 结构设计：
 *   · 中心原点 = ME（自己）
 *   · 向外多层同心环形轨道（半径递增）
 *   · 书单 / 笔记作为「星体节点」分布在轨道上，按「知识象限」分区
 *     —— 每个象限（category）占据一个扇形角域，节点沿该扇形分布；
 *   · 整套星图跟随星系缓慢柔和自转；
 *   · 鼠标悬浮星体节点时，平滑弹出书名与简介；
 *   · 星体自带微弱星芒光晕，轨道极细半透深空灰。
 *
 * 数据流：GET /api/reads → 生成布局 → 渲染动画循环。
 * 后台保存后，页面每 30 秒 / 每次聚焦会自动重新拉取，数据变化即自动刷新。
 */
(function () {
  const canvas = document.getElementById('starmap');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('starmap-tooltip');
  const elBooks = document.getElementById('stat-books');
  const elNotes = document.getElementById('stat-notes');
  const elCats = document.getElementById('stat-cats');
  const elLegend = document.getElementById('legend');

  let width = 0;
  let height = 0;
  let dpr = 1;

  let rawData = [];        // 原始阅读数据（来自接口）
  let lastJSON = '';       // 用于判断数据是否变化
  let categories = [];     // [{ name, start, mid, end, color }]
  let nodes = [];          // 基础布局 [{ angle, radius, color, item, category }]
  let screenNodes = [];    // 每帧计算出的屏幕坐标 [{ x, y, ... }]，用于命中检测
  let rotation = 0;        // 当前自转角度

  const mouse = { x: -9999, y: -9999 };
  let hovered = null;      // 当前悬浮的节点（或其 null）

  // 每个象限（category）按扇形角域分布时，每圈最多放几个节点
  const ITEMS_PER_RING = 3;

  // 知识象限配色（低饱和、色相区分、固定顺序）。
  // 颜色按「分类名排序」后固定映射，保证同一分类永远同色，不随数据顺序变化。
  const CAT_COLORS = [
    '#7d9fd4', // 蓝
    '#9d86d4', // 紫
    '#6fb0bd', // 青
    '#cf8096', // 胭脂红
    '#c9a877', // 金
    '#82b99a', // 青绿
    '#c083c0', // 品红
    '#d0d0de', // 银白
    '#86a7c0', // 灰蓝
    '#b0879a', // 藕粉
  ];

  /* ---------- 工具：十六进制颜色 → rgba() ---------- */
  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ---------- 画布尺寸自适应 ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildLayout();
  }

  /* ---------- 由数据生成布局 ---------- */
  function buildLayout() {
    categories = [];
    nodes = [];
    const cx = width / 2;
    const cy = height / 2;

    // 1) 统计分类（去重）并排序，保证颜色映射稳定
    const catNames = Array.from(new Set(rawData.map((d) => d.category))).sort();

    // 2) 为每个分类分配一个扇形角域（均分整个圆周）
    const sector = (Math.PI * 2) / Math.max(1, catNames.length);
    categories = catNames.map((name, i) => ({
      name: name,
      start: i * sector,
      mid: i * sector + sector / 2,
      end: (i + 1) * sector,
      color: CAT_COLORS[i % CAT_COLORS.length],
    }));
    const colorByCat = {};
    categories.forEach((c) => (colorByCat[c.name] = c.color));

    // 3) 轨道半径：内圈起，逐层外扩
    const outer = Math.min(width, height) * 0.44; // 最外圈距离中心的距离
    const baseRadius = Math.max(70, outer * 0.3);
    const ringGap = 92;

    // 4) 把每条记录放到对应分类的扇形里
    const perCat = {}; // category -> 已放置数量
    rawData.forEach((item) => {
      const cat = categories.find((c) => c.name === item.category);
      if (!cat) return;

      const idx = perCat[item.category] || 0;
      perCat[item.category] = idx + 1;

      // 圈号 = 第几个（每圈 ITEMS_PER_RING 个）
      const ring = Math.floor(idx / ITEMS_PER_RING);
      const within = idx % ITEMS_PER_RING;
      const radius = baseRadius + ring * ringGap;

      // 在该扇形角域内均分角度（两侧留少量 padding，避免压线）
      const pad = sector * 0.12;
      const span = sector - pad * 2;
      const angle = cat.start + pad + (within / ITEMS_PER_RING) * span;

      nodes.push({
        angle: angle,
        radius: radius,
        color: colorByCat[item.category],
        category: item.category,
        item: item,
        type: item.type === 'note' ? 'note' : 'book',
      });
    });

    // 5) 更新左侧统计卡片
    if (elBooks) elBooks.textContent = rawData.filter((d) => d.type !== 'note').length;
    if (elNotes) elNotes.textContent = rawData.filter((d) => d.type === 'note').length;
    if (elCats) elCats.textContent = categories.length;

    // 6) 渲染图例（分类 → 颜色 + 名称）
    if (elLegend) {
      elLegend.innerHTML = '<h4>知识象限</h4>' +
        categories.map((c) =>
          '<div class="legend-item"><span class="legend-dot" style="background:' + c.color + ';box-shadow:0 0 8px ' + hexToRgba(c.color, 0.7) + '"></span>' +
          c.name + '</div>'
        ).join('');
    }
  }

  /* ---------- 绘制一帧 ---------- */
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;

    // 缓慢自转
    rotation += 0.0008;

    // 1) 同心环形轨道（极细半透深空灰）
    const maxRing = nodes.reduce((m, n) => Math.max(m, n.radius), 0);
    const outer = Math.min(width, height) * 0.44;
    const baseRadius = Math.max(70, outer * 0.3);
    for (let r = baseRadius; r <= maxRing + 1; r += 92) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(160,175,210,0.10)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 2) 象限分隔线（极淡，标识知识分区）+ 分类标签
    categories.forEach((c) => {
      const a = c.start + rotation;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * (maxRing + 40), cy + Math.sin(a) * (maxRing + 40));
      ctx.strokeStyle = 'rgba(160,175,210,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 分类标签：放在最外圈之外，颜色极淡，文字保持正立
      const mid = c.mid + rotation;
      const lx = cx + Math.cos(mid) * (maxRing + 56);
      const ly = cy + Math.sin(mid) * (maxRing + 56);
      ctx.fillStyle = 'rgba(168,174,196,0.38)';
      ctx.font = '12px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.name, lx, ly);
    });

    // 3) 中心原点 ME
    const meGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
    meGlow.addColorStop(0, 'rgba(230,233,242,0.9)');
    meGlow.addColorStop(0.3, 'rgba(140,190,210,0.35)');
    meGlow.addColorStop(1, 'rgba(140,190,210,0)');
    ctx.fillStyle = meGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e6e9f2';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(230,233,242,0.85)';
    ctx.font = '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ME', cx, cy + 34);

    // 4) 星体节点（随自转定位）
    screenNodes = [];
    ctx.globalCompositeOperation = 'lighter';
    nodes.forEach((n) => {
      const a = n.angle + rotation;
      const x = cx + Math.cos(a) * n.radius;
      const y = cy + Math.sin(a) * n.radius;

      // 星芒光晕
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
      glow.addColorStop(0, hexToRgba(n.color, 0.55));
      glow.addColorStop(1, hexToRgba(n.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fill();

      if (n.type === 'note') {
        // 笔记：空心圆环（donut）
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(n.color, 0.95);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // 书：实心圆点
        ctx.fillStyle = hexToRgba(n.color, 0.95);
        ctx.beginPath();
        ctx.arc(x, y, 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      screenNodes.push({ x: x, y: y, node: n });
    });
    ctx.globalCompositeOperation = 'source-over';

    // 5) 命中检测 → 悬浮提示
    hitTest();

    requestAnimationFrame(draw);
  }

  /* ---------- 命中检测 + 提示气泡 ---------- */
  function hitTest() {
    let found = null;
    for (const s of screenNodes) {
      const dx = mouse.x - s.x;
      const dy = mouse.y - s.y;
      if (dx * dx + dy * dy < 14 * 14) {
        found = s.node;
        break;
      }
    }

    if (found !== hovered) {
      hovered = found;
      if (hovered) {
        showTooltip(hovered);
      } else {
        hideTooltip();
      }
    }
  }

  function showTooltip(n) {
    if (!tooltip) return;
    const item = n.item;
    tooltip.innerHTML =
      '<div class="tt-title">' + esc(item.title) + '</div>' +
      '<div class="tt-meta">' + esc(item.category) + ' · ' + esc(item.status) +
      (n.type === 'note' ? ' · 笔记' : ' · 书') + '</div>' +
      '<div class="tt-note">' + esc(item.note || '') + '</div>';
    tooltip.classList.add('show');
    positionTooltip();
  }

  function hideTooltip() {
    if (!tooltip) return;
    tooltip.classList.remove('show');
  }

  // 让气泡跟随鼠标，靠近右/下边缘时翻转，避免溢出
  function positionTooltip() {
    if (!tooltip) return;
    const gap = 18;
    let tx = mouse.x + gap;
    let ty = mouse.y + gap;
    const rect = tooltip.getBoundingClientRect();
    if (tx + rect.width > window.innerWidth - 12) tx = mouse.x - rect.width - gap;
    if (ty + rect.height > window.innerHeight - 12) ty = mouse.y - rect.height - gap;
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  }

  // 简单转义，防止书名/简介里的 HTML 字符破坏结构
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 事件绑定 ---------- */
  canvas.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (hovered) positionTooltip(); // 悬浮时气泡跟随
  });

  canvas.addEventListener('pointerleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
    hideTooltip();
    hovered = null;
  });

  // 触屏设备：点按即显示提示（替代 hover）
  canvas.addEventListener('pointerdown', () => {
    if (hovered) positionTooltip();
  });

  window.addEventListener('resize', resize);

  /* ---------- 数据加载 + 自动刷新 ---------- */
  function fetchData() {
    return fetch('/api/reads')
      .then((r) => r.json())
      .then((json) => {
        const str = JSON.stringify(json);
        if (str !== lastJSON) {
          lastJSON = str;
          rawData = json || [];
          buildLayout();
        }
      })
      .catch(() => {});
  }

  resize();
  draw();      // 启动动画循环（只需一次，内部会自我递归）
  fetchData(); // 异步拉取数据，返回后 buildLayout 更新，正在运行的循环会自动绘制出新节点

  // 自动刷新：后台保存后，星图在 30 秒内自动同步；切回页面时立即同步
  setInterval(fetchData, 30 * 1000);
  window.addEventListener('focus', fetchData);
})();
