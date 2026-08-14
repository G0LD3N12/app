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

  const fontOptions: Array<{ id: ScriptureFont; name: string }> = [
    { id: 'literata', name: 'Literata' },
    { id: 'crimson', name: 'Crimson' },
    { id: 'garamond', name: 'Cormorant' },
    { id: 'sans', name: 'Sans' },
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

        {/* 1. Tipografía Bíblica */}
        <div className="reader-pref-section">
          <div className="reader-pref-label-row">
            <Type size={13} />
            <span>Tipografía bíblica</span>
          </div>
          <div className="reader-pref-font-row">
            {fontOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`reader-pref-btn ${fontFamily === opt.id ? 'active' : ''}`}
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
                className={`reader-pref-btn ${lineHeightPreset === 'compact' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('compact')}
              >
                Compacto
              </button>
              <button
                type="button"
                className={`reader-pref-btn ${lineHeightPreset === 'comfortable' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('comfortable')}
              >
                Cómodo
              </button>
              <button
                type="button"
                className={`reader-pref-btn ${lineHeightPreset === 'spacious' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('spacious')}
              >
                Espacioso
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
                className={`reader-pref-btn ${maxWidthPreset === 'standard' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('standard')}
              >
                Estándar
              </button>
              <button
                type="button"
                className={`reader-pref-btn ${maxWidthPreset === 'wide' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('wide')}
              >
                Amplio
              </button>
              <button
                type="button"
                className={`reader-pref-btn ${maxWidthPreset === 'expanded' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('expanded')}
              >
                Completo
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
