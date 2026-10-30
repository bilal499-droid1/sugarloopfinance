// before the app loads, so pages don't flash light first.
const KEY = 'theme';

export const currentTheme = () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

export const setTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked (private window): the choice just lasts for this visit.
  }
};
