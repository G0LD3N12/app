import React from 'react';
import { Type } from 'lucide-react';

interface SettingsTypographySectionProps {
  fontSize: number;
  onChangeFontSize: (size: number) => void;
}

export const SettingsTypographySection: React.FC<SettingsTypographySectionProps> = ({
  fontSize,
  onChangeFontSize,
}) => {
  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <Type size={18} color="var(--accent-gold)" />
        <h2>Tipografía & Lectura</h2>
      </div>

      <div className="settings-group">
        {/* Font Size Row */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Tamaño de Fuente del Texto Bíblico</span>
            <span className="settings-row-desc">Ajusta el cuerpo editorial para una lectura óptima</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min="13"
              max="28"
              value={fontSize}
              onChange={(e) => onChangeFontSize(Number(e.target.value))}
              style={{ width: '130px', accentColor: 'var(--accent-gold)', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--accent-gold)', fontWeight: 'bold', minWidth: '40px' }}>
              {fontSize}px
            </span>
          </div>
        </div>

        {/* Editorial Preview Box */}
        <div style={{ padding: '16px 18px' }}>
          <div className="typography-preview-box" style={{ margin: 0 }}>
            <span className="preview-label">Vista Previa Editorial</span>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: `${fontSize}px`, lineHeight: '1.7', color: 'var(--text-primary)', margin: 0 }}>
              «En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios. Este era en el principio con Dios.»
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
