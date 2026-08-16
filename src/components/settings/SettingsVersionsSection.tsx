import React from 'react';
import { BibleVersion } from '../../types';
import { BookOpen } from 'lucide-react';

const VersionSettingsRow = React.memo<{
  version: BibleVersion;
  isCurrent: boolean;
  onSelect: (id: string) => void;
}>(({ version: v, isCurrent, onSelect }) => {
  return (
    <div className="settings-row">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            {v.name} ({v.short_name})
          </span>
          <span className="version-lang-pill">{v.language.toUpperCase()}</span>
          {isCurrent && <span className="default-version-badge">Predeterminada</span>}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Licencia: {v.license} · Empaquetado localmente en SQLite
        </span>
      </div>

      <button
        className={`btn-select-default ${isCurrent ? 'active' : ''}`}
        onClick={() => onSelect(v.id)}
      >
        {isCurrent ? 'Seleccionada ✓' : 'Usar por defecto'}
      </button>
    </div>
  );
});

interface SettingsVersionsSectionProps {
  versions: BibleVersion[];
  currentVersion: string;
  onSelectDefaultVersion: (vId: string) => void;
}

export const SettingsVersionsSection: React.FC<SettingsVersionsSectionProps> = ({
  versions,
  currentVersion,
  onSelectDefaultVersion,
}) => {
  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <BookOpen size={18} color="var(--accent-gold)" />
        <h2>Versiones Bíblicas Instaladas (100% Offline)</h2>
      </div>

      <div className="settings-group">
        {versions.map((v) => (
          <VersionSettingsRow
            key={v.id}
            version={v}
            isCurrent={currentVersion === v.id}
            onSelect={onSelectDefaultVersion}
          />
        ))}
      </div>
    </section>
  );
};
