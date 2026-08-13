import React from 'react';
import { BibleVersion } from '../types';
import { Check, Columns2, BookOpen } from 'lucide-react';

interface VersionPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  versions: BibleVersion[];
  currentVersion: string;
  onSelectVersion: (versionId: string) => void;
  parallelMode: boolean;
  onToggleParallelMode: () => void;
  secondaryVersion: string;
  onSelectSecondaryVersion: (versionId: string) => void;
}

export const VersionPickerPopover: React.FC<VersionPickerPopoverProps> = ({
  isOpen,
  onClose,
  versions,
  currentVersion,
  onSelectVersion,
  parallelMode,
  onToggleParallelMode,
  secondaryVersion,
  onSelectSecondaryVersion,
}) => {
  if (!isOpen) return null;

  const spanishVersions = versions.filter((v) => v.language === 'es');
  const englishVersions = versions.filter((v) => v.language === 'en');

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="version-picker-popover">
        {/* Header */}
        <div className="popover-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} color="var(--accent-gold)" />
            <span style={{ fontSize: '0.88rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Traducciones Bíblicas
            </span>
          </div>
          <button
            className={`parallel-toggle-btn ${parallelMode ? 'active' : ''}`}
            onClick={onToggleParallelMode}
            title="Comparar dos versiones lado a lado (Atajo: P)"
          >
            <Columns2 size={14} />
            <span>{parallelMode ? 'Vista Paralela: Activa' : 'Vista Paralela'}</span>
          </button>
        </div>

        <div className="popover-body">
          {/* Español */}
          <div className="popover-section">
            <span className="popover-section-label">Español</span>
            <div className="popover-version-list">
              {spanishVersions.map((v) => {
                const isSelected = currentVersion === v.id;
                const isSecondary = parallelMode && secondaryVersion === v.id;

                return (
                  <div
                    key={v.id}
                    className={`popover-version-row ${isSelected ? 'active' : ''} ${isSecondary ? 'secondary-active' : ''}`}
                    onClick={() => {
                      onSelectVersion(v.id);
                      if (!parallelMode) onClose();
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{v.short_name}</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{v.name}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.license}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isSelected && <Check size={14} color="var(--accent-gold)" />}
                      {parallelMode && (
                        <button
                          className={`btn-set-secondary ${isSecondary ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSecondaryVersion(v.id);
                          }}
                          title="Establecer como traducción secundaria para vista paralela"
                        >
                          {isSecondary ? 'Columna 2' : '+ Paralelo'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* English */}
          <div className="popover-section">
            <span className="popover-section-label">English</span>
            <div className="popover-version-list">
              {englishVersions.map((v) => {
                const isSelected = currentVersion === v.id;
                const isSecondary = parallelMode && secondaryVersion === v.id;

                return (
                  <div
                    key={v.id}
                    className={`popover-version-row ${isSelected ? 'active' : ''} ${isSecondary ? 'secondary-active' : ''}`}
                    onClick={() => {
                      onSelectVersion(v.id);
                      if (!parallelMode) onClose();
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{v.short_name}</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{v.name}</span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.license}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isSelected && <Check size={14} color="var(--accent-gold)" />}
                      {parallelMode && (
                        <button
                          className={`btn-set-secondary ${isSecondary ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSecondaryVersion(v.id);
                          }}
                          title="Establecer como traducción secundaria para vista paralela"
                        >
                          {isSecondary ? 'Columna 2' : '+ Paralelo'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
