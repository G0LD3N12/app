import React, { useState, useEffect, useRef, useMemo } from 'react';
import { BibleVersion } from '../types';
import { Library, Columns2, X } from 'lucide-react';

interface VersionPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  versions: BibleVersion[];
  targetColumn?: 'primary' | 'secondary';
  currentVersion: string;
  onSelectVersion: (versionId: string) => void;
  parallelMode: boolean;
  onToggleParallelMode: () => void;
  secondaryVersion: string;
  onSelectSecondaryVersion: (versionId: string) => void;
}

interface EditionMetadata {
  spineTitle: string[];
  spineYear: string;
  spineVariant: 'classic-gold' | 'silver-emboss' | 'royal-crest' | 'modern-steel' | 'standard';
  subDescription: string;
}

const EDITION_METADATA: Record<string, EditionMetadata> = {
  rv1909: {
    spineTitle: ['REINA', 'VALERA'],
    spineYear: '1909',
    spineVariant: 'classic-gold',
    subDescription: 'Traducción clásica y solemne de Casiodoro de Reina y Cipriano de Valera.',
  },
  vbl: {
    spineTitle: ['BIBLIA', 'LIBRE'],
    spineYear: 'VBL',
    spineVariant: 'silver-emboss',
    subDescription: 'Traducción contemporánea directa y de libre distribución.',
  },
  kjv: {
    spineTitle: ['KING', 'JAMES'],
    spineYear: '1611',
    spineVariant: 'royal-crest',
    subDescription: 'Edición histórica en lengua inglesa de máxima reverencia editorial.',
  },
  web: {
    spineTitle: ['WORLD', 'ENGLISH'],
    spineYear: 'WEB',
    spineVariant: 'modern-steel',
    subDescription: 'Versión moderna en inglés contemporáneo en dominio público.',
  },
};

const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  la: 'Latina',
  el: 'Ελληνικά',
  he: 'עברית',
};

export const VersionPickerPopover: React.FC<VersionPickerPopoverProps> = ({
  isOpen,
  onClose,
  versions,
  targetColumn = 'primary',
  currentVersion,
  onSelectVersion,
  parallelMode,
  onToggleParallelMode,
  secondaryVersion,
  onSelectSecondaryVersion,
}) => {
  const [hoveredVersionId, setHoveredVersionId] = useState<string | null>(null);
  const [pullingBookId, setPullingBookId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Determine active version for the targeted column
  const effectiveActiveId = targetColumn === 'secondary' ? secondaryVersion : currentVersion;

  // Group versions by language
  const groupedVersions = useMemo(() => {
    return versions.reduce<Record<string, BibleVersion[]>>((acc, v) => {
      const lang = v.language || 'es';
      (acc[lang] = acc[lang] || []).push(v);
      return acc;
    }, {});
  }, [versions]);

  const orderedLanguages = useMemo(() => {
    return Object.keys(groupedVersions).sort((a, b) => {
      if (a === 'es') return -1;
      if (b === 'es') return 1;
      return a.localeCompare(b);
    });
  }, [groupedVersions]);

  const activeVersionObj = useMemo(() => {
    return versions.find((v) => v.id === effectiveActiveId) || versions[0] || null;
  }, [versions, effectiveActiveId]);

  const inspectedVersion = useMemo(() => {
    if (hoveredVersionId) {
      return versions.find((v) => v.id === hoveredVersionId) || activeVersionObj;
    }
    return activeVersionObj;
  }, [hoveredVersionId, versions, activeVersionObj]);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectBook = (versionId: string) => {
    setPullingBookId(versionId);

    if (targetColumn === 'secondary') {
      onSelectSecondaryVersion(versionId);
    } else {
      onSelectVersion(versionId);
    }

    setTimeout(() => {
      setPullingBookId(null);
      onClose();
    }, 420);
  };

  const getBookMeta = (v: BibleVersion): EditionMetadata => {
    if (EDITION_METADATA[v.id]) return EDITION_METADATA[v.id];
    const words = v.short_name.split(/[\s-_]+/);
    return {
      spineTitle: words.length > 1 ? words.slice(0, 2) : [v.short_name],
      spineYear: v.short_name,
      spineVariant: 'standard',
      subDescription: `${v.name} (${LANGUAGE_NAMES[v.language] || v.language})`,
    };
  };

  return (
    <>
      <div className="library-popover-backdrop" onClick={onClose} />
      <div
        ref={popoverRef}
        className="library-popover-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="library-popover-header">
          <div className="library-popover-title-wrapper">
            <Library size={16} className="library-icon" />
            <span className="library-popover-title">
              {parallelMode && targetColumn === 'secondary'
                ? 'Traducción · Columna 2'
                : parallelMode && targetColumn === 'primary'
                ? 'Traducción · Columna 1'
                : 'Biblioteca de Traducciones'}
            </span>
          </div>

          <div className="library-popover-actions">
            {/* Parallel Mode Icon-Only Toggle */}
            <button
              className={`library-icon-btn ${parallelMode ? 'active' : ''}`}
              onClick={onToggleParallelMode}
              title={parallelMode ? 'Desactivar Vista Paralela (P)' : 'Activar Vista Paralela (P)'}
              aria-label="Alternar Vista Paralela"
            >
              <Columns2 size={16} />
            </button>

            <button className="library-close-btn" onClick={onClose} title="Cerrar (Esc)">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic Contextual Edition Info Banner */}
        {inspectedVersion && (
          <div className="library-info-banner">
            <div className="library-info-left">
              <div className="library-info-headline">
                <span className="library-info-name">{inspectedVersion.name}</span>
                <span className="library-info-tag">{inspectedVersion.short_name}</span>
              </div>
              <p className="library-info-desc">
                {getBookMeta(inspectedVersion).subDescription}
              </p>
            </div>
            <div className="library-info-right">
              <span className="library-info-license">{inspectedVersion.license}</span>
              <span className="library-info-lang">
                {LANGUAGE_NAMES[inspectedVersion.language] || inspectedVersion.language}
              </span>
            </div>
          </div>
        )}

        {/* The Shelves Area */}
        <div className="library-shelves-container custom-scrollbar">
          {orderedLanguages.map((langKey) => {
            const langVersions = groupedVersions[langKey] || [];
            if (langVersions.length === 0) return null;

            return (
              <div key={langKey} className="library-shelf-section">
                {/* Shelf Language Header */}
                <div className="library-shelf-header">
                  <span className="library-shelf-lang-title">
                    {LANGUAGE_NAMES[langKey] || langKey.toUpperCase()}
                  </span>
                  <span className="library-shelf-count">
                    {langVersions.length} {langVersions.length === 1 ? 'ejemplar' : 'ejemplares'}
                  </span>
                </div>

                {/* 3D Shelf Stage */}
                <div className="library-shelf-stage">
                  <div className="library-shelf-books-row">
                    {langVersions.map((version) => {
                      const isSelected = effectiveActiveId === version.id;
                      const isPulling = pullingBookId === version.id;
                      const meta = getBookMeta(version);

                      return (
                        <div
                          key={version.id}
                          className={`library-book-wrapper ${isSelected ? 'selected' : ''} ${
                            isPulling ? 'pulling' : ''
                          }`}
                          onMouseEnter={() => setHoveredVersionId(version.id)}
                          onMouseLeave={() => setHoveredVersionId(null)}
                          onClick={() => handleSelectBook(version.id)}
                        >
                          {/* 3D Physical Book Volume */}
                          <div className={`library-book-volume variant-${meta.spineVariant}`}>
                            {/* Ribbon Bookmark on Active Book */}
                            {isSelected && (
                              <div className="book-ribbon">
                                <div className="book-ribbon-tail" />
                              </div>
                            )}

                            {/* Book Spine (Main visible side) */}
                            <div className="book-spine">
                              {/* Top Spine Embossed Lines */}
                              <div className="book-spine-grooves top" />

                              {/* Title / Emblem */}
                              <div className="book-spine-content">
                                <div className="book-spine-tag">{version.short_name}</div>
                                <div className="book-spine-title">
                                  {meta.spineTitle.map((word, idx) => (
                                    <span key={idx} className="spine-word">
                                      {word}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Bottom Year / Code */}
                              <div className="book-spine-bottom">
                                <span className="spine-year">{meta.spineYear}</span>
                              </div>

                              {/* Bottom Spine Embossed Lines */}
                              <div className="book-spine-grooves bottom" />
                            </div>

                            {/* 3D Book Top Edge */}
                            <div className="book-top-edge" />

                            {/* 3D Book Side Pages Edge */}
                            <div className="book-side-edge" />
                          </div>

                          {/* Shelf Contact Shadow */}
                          <div className="book-shelf-shadow" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Minimalist Solid Shelf Ledge Bar */}
                  <div className="library-shelf-ledge">
                    <div className="shelf-surface-top" />
                    <div className="shelf-front-bevel" />
                    <div className="shelf-under-shadow" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clean Footer */}
        <div className="library-popover-footer">
          <div className="library-footer-hint">
            <span className="kbd-pill">Clic</span> Seleccionar traducción
          </div>
        </div>
      </div>
    </>
  );
};
export default VersionPickerPopover;
