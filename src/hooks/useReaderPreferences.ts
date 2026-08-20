import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppTheme,
  ScriptureFont,
  LineHeightPreset,
  MaxWidthPreset,
  ThemePreference,
} from '../types';
import {
  getWindowsCapabilities,
  setWindowsAppearance,
} from '../services/windowsService';
import { isWindowsPlatform } from '../utils/platform';

const THEME_PREFERENCE_KEY = 'verbum_theme_preference';
const LEGACY_THEME_KEY = 'verbum_theme';
const APP_THEMES: AppTheme[] = [
  'obsidian', 'catppuccin', 'tokyonight', 'vercel', 'black',
  'nord', 'sepia', 'white', 'dark', 'light',
];

const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === 'string' && APP_THEMES.includes(value as AppTheme);

export function loadThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ThemePreference>;
      if (parsed.mode === 'system') return { mode: 'system' };
      if (parsed.mode === 'manual' && isAppTheme(parsed.theme)) {
        return { mode: 'manual', theme: parsed.theme };
      }
    }
  } catch {
    // Ignore malformed preferences and migrate the legacy value below.
  }

  const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
  if (isAppTheme(legacyTheme)) return { mode: 'manual', theme: legacyTheme };
  return isWindowsPlatform()
    ? { mode: 'system' }
    : { mode: 'manual', theme: 'obsidian' };
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemIsDark: boolean
): AppTheme {
  if (preference.mode === 'manual') return preference.theme;
  return systemIsDark ? 'obsidian' : 'white';
}

/**
 * Reader appearance state (theme + typography) with localStorage
 * persistence and live application of the theme to the document.
 */
export function useReaderPreferences() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(loadThemePreference);
  const [systemIsDark, setSystemIsDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
  );
  const [effectsEnabled, setEffectsEnabled] = useState(true);
  const theme = useMemo(
    () => resolveThemePreference(themePreference, systemIsDark),
    [themePreference, systemIsDark]
  );
  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemePreference({ mode: 'manual', theme: nextTheme });
  }, []);
  const useSystemTheme = useCallback(() => {
    setThemePreference({ mode: 'system' });
  }, []);
  const [fontSize, setFontSize] = useState<number>(() => {
    return parseInt(localStorage.getItem('verbum_font_size') || '19', 10);
  });
  const [fontFamily, setFontFamily] = useState<ScriptureFont>(() => {
    return (localStorage.getItem('verbum_font_family') as ScriptureFont) || 'literata';
  });
  const [lineHeightPreset, setLineHeightPreset] = useState<LineHeightPreset>(() => {
    return (localStorage.getItem('verbum_line_height') as LineHeightPreset) || 'comfortable';
  });
  const [maxWidthPreset, setMaxWidthPreset] = useState<MaxWidthPreset>(() => {
    return (localStorage.getItem('verbum_max_width') as MaxWidthPreset) || 'wide';
  });

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemIsDark(colorScheme.matches);
    handleChange();
    colorScheme.addEventListener('change', handleChange);
    return () => colorScheme.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const transparency = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const forcedColors = window.matchMedia('(forced-colors: active)');
    const handleChange = () => setEffectsEnabled(!transparency.matches && !forcedColors.matches);
    handleChange();
    transparency.addEventListener('change', handleChange);
    forcedColors.addEventListener('change', handleChange);
    return () => {
      transparency.removeEventListener('change', handleChange);
      forcedColors.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_PREFERENCE_KEY, JSON.stringify(themePreference));
  }, [themePreference]);

  // Apply the resolved theme without destroying the user's system/manual choice.
  useEffect(() => {
    const isDark = theme !== 'white' && theme !== 'sepia' && theme !== 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(LEGACY_THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!isWindowsPlatform()) return;
    let cancelled = false;

    document.documentElement.classList.add('platform-windows');
    void getWindowsCapabilities()
      .then((capabilities) => {
        if (!cancelled) {
          document.documentElement.classList.toggle(
            'windows-native-effects',
            capabilities.supportsMica && effectsEnabled
          );
        }
      })
      .catch((error) => {
        document.documentElement.classList.remove('windows-native-effects');
        console.warn('Windows composition capabilities are unavailable:', error);
      });

    void setWindowsAppearance(
      theme === 'white' || theme === 'sepia' || theme === 'light' ? 'light' : 'dark',
      effectsEnabled
    ).catch((error) => console.warn('Unable to update the Windows backdrop:', error));

    return () => {
      cancelled = true;
    };
  }, [theme, effectsEnabled]);

  useEffect(() => {
    localStorage.setItem('verbum_font_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('verbum_font_family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('verbum_line_height', lineHeightPreset);
  }, [lineHeightPreset]);

  useEffect(() => {
    localStorage.setItem('verbum_max_width', maxWidthPreset);
  }, [maxWidthPreset]);

  return {
    theme,
    setTheme,
    themePreference,
    useSystemTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    lineHeightPreset,
    setLineHeightPreset,
    maxWidthPreset,
    setMaxWidthPreset,
  };
}
