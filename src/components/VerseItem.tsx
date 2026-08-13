import React, { useEffect, useMemo, useRef, useState } from 'react';
import { VerseWithStudy } from '../types';
import { Bookmark, Copy, SplitSquareVertical, Sparkles, Search, Check } from 'lucide-react';

interface VerseItemProps {
  verse: VerseWithStudy;
  bookName: string;
  versionShortName: string;
  fontSize: number;
  lineHeight: number;
  isSelected: boolean;
  isBookmarked: boolean;
  onToggleBookmark: (verseNum: number) => void;
  onSelectConcept: (slug: string) => void;
  onCompareVerse: (verseNum: number) => void;
  onSearchWord: (word: string) => void;
  onFocusVerse: (verseNum: number) => void;
}

const VerseItemInner: React.FC<VerseItemProps> = ({
  verse,
  bookName,
  versionShortName,
  fontSize,
  lineHeight,
  isSelected,
  isBookmarked,
  onToggleBookmark,
  onSelectConcept,
  onCompareVerse,
  onSearchWord,
  onFocusVerse,
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

  const interactiveText = useMemo(() => {
    if (!verse.concepts || verse.concepts.length === 0) {
      return <span>{verse.text}</span>;
    }

    const testers = verse.concepts
      .filter((c) => c.word_pattern)
      .map((c) => {
        try {
          return { concept: c, tester: new RegExp(`^(${c.word_pattern})$`, 'i') };
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { concept: (typeof verse.concepts)[number]; tester: RegExp } => entry !== null);

    if (testers.length === 0) {
      return <span>{verse.text}</span>;
    }

    try {
      const combined = testers.map((t) => t.concept.word_pattern).join('|');
      const regex = new RegExp(`(${combined})`, 'gi');
      const parts = verse.text.split(regex);

      return (
        <span>
          {parts.map((part, idx) => {
            const matched = testers.find((t) => t.tester.test(part));
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
      return <span>{verse.text}</span>;
    }
  }, [verse.text, verse.concepts, onSelectConcept]);

  return (
    <div
      id={`verse-${verse.verse}`}
      className={`verse-row-editorial ${isSelected ? 'selected' : ''} ${isBookmarked ? 'bookmarked' : ''}`}
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: lineHeight,
      }}
      onClick={() => onFocusVerse(verse.verse)}
    >
      <span className="verse-number-editorial" title={`Versículo ${verse.verse}`}>
        {verse.verse}
      </span>

      <span className="verse-text-editorial">{interactiveText}</span>

      <div className="verse-floating-toolbar" onClick={(e) => e.stopPropagation()}>
        <button
          className={`verse-tool-btn ${isBookmarked ? 'active-bookmark' : ''}`}
          onClick={() => onToggleBookmark(verse.verse)}
          title={isBookmarked ? 'Quitar marcador' : 'Guardar marcador (🔖)'}
        >
          <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
        </button>

        <button
          className="verse-tool-btn"
          onClick={handleCopy}
          title={isCopied ? '¡Copiado!' : 'Copiar versículo con cita (📋)'}
        >
          {isCopied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
        </button>

        <button
          className="verse-tool-btn"
          onClick={() => onCompareVerse(verse.verse)}
          title="Comparar en todas las traducciones (⇄)"
        >
          <SplitSquareVertical size={13} />
        </button>

        {verse.concepts && verse.concepts.length > 0 && (
          <button
            className="verse-tool-btn highlight-study"
            onClick={() => onSelectConcept(verse.concepts[0].slug)}
            title={`Estudio: ${verse.concepts[0].term_es} (✨)`}
          >
            <Sparkles size={13} />
          </button>
        )}

        <button
          className="verse-tool-btn"
          onClick={() => {
            const firstWord = verse.text.split(' ')[0]?.replace(/[^a-záéíóúñ]/gi, '') || '';
            if (firstWord) onSearchWord(firstWord);
          }}
          title="Buscar coincidencias en la Biblia (🔍)"
        >
          <Search size={13} />
        </button>
      </div>
    </div>
  );
};

export const VerseItem = React.memo(VerseItemInner);
