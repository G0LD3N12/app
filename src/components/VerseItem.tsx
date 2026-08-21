import React, { useMemo } from 'react';
import { VerseWithStudy, ConceptOccurrenceBadge } from '../types';

export interface ConceptTester {
  concept: ConceptOccurrenceBadge;
  tester: RegExp;
}

interface VerseItemProps {
  verse: VerseWithStudy;
  fontSize: number;
  lineHeight: number;
  isSelected: boolean;
  isBookmarked: boolean;
  isPlayingAudio?: boolean;
  onSelectConcept: (slug: string) => void;
  onFocusVerse: (verseNum: number) => void;
  /** Pre-compiled regex testers for the chapter's concepts (shared across verses) */
  chapterTesters: ConceptTester[];
}

const VerseItemInner: React.FC<VerseItemProps> = ({
  verse,
  fontSize,
  lineHeight,
  isSelected,
  isBookmarked,
  isPlayingAudio,
  onSelectConcept,
  onFocusVerse,
  chapterTesters,
}) => {
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
    const attached = remaining.length > 0 && !/^\s/.test(remaining);
    return { dropCapChar: dropCap, mainText: remaining, isAttached: attached };
  }, [verse.verse, verse.text]);

  const interactiveText = useMemo(() => {
    const textToParse = mainText;

    if (!verse.concepts || verse.concepts.length === 0 || chapterTesters.length === 0) {
      return <span>{textToParse}</span>;
    }

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
            const matched = relevantTesters.find((t) => {
              t.tester.lastIndex = 0;
              return t.tester.test(part);
            });
            if (matched) {
              return (
                <span
                  key={idx}
                  className="study-word-clickable"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConcept(matched.concept.slug);
                  }}
                  title={`Concepto histórico: ${matched.concept.term_es}`}
                >
                  {part}
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
          title={`Capítulo ${verse.chapter}, versículo 1`}
        >
          {dropCapChar}
        </span>
      ) : (
        <span className="verse-number-editorial" title={`Versículo ${verse.verse}`}>
          {verse.verse}
        </span>
      )}

      <span className="verse-text-editorial">{interactiveText}</span>
    </div>
  );
};

export const VerseItem = React.memo(VerseItemInner);
