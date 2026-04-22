import { useEffect, useState, useCallback } from 'react';

export interface ThemePreset {
  id: string;
  name: string;
  // HSL values stored as "H S% L%" strings (Tailwind/shadcn format)
  light: { primary: string; ring: string };
  dark: { primary: string; ring: string };
  // CSS gradient swatch for the picker UI
  swatch: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'teal',
    name: 'Teal (Padrão)',
    light: { primary: '174 72% 40%', ring: '174 72% 40%' },
    dark: { primary: '174 65% 50%', ring: '174 65% 50%' },
    swatch: 'linear-gradient(135deg, hsl(174 72% 40%), hsl(174 65% 50%))',
  },
  {
    id: 'violet',
    name: 'Violeta',
    light: { primary: '262 70% 55%', ring: '262 70% 55%' },
    dark: { primary: '262 65% 65%', ring: '262 65% 65%' },
    swatch: 'linear-gradient(135deg, hsl(262 70% 55%), hsl(280 70% 65%))',
  },
  {
    id: 'pink',
    name: 'Rosa',
    light: { primary: '330 75% 55%', ring: '330 75% 55%' },
    dark: { primary: '330 70% 65%', ring: '330 70% 65%' },
    swatch: 'linear-gradient(135deg, hsl(330 75% 55%), hsl(345 80% 65%))',
  },
  {
    id: 'orange',
    name: 'Laranja',
    light: { primary: '24 95% 55%', ring: '24 95% 55%' },
    dark: { primary: '24 90% 60%', ring: '24 90% 60%' },
    swatch: 'linear-gradient(135deg, hsl(24 95% 55%), hsl(15 90% 60%))',
  },
  {
    id: 'blue',
    name: 'Azul',
    light: { primary: '217 90% 55%', ring: '217 90% 55%' },
    dark: { primary: '217 85% 65%', ring: '217 85% 65%' },
    swatch: 'linear-gradient(135deg, hsl(217 90% 55%), hsl(200 90% 60%))',
  },
  {
    id: 'green',
    name: 'Verde',
    light: { primary: '142 70% 40%', ring: '142 70% 40%' },
    dark: { primary: '142 65% 50%', ring: '142 65% 50%' },
    swatch: 'linear-gradient(135deg, hsl(142 70% 40%), hsl(160 70% 50%))',
  },
  {
    id: 'amber',
    name: 'Âmbar',
    light: { primary: '38 95% 50%', ring: '38 95% 50%' },
    dark: { primary: '38 90% 60%', ring: '38 90% 60%' },
    swatch: 'linear-gradient(135deg, hsl(38 95% 50%), hsl(48 95% 55%))',
  },
  {
    id: 'red',
    name: 'Vermelho',
    light: { primary: '0 75% 55%', ring: '0 75% 55%' },
    dark: { primary: '0 70% 60%', ring: '0 70% 60%' },
    swatch: 'linear-gradient(135deg, hsl(0 75% 55%), hsl(15 80% 60%))',
  },
];

const STORAGE_KEY = 'app-theme-color';
const DEFAULT_ID = 'teal';

export const applyThemeColor = (presetId: string) => {
  const preset = THEME_PRESETS.find(p => p.id === presetId) || THEME_PRESETS[0];
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const vals = isDark ? preset.dark : preset.light;
  root.style.setProperty('--primary', vals.primary);
  root.style.setProperty('--ring', vals.ring);
  root.style.setProperty('--sidebar-primary', vals.primary);
  root.style.setProperty('--sidebar-ring', vals.ring);
  // Save both variants so theme switches keep the choice
  root.style.setProperty('--primary-light', preset.light.primary);
  root.style.setProperty('--primary-dark', preset.dark.primary);
};

export const useThemeColor = () => {
  const [themeId, setThemeId] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_ID;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ID;
  });

  useEffect(() => {
    applyThemeColor(themeId);
  }, [themeId]);

  // Re-apply when dark mode toggles
  useEffect(() => {
    const observer = new MutationObserver(() => applyThemeColor(themeId));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [themeId]);

  const setTheme = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setThemeId(id);
  }, []);

  return { themeId, setTheme, presets: THEME_PRESETS };
};
