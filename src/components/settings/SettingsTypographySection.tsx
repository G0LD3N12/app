import React from 'react';
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

const LINE_HEIGHTS: Record<LineHeightPreset, string> = {
  compact: '1.55',
  comfortable: '1.75',
  spacious: '2',
};

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
    SCRIPTURE_FONT_OPTIONS.find((font) => font.id === fontFamily) || SCRIPTURE_FONT_OPTIONS[0];

  return (
    <section className="settings-block settings-reading-grid">
      <div className="settings-reading-controls">
        <div className="settings-field">
          <label>Tipografía</label>
          <FontPicker
            fontFamily={fontFamily}
            onChangeFontFamily={onChangeFontFamily}
            variant="settings"
          />
        </div>

        <div className="settings-field">
          <div className="settings-field-heading">
            <label htmlFor="reader-font-size">Tamaño</label>
            <output>{fontSize}px</output>
          </div>
          <input
            id="reader-font-size"
            className="settings-range"
            type="range"
            min="14"
            max="26"
            value={fontSize}
            onChange={(event) => onChangeFontSize(Number(event.target.value))}
          />
        </div>

        {onChangeLineHeight && (
          <div className="settings-field">
            <label>Interlineado</label>
            <div className="settings-segmented settings-segmented-wide">
              {([
                ['compact', 'Corto'],
                ['comfortable', 'Cómodo'],
                ['spacious', 'Amplio'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={lineHeightPreset === id ? 'active' : ''}
                  onClick={() => onChangeLineHeight(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {onChangeMaxWidth && (
          <div className="settings-field">
            <label>Ancho de lectura</label>
            <div className="settings-segmented settings-segmented-wide">
              {([
                ['standard', 'Sereno'],
                ['wide', 'Amplio'],
                ['expanded', 'Extenso'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={maxWidthPreset === id ? 'active' : ''}
                  onClick={() => onChangeMaxWidth(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="settings-reading-preview">
        <span>Juan 1:1</span>
        <p
          style={{
            fontFamily: currentFont.fontVar,
            fontSize: `${Math.min(fontSize, 23)}px`,
            lineHeight: LINE_HEIGHTS[lineHeightPreset],
          }}
        >
          En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.
        </p>
        <small>{currentFont.name} · RV1909</small>
      </div>
    </section>
  );
};
