// Theme switcher — light, dark, auto
(function() {
  const STORAGE_KEY = 'gt_theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const resolved = theme === 'auto' ? getSystemTheme() : theme;
    document.documentElement.setAttribute('data-theme', resolved);
    // Update toggle button icons if present
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'auto';
  }

  // Apply on load
  applyTheme(getTheme());

  // Listen for system theme changes (for auto mode)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    if (getTheme() === 'auto') applyTheme('auto');
  });

  // Expose globally
  window.ThemeSwitcher = { setTheme: setTheme, getTheme: getTheme };

  // Bind toggle buttons (handle both before and after DOMContentLoaded)
  function bindButtons() {
    document.querySelectorAll('.theme-btn').forEach(function(btn) {
      if (!btn._themeBound) {
        btn._themeBound = true;
        btn.addEventListener('click', function() {
          setTheme(btn.dataset.theme);
        });
      }
    });
    applyTheme(getTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }
})();
