import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VerseWithStudy, ConceptOccurrenceBadge } from '../types';
import { Bookmark, Copy, SplitSquareVertical, Sparkles, Search, Check, Volume2 } from 'lucide-react';

export interface ConceptTester {
  concept: ConceptOccurrenceBadge;
  tester: RegExp;
}

interface VerseItemProps {
  verse: VerseWithStudy;
  bookName: string;
  versionShortName: string;
  fontSize: number;
  lineHeight: number;
  isSelected: boolean;
  isBookmarked: boolean;
  isPlayingAudio?: boolean;
  onToggleBookmark: (verseNum: number) => void;
  onSelectConcept: (slug: string) => void;
  onCompareVerse: (verseNum: number) => void;
  onSearchWord: (word: string) => void;
  onFocusVerse: (verseNum: number) => void;
  onListenVerse?: (verseNum: number, text: string) => void;
  /** Pre-compiled regex testers for the chapter's concepts (shared across verses) */
  chapterTesters: ConceptTester[];
}

const VerseItemInner: React.FC<VerseItemProps> = ({
  verse,
  bookName,
  versionShortName,
  fontSize,
  lineHeight,
  isSelected,
  isBookmarked,
  isPlayingAudio,
  onToggleBookmark,
  onSelectConcept,
  onCompareVerse,
  onSearchWord,
  onFocusVerse,
  onListenVerse,
  chapterTesters,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = `«${verse.text.trim()}» — ${bookName} ${verse.chapter}:${verse.verse} (${versionShortName})`;
    navigator.clipboard.writeText(formatted);
    setIsCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => setIsCopied(false), 1800);
  };

  const { dropCapChar, mainText, isAttached } = useMemo(() => {
    if (verse.verse !== 1) {
      return { dropCapChar: null, mainText: verse.text, isAttached: false };
    }

    const trimmed = verse.text.trim();
    const match = trimmed.match(/^([«"“'¿¡]?)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/);
    if (!match) {
      return { dropCapChar: null, mainText: verse.text, isAttached: false };
    }

    const dropCap = match[0];
    const remaining = trimmed.slice(dropCap.length);
    const isAttached = remaining.length > 0 && !/^\s/.test(remaining);
    return { dropCapChar: dropCap, mainText: remaining, isAttached };
  }, [verse.verse, verse.text]);

  const interactiveText = useMemo(() => {
    const textToParse = mainText;

    if (!verse.concepts || verse.concepts.length === 0 || chapterTesters.length === 0) {
      return <span>{textToParse}</span>;
    }

    // Only use testers relevant to this verse's concepts
    const relevantTesters = chapterTesters.filter((t) =>
      verse.concepts.some((c) => c.concept_id === t.concept.concept_id)
    );

    if (relevantTesters.length === 0) {
      return <span>{textToParse}</span>;
    }

    try {
      const combined = relevantTesters.map((t) => t.concept.word_pattern).join('|');
      const regex = new RegExp(`(${combined})`, 'gi');
      const parts = textToParse.split(regex);

      return (
        <span>
          {parts.map((part, idx) => {
            const matched = relevantTesters.find((t) => t.tester.test(part));
            if (matched) {
              return (
                <span
                  key={idx}
                  className="study-word-clickable"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConcept(matched.concept.slug);
                  }}
                  title={`Concepto histórico: ${matched.concept.term_es} — Clic para abrir panel de estudio`}
                >
                  {part}
                  <Sparkles size={11} className="study-indicator-spark" />
                </span>
              );
            }

            return <span key={idx}>{part}</span>;
          })}
        </span>
      );
    } catch {
      return <span>{textToParse}</span>;
    }
  }, [mainText, verse.concepts, onSelectConcept, chapterTesters]);

  return (
    <div
      id={`verse-${verse.verse}`}
      className={`verse-row-editorial ${isSelected ? 'selected' : ''} ${isBookmarked ? 'bookmarked' : ''} ${isPlayingAudio ? 'playing-audio' : ''}`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
      }}
      onClick={() => onFocusVerse(verse.verse)}
    >
      {dropCapChar ? (
        <span
          className={`verse-initial-dropcap ${isAttached ? 'attached' : ''}`}
          title={`Capítulo ${verse.chapter}, Versículo 1`}
        >
          {dropCapChar}
        </span>
      ) : (
        <span className="verse-number-editorial" title={`Versículo ${verse.verse}`}>
          {verse.verse}
        </span>
      )}

      <span className="verse-text-editorial">{interactiveText}</span>

      <div className="verse-floating-toolbar" onClick={(e) => e.stopPropagation()}>
        {onListenVerse && (
          <button
            className="verse-tool-btn"
            onClick={() => onListenVerse(verse.verse, verse.text)}
            title="Escuchar desde este versículo (🔊)"
          >
            <Volume2 size={14} />
          </button>
        )}

        <button
          className={`verse-tool-btn ${isBookmarked ? 'active-bookmark' : ''}`}
          onClick={() => onToggleBookmark(verse.verse)}
          title={isBookmarked ? 'Quitar marcador' : 'Guardar marcador (🔖)'}
        >
          <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>

        <button
          className="verse-tool-btn"
          onClick={handleCopy}
          title={isCopied ? '¡Copiado!' : 'Copiar versículo con cita (📋)'}
        >
          {isCopied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
        </button>

        <button
          className="verse-tool-btn"
          onClick={() => onCompareVerse(verse.verse)}
          title="Comparar en todas las traducciones (⇄)"
        >
          <SplitSquareVertical size={14} />
        </button>

        {verse.concepts && verse.concepts.length > 0 && (
          <button
            className="verse-tool-btn highlight-study"
            onClick={() => onSelectConcept(verse.concepts[0].slug)}
            title={`Estudio: ${verse.concepts[0].term_es} (✨)`}
          >
            <Sparkles size={14} />
          </button>
        )}

        <div className="verse-toolbar-divider" />

        <button
          className="verse-tool-btn"
          onClick={() => {
            const firstWord = verse.text.split(' ')[0]?.replace(/[^a-záéíóúñ]/gi, '') || '';
            if (firstWord) onSearchWord(firstWord);
          }}
          title="Buscar coincidencias en la Biblia (🔍)"
        >
          <Search size={14} />
        </button>
      </div>
    </div>
  );
};

export const VerseItem = React.memo(VerseItemInner);
