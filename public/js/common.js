/**
 * 全局公共逻辑
 * ------------------------------------------------------------
 *  1. 初始化星云粒子背景（starfield.js 是自执行脚本，只需引入即可）；
 *  2. 根据当前路径高亮顶部导航按钮；
 *  3. 从 /api/profile 拉取个人资料，动态填充姓名、简介、页脚联系方式；
 *  4. 自动更新页脚年份。
 * ------------------------------------------------------------
 * 这样个人资料改动后，各页面的姓名与联系方式无需修改 HTML 即可自动更新。
 */
document.addEventListener('DOMContentLoaded', function () {
  /* ---------- 1. 导航高亮 ---------- */
  // 取当前路径（去掉末尾斜杠，根路径保留为 '/'）
  let path = location.pathname.replace(/\/+$/, '');
  if (path === '') path = '/';

  document.querySelectorAll('.nav-links a').forEach(function (a) {
    const href = a.getAttribute('href');
    if (href === path) {
      a.classList.add('active');
    }
  });

  /* ---------- 2. 动态填充个人资料 ---------- */
  fetch('/api/profile')
    .then((r) => r.json())
    .then((profile) => {
      // 凡是带 data-profile="xxx" 的元素，都用 profile.xxx 填充
      document.querySelectorAll('[data-profile]').forEach((el) => {
        const key = el.getAttribute('data-profile');
        if (profile[key] != null) {
          el.textContent = profile[key];
        }
      });

      // 填充页脚联系方式
      const fc = document.getElementById('footer-contact');
      if (fc && profile.contact) {
        fc.innerHTML = buildContactHTML(profile.contact);
      }
    })
    .catch(() => {
      /* 拉取失败时保持 HTML 里的默认占位文字，不影响展示 */
    });

  /* ---------- 3. 页脚年份 ---------- */
  document.querySelectorAll('.footer-year').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});

/**
 * 把联系方式对象拼成页脚 HTML 片段。
 * 每个字段用「·」分隔，链接项可直接点击。
 */
function buildContactHTML(contact) {
  const items = [];
  // 邮箱：支持一个或多个（emails 数组，兼容旧的 email 字符串）
  const emails = Array.isArray(contact.emails) ? contact.emails : (contact.email ? [contact.email] : []);
  emails.forEach((e) => items.push('<a href="mailto:' + e + '">' + e + '</a>'));
  if (contact.github) items.push('<a href="' + contact.github + '" target="_blank" rel="noopener">GitHub</a>');
  if (contact.qq) items.push('<span>QQ：' + contact.qq + '</span>');
  if (contact.wechat) items.push('<span>微信：' + contact.wechat + '</span>');
  if (contact.blog) items.push('<a href="' + contact.blog + '" target="_blank" rel="noopener">Blog</a>');
  return items.join('<span class="sep">·</span>');
}
