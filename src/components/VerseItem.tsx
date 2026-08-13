import React, { useState } from 'react';
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

export const VerseItem: React.FC<VerseItemProps> = ({
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

  // Copy verse formatted text to clipboard
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = `«${verse.text.trim()}» — ${bookName} ${verse.chapter}:${verse.verse} (${versionShortName})`;
    navigator.clipboard.writeText(formatted);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  // Render text with interactive clickable study words
  const renderInteractiveText = () => {
    if (!verse.concepts || verse.concepts.length === 0) {
      return <span>{verse.text}</span>;
    }

    // Build regex pattern for all concepts in this verse
    const patterns = verse.concepts.map((c) => c.word_pattern).filter(Boolean);
    if (patterns.length === 0) {
      return <span>{verse.text}</span>;
    }

    try {
      const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
      const parts = verse.text.split(regex);

      return (
        <span>
          {parts.map((part, idx) => {
            const matchedConcept = verse.concepts.find((c) => {
              try {
                return new RegExp(`^(${c.word_pattern})$`, 'i').test(part);
              } catch {
                return false;
              }
            });

            if (matchedConcept) {
              return (
                <span
                  key={idx}
                  className="study-word-clickable"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConcept(matchedConcept.slug);
                  }}
                  title={`Concepto histórico: ${matchedConcept.term_es} — Clic para abrir panel de estudio`}
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
  };

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
      {/* Verse Number Margin */}
      <span className="verse-number-editorial" title={`Versículo ${verse.verse}`}>
        {verse.verse}
      </span>

      {/* Scripture Text */}
      <span className="verse-text-editorial">{renderInteractiveText()}</span>

      {/* Floating Micro-Toolbar on Hover / Focus */}
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
