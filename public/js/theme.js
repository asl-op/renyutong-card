/**
 * theme.js —— 白天 / 黑夜 / 随系统 三种主题模式
 * 说明：
 *   1. 立即读取并应用主题（放在 <head>，避免页面闪一下错误配色）
 *   2. 左下角注入「白天 / 黑夜 / 随系统」切换控件
 *   3. 选择持久化到 localStorage；「随系统」跟随操作系统深浅色
 *   4. 切换后调用 window.Card.applyTheme 更新粒子背景配色
 */
(function () {
  const KEY = 'rt-theme';

  // 把模式解析成实际的 light / dark
  function resolve(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  let mode = 'system';
  try { mode = localStorage.getItem(KEY) || 'system'; } catch (e) {}

  function apply() {
    const resolved = resolve(mode);
    document.documentElement.setAttribute('data-theme', resolved);
    if (window.Card && window.Card.applyTheme) window.Card.applyTheme(resolved);
  }

  // 立即应用（在 <head> 中执行，早于 body 渲染）
  apply();

  // 系统深浅色变化时，仅在「随系统」模式下自动跟随
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      if (mode === 'system') apply();
    });
  }

  function setMode(m) {
    mode = m;
    try { localStorage.setItem(KEY, m); } catch (e) {}
    apply();
    renderSwitch();
  }

  function renderSwitch() {
    const wrap = document.getElementById('theme-switch');
    if (!wrap) return;
    wrap.querySelectorAll('button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  function inject() {
    const wrap = document.createElement('div');
    wrap.id = 'theme-switch';
    wrap.className = 'theme-switch';
    wrap.innerHTML =
      '<button data-mode="light" type="button">白天</button>' +
      '<button data-mode="dark" type="button">黑夜</button>' +
      '<button data-mode="system" type="button">随系统</button>';
    wrap.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.dataset.mode); });
    });
    document.body.appendChild(wrap);
    renderSwitch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
