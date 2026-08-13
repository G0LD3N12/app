import React from 'react';
import { ScriptureFont, LineHeightPreset, MaxWidthPreset } from '../types';
import { Sliders, Type, AlignJustify, MoveHorizontal } from 'lucide-react';

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
}) => {
  if (!isOpen) return null;

  const fontOptions: Array<{ id: ScriptureFont; name: string; desc: string; sample: string }> = [
    { id: 'literata', name: 'Literata', desc: 'Editorial moderna', sample: 'En el principio' },
    { id: 'crimson', name: 'Crimson Pro', desc: 'Clásica académica', sample: 'En el principio' },
    { id: 'garamond', name: 'Cormorant', desc: 'Solemne histórica', sample: 'En el principio' },
    { id: 'sans', name: 'Inter / Sans', desc: 'Minimalista sin serifa', sample: 'En el principio' },
  ];

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="reader-pref-popover">
        <div className="popover-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '0.88rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ajustes de Lectura
            </span>
          </div>
        </div>

        <div className="popover-body" style={{ gap: '16px' }}>
          {/* 1. Fuente Tipográfica */}
          <div className="pref-group">
            <div className="pref-label-row">
              <Type size={14} />
              <span>Tipografía Bíblica</span>
            </div>
            <div className="pref-buttons-grid">
              {fontOptions.map((opt) => (
                <button
                  key={opt.id}
                  className={`pref-choice-card ${fontFamily === opt.id ? 'active' : ''}`}
                  onClick={() => onChangeFontFamily(opt.id)}
                >
                  <span className="pref-choice-name">{opt.name}</span>
                  <span className="pref-choice-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Tamaño de Fuente */}
          <div className="pref-group">
            <div className="pref-label-row">
              <span>Tamaño de Letra ({fontSize}px)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="icon-btn"
                onClick={() => onChangeFontSize(Math.max(15, fontSize - 1))}
                style={{ fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                A-
              </button>
              <input
                type="range"
                min="15"
                max="26"
                value={fontSize}
                onChange={(e) => onChangeFontSize(parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              />
              <button
                className="icon-btn"
                onClick={() => onChangeFontSize(Math.min(26, fontSize + 1))}
                style={{ fontSize: '1rem', fontWeight: 'bold' }}
              >
                A+
              </button>
            </div>
          </div>

          {/* 3. Interlineado / Densidad */}
          <div className="pref-group">
            <div className="pref-label-row">
              <AlignJustify size={14} />
              <span>Interlineado</span>
            </div>
            <div className="pref-pill-group">
              <button
                className={`pref-pill-btn ${lineHeightPreset === 'compact' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('compact')}
              >
                Compacto
              </button>
              <button
                className={`pref-pill-btn ${lineHeightPreset === 'comfortable' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('comfortable')}
              >
                Cómodo (1.75x)
              </button>
              <button
                className={`pref-pill-btn ${lineHeightPreset === 'spacious' ? 'active' : ''}`}
                onClick={() => onChangeLineHeight('spacious')}
              >
                Espacioso
              </button>
            </div>
          </div>

          {/* 4. Ancho del Área de Lectura */}
          <div className="pref-group">
            <div className="pref-label-row">
              <MoveHorizontal size={14} />
              <span>Ancho de Lectura</span>
            </div>
            <div className="pref-pill-group">
              <button
                className={`pref-pill-btn ${maxWidthPreset === 'standard' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('standard')}
              >
                Estándar (780px)
              </button>
              <button
                className={`pref-pill-btn ${maxWidthPreset === 'wide' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('wide')}
              >
                Amplio (880px)
              </button>
              <button
                className={`pref-pill-btn ${maxWidthPreset === 'expanded' ? 'active' : ''}`}
                onClick={() => onChangeMaxWidth('expanded')}
              >
                Completo (1040px)
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
