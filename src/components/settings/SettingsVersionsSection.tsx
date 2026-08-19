import React from 'react';
import { BookOpen, Check } from 'lucide-react';
import { BibleVersion } from '../../types';

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
  const selected = versions.find((version) => version.id === currentVersion) ?? versions[0];

  return (
    <section className="settings-block">
      <div className="settings-block-title">
        <div><strong>Edición principal</strong><span>Se abrirá al iniciar Verbum.</span></div>
        <BookOpen size={17} />
      </div>

      <select
        className="settings-text-input settings-version-select"
        value={selected?.id || ''}
        onChange={(event) => onSelectDefaultVersion(event.target.value)}
        disabled={!versions.length}
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.name} ({version.short_name})
          </option>
        ))}
      </select>

      {selected && (
        <div className="settings-version-preview">
          <span className="settings-version-monogram">{selected.short_name.slice(0, 3)}</span>
          <div>
            <strong>{selected.name}</strong>
            <span>{selected.language.toUpperCase()} · disponible sin conexión</span>
          </div>
          <Check size={15} />
        </div>
      )}
    </section>
  );
};
