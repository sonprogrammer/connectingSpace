import { create } from 'zustand';

export type Theme = 'dark' | 'light';

type ThemeState = {
  theme: Theme;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  toggleTheme: () =>
    set(({ theme }) => ({ theme: theme === 'dark' ? 'light' : 'dark' })),
}));
