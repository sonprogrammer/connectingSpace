'use client';

import { useEffect } from 'react';

import { useThemeStore } from './theme-store';

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('connecting-space-theme');

    if (storedTheme === 'light' && theme === 'dark') {
      toggleTheme();
      return;
    }

    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('connecting-space-theme', theme);
  }, [theme, toggleTheme]);

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      aria-label={isLight ? '다크 모드로 전환' : '라이트 모드로 전환'}
      aria-pressed={isLight}
      onClick={toggleTheme}
    >
      {isLight ? '다크' : '라이트'}
    </button>
  );
}
