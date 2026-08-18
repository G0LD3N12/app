import React from 'react';
import { Type } from 'lucide-react';
import {
  ScriptureFont,
  LineHeightPreset,
  MaxWidthPreset,
  SCRIPTURE_FONT_OPTIONS,
} from '../../types';
import { FontPicker } from '../FontPicker';

interface SettingsTypographySectionProps {
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  fontFamily: ScriptureFont;
  onChangeFontFamily: (font: ScriptureFont) => void;
  lineHeightPreset?: LineHeightPreset;
  onChangeLineHeight?: (preset: LineHeightPreset) => void;
  maxWidthPreset?: MaxWidthPreset;
  onChangeMaxWidth?: (preset: MaxWidthPreset) => void;
}

export const SettingsTypographySection: React.FC<SettingsTypographySectionProps> = ({
  fontSize,
  onChangeFontSize,
  fontFamily,
  onChangeFontFamily,
  lineHeightPreset = 'comfortable',
  onChangeLineHeight,
  maxWidthPreset = 'standard',
  onChangeMaxWidth,
}) => {
  const currentFont =
    SCRIPTURE_FONT_OPTIONS.find((f) => f.id === fontFamily) || SCRIPTURE_FONT_OPTIONS[0];

  const getLineHeightValue = () => {
    if (lineHeightPreset === 'compact') return '1.55';
    if (lineHeightPreset === 'spacious') return '2.0';
    return '1.75';
  };

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <Type size={18} color="var(--accent-gold)" />
        <h2>Tipografía & Experiencia de Lectura</h2>
      </div>

      <div className="settings-group">
        {/* 1. Font Family Selector */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Familia Tipográfica Editorial</span>
            <span className="settings-row-desc">
              Selecciona entre fuentes serif clásicas o sans-serif contemporáneas de alta legibilidad
            </span>
          </div>

          <div style={{ minWidth: '220px', maxWidth: '300px', width: '100%' }}>
            <FontPicker
              fontFamily={fontFamily}
              onChangeFontFamily={onChangeFontFamily}
              variant="settings"
            />
          </div>
        </div>

        {/* 2. Font Size Slider */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Tamaño de Fuente</span>
            <span className="settings-row-desc">
              Ajusta la escala tipográfica del texto bíblico
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="14"
              max="26"
              value={fontSize}
              onChange={(e) => onChangeFontSize(Number(e.target.value))}
              style={{ width: '130px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
              aria-label="Tamaño de fuente"
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                color: 'var(--accent-gold)',
                fontWeight: 'bold',
                minWidth: '42px',
              }}
            >
              {fontSize}px
            </span>
          </div>
        </div>

        {/* 3. Line Height Preset */}
        {onChangeLineHeight && (
          <div className="settings-row">
            <div className="settings-label-col">
              <span className="settings-row-title">Interlineado</span>
              <span className="settings-row-desc">
                Espaciado vertical entre líneas para mayor comodidad visual
              </span>
            </div>

            <div className="settings-btn-group" style={{ display: 'flex', gap: '6px' }}>
              {(
                [
                  { id: 'compact', label: 'Compacto' },
                  { id: 'comfortable', label: 'Cómodo' },
                  { id: 'spacious', label: 'Espacioso' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`btn-select-default ${lineHeightPreset === preset.id ? 'active' : ''}`}
                  onClick={() => onChangeLineHeight(preset.id)}
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Max Width Preset */}
        {onChangeMaxWidth && (
          <div className="settings-row">
            <div className="settings-label-col">
              <span className="settings-row-title">Ancho del Párrafo</span>
              <span className="settings-row-desc">
                Amplitud horizontal del bloque de lectura bíblica
              </span>
            </div>

            <div className="settings-btn-group" style={{ display: 'flex', gap: '6px' }}>
              {(
                [
                  { id: 'standard', label: 'Estándar (800px)' },
                  { id: 'wide', label: 'Amplio (880px)' },
                  { id: 'expanded', label: 'Completo (1040px)' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`btn-select-default ${maxWidthPreset === preset.id ? 'active' : ''}`}
                  onClick={() => onChangeMaxWidth(preset.id)}
                  style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Live Editorial Preview Box */}
        <div style={{ padding: '16px 18px' }}>
          <div className="typography-preview-box" style={{ margin: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <span className="preview-label" style={{ margin: 0 }}>
                Vista Previa Editorial
              </span>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-gold)',
                  opacity: 0.9,
                  background: 'var(--accent-gold-soft)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(229, 184, 66, 0.25)',
                }}
              >
                {currentFont.name} · {fontSize}px
              </span>
            </div>
            <p
              style={{
                fontFamily: currentFont.fontVar,
                fontSize: `${fontSize}px`,
                lineHeight: getLineHeightValue(),
                color: 'var(--text-primary)',
                margin: 0,
                transition: 'font-family 0.2s ease, font-size 0.15s ease',
              }}
            >
              «En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios. Este era
              en el principio con Dios. Todas las cosas por él fueron hechas, y sin él nada de lo que
              ha sido hecho, fue hecho.»
            </p>
            <div
              style={{
                marginTop: '10px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
              }}
            >
              — Juan 1:1-3 · Reina-Valera 1909
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
