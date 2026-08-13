/**
 * 关于我页面渲染逻辑
 * ------------------------------------------------------------
 * 从 /api/profile 拉取技能标签与联系方式，动态填充页面。
 * 个人介绍正文（data-profile="about"）由 common.js 统一填充。
 */
document.addEventListener('DOMContentLoaded', function () {
  fetch('/api/profile')
    .then((r) => r.json())
    .then((p) => {
      // 技能标签
      const skillsEl = document.getElementById('skills');
      if (skillsEl) {
        skillsEl.innerHTML = (p.skills || []).map((s) => '<span class="skill">' + esc(s) + '</span>').join('');
      }

      // 联系方式卡片
      const contactEl = document.getElementById('contact-list');
      if (contactEl) {
        contactEl.innerHTML = buildContact(p.contact || {});
      }
    })
    .catch(() => {
      // 拉取失败保持占位文字即可
    });
});

// 拼接联系方式卡片（比页脚更详细的展示形式）
function buildContact(c) {
  const rows = [];
  // 邮箱：支持一个或多个（emails 数组，兼容旧的 email 字符串）
  const emails = Array.isArray(c.emails) ? c.emails : (c.email ? [c.email] : []);
  emails.forEach((e, i) => {
    rows.push([i === 0 ? '邮箱' : '邮箱 ' + (i + 1), '<a href="mailto:' + esc(e) + '">' + esc(e) + '</a>']);
  });
  if (c.github) rows.push(['GitHub', '<a href="' + esc(c.github) + '" target="_blank" rel="noopener">' + esc(c.github) + '</a>']);
  if (c.wechat) rows.push(['微信', esc(c.wechat)]);
  if (c.qq) rows.push(['QQ', esc(c.qq)]);
  if (c.blog) rows.push(['博客', '<a href="' + esc(c.blog) + '" target="_blank" rel="noopener">' + esc(c.blog) + '</a>']);
  return rows
    .map((r) => '<div class="contact-item"><span class="label">' + r[0] + '</span><span class="value">' + r[1] + '</span></div>')
    .join('');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
