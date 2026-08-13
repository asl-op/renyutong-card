/**
 * 项目页渲染逻辑
 * ------------------------------------------------------------
 * 从 /api/projects 拉取项目列表，动态渲染成卡片网格。
 * 后台新增 / 编辑 / 删除后，刷新页面即可看到最新内容（无需改前端代码）。
 */
document.addEventListener('DOMContentLoaded', function () {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  fetch('/api/projects')
    .then((r) => r.json())
    .then((list) => {
      // 没有项目时的空状态提示
      if (!list || list.length === 0) {
        grid.innerHTML = '<p class="empty-hint">还没有项目，可到 <a href="/admin" style="color:#5d8a9c">后台</a> 添加一个。</p>';
        return;
      }
      // 拼接每张项目卡片
      grid.innerHTML = list
        .map((p) => {
          const tags = (p.tags || []).map((t) => '<span class="tag">' + esc(t) + '</span>').join('');
          const link = p.link
            ? '<a class="project-link" href="' + esc(p.link) + '" target="_blank" rel="noopener">查看链接 →</a>'
            : '';
          return (
            '<article class="project-card">' +
            '<h3>' + esc(p.title) + '</h3>' +
            '<p>' + esc(p.description || '') + '</p>' +
            '<div class="tags">' + tags + '</div>' +
            link +
            '</article>'
          );
        })
        .join('');
    })
    .catch(() => {
      grid.innerHTML = '<p class="empty-hint">加载失败，请确认后端服务已启动（运行 start.bat）。</p>';
    });
});

// 转义 HTML 特殊字符，防止标题/描述里的字符破坏页面结构
function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
