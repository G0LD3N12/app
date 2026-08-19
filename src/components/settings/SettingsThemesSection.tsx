import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { AppTheme, ThemeDefinition } from '../../types';
import { THEME_PALETTES } from '../../themeDefinitions';

const THEME_LABELS: Partial<Record<AppTheme, string>> = {
  obsidian: 'Obsidian',
  black: 'OLED',
  tokyonight: 'Tokyo Night',
  catppuccin: 'Catppuccin',
  vercel: 'Geist',
  nord: 'Nord',
  sepia: 'Papiro',
  white: 'Pure White',
};

const ThemeCard = React.memo<{
  palette: ThemeDefinition;
  active: boolean;
  onSelect: (theme: AppTheme) => void;
}>(({ palette, active, onSelect }) => (
  <button
    type="button"
    className={`settings-theme-card ${active ? 'active' : ''}`}
    onClick={() => onSelect(palette.id as AppTheme)}
    title={palette.name}
    style={{
      '--theme-bg': palette.bgPreview,
      '--theme-surface': palette.surfacePreview,
      '--theme-accent': palette.accentPreview,
      '--theme-text': palette.textPreview,
    } as React.CSSProperties}
    aria-pressed={active}
  >
    <span className="settings-theme-miniature" aria-hidden="true">
      <span className="settings-theme-mini-sidebar" />
      <span className="settings-theme-mini-page">
        <i />
        <i />
        <i />
      </span>
    </span>
    <span className="settings-theme-card-meta">
      <strong>{THEME_LABELS[palette.id] || palette.name}</strong>
      <span className="settings-theme-swatches" aria-hidden="true">
        <i style={{ background: palette.bgPreview }} />
        <i style={{ background: palette.surfacePreview }} />
        <i style={{ background: palette.accentPreview }} />
      </span>
    </span>
    {active && <Check className="settings-theme-check" size={14} />}
  </button>
));

interface SettingsThemesSectionProps {
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
}

export const SettingsThemesSection: React.FC<SettingsThemesSectionProps> = ({
  theme,
  onSelectTheme,
}) => {
  const [filter, setFilter] = useState<'all' | 'dark' | 'light'>('all');
  const activeTheme = theme === 'dark' ? 'obsidian' : theme === 'light' ? 'white' : theme;
  const themes = useMemo(
    () => THEME_PALETTES.filter((item) => filter === 'all' || item.category === filter),
    [filter]
  );

  return (
    <section className="settings-block">
      <div className="settings-block-toolbar">
        <div>
          <h2>Paleta</h2>
          <span>{THEME_PALETTES.length} estilos incluidos</span>
        </div>
        <div className="settings-segmented" aria-label="Filtrar temas">
          {([
            ['all', 'Todos'],
            ['dark', 'Oscuros'],
            ['light', 'Claros'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-theme-grid">
        {themes.map((palette) => (
          <ThemeCard
            key={palette.id}
            palette={palette}
            active={activeTheme === palette.id}
            onSelect={onSelectTheme}
          />
        ))}
      </div>
    </section>
  );
};
