import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Book, BibleVersion } from '../types';
import { fetchChapter } from '../services/bibleService';
import { X, Copy, Check, BookOpen } from 'lucide-react';
import { showToast } from './ToastHost';
import { LandscapeArtwork, LandscapeVariant } from './compare/LandscapeArtworks';

interface VerseCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  chapter: number;
  verseNum: number;
  versions: BibleVersion[];
}

interface TranslationColConfig {
  id: string;
  shortName: string;
  fallbackName: string;
  variant: LandscapeVariant;
  accentColor: string;
}

const TARGET_TRANSLATIONS: TranslationColConfig[] = [
  { id: 'rv1909', shortName: 'RV1909', fallbackName: 'Reina-Valera 1909', variant: 'gold', accentColor: '#d97706' },
  { id: 'vbl', shortName: 'VBL', fallbackName: 'Versión Biblia Libre', variant: 'emerald', accentColor: '#16a34a' },
  { id: 'kjv', shortName: 'KJV', fallbackName: 'King James Version', variant: 'azure', accentColor: '#2563eb' },
  { id: 'web', shortName: 'WEB', fallbackName: 'World English Bible', variant: 'lavender', accentColor: '#7c3aed' },
  { id: 'rvr1960', shortName: 'RVR1960', fallbackName: 'Reina-Valera 1960', variant: 'terracotta', accentColor: '#dc2626' },
];

export const VerseCompareModal: React.FC<VerseCompareModalProps> = React.memo(({
  isOpen,
  onClose,
  book,
  chapter,
  verseNum,
  versions,
}) => {
  const [comparisons, setComparisons] = useState<
    { config: TranslationColConfig; version: BibleVersion | null; text: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVersionId, setActiveVersionId] = useState<string>('rv1909');
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    if (!isOpen || !book) return;

    let isMounted = true;
    setIsLoading(true);
    setComparisons([]);

    const loadTranslations = async () => {
      const tasks = TARGET_TRANSLATIONS.map(async (config) => {
        let vObj: BibleVersion | null = versions.find(
          (v) => v.id.toLowerCase() === config.id || v.short_name.toLowerCase() === config.shortName.toLowerCase()
        ) || null;
        if (!vObj && config.id === 'rvr1960') {
          vObj = versions.find((v) => v.id === 'sse') || null;
        }
        const effectiveVersionId = vObj ? vObj.id : config.id;
        try {
          const verses = await fetchChapter(effectiveVersionId, book.id, chapter);
          const match = verses.find((item) => item.verse === verseNum);
          return {
            config,
            version: vObj,
            text: match ? match.text : 'Texto no disponible en esta traducción para el versículo seleccionado.',
          };
        } catch {
          return {
            config,
            version: vObj,
            text: 'Texto no disponible en esta traducción para el versículo seleccionado.',
          };
        }
      });
      const results = await Promise.all(tasks);
      if (isMounted) {
        setComparisons(results);
        setIsLoading(false);
      }
    };

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [isOpen, book, chapter, verseNum, versions]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeEntry = useMemo(() => {
    return comparisons.find((c) => c.config.id === activeVersionId) || comparisons[0];
  }, [comparisons, activeVersionId]);

  const handleCopySingleOrAll = useCallback(() => {
    if (!book) return;

    if (activeEntry) {
      const text = `«${activeEntry.text}»\n— ${book.name_es} ${chapter}:${verseNum} (${activeEntry.config.shortName})`;
      navigator.clipboard.writeText(text).catch(() => showToast('No se pudo copiar'));
      setCopiedAll(true);
      showToast(`Copiado [${activeEntry.config.shortName}] ${book.name_es} ${chapter}:${verseNum}`);
      setTimeout(() => setCopiedAll(false), 2000);
    } else {
      const allText = comparisons
        .map((c) => `[${c.config.shortName}] ${book.name_es} ${chapter}:${verseNum}\n«${c.text}»`)
        .join('\n\n');
      navigator.clipboard.writeText(allText).catch(() => showToast('No se pudo copiar'));
      setCopiedAll(true);
      showToast(`Comparación copiada (${comparisons.length} traducciones)`);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }, [book, chapter, verseNum, activeEntry, comparisons]);

  if (!isOpen || !book) return null;

  return (
    <div className="verse-compare-backdrop" onClick={onClose}>
      <div
        className="verse-compare-dialog-modern"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-translations-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="compare-modern-header">
          <div className="compare-header-left">
            <h2 id="compare-translations-title" className="compare-modern-title">COMPARAR TRADUCCIONES</h2>
            <p className="compare-modern-subtitle">
              <span className="compare-ref-accent">{book.name_es.toUpperCase()} {chapter}:{verseNum}</span>
              <span className="compare-ref-dot"> · </span>
              <span className="compare-ref-count">{TARGET_TRANSLATIONS.length} traducciones</span>
            </p>
          </div>

          <div className="compare-header-actions">
            <button
              type="button"
              className="compare-copy-capsule-btn"
              onClick={handleCopySingleOrAll}
              title="Copiar versículo al portapapeles"
            >
              {copiedAll ? <Check size={13} color="var(--accent-gold)" /> : <Copy size={13} />}
              <span>{copiedAll ? '¡Copiado!' : 'Copiar versículo'}</span>
            </button>

            <button
              type="button"
              className="compare-close-btn"
              onClick={onClose}
              title="Cerrar (Esc)"
              aria-label="Cerrar comparación"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Central Ornament Divider with 4-Point Compass Star */}
        <div className="compare-star-divider">
          <div className="compare-divider-line" />
          <div className="compare-compass-star">✦</div>
          <div className="compare-divider-line" />
        </div>

        {/* 5-Column Grid */}
        <div
          className="compare-columns-grid"
          role="radiogroup"
          aria-label="Traducciones disponibles"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <div className="compare-loading-state">
              <div className="reader-skeleton-line title" style={{ margin: '0 auto 12px auto' }} />
              <span>Cargando traducciones...</span>
            </div>
          ) : (
            comparisons.map((c) => {
              const isSelected = c.config.id === activeVersionId;
              const { config, text } = c;

              return (
                <div
                  key={config.id}
                  className={`compare-col-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setActiveVersionId(config.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setActiveVersionId(config.id);
                    }
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`Seleccionar ${config.shortName}`}
                  tabIndex={0}
                  style={{
                    '--card-accent': config.accentColor,
                  } as React.CSSProperties}
                >
                  {/* Column Header: Book Icon + Version Short Name */}
                  <div className="compare-col-header">
                    <BookOpen size={14} color={config.accentColor} className="col-book-icon" />
                    <span className="col-version-badge" style={{ color: config.accentColor }}>
                      {config.shortName}
                    </span>
                  </div>

                  {/* Column Text Content */}
                  <div className="compare-col-body">
                    <p className="compare-col-text">
                      <span className="col-verse-number" style={{ color: config.accentColor }}>
                        {verseNum}
                      </span>
                      {' '}
                      {text}
                    </p>
                  </div>

                  {/* Atmospheric Watercolor Landscape Background (Masked to base) */}
                  <div className="compare-col-landscape">
                    <LandscapeArtwork variant={config.variant} />
                  </div>

                  {/* Active Indicator Bottom Border Bar */}
                  {isSelected && <div className="compare-active-bar" style={{ backgroundColor: config.accentColor }} />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
});
