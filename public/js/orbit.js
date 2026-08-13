/**
 * orbit.js —— 太阳系同心环形星轨
 * 效果：
 *  1. 页面中心为「ME」原点，向外多层独立环形轨道
 *  2. 内容（项目 / 阅读）作为星体节点，按分类分布到不同轨道
 *  3. 整套星轨以极慢速度顺时针柔和自转
 *  4. 鼠标悬浮星体节点，平滑弹出标题 / 简介卡片
 * 实现：纯原生 JS + CSS，无图表库、无外部图片
 */
(function () {
  const stage = document.getElementById('orbitStage');
  if (!stage) return;

  // 悬浮详情卡片元素
  const card = document.getElementById('hoverCard');

  // 数据接口：由 HTML 上的 data-api 指定（项目 /api/projects，阅读 /api/reads）
  const api = stage.dataset.api || '/api/projects';

  // ---------- 轨道参数 ----------
  const R_BASE = 0.16;    // 最内圈半径（占舞台短边的比例）
  const R_STEP = 0.145;   // 每向外一圈增加的半径比例

  // 不同轨道使用的星尘色调（低饱和、柔和）
  const RING_TINTS = [
    'rgba(86, 140, 200, 0.07)',   // 星尘青
    'rgba(150, 120, 210, 0.06)',  // 星云紫
    'rgba(120, 130, 220, 0.07)',  // 暗靛蓝
    'rgba(90, 160, 180, 0.06)',   // 青紫
    'rgba(160, 140, 200, 0.06)',  // 淡紫
  ];
  const DOT_COLORS = ['#9fb8d8', '#b6a4dc', '#8fb4d4', '#a7c4d8', '#b39ddb'];

  // 舞台尺寸与圆心
  let W = 0, H = 0, cx = 0, cy = 0, minDim = 0;

  // 节点数组：{ el, radius, angle, omega }
  let nodes = [];

  // 自转周期：每 130 秒转一圈（极慢，不抢阅读焦点）
  const PERIOD = 130000;                 // 毫秒
  const BASE_OMEGA = (Math.PI * 2) / PERIOD; // 角速度；屏幕坐标 y 向下，角度递增即顺时针

  // 缓存数据，窗口缩放时无需重新请求接口
  let cachedItems = [];
  let cachedCats = [];

  // ---------- 工具：HTML 转义，避免特殊字符破坏结构 ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // ---------- 计算舞台尺寸与圆心 ----------
  function resize() {
    W = stage.clientWidth;
    H = stage.clientHeight;
    cx = W / 2;
    cy = H / 2;
    minDim = Math.min(W, H);
  }

  // ---------- 构建轨道圈层 ----------
  function buildRings(categories) {
    stage.querySelectorAll('.orbit-ring').forEach(function (el) { el.remove(); });

    categories.forEach(function (cat, i) {
      const r = (R_BASE + R_STEP * i) * minDim;
      const ring = document.createElement('div');
      ring.className = 'orbit-ring';
      ring.style.width = (r * 2) + 'px';
      ring.style.height = (r * 2) + 'px';
      ring.style.left = (cx - r) + 'px';
      ring.style.top = (cy - r) + 'px';
      ring.style.setProperty('--tint', RING_TINTS[i % RING_TINTS.length]);
      stage.appendChild(ring);
    });
  }

  // ---------- 构建中心 ME 原点 ----------
  function buildCore() {
    const core = document.createElement('div');
    core.className = 'orbit-core';
    core.textContent = 'ME';
    core.style.left = cx + 'px';
    core.style.top = cy + 'px';
    stage.appendChild(core);
  }

  // ---------- 构建星体节点 ----------
  function buildNodes(items, categories) {
    // 清理旧的节点与中心点
    stage.querySelectorAll('.orbit-node, .orbit-core').forEach(function (el) { el.remove(); });
    buildCore();

    // 按分类分组
    const grouped = {};
    categories.forEach(function (c) { grouped[c] = []; });
    items.forEach(function (it) {
      const c = it.category || '未分类';
      if (!grouped[c]) grouped[c] = [];
      grouped[c].push(it);
    });

    nodes = [];
    categories.forEach(function (cat, ri) {
      const list = grouped[cat] || [];
      const r = (R_BASE + R_STEP * ri) * minDim;
      const color = DOT_COLORS[ri % DOT_COLORS.length];

      list.forEach(function (it, ni) {
        // 同一轨道上的节点均匀分布，不同轨道错开起始角度，避免堆叠
        const angle = (Math.PI * 2 * ni) / Math.max(list.length, 1) + ri * 0.6;

        const node = document.createElement('div');
        node.className = 'orbit-node';
        node.innerHTML =
          '<span class="node-dot"></span>' +
          '<span class="node-label"></span>';
        node.querySelector('.node-dot').style.setProperty('--dot-color', color);
        node.querySelector('.node-label').textContent = it.title;

        // 悬浮显示 / 离开隐藏详情卡片
        node.addEventListener('mouseenter', function () { showCard(it, node); });
        node.addEventListener('mouseleave', hideCard);

        stage.appendChild(node);
        nodes.push({ el: node, radius: r, angle: angle, omega: BASE_OMEGA, item: it });
      });
    });
  }

  // ---------- 悬浮详情卡片 ----------
  function showCard(item, node) {
    if (!card) return;
    const tags = (item.tags && item.tags.length) ? item.tags.join(' / ') : '';
    card.innerHTML =
      '<div class="hc-cat">' + escapeHtml(item.category || '未分类') + '</div>' +
      '<div class="hc-title">' + escapeHtml(item.title) + '</div>' +
      '<div class="hc-summary">' + escapeHtml(item.summary || '') + '</div>' +
      '<div class="hc-meta">' + escapeHtml(item.date || '') + (tags ? ' · ' + escapeHtml(tags) : '') + '</div>' +
      (item.link ? '<a class="hc-link" href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener">查看详情 →</a>' : '');
    card.classList.add('show');
    positionCard(node);
  }

  function hideCard() {
    if (card) card.classList.remove('show');
  }

  // 根据节点位置摆放卡片，并限制在视口内
  function positionCard(node) {
    const rect = node.getBoundingClientRect();
    const cw = card.offsetWidth || 280;
    const ch = card.offsetHeight || 160;
    let left = rect.right + 16;
    let top = rect.top + rect.height / 2 - ch / 2;

    if (left + cw > window.innerWidth - 12) left = rect.left - cw - 16;
    if (left < 12) left = 12;
    if (top < 12) top = 12;
    if (top + ch > window.innerHeight - 12) top = window.innerHeight - ch - 12;

    card.style.left = left + 'px';
    card.style.top = top + 'px';
  }

  // ---------- 主渲染循环（自转动画） ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(now - last, 100); // 限制步长，避免切换后台后跳帧
    last = now;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.angle += n.omega * dt;                       // 顺时针自转
      const x = Math.cos(n.angle) * n.radius;        // 计算轨道坐标
      const y = Math.sin(n.angle) * n.radius;
      // 先平移到圆心偏移位置，再居中节点自身（translate 右到左依次应用）
      n.el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%, -50%)';
    }
    requestAnimationFrame(loop);
  }

  // ---------- 读取数据 ----------
  async function load() {
    try {
      cachedItems = await fetch(api).then(function (r) { return r.json(); });
    } catch (e) {
      cachedItems = [];
    }
    cachedCats = [];
    cachedItems.forEach(function (it) {
      const c = it.category || '未分类';
      if (cachedCats.indexOf(c) === -1) cachedCats.push(c);
    });
    render();
  }

  // ---------- 按当前尺寸重建轨道与节点 ----------
  function render() {
    resize();
    buildRings(cachedCats);
    buildNodes(cachedItems, cachedCats);
  }

  // 窗口缩放时防抖重建
  let resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(render, 150);
  });

  // 启动：先读数据再渲染，然后开始动画
  load();
  requestAnimationFrame(loop);
})();
