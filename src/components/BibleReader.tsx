import React, { useEffect, useRef } from 'react';
import { Book, VerseWithStudy, ScriptureFont, LineHeightPreset, MaxWidthPreset } from '../types';
import { VerseItem } from './VerseItem';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BibleReaderProps {
  currentBook: Book | null;
  currentChapter: number;
  currentVersion: string;
  versionShortName: string;
  verses: VerseWithStudy[];
  parallelVerses?: VerseWithStudy[];
  secondaryVersionShortName?: string;
  parallelMode: boolean;
  fontSize: number;
  fontFamily: ScriptureFont;
  lineHeightPreset: LineHeightPreset;
  maxWidthPreset: MaxWidthPreset;
  selectedVerse: number | null;
  onSelectVerse: (vNum: number) => void;
  bookmarks: number[];
  onToggleBookmark: (verseNum: number) => void;
  onSelectConcept: (slug: string) => void;
  onCompareVerse: (verseNum: number) => void;
  onSearchWord: (word: string) => void;
  onNavigateChapter: (delta: number) => void;
  targetVerseToScroll: number | null;
}

export const BibleReader: React.FC<BibleReaderProps> = ({
  currentBook,
  currentChapter,
  versionShortName,
  verses,
  parallelVerses,
  secondaryVersionShortName,
  parallelMode,
  fontSize,
  fontFamily,
  lineHeightPreset,
  maxWidthPreset,
  selectedVerse,
  onSelectVerse,
  bookmarks,
  onToggleBookmark,
  onSelectConcept,
  onCompareVerse,
  onSearchWord,
  onNavigateChapter,
  targetVerseToScroll,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to target verse when updated
  useEffect(() => {
    if (targetVerseToScroll === null || targetVerseToScroll <= 0) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`verse-${targetVerseToScroll}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [targetVerseToScroll, verses]);

  // Line height numeric multiplier
  const getLineHeightMultiplier = (): number => {
    if (lineHeightPreset === 'compact') return 1.55;
    if (lineHeightPreset === 'spacious') return 2.0;
    return 1.75; // comfortable
  };

  // Max width container class
  const getMaxWidthPx = (): string => {
    if (parallelMode) return '1180px';
    if (maxWidthPreset === 'wide') return '880px';
    if (maxWidthPreset === 'expanded') return '1040px';
    return '800px'; // standard
  };

  // Font family CSS rule
  const getFontFamilyCSS = (): string => {
    if (fontFamily === 'crimson') return 'var(--font-crimson)';
    if (fontFamily === 'garamond') return 'var(--font-garamond)';
    if (fontFamily === 'sans') return 'var(--font-sans)';
    return 'var(--font-serif)'; // literata default
  };

  const hasPrev = currentChapter > 1;
  const hasNext = currentBook ? currentChapter < currentBook.total_chapters : false;

  return (
    <div
      ref={containerRef}
      className={`reader-viewport font-preset-${fontFamily}`}
      style={{ fontFamily: getFontFamilyCSS() }}
    >
      <div className="reader-content-wrapper" style={{ maxWidth: getMaxWidthPx() }}>
        {/* Tighter, More Elegant Chapter Header (Document feel) */}
        <header className="chapter-document-header">
          <h1 className="chapter-document-title">
            {currentBook ? `${currentBook.name_es.toUpperCase()} ${currentChapter}` : 'CARGANDO...'}
          </h1>
          <div className="chapter-document-meta">
            <span>
              {currentBook?.testament === 'OT' ? 'Antiguo Testamento' : 'Nuevo Testamento'}
            </span>
            <span className="meta-separator">·</span>
            <span>{verses.length} versículos</span>
            <span className="meta-separator">·</span>
            <span className="meta-version-badge">{versionShortName}</span>
            {parallelMode && secondaryVersionShortName && (
              <>
                <span className="meta-separator">⇄</span>
                <span className="meta-version-badge">{secondaryVersionShortName}</span>
              </>
            )}
          </div>
        </header>

        {/* Verses Area: Single Column or Parallel Split View */}
        {!parallelMode ? (
          /* Single Column Editorial Document */
          <div className="verses-container">
            {verses.map((v) => (
              <VerseItem
                key={v.id}
                verse={v}
                bookName={currentBook?.name_es || ''}
                versionShortName={versionShortName}
                fontSize={fontSize}
                lineHeight={getLineHeightMultiplier()}
                isSelected={selectedVerse === v.verse}
                isBookmarked={bookmarks.includes(v.verse)}
                onToggleBookmark={onToggleBookmark}
                onSelectConcept={onSelectConcept}
                onCompareVerse={onCompareVerse}
                onSearchWord={onSearchWord}
                onFocusVerse={onSelectVerse}
              />
            ))}
          </div>
        ) : (
          /* Parallel Split View (Side-by-Side Synchronized Verses) */
          <div className="parallel-verses-grid">
            <div className="parallel-column-header">
              <div className="parallel-col-title primary">
                <span>{versionShortName}</span>
              </div>
              <div className="parallel-col-title secondary">
                <span>{secondaryVersionShortName || 'Traducción 2'}</span>
              </div>
            </div>

            <div className="parallel-rows-wrapper">
              {verses.map((v, idx) => {
                const pVerse = parallelVerses && parallelVerses[idx];

                return (
                  <div
                    key={v.id}
                    className={`parallel-verse-row ${selectedVerse === v.verse ? 'selected' : ''}`}
                    onClick={() => onSelectVerse(v.verse)}
                  >
                    {/* Primary Column */}
                    <div className="parallel-col primary">
                      <VerseItem
                        verse={v}
                        bookName={currentBook?.name_es || ''}
                        versionShortName={versionShortName}
                        fontSize={fontSize - 1}
                        lineHeight={getLineHeightMultiplier()}
                        isSelected={selectedVerse === v.verse}
                        isBookmarked={bookmarks.includes(v.verse)}
                        onToggleBookmark={onToggleBookmark}
                        onSelectConcept={onSelectConcept}
                        onCompareVerse={onCompareVerse}
                        onSearchWord={onSearchWord}
                        onFocusVerse={onSelectVerse}
                      />
                    </div>

                    {/* Secondary Parallel Column */}
                    <div className="parallel-col secondary">
                      {pVerse ? (
                        <div
                          className="verse-row-editorial secondary"
                          style={{
                            fontSize: `${fontSize - 1}px`,
                            lineHeight: getLineHeightMultiplier(),
                          }}
                        >
                          <span className="verse-number-editorial secondary">{pVerse.verse}</span>
                          <span className="verse-text-editorial">{pVerse.text}</span>
                        </div>
                      ) : (
                        <span className="verse-text-muted">...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reader Navigation Footer */}
        <footer className="reader-nav-footer">
          <button
            className="nav-chapter-btn"
            disabled={!hasPrev}
            onClick={() => onNavigateChapter(-1)}
            title="Capítulo anterior (Atajo: ← o Alt+←)"
          >
            <ChevronLeft size={16} />
            <span>Capítulo Anterior</span>
          </button>

          <div className="reader-footer-center">
            <span className="reader-footer-passage">
              {currentBook?.name_es} {currentChapter}
            </span>
          </div>

          <button
            className="nav-chapter-btn"
            disabled={!hasNext}
            onClick={() => onNavigateChapter(1)}
            title="Capítulo siguiente (Atajo: → o Alt+→)"
          >
            <span>Capítulo Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </footer>
      </div>
    </div>
  );
};
