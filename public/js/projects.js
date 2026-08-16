/**
 * projects.js —— 项目页卡片列表
 * 从后端 /api/projects 读取数据，渲染为简洁卡片（标题 / 分类 / 简介 / 标签 / 链接）
 * 后台新增、编辑、删除后，刷新本页即自动更新，无需改前端代码
 */
(function () {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;

  const escapeHtml = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };

  async function load() {
    let items = [];
    try {
      items = await fetch('/api/projects').then(function (r) { return r.json(); });
    } catch (e) { items = []; }

    if (!items.length) {
      grid.innerHTML = '<p class="empty-hint">还没有项目，去后台 <a href="/admin">/admin</a> 添加一个吧。</p>';
      return;
    }

    grid.innerHTML = items.map(function (it) {
      const tags = (it.tags && it.tags.length)
        ? it.tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('')
        : '';
      return (
        '<article class="project-card">' +
          '<h3 class="p-title">' + escapeHtml(it.title) + '</h3>' +
          '<div class="p-meta">' +
            '<span class="p-cat">' + escapeHtml(it.category || '') + '</span>' +
            (it.date ? '<span class="p-date">' + escapeHtml(it.date) + '</span>' : '') +
          '</div>' +
          '<p class="p-summary">' + escapeHtml(it.summary || '') + '</p>' +
          (tags ? '<div class="p-tags">' + tags + '</div>' : '') +
          (it.link ? '<a class="p-link" href="' + escapeHtml(it.link) + '" target="_blank" rel="noopener">查看详情 →</a>' : '') +
        '</article>'
      );
    }).join('');
  }

  load();
})();
