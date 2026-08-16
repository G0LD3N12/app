import React from 'react';
import { ScriptureFont, LineHeightPreset, MaxWidthPreset, AppTheme } from '../types';
import { SlidersHorizontal, Type, AlignJustify, MoveHorizontal, Moon, Sun } from 'lucide-react';

interface ReaderPreferencesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  fontFamily: ScriptureFont;
  onChangeFontFamily: (font: ScriptureFont) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  lineHeightPreset: LineHeightPreset;
  onChangeLineHeight: (preset: LineHeightPreset) => void;
  maxWidthPreset: MaxWidthPreset;
  onChangeMaxWidth: (preset: MaxWidthPreset) => void;
  theme?: AppTheme;
  onSelectTheme?: (theme: AppTheme) => void;
}

export const ReaderPreferencesPopover: React.FC<ReaderPreferencesPopoverProps> = ({
  isOpen,
  onClose,
  fontFamily,
  onChangeFontFamily,
  fontSize,
  onChangeFontSize,
  lineHeightPreset,
  onChangeLineHeight,
  maxWidthPreset,
  onChangeMaxWidth,
  theme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  const isDark = theme ? theme !== 'white' && theme !== 'sepia' && theme !== 'light' : true;

  const fontOptions: Array<{ id: ScriptureFont; name: string; fontVar: string }> = [
    { id: 'literata', name: 'Literata', fontVar: 'var(--font-serif)' },
    { id: 'crimson', name: 'Crimson', fontVar: 'var(--font-crimson)' },
    { id: 'garamond', name: 'Cormorant Garamond', fontVar: 'var(--font-garamond)' },
    { id: 'sans', name: 'Sans', fontVar: 'var(--font-sans)' },
  ];

  const handleSetTheme = (mode: 'dark' | 'light') => {
    if (!onSelectTheme) return;
    if (mode === 'dark') {
      if (!isDark) onSelectTheme('obsidian');
    } else {
      if (isDark) onSelectTheme('white');
    }
  };

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="reader-pref-popover">
        {/* Header with Title & Theme Switch */}
        <div className="reader-pref-header">
          <div className="reader-pref-title">
            <SlidersHorizontal size={15} />
            <span>AJUSTES DE LECTURA</span>
          </div>

          {/* Theme Toggle (Moon / Sun) */}
          <div className="reader-pref-theme-switch">
            <button
              type="button"
              className={`reader-pref-theme-btn ${isDark ? 'active' : ''}`}
              onClick={() => handleSetTheme('dark')}
              title="Tema Oscuro"
              aria-label="Tema Oscuro"
            >
              <Moon size={13} />
            </button>
            <button
              type="button"
              className={`reader-pref-theme-btn ${!isDark ? 'active' : ''}`}
              onClick={() => handleSetTheme('light')}
              title="Tema Claro"
              aria-label="Tema Claro"
            >
              <Sun size={13} />
            </button>
          </div>
        </div>

        <div className="reader-pref-divider" />

        {/* 1. Tipografía */}
        <div className="reader-pref-section">
          <div className="reader-pref-label-row">
            <Type size={13} />
            <span>Tipografía</span>
          </div>
          <div className="reader-pref-font-row">
            {fontOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-font={opt.id}
                style={{ fontFamily: opt.fontVar }}
                className={`reader-pref-btn reader-pref-font-btn ${fontFamily === opt.id ? 'active' : ''}`}
                onClick={() => onChangeFontFamily(opt.id)}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        <div className="reader-pref-divider" />

        {/* 2. Tamaño de Letra */}
        <div className="reader-pref-section">
          <div className="reader-pref-label-row space-between">
            <div className="reader-pref-label-left">
              <Type size={13} />
              <span>Tamaño de letra</span>
            </div>
            <span className="reader-pref-val-badge">{fontSize}px</span>
          </div>
          <div className="reader-pref-slider-row">
            <span className="reader-pref-slider-label sm">A</span>
            <input
              type="range"
              min="14"
              max="26"
              value={fontSize}
              onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10))}
              className="reader-pref-range-slider"
              aria-label="Tamaño de letra"
            />
            <span className="reader-pref-slider-label lg">A</span>
          </div>
        </div>

        <div className="reader-pref-divider" />

        {/* 3 & 4. Interlineado & Ancho (Vertical 2-Column Layout) */}
        <div className="reader-pref-columns-grid">
          {/* Interlineado */}
          <div className="reader-pref-column">
            <div className="reader-pref-label-row">
              <AlignJustify size={13} />
              <span>Interlineado</span>
            </div>
            <div className="reader-pref-btn-stack">
              <button
                type="button"
                className={`reader-pref-btn reader-pref-option-btn ${lineHeightPreset === 'compact' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('compact')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="reader-pref-option-icon">
                  <line x1="2" y1="5.2" x2="14" y2="5.2" />
                  <line x1="2" y1="8" x2="11" y2="8" />
                  <line x1="2" y1="10.8" x2="13" y2="10.8" />
                </svg>
                <span>Compacto</span>
              </button>
              <button
                type="button"
                className={`reader-pref-btn reader-pref-option-btn ${lineHeightPreset === 'comfortable' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('comfortable')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="reader-pref-option-icon">
                  <line x1="2" y1="3.5" x2="14" y2="3.5" />
                  <line x1="2" y1="8" x2="11" y2="8" />
                  <line x1="2" y1="12.5" x2="13" y2="12.5" />
                </svg>
                <span>Cómodo</span>
              </button>
              <button
                type="button"
                className={`reader-pref-btn reader-pref-option-btn ${lineHeightPreset === 'spacious' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('spacious')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="reader-pref-option-icon">
                  <line x1="2" y1="1.8" x2="14" y2="1.8" />
                  <line x1="2" y1="8" x2="11" y2="8" />
                  <line x1="2" y1="14.2" x2="13" y2="14.2" />
                </svg>
                <span>Espacioso</span>
              </button>
            </div>
          </div>

          {/* Ancho */}
          <div className="reader-pref-column">
            <div className="reader-pref-label-row">
              <MoveHorizontal size={13} />
              <span>Ancho</span>
            </div>
            <div className="reader-pref-btn-stack">
              <button
                type="button"
                className={`reader-pref-btn reader-pref-option-btn ${maxWidthPreset === 'standard' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('standard')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="reader-pref-option-icon">
                  <line x1="4.5" y1="3" x2="4.5" y2="13" strokeOpacity="0.4" />
                  <line x1="11.5" y1="3" x2="11.5" y2="13" strokeOpacity="0.4" />
                  <line x1="5.5" y1="8" x2="10.5" y2="8" />
                </svg>
                <span>Estándar</span>
              </button>
              <button
                type="button"
                className={`reader-pref-btn reader-pref-option-btn ${maxWidthPreset === 'wide' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('wide')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="reader-pref-option-icon">
                  <line x1="2.5" y1="3" x2="2.5" y2="13" strokeOpacity="0.4" />
                  <line x1="13.5" y1="3" x2="13.5" y2="13" strokeOpacity="0.4" />
                  <line x1="3.5" y1="8" x2="12.5" y2="8" />
                </svg>
                <span>Amplio</span>
              </button>
              <button
                type="button"
                className={`reader-pref-btn reader-pref-option-btn ${maxWidthPreset === 'expanded' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('expanded')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="reader-pref-option-icon">
                  <line x1="1" y1="3" x2="1" y2="13" strokeOpacity="0.4" />
                  <line x1="15" y1="3" x2="15" y2="13" strokeOpacity="0.4" />
                  <line x1="2" y1="8" x2="14" y2="8" />
                </svg>
                <span>Completo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
