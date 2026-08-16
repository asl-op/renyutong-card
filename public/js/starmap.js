/**
 * starmap.js —— 阅读页「径向圈层星图」
 * 效果：
 *   1. 中心「ME」原点，向外多层同心环形轨道
 *   2. 书单 / 笔记作为星体节点，分布在轨道上，按「知识象限」分区
 *      （技术 / 人文 / 科幻 / 方法论，各占约 90° 扇区）
 *   3. 整套星图以极慢速度柔和自转（CSS 动画，低性能消耗）
 *   4. 悬浮星体节点，平滑弹出书名 + 简介
 *   5. 左侧统计卡片：书籍总数 / 笔记数量
 * 实现：纯原生 JS + CSS，无图表库、无外部图片
 */
(function () {
  const stage = document.getElementById('starmap');
  if (!stage) return;
  const card = document.getElementById('hoverCard');
  const statsEl = document.getElementById('readsStats');

  // 四个知识象限的方位（屏幕坐标 y 向下：右=0°，下=90°，上=-90°）
  // color/glow 用于给各分类的行星做微弱着色区分，整体保持冷调统一
  const QUADRANTS = {
    '技术':   { center: -45,  color: '#7fb8d8', glow: 'rgba(127,184,216,.55)' },
    '人文':   { center: -135, color: '#9fb4d8', glow: 'rgba(159,180,216,.55)' },
    '科幻':   { center: 135,  color: '#6fb4c6', glow: 'rgba(111,180,198,.55)' },
    '方法论': { center: 45,   color: '#c7d4e8', glow: 'rgba(199,212,232,.6)' },
  };
  const RING_RADII = [0.16, 0.27, 0.38, 0.47]; // 轨道半径（占星图半边的比例，内圈→外圈）

  const deg2rad = function (d) { return d * Math.PI / 180; };
  const escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };
  // 确定性伪随机：让同一批数据每次刷新布局一致
  const seeded = function (i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  let cachedItems = [];

  function sizeOf() {
    const s = stage.clientWidth || Math.min(window.innerWidth * 0.8, 520);
    return { size: s, cx: s / 2, cy: s / 2 };
  }

  // ---------- 左侧统计卡片 ----------
  function renderStats(items) {
    const notes = items.filter(function (i) { return i.intro && String(i.intro).trim(); }).length;
    statsEl.innerHTML =
      '<div class="stat-card"><span class="stat-num">' + items.length + '</span><span class="stat-label">书籍总数</span></div>' +
      '<div class="stat-card"><span class="stat-num">' + notes + '</span><span class="stat-label">笔记数量</span></div>';
  }

  // ---------- 四象限标签（固定，不随星图自转） ----------
  function renderQuadrants() {
    const holder = stage.querySelector('.starmap-quadrants');
    if (!holder) return;
    holder.innerHTML = '';
    const m = sizeOf();
    const R = (m.size / 2) * 0.57; // 标签放在最外层轨道之外
    Object.keys(QUADRANTS).forEach(function (key) {
      const a = deg2rad(QUADRANTS[key].center);
      const span = document.createElement('span');
      span.className = 'quadrant-label';
      span.textContent = key;
      span.style.left = (m.cx + Math.cos(a) * R) + 'px';
      span.style.top = (m.cy + Math.sin(a) * R) + 'px';
      holder.appendChild(span);
    });
  }

  // ---------- 轨道 + 星体节点 ----------
  function renderMap(items) {
    const system = stage.querySelector('.starmap-system');
    system.innerHTML = '';
    const m = sizeOf();

    // 同心轨道（极细半透深空灰）
    RING_RADII.forEach(function (r) {
      const ring = document.createElement('div');
      ring.className = 'starmap-orbit';
      const d = r * 2 * m.size;
      ring.style.width = d + 'px';
      ring.style.height = d + 'px';
      ring.style.left = (m.cx - d / 2) + 'px';
      ring.style.top = (m.cy - d / 2) + 'px';
      system.appendChild(ring);
    });

    // 星体节点：按象限扇区 + 轨道半径定位
    items.forEach(function (it, i) {
      const q = QUADRANTS[it.category] || QUADRANTS['技术'];
      const ring = Math.max(0, Math.min(RING_RADII.length - 1, Number(it.ring) || 0));
      const radius = RING_RADII[ring] * (m.size / 2);
      const spread = (seeded(i) - 0.5) * 60;   // 在象限中心 ±30° 散布，避免重叠
      const a = deg2rad(q.center + spread);
      const x = m.cx + Math.cos(a) * radius;
      const y = m.cy + Math.sin(a) * radius;

      const node = document.createElement('div');
      node.className = 'starmap-node';
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      // 行星按四分类着色（微弱区分，保持整体冷调统一）
      node.style.setProperty('--planet-color', q.color);
      node.style.setProperty('--planet-glow', q.glow);
      node.addEventListener('mouseenter', function () { showCard(it); });
      node.addEventListener('mousemove', moveCard);
      node.addEventListener('mouseleave', hideCard);
      node.addEventListener('click', function () { showCard(it); }); // 触屏：点击查看
      system.appendChild(node);
    });
  }

  // ---------- 悬浮详情卡片 ----------
  function showCard(it) {
    if (!card) return;
    card.innerHTML =
      '<div class="hc-cat">' + escapeHtml(it.category || '技术') + ' · 轨道 ' + (it.ring || 0) + '</div>' +
      '<div class="hc-title">' + escapeHtml(it.title) + '</div>' +
      (it.intro ? '<div class="hc-summary">' + escapeHtml(it.intro) + '</div>' : '') +
      (it.link ? '<a class="hc-link" href="' + escapeHtml(it.link) + '" target="_blank" rel="noopener">查看详情 →</a>' : '');
    card.classList.add('show');
  }
  function moveCard(e) {
    if (!card) return;
    const pad = 18;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const cw = card.offsetWidth || 280;
    const ch = card.offsetHeight || 160;
    if (x + cw > window.innerWidth - 12) x = e.clientX - cw - pad;
    if (y + ch > window.innerHeight - 12) y = e.clientY - ch - pad;
    card.style.left = x + 'px';
    card.style.top = y + 'px';
  }
  function hideCard() { if (card) card.classList.remove('show'); }

  // ---------- 渲染入口 ----------
  function render(items) {
    renderStats(items);
    renderQuadrants();
    renderMap(items);
  }

  async function load() {
    try {
      cachedItems = await fetch('/api/reads').then(function (r) { return r.json(); });
    } catch (e) { cachedItems = []; }
    render(cachedItems);
  }

  // 窗口缩放时防抖重建
  let timer = null;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () { render(cachedItems); }, 150);
  });

  load();
})();
