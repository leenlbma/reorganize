'use strict';

const themeButton = document.getElementById('theme-button');
function setTheme(theme) {
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  themeButton.setAttribute('aria-label', theme === 'dark' ? '切换为浅色模式' : '切换为深色模式');
}
try { setTheme(JSON.parse(localStorage.getItem('reorganize-theme'))); } catch { setTheme('light'); }
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  try { localStorage.setItem('reorganize-theme', JSON.stringify(theme)); } catch { /* Reading does not require storage. */ }
});

const directoryLink = document.getElementById('ai-directory-link');
const copyButton = document.getElementById('copy-ai-link');
copyButton.hidden = false;
copyButton.addEventListener('click', async () => {
  const status = document.getElementById('copy-status');
  try {
    await navigator.clipboard.writeText(directoryLink.href);
    status.textContent = '已复制，可以粘贴给你的 Agent。';
  } catch {
    status.textContent = '暂时无法自动复制，请选择上方链接手动复制。';
  }
});
