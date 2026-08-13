/**
 * admin.js —— 后台可视化管理
 * 功能：对「项目 / 阅读」内容进行新增、编辑、删除
 * 说明：保存后前端环形星轨会自动刷新渲染，无需改动任何前端代码
 * 安全：写操作需携带管理密码（默认 asl11320，见 server.js 的 ADMIN_PASSWORD）
 */
(function () {
  const listEl = document.getElementById('adminList');       // 列表容器
  const form = document.getElementById('itemForm');          // 表单
  const formTitle = document.getElementById('formTitle');    // 表单标题
  const cancelBtn = document.getElementById('cancelEdit');   // 取消编辑按钮
  const submitBtn = document.getElementById('submitBtn');    // 提交按钮

  // 表单字段
  const f = {
    title: document.getElementById('fTitle'),
    summary: document.getElementById('fSummary'),
    category: document.getElementById('fCategory'),
    link: document.getElementById('fLink'),
    date: document.getElementById('fDate'),
    tags: document.getElementById('fTags'),
  };

  let currentType = 'projects'; // 当前资源类型：projects / reads
  let editingId = null;         // 正在编辑的记录 id（null 表示新增）

  // ---------- 管理密码 ----------
  // 密码保存在 sessionStorage（关闭标签页后失效），首次写操作时弹窗询问
  let adminPass = sessionStorage.getItem('adminPass') || '';
  function getPass() {
    if (!adminPass) {
      adminPass = prompt('请输入后台管理密码（默认 asl11320）：') || '';
      if (adminPass) sessionStorage.setItem('adminPass', adminPass);
    }
    return adminPass;
  }
  function clearPass() {
    adminPass = '';
    sessionStorage.removeItem('adminPass');
  }

  // 写请求头：附带鉴权密码；json=true 时加上 JSON 类型头
  function authHeaders(json) {
    const h = { 'x-admin-password': getPass() };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  // 拼接接口地址
  function apiUrl(id) {
    return '/api/' + currentType + (id ? '/' + id : '');
  }

  // 处理 401（密码错误）
  function handleUnauthorized(res) {
    if (res.status === 401) {
      clearPass();
      alert('密码错误，请重新输入。');
      return true;
    }
    return false;
  }

  // ---------- 切换 tab ----------
  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      currentType = tab.dataset.type;
      document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      resetForm();
      load();
    });
  });

  // ---------- 读取并渲染列表 ----------
  async function load() {
    let items = [];
    try {
      items = await fetch(apiUrl()).then(function (r) { return r.json(); });
    } catch (e) {}

    listEl.innerHTML = '';
    if (!items.length) {
      listEl.innerHTML = '<div class="admin-empty">暂无内容，请在右侧表单新增一条。</div>';
      return;
    }

    items.forEach(function (it) {
      const row = document.createElement('div');
      row.className = 'admin-item';
      const tags = (it.tags && it.tags.length) ? it.tags.join(' / ') : '';
      row.innerHTML =
        '<div class="ai-title">' + escapeHtml(it.title) + '</div>' +
        '<div class="ai-cat">' + escapeHtml(it.category || '未分类') + '</div>' +
        '<div class="ai-summary">' + escapeHtml(it.summary || '') + '</div>' +
        '<div class="ai-actions">' +
        '  <button class="edit" data-id="' + escapeHtml(it.id) + '">编辑</button>' +
        '  <button class="del" data-id="' + escapeHtml(it.id) + '">删除</button>' +
        '</div>';
      listEl.appendChild(row);
    });

    // 事件委托：编辑 / 删除
    listEl.querySelectorAll('.edit').forEach(function (btn) {
      btn.addEventListener('click', function () { startEdit(btn.dataset.id); });
    });
    listEl.querySelectorAll('.del').forEach(function (btn) {
      btn.addEventListener('click', function () { remove(btn.dataset.id); });
    });
  }

  // ---------- 表单提交：新增或编辑 ----------
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const payload = {
      title: f.title.value.trim(),
      summary: f.summary.value.trim(),
      category: f.category.value.trim() || '未分类',
      link: f.link.value.trim(),
      date: f.date.value.trim(),
      // 标签：用逗号分隔，去掉空白
      tags: f.tags.value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean),
    };

    if (!payload.title) { alert('请填写标题'); return; }

    const opts = {
      method: editingId ? 'PUT' : 'POST',
      headers: authHeaders(true),
      body: JSON.stringify(payload),
    };

    try {
      const res = await fetch(apiUrl(editingId || undefined), opts);
      if (handleUnauthorized(res)) return;
    } catch (err) {
      alert('保存失败，请确认服务正在运行');
    }

    resetForm();
    load();
  });

  // ---------- 开始编辑：填充表单 ----------
  function startEdit(id) {
    fetch(apiUrl())
      .then(function (r) { return r.json(); })
      .then(function (items) {
        const it = items.find(function (x) { return x.id === id; });
        if (!it) return;
        editingId = id;
        f.title.value = it.title || '';
        f.summary.value = it.summary || '';
        f.category.value = it.category || '';
        f.link.value = it.link || '';
        f.date.value = it.date || '';
        f.tags.value = (it.tags || []).join(', ');
        formTitle.textContent = '编辑' + (currentType === 'projects' ? '项目' : '阅读');
        submitBtn.textContent = '保存修改';
        cancelBtn.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth' });
      });
  }

  // ---------- 删除 ----------
  async function remove(id) {
    if (!confirm('确定删除这条内容吗？')) return;
    try {
      const res = await fetch(apiUrl(id), { method: 'DELETE', headers: authHeaders(false) });
      if (handleUnauthorized(res)) return;
    } catch (e) {}
    if (editingId === id) resetForm();
    load();
  }

  // ---------- 重置表单为「新增」状态 ----------
  function resetForm() {
    editingId = null;
    form.reset();
    formTitle.textContent = '新增' + (currentType === 'projects' ? '项目' : '阅读');
    submitBtn.textContent = '新增并保存';
    cancelBtn.style.display = 'none';
  }

  // 取消编辑
  cancelBtn.addEventListener('click', resetForm);

  // HTML 转义
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // 初始化
  load();
})();
