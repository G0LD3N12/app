import { useEffect, useState } from 'react';
import { AppTheme, ScriptureFont, LineHeightPreset, MaxWidthPreset } from '../types';

/**
 * Reader appearance state (theme + typography) with localStorage
 * persistence and live application of the theme to the document.
 */
export function useReaderPreferences() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('verbum_theme') as AppTheme) || 'obsidian';
  });
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

  // Apply theme to document
  useEffect(() => {
    const isDark = theme !== 'white' && theme !== 'sepia' && theme !== 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('verbum_theme', theme);
  }, [theme]);

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
