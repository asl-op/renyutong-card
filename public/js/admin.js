/**
 * admin.js —— 后台可视化管理（配置驱动）
 * 功能：对「项目 / 阅读」两个板块进行新增、编辑、删除
 * 说明：保存后前端会自动刷新渲染，无需改动任何前端代码
 * 安全：写操作需携带管理密码（由 server.js 生成/配置，密码不提交到 Git）
 */
(function () {
  const root = document.getElementById('adminRoot');
  if (!root) return;

  const escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };

  // ---------- 两个板块的字段与行为配置 ----------
  const CONFIGS = {
    projects: {
      label: '项目',
      fields: [
        { key: 'title', label: '标题 *', type: 'text', required: true, ph: '例如：个人名片网站' },
        { key: 'summary', label: '简介', type: 'textarea', ph: '一句话介绍，会显示在卡片里' },
        { key: 'category', label: '分类', type: 'text', ph: '例如：Web 开发' },
        { key: 'link', label: '链接（可选）', type: 'text', ph: 'https://github.com/asl-op' },
        { key: 'date', label: '日期', type: 'text', ph: '例如：2026-08' },
        { key: 'tags', label: '标签（逗号分隔）', type: 'text', ph: 'Node.js, 原生 JS' },
      ],
      normalize: function (d) {
        return {
          title: d.title,
          summary: d.summary,
          category: d.category || '未分类',
          link: d.link,
          date: d.date,
          tags: (d.tags || '').split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean),
        };
      },
      itemHTML: function (it) {
        const tags = (it.tags && it.tags.length)
          ? it.tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('')
          : '';
        return '<div class="admin-item">' +
          '<div class="ai-title">' + escapeHtml(it.title) + '</div>' +
          '<div class="ai-cat">' + escapeHtml(it.category || '') + (it.date ? ' · ' + escapeHtml(it.date) : '') + '</div>' +
          '<div class="ai-summary">' + escapeHtml(it.summary || '') + '</div>' +
          (tags ? '<div class="ai-tags">' + tags + '</div>' : '') +
          '<div class="ai-actions">' +
            '<button class="edit" data-id="' + escapeHtml(it.id) + '">编辑</button>' +
            '<button class="del" data-id="' + escapeHtml(it.id) + '">删除</button>' +
          '</div>' +
        '</div>';
      },
    },
    reads: {
      label: '阅读条目',
      fields: [
        { key: 'title', label: '书名 / 标题 *', type: 'text', required: true, ph: '例如：《三体》读后感' },
        { key: 'intro', label: '简介 / 笔记', type: 'textarea', ph: '读后笔记，会显示在星图悬浮卡片里' },
        { key: 'category', label: '知识象限', type: 'select', options: [
          { value: '技术', label: '技术' },
          { value: '人文', label: '人文' },
          { value: '科幻', label: '科幻' },
          { value: '方法论', label: '方法论' },
        ]},
        { key: 'ring', label: '轨道', type: 'select', options: [
          { value: 0, label: '0 · 内圈' },
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3 · 外圈' },
        ]},
      ],
      normalize: function (d) {
        return {
          title: d.title,
          intro: d.intro,
          category: d.category || '技术',
          ring: Number(d.ring) || 0,
        };
      },
      itemHTML: function (it) {
        return '<div class="admin-item">' +
          '<div class="ai-title">' + escapeHtml(it.title) + '</div>' +
          '<div class="ai-cat">' + escapeHtml(it.category || '技术') + ' · 轨道 ' + (it.ring || 0) + '</div>' +
          '<div class="ai-summary">' + escapeHtml(it.intro || '') + '</div>' +
          '<div class="ai-actions">' +
            '<button class="edit" data-id="' + escapeHtml(it.id) + '">编辑</button>' +
            '<button class="del" data-id="' + escapeHtml(it.id) + '">删除</button>' +
          '</div>' +
        '</div>';
      },
    },
  };

  // ---------- 状态 ----------
  let currentType = 'projects';
  let editingId = null;
  let items = [];
  let adminPass = sessionStorage.getItem('adminPass') || '';

  const cfg = function () { return CONFIGS[currentType]; };
  const apiUrl = function (id) { return '/api/' + currentType + (id ? '/' + id : ''); };

  function getPass() {
    if (!adminPass) {
      adminPass = prompt('请输入后台管理密码：') || '';
      if (adminPass) sessionStorage.setItem('adminPass', adminPass);
    }
    return adminPass;
  }
  function clearPass() {
    adminPass = '';
    sessionStorage.removeItem('adminPass');
  }
  function authHeaders(json) {
    const h = { 'x-admin-password': getPass() };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  // ---------- 生成表单字段 HTML ----------
  function fieldHTML(f) {
    if (f.type === 'textarea') {
      return '<div class="field"><label>' + f.label + '</label>' +
        '<textarea name="' + f.key + '" placeholder="' + (f.ph || '') + '"></textarea></div>';
    }
    if (f.type === 'select') {
      const opts = f.options.map(function (o) {
        return '<option value="' + o.value + '">' + o.label + '</option>';
      }).join('');
      return '<div class="field"><label>' + f.label + '</label>' +
        '<select name="' + f.key + '">' + opts + '</select></div>';
    }
    return '<div class="field"><label>' + f.label + '</label>' +
      '<input type="text" name="' + f.key + '" placeholder="' + (f.ph || '') + '" ' + (f.required ? 'required' : '') + '></div>';
  }

  // ---------- 构建整体面板（列表 + 表单） ----------
  function build() {
    root.innerHTML =
      '<div class="admin-panel">' +
        '<div id="adminList" class="admin-list"></div>' +
        '<form id="itemForm" class="admin-form" autocomplete="off">' +
          '<h2 id="formTitle">新增' + cfg().label + '</h2>' +
          cfg().fields.map(fieldHTML).join('') +
          '<button id="submitBtn" class="admin-submit" type="submit">新增并保存</button>' +
          '<button id="cancelEdit" class="admin-cancel" type="button" style="display:none;">取消编辑</button>' +
        '</form>' +
      '</div>';

    document.getElementById('itemForm').addEventListener('submit', onSubmit);
    document.getElementById('cancelEdit').addEventListener('click', resetForm);
    load();
  }

  // ---------- 读取并渲染列表 ----------
  function renderList() {
    const listEl = document.getElementById('adminList');
    if (!items.length) {
      listEl.innerHTML = '<div class="admin-empty">暂无内容，请在右侧表单新增一条。</div>';
      return;
    }
    listEl.innerHTML = items.map(cfg().itemHTML).join('');
    listEl.querySelectorAll('.edit').forEach(function (b) {
      b.addEventListener('click', function () { startEdit(b.dataset.id); });
    });
    listEl.querySelectorAll('.del').forEach(function (b) {
      b.addEventListener('click', function () { remove(b.dataset.id); });
    });
  }

  async function load() {
    try {
      items = await fetch(apiUrl()).then(function (r) { return r.json(); });
    } catch (e) { items = []; }
    renderList();
  }

  // ---------- 表单收集与提交 ----------
  function collect() {
    const form = document.getElementById('itemForm');
    const data = {};
    cfg().fields.forEach(function (f) {
      const el = form.querySelector('[name="' + f.key + '"]');
      data[f.key] = el ? el.value : '';
    });
    return cfg().normalize(data);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const payload = collect();
    if (!payload.title) { alert('请填写标题'); return; }

    const opts = {
      method: editingId ? 'PUT' : 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    };
    try {
      const res = await fetch(apiUrl(editingId || undefined), opts);
      if (res.status === 401) { clearPass(); alert('密码错误，请重新输入。'); return; }
    } catch (err) {
      alert('保存失败，请确认服务正在运行');
    }
    resetForm();
    load();
  }

  // ---------- 编辑 / 删除 ----------
  function startEdit(id) {
    const it = items.find(function (x) { return x.id === id; });
    if (!it) return;
    editingId = id;
    const form = document.getElementById('itemForm');
    cfg().fields.forEach(function (f) {
      const el = form.querySelector('[name="' + f.key + '"]');
      if (el) el.value = (f.key === 'tags') ? (it.tags || []).join(', ') : (it[f.key] != null ? it[f.key] : '');
    });
    document.getElementById('formTitle').textContent = '编辑' + cfg().label;
    document.getElementById('submitBtn').textContent = '保存修改';
    document.getElementById('cancelEdit').style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  async function remove(id) {
    if (!confirm('确定删除这条内容吗？')) return;
    try {
      const res = await fetch(apiUrl(id), { method: 'DELETE', headers: authHeaders(false) });
      if (res.status === 401) { clearPass(); alert('密码错误，请重新输入。'); return; }
    } catch (e) {}
    if (editingId === id) resetForm();
    load();
  }

  // ---------- 重置表单为「新增」状态 ----------
  function resetForm() {
    editingId = null;
    const form = document.getElementById('itemForm');
    if (form) form.reset();
    const t = document.getElementById('formTitle');
    if (t) t.textContent = '新增' + cfg().label;
    const s = document.getElementById('submitBtn');
    if (s) s.textContent = '新增并保存';
    const c = document.getElementById('cancelEdit');
    if (c) c.style.display = 'none';
  }

  // ---------- 切换 tab ----------
  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      currentType = tab.dataset.type;
      document.querySelectorAll('.admin-tab').forEach(function (t) {
        t.classList.toggle('active', t === tab);
      });
      editingId = null;
      build();
    });
  });

  // ---------- 初始化 ----------
  build();
})();
