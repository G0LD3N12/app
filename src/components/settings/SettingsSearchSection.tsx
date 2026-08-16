import React from 'react';
import { BibleVersion } from '../../types';
import { Search } from 'lucide-react';

interface SettingsSearchSectionProps {
  versions: BibleVersion[];
  searchLanguages: string[];
  onChangeSearchLanguages: (langs: string[]) => void;
}

export const SettingsSearchSection: React.FC<SettingsSearchSectionProps> = ({
  versions,
  searchLanguages,
  onChangeSearchLanguages,
}) => {
  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <Search size={18} color="var(--accent-gold)" />
        <h2>Motor de Búsqueda SQLite FTS5</h2>
      </div>

      <div className="settings-group" style={{ padding: '14px' }}>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-num">120,962</span>
            <span className="stat-desc">Versículos indexados localmente</span>
          </div>

          <div className="stat-box">
            <span className="stat-num">&lt; 10 ms</span>
            <span className="stat-desc">Velocidad media de consulta global</span>
          </div>

          <div className="stat-box">
            <span className="stat-num">remove_diacritics</span>
            <span className="stat-desc">Búsqueda insensible a tildes (jose → José)</span>
          </div>

          <div className="stat-box">
            <span className="stat-num">Lematización</span>
            <span className="stat-desc">Expansión canónica (anaquitas ⇄ anaceos ⇄ anakim)</span>
          </div>
        </div>

        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Idiomas incluidos en la búsqueda
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {searchLanguages.length === 0 ? 'Todos los idiomas' : `${searchLanguages.length} seleccionado(s)`}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            <button
              className={`btn-select-default ${searchLanguages.length === 0 ? 'active' : ''}`}
              onClick={() => onChangeSearchLanguages([])}
            >
              Todos
            </button>
            {Array.from(new Set(versions.map((v) => v.language))).map((lang) => {
              const label: Record<string, string> = {
                es: 'Español',
                en: 'English',
                fr: 'Français',
                de: 'Deutsch',
                pt: 'Português',
                la: 'Latín',
              };
              const active = searchLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  className={`btn-select-default ${active ? 'active' : ''}`}
                  onClick={() => {
                    if (active) {
                      onChangeSearchLanguages(searchLanguages.filter((l) => l !== lang));
                    } else {
                      onChangeSearchLanguages([...searchLanguages, lang]);
                    }
                  }}
                >
                  {label[lang] || lang.toUpperCase()}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            La búsqueda global (Ctrl+F / Ctrl+K) solo devolverá resultados en los idiomas marcados.
          </p>
        </div>
      </div>
    </section>
  );
};
