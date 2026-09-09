import type { AppSettings } from '../types';

export function applyTheme(theme: AppSettings['theme']) {
  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.dataset.theme = resolvedTheme;
}

export function watchSystemTheme(theme: AppSettings['theme']) {
  if (theme !== 'system') return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => applyTheme(theme);
  media.addEventListener('change', handleChange);
  return () => media.removeEventListener('change', handleChange);
}