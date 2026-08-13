/**
 * main.js —— 全站共享脚本
 * 作用：
 *  1. 顶部导航高亮（根据当前路径）
 *  2. 从后端 /api/site 读取个人信息，填充带 data-site 属性的元素
 *  3. 关于我页面：动态构建联系方式列表
 */
(function () {
  // HTML 转义工具
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // ---------- 1. 导航高亮 ----------
  const path = location.pathname;
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    const href = a.getAttribute('href');
    const active = href === '/' ? path === '/' : path.indexOf(href) === 0;
    if (active) a.classList.add('active');
  });

  // ---------- 2. 读取站点信息，填充 data-site 元素 ----------
  async function loadSite() {
    let site = null;
    try {
      site = await fetch('/api/site').then(function (r) { return r.json(); });
    } catch (e) {
      return; // 读取失败则保留 HTML 里的默认文案
    }

    // 普通元素：填入文本；<a> 标签：填入 href
    document.querySelectorAll('[data-site]').forEach(function (el) {
      const key = el.getAttribute('data-site');
      const val = site[key];
      if (val == null || val === '') return;
      if (el.tagName === 'A') {
        el.setAttribute('href', val);
      } else {
        el.textContent = val;
      }
    });

    // ---------- 3. 关于我页面：构建联系方式 ----------
    const box = document.getElementById('aboutContact');
    if (box) {
      const items = [
        { label: '邮箱', value: site.email, href: 'mailto:' + site.email },
        { label: '备用邮箱', value: site.email2, href: 'mailto:' + site.email2 },
        { label: 'GitHub', value: '@' + site.githubUser, href: site.github },
        { label: '微信', value: site.wechat, href: null },
        { label: 'QQ', value: site.qq, href: null },
      ];
      box.innerHTML = '';
      items.forEach(function (it) {
        if (!it.value) return;
        const el = document.createElement(it.href ? 'a' : 'div');
        el.className = 'contact-item';
        el.innerHTML =
          '<span class="ci-label">' + escapeHtml(it.label) + '</span>' +
          '<span class="ci-value">' + escapeHtml(it.value) + '</span>';
        if (it.href) {
          el.href = it.href;
          el.target = '_blank';
          el.rel = 'noopener';
        }
        box.appendChild(el);
      });
    }

    // ---------- 4. 关于我页面：构建技能标签 ----------
    const skillsBox = document.getElementById('aboutSkills');
    if (skillsBox && Array.isArray(site.skills)) {
      skillsBox.innerHTML = '';
      site.skills.forEach(function (s) {
        const tag = document.createElement('span');
        tag.className = 'skill-tag';
        tag.textContent = s;
        skillsBox.appendChild(tag);
      });
    }
  }

  loadSite();
})();
