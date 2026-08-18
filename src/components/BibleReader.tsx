import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Book, VerseWithStudy, ScriptureFont, LineHeightPreset, MaxWidthPreset } from '../types';
import { VerseItem, ConceptTester } from './VerseItem';
import { ChevronLeft, ChevronRight, ChevronDown, Play, Pause } from 'lucide-react';
import { useAudioManager } from '../context/AudioManagerContext';

interface BibleReaderProps {
  currentBook: Book | null;
  currentChapter: number;
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
  bookmarkedVerses: Set<number>;
  onSelectConcept: (slug: string) => void;
  onNavigateChapter: (delta: number) => void;
  targetVerseToScroll: number | null;
  onOpenVersionLibrary?: (target: 'primary' | 'secondary') => void;
  isLoading?: boolean;
}

export const BibleReader: React.FC<BibleReaderProps> = React.memo(({
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
  bookmarkedVerses,
  onSelectConcept,
  onNavigateChapter,
  targetVerseToScroll,
  onOpenVersionLibrary,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    activeVerseNumber,
    playChapter,
    isAudioBarVisible,
    playbackState,
    pause,
    resume,
    voiceSettings,
  } = useAudioManager();

  // Auto-scroll when activeVerseNumber changes in audiobook playback
  useEffect(() => {
    if (activeVerseNumber !== null && activeVerseNumber > 0 && voiceSettings.autoScroll) {
      const el = document.getElementById(`verse-${activeVerseNumber}`);
      if (el) {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeVerseNumber, voiceSettings.autoScroll]);

  const isPlayingThisChapter =
    isAudioBarVisible && (playbackState === 'playing' || playbackState === 'generating' || playbackState === 'ready');

  const handleToggleListenChapter = useCallback(() => {
    if (isPlayingThisChapter) {
      if (playbackState === 'playing') {
        pause();
      } else {
        resume();
      }
    } else {
      if (!currentBook || verses.length === 0) return;
      const verseList = verses.map((v) => ({
        verseNumber: v.verse,
        text: v.text,
      }));
      playChapter(
        verseList,
        currentBook.id,
        currentBook.name_es,
        currentChapter,
        versionShortName,
        selectedVerse || 1
      );
    }
  }, [isPlayingThisChapter, playbackState, pause, resume, currentBook, verses, playChapter, currentChapter, versionShortName, selectedVerse]);

  // Pre-compile concept regex testers once per chapter (shared across all verses)
  const chapterTesters = useMemo<ConceptTester[]>(() => {
    const seen = new Set<number>();
    return verses.flatMap((v) => v.concepts).filter((c) => {
      if (!c.word_pattern || seen.has(c.concept_id)) return false;
      seen.add(c.concept_id);
      try {
        return true;
      } catch {
        return false;
      }
    }).map((c) => ({
      concept: c,
      tester: new RegExp(`^(${c.word_pattern})$`, 'i'),
    }));
  }, [verses]);

  // Scroll to target verse when updated
  useEffect(() => {
    if (targetVerseToScroll === null || targetVerseToScroll <= 0) return;
    const timer = window.setTimeout(() => {
      const smoothJump = targetVerseToScroll > 1;
      document.getElementById(`verse-${targetVerseToScroll}`)?.scrollIntoView({
        behavior: smoothJump ? 'smooth' : 'auto',
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

  // Max width container class (optimal measure 65-72ch)
  const getMaxWidthPx = (): string => {
    if (parallelMode) return '130ch';
    if (maxWidthPreset === 'wide') return '78ch';
    if (maxWidthPreset === 'expanded') return '92ch';
    return '68ch'; // standard optimal editorial measure
  };

  // Font family CSS rule
  const getFontFamilyCSS = (): string => {
    if (fontFamily === 'crimson') return 'var(--font-crimson)';
    if (fontFamily === 'garamond') return 'var(--font-garamond)';
    if (fontFamily === 'charter') return 'var(--font-charter)';
    if (fontFamily === 'source-serif') return 'var(--font-source-serif)';
    if (fontFamily === 'sf-pro') return 'var(--font-sf-pro)';
    if (fontFamily === 'inter') return 'var(--font-inter)';
    if (fontFamily === 'jakarta') return 'var(--font-jakarta)';
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
            {currentBook ? `${currentBook.name_es.toUpperCase()} ${currentChapter}` : ''}
          </h1>
          {currentBook && (
            <div className="chapter-document-meta">
              <span>
                {currentBook.testament === 'OT' ? 'Antiguo Testamento' : 'Nuevo Testamento'}
              </span>
              <span className="meta-separator">·</span>
              <span>{verses.length} versículos</span>
              <span className="meta-separator">·</span>
              <button
                className="meta-version-badge-btn"
                onClick={() => onOpenVersionLibrary?.('primary')}
                title="Abrir biblioteca para traducción principal (Columna 1)"
              >
                {versionShortName}
              </button>
              {parallelMode && secondaryVersionShortName && (
                <>
                  <span className="meta-separator">⇄</span>
                  <button
                    className="meta-version-badge-btn"
                    onClick={() => onOpenVersionLibrary?.('secondary')}
                    title="Abrir biblioteca para traducción secundaria (Columna 2)"
                  >
                    {secondaryVersionShortName}
                  </button>
                </>
              )}
              <span className="meta-separator">·</span>
              <button
                className={`meta-play-chapter-btn ${isPlayingThisChapter ? 'active' : ''}`}
                onClick={handleToggleListenChapter}
                title={isPlayingThisChapter ? 'Pausar o reanudar lectura de audio' : 'Reproducir capítulo completo'}
                aria-label={isPlayingThisChapter ? 'Pausar lectura' : 'Reproducir capítulo'}
              >
                {isPlayingThisChapter && playbackState === 'playing' ? (
                  <Pause size={9} fill="currentColor" />
                ) : (
                  <Play size={9} fill="currentColor" style={{ marginLeft: '1px' }} />
                )}
              </button>
            </div>
          )}
        </header>

        {/* Verses Area: Loading Skeleton or Single Column / Parallel Split View */}
        {(!currentBook || (isLoading && verses.length === 0)) ? (
          <div className="reader-skeleton-container" aria-label="Cargando capítulo...">
            <div className="reader-skeleton-line title" />
            <div className="reader-skeleton-line meta" />
            <div className="reader-skeleton-divider" />
            <div className="reader-skeleton-line w-95" />
            <div className="reader-skeleton-line w-85" />
            <div className="reader-skeleton-line w-90" />
            <div className="reader-skeleton-line w-70" />
            <div className="reader-skeleton-line w-88" />
            <div className="reader-skeleton-line w-60" />
          </div>
        ) : !parallelMode ? (
          /* Single Column Editorial Document */
          <div className={`verses-container ${((playbackState === 'playing' || playbackState === 'generating' || playbackState === 'ready') && activeVerseNumber !== null) ? 'has-active-audio' : ''}`}>
            {verses.map((v) => (
              <VerseItem
                key={v.id}
                verse={v}
                fontSize={fontSize}
                lineHeight={getLineHeightMultiplier()}
                isSelected={selectedVerse === v.verse}
                isBookmarked={bookmarkedVerses.has(v.verse)}
                isPlayingAudio={activeVerseNumber === v.verse}
                onSelectConcept={onSelectConcept}
                onFocusVerse={onSelectVerse}
                chapterTesters={chapterTesters}
              />
            ))}
          </div>
        ) : (
          /* Parallel Split View (Side-by-Side Synchronized Verses) */
          <div className="parallel-verses-grid">
            <div className="parallel-column-header">
              <button
                className="parallel-col-title-btn primary"
                onClick={() => onOpenVersionLibrary?.('primary')}
                title="Cambiar traducción izquierda (Columna 1)"
              >
                <span>{versionShortName}</span>
                <ChevronDown size={11} />
              </button>
              <button
                className="parallel-col-title-btn secondary"
                onClick={() => onOpenVersionLibrary?.('secondary')}
                title="Cambiar traducción derecha (Columna 2)"
              >
                <span>{secondaryVersionShortName || 'Traducción 2'}</span>
                <ChevronDown size={11} />
              </button>
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
                        fontSize={fontSize - 1}
                        lineHeight={getLineHeightMultiplier()}
                        isSelected={selectedVerse === v.verse}
                        isBookmarked={bookmarkedVerses.has(v.verse)}
                        isPlayingAudio={activeVerseNumber === v.verse}
                        onSelectConcept={onSelectConcept}
                        onFocusVerse={onSelectVerse}
                        chapterTesters={chapterTesters}
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
});
