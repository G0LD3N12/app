import React, { useState } from 'react';
import { AppTheme } from '../types';
import { THEME_PALETTES } from '../themeDefinitions';
import { Palette, Check } from 'lucide-react';

interface ThemesViewProps {
  currentTheme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

export const ThemesView: React.FC<ThemesViewProps> = ({ currentTheme, onSelectTheme }) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'dark' | 'light'>('all');

  // Normalize alias themes
  const activeNormalized = currentTheme === 'dark' ? 'obsidian' : currentTheme === 'light' ? 'white' : currentTheme;

  const filtered = THEME_PALETTES.filter(
    (t) => filterCategory === 'all' || t.category === filterCategory
  );

  return (
    <div className="settings-viewport">
      <div className="settings-content-wrapper">
        {/* Header */}
        <div className="settings-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={24} color="var(--accent-gold)" />
            <h1 className="settings-title">Galería de Temas</h1>
          </div>
          <p className="settings-subtitle">
            Paletas cromáticas profesionales oficiales (Catppuccin, Tokyo Night, Vercel, Nord, Papiro Sepia y más)
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button
            className={`catalog-filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCategory('all')}
          >
            Todos los temas ({THEME_PALETTES.length})
          </button>
          <button
            className={`catalog-filter-btn ${filterCategory === 'dark' ? 'active' : ''}`}
            onClick={() => setFilterCategory('dark')}
          >
            Modos Oscuros (6)
          </button>
          <button
            className={`catalog-filter-btn ${filterCategory === 'light' ? 'active' : ''}`}
            onClick={() => setFilterCategory('light')}
          >
            Modos Claros (2)
          </button>
        </div>

        {/* Theme Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
          {filtered.map((t) => {
            const isCurrent = activeNormalized === t.id;

            return (
              <div
                key={t.id}
                className={`theme-card-preview ${isCurrent ? 'active-theme' : ''}`}
                onClick={() => onSelectTheme(t.id)}
                style={{
                  backgroundColor: t.surfacePreview,
                  borderColor: isCurrent ? t.accentPreview : 'var(--border-subtle)',
                }}
              >
                {/* Header of theme card */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: t.accentPreview,
                        boxShadow: `0 0 8px ${t.accentPreview}`,
                      }}
                    />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: t.textPreview }}>
                      {t.name}
                    </h3>
                  </div>

                  {isCurrent ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: t.accentPreview,
                        color: t.bgPreview === '#ffffff' ? '#ffffff' : '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} /> Activo
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {t.category === 'dark' ? 'Oscuro' : 'Claro'}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.82rem', color: t.textPreview, opacity: 0.8, lineHeight: '1.45', marginBottom: '14px' }}>
                  {t.description}
                </p>

                {/* Color Swatches Palette */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', alignItems: 'center' }}>
                  <div
                    title={`Fondo: ${t.bgPreview}`}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.bgPreview, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div
                    title={`Superficie: ${t.surfacePreview}`}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.surfacePreview, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <div
                    title={`Acento: ${t.accentPreview}`}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.accentPreview }}
                  />
                  <div
                    title={`Texto: ${t.textPreview}`}
                    style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: t.textPreview }}
                  />
                </div>

                {/* Mini Scripture Preview */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: t.bgPreview,
                    border: `1px solid ${isCurrent ? t.accentPreview : 'rgba(255,255,255,0.08)'}`,
                    fontFamily: 'var(--font-serif)',
                    fontSize: '0.85rem',
                    color: t.textPreview,
                    lineHeight: '1.5',
                  }}
                >
                  <span style={{ color: t.accentPreview, fontWeight: 'bold', fontSize: '0.75rem', marginRight: '6px' }}>1</span>
                  «En el principio era el Verbo, y el Verbo era con Dios...»
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    className={`btn-select-default ${isCurrent ? 'active' : ''}`}
                    style={{
                      borderColor: isCurrent ? t.accentPreview : undefined,
                      color: isCurrent ? t.accentPreview : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTheme(t.id);
                    }}
                  >
                    {isCurrent ? 'Tema Aplicado' : 'Aplicar este tema'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
