const THEME_SCRIPT = `
(function () {
  var KEY = 'expense-tracker-theme';
  var root = document.documentElement;
  function resolveDark() {
    var stored = localStorage.getItem(KEY) || 'system';
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  root.classList.toggle('dark', resolveDark());
})();
`.trim();

/** Runs before React hydrates — prevents flash + sets initial theme class */
export function ThemeScript() {
  return (
    <script
      id="expense-tracker-theme"
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
