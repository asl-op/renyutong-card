/**
 * 后台可视化管理逻辑（含简单口令登录）
 * ------------------------------------------------------------
 *  1. 未登录时显示「登录门」，输入口令后进入管理界面；
 *  2. 提供项目 / 阅读的新增、编辑、删除；
 *  3. 所有写操作都走后端接口；后端校验登录令牌，未登录会返回 401，
 *     此时自动退回登录门。
 */
document.addEventListener('DOMContentLoaded', function () {
  const loginGate = document.getElementById('login-gate');
  const adminContent = document.getElementById('admin-content');
  const loginForm = document.getElementById('login-form');
  const loginErr = document.getElementById('login-err');
  const loginPassword = document.getElementById('login-password');

  /* ---------- 小工具：读写表单字段 ---------- */
  function val(id) { return document.getElementById(id).value.trim(); }
  function set(id, v) { document.getElementById(id).value = v; }

  /* ---------- 显示登录门 / 管理界面 ---------- */
  function showLogin() {
    adminContent.style.display = 'none';
    loginGate.style.display = '';
  }
  function enterAdmin() {
    loginGate.style.display = 'none';
    adminContent.style.display = '';
  }

  /* ---------- 统一请求封装：写操作若 401，退回登录门 ---------- */
  async function api(url, opts) {
    const res = await fetch(url, opts);
    if (res.status === 401) showLogin();
    return res;
  }

  /* ---------- 通用 CRUD 装配函数 ---------- */
  function setupCollection(cfg) {
    const form = document.getElementById(cfg.formId);
    const list = document.getElementById(cfg.listId);
    const idEl = document.getElementById(cfg.idField);
    const cancelBtn = document.getElementById(cfg.cancelId);
    const submitBtn = form.querySelector('button[type="submit"]');

    let items = [];

    // 清空表单，回到「新增」状态
    function resetForm() {
      form.reset();
      idEl.value = '';
      submitBtn.textContent = cfg.addLabel;
      cancelBtn.style.display = 'none';
    }

    // 渲染列表，并给每条绑定「编辑 / 删除」按钮
    function render() {
      if (!items.length) {
        list.innerHTML = '<p class="empty-hint">暂无内容，用上方表单新增一条吧。</p>';
        return;
      }
      list.innerHTML = items.map(cfg.renderItem).join('');

      list.querySelectorAll('[data-act="edit"]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = items.find((i) => i.id === btn.getAttribute('data-id'));
          if (!item) return;
          cfg.fillForm(item);
          idEl.value = item.id;
          submitBtn.textContent = '保存修改';
          cancelBtn.style.display = '';
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });

      list.querySelectorAll('[data-act="del"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('确定删除这一条吗？')) return;
          await api(cfg.api + '/' + btn.getAttribute('data-id'), { method: 'DELETE' });
          await load();
        });
      });
    }

    // 拉取最新数据
    async function load() {
      try {
        const res = await api(cfg.api);
        items = res.ok ? await res.json() : [];
      } catch (e) {
        items = [];
      }
      render();
    }

    // 提交表单：有 id 就是编辑，没有就是新增
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const body = cfg.readForm();
      const url = idEl.value ? cfg.api + '/' + idEl.value : cfg.api;
      const res = await api(url, {
        method: idEl.value ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return; // 401 时 api() 已退回登录门
      resetForm();
      await load();
    });

    cancelBtn.addEventListener('click', resetForm);
    load();
  }

  /* ---------- 项目板块配置 ---------- */
  function setupProject() {
    setupCollection({
      api: '/api/projects',
      formId: 'form-project',
      listId: 'list-projects',
      idField: 'p-id',
      cancelId: 'p-cancel',
      addLabel: '新增项目',
      readForm() {
        return {
          title: val('p-title'),
          description: val('p-desc'),
          tags: val('p-tags').split(/[,，]/).map((s) => s.trim()).filter(Boolean),
          link: val('p-link'),
        };
      },
      fillForm(item) {
        set('p-title', item.title || '');
        set('p-desc', item.description || '');
        set('p-tags', (item.tags || []).join(', '));
        set('p-link', item.link || '');
      },
      renderItem(item) {
        const tags = (item.tags || []).map((t) => '<span class="tag">' + esc(t) + '</span>').join('');
        return (
          '<div class="admin-item">' +
          '<div class="ai-main"><div class="ai-title">' + esc(item.title) + '</div>' +
          '<div class="ai-meta">' + tags + (item.createdAt ? ' · ' + esc(item.createdAt) : '') + '</div></div>' +
          '<div class="ai-actions">' +
          '<button class="btn-mini" data-act="edit" data-id="' + item.id + '">编辑</button>' +
          '<button class="btn-mini danger" data-act="del" data-id="' + item.id + '">删除</button>' +
          '</div></div>'
        );
      },
    });
  }

  /* ---------- 阅读板块配置 ---------- */
  function setupRead() {
    setupCollection({
      api: '/api/reads',
      formId: 'form-read',
      listId: 'list-reads',
      idField: 'r-id',
      cancelId: 'r-cancel',
      addLabel: '新增阅读',
      readForm() {
        return {
          type: val('r-type') || 'book',
          title: val('r-title'),
          category: val('r-category'),
          status: val('r-status'),
          note: val('r-note'),
        };
      },
      fillForm(item) {
        set('r-type', item.type || 'book');
        set('r-title', item.title || '');
        set('r-category', item.category || '');
        set('r-status', item.status || '');
        set('r-note', item.note || '');
      },
      renderItem(item) {
        const badge = item.type === 'note'
          ? '<span class="tag">笔记</span>'
          : '<span class="tag">书</span>';
        return (
          '<div class="admin-item">' +
          '<div class="ai-main"><div class="ai-title">' + esc(item.title) + '</div>' +
          '<div class="ai-meta">' + badge +
          (item.category ? '<span class="tag">' + esc(item.category) + '</span>' : '') +
          (item.status ? ' · ' + esc(item.status) : '') + '</div></div>' +
          '<div class="ai-actions">' +
          '<button class="btn-mini" data-act="edit" data-id="' + item.id + '">编辑</button>' +
          '<button class="btn-mini danger" data-act="del" data-id="' + item.id + '">删除</button>' +
          '</div></div>'
        );
      },
    });
  }

  /* ---------- 登录 / 登出 ---------- */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginErr.textContent = '';
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: loginPassword.value }),
    });
    if (res.ok) {
      loginPassword.value = '';
      enterAdmin();
    } else {
      loginErr.textContent = '口令错误，请重试';
    }
  });

  document.querySelectorAll('[data-act="logout"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      showLogin();
    });
  });

  /* ---------- 初始化 ---------- */
  // 无论是否登录都先装配两个板块（数据 GET 是公开的），再按登录状态决定显示哪一面
  setupProject();
  setupRead();

  fetch('/api/auth')
    .then((r) => r.json())
    .then((d) => (d.authed ? enterAdmin() : showLogin()))
    .catch(() => showLogin());
});

// 转义 HTML 特殊字符
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
