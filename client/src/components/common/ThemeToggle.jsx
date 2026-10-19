import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { currentTheme, setTheme } from '../../utils/theme';

export default function ThemeToggle({ className = '' }) {
  const [theme, setThemeState] = useState(currentTheme);
  const dark = theme === 'dark';

  const toggle = () => {
    const next = dark ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 ${className}`}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
