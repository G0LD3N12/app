import React, { useState, useMemo } from 'react';
import { AppTheme, ThemeDefinition } from '../../types';
import { THEME_PALETTES } from '../../themeDefinitions';
import { Palette, Check } from 'lucide-react';

const ThemeCard = React.memo<{
  palette: ThemeDefinition;
  isActive: boolean;
  onSelect: (id: AppTheme) => void;
}>(({ palette: t, isActive, onSelect }) => {
  const handleClick = React.useCallback(() => {
    onSelect(t.id as AppTheme);
  }, [onSelect, t.id]);

  return (
    <div
      className={`theme-card-preview ${isActive ? 'active-theme' : ''}`}
      onClick={handleClick}
      style={{
        backgroundColor: t.surfacePreview,
        borderColor: isActive ? t.accentPreview : 'var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: t.accentPreview,
              boxShadow: `0 0 8px ${t.accentPreview}`,
            }}
          />
          <h3 style={{ fontSize: '0.92rem', fontWeight: '700', color: t.textPreview, margin: 0 }}>
            {t.name}
          </h3>
        </div>

        {isActive ? (
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: '700',
              padding: '2px 7px',
              borderRadius: '6px',
              backgroundColor: t.accentPreview,
              color: t.bgPreview === '#ffffff' || t.accentPreview === '#ffffff' ? '#000000' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <Check size={11} /> Activo
          </span>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            {t.category === 'dark' ? 'Oscuro' : 'Claro'}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.76rem', color: t.textPreview, opacity: 0.82, lineHeight: '1.4', margin: '0 0 10px 0' }}>
        {t.description}
      </p>

      {/* Color Swatches */}
      <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.bgPreview,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          title="Fondo de Aplicación"
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.surfacePreview,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          title="Superficie de Tarjetas"
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.accentPreview,
          }}
          title="Color de Acento"
        />
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: t.textPreview,
          }}
          title="Color del Texto Principal"
        />
      </div>
    </div>
  );
});

interface SettingsThemesSectionProps {
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

export const SettingsThemesSection: React.FC<SettingsThemesSectionProps> = ({
  theme,
  onSelectTheme,
}) => {
  const [themeFilter, setThemeFilter] = useState<'all' | 'dark' | 'light'>('all');

  const activeNormalized = theme === 'dark' ? 'obsidian' : theme === 'light' ? 'white' : theme;

  const filteredThemes = useMemo(() => {
    return THEME_PALETTES.filter(
      (t) => themeFilter === 'all' || t.category === themeFilter
    );
  }, [themeFilter]);

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <Palette size={18} color="var(--accent-gold)" />
        <h2>Temas Cromáticos ({THEME_PALETTES.length} Paletas Nativas)</h2>
      </div>

      <div className="settings-group" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span className="settings-row-desc">
            Paletas adaptadas para alto contraste, modo OLED y lectura prolongada sin fatiga.
          </span>

          {/* Theme filter pills */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`catalog-filter-btn ${themeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setThemeFilter('all')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              Todos ({THEME_PALETTES.length})
            </button>
            <button
              className={`catalog-filter-btn ${themeFilter === 'dark' ? 'active' : ''}`}
              onClick={() => setThemeFilter('dark')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              Oscuros ({THEME_PALETTES.filter((t) => t.category === 'dark').length})
            </button>
            <button
              className={`catalog-filter-btn ${themeFilter === 'light' ? 'active' : ''}`}
              onClick={() => setThemeFilter('light')}
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
            >
              Claros ({THEME_PALETTES.filter((t) => t.category === 'light').length})
            </button>
          </div>
        </div>

        {/* Grid of Memoized Theme Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '12px' }}>
          {filteredThemes.map((t) => (
            <ThemeCard
              key={t.id}
              palette={t}
              isActive={activeNormalized === t.id}
              onSelect={onSelectTheme}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
