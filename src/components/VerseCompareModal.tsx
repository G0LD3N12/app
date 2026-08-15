import React, { useState, useEffect, useCallback } from 'react';
import { Book, BibleVersion } from '../types';
import { fetchChapter } from '../services/bibleService';
import { X, Copy, Check, SplitSquareVertical } from 'lucide-react';

interface VerseCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  chapter: number;
  verseNum: number;
  versions: BibleVersion[];
}

export const VerseCompareModal: React.FC<VerseCompareModalProps> = React.memo(({
  isOpen,
  onClose,
  book,
  chapter,
  verseNum,
  versions,
}) => {
  const [comparisons, setComparisons] = useState<{ version: BibleVersion; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSingle, setCopiedSingle] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !book) return;

    let isMounted = true;
    setIsLoading(true);
    setComparisons([]);

    const loadAllVersions = async () => {
      const results: { version: BibleVersion; text: string }[] = [];
      for (const v of versions) {
        try {
          const verses = await fetchChapter(v.id, book.id, chapter);
          const match = verses.find((item) => item.verse === verseNum);
          if (match && isMounted) {
            results.push({ version: v, text: match.text });
          }
        } catch (e) {
          console.error(`Error loading comparison for ${v.id}:`, e);
        }
      }
      if (isMounted) {
        setComparisons(results);
        setIsLoading(false);
      }
    };

    loadAllVersions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, book, chapter, verseNum, versions]);

  const handleCopyAll = useCallback(() => {
    if (!book) return;
    const textToCopy = comparisons
      .map((c) => `[${c.version.short_name}] ${book.name_es} ${chapter}:${verseNum}\n«${c.text}»`)
      .join('\n\n');

    navigator.clipboard.writeText(textToCopy);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [comparisons, book, chapter, verseNum]);

  const handleCopySingle = useCallback((c: { version: BibleVersion; text: string }) => {
    if (!book) return;
    const text = `«${c.text}» — ${book.name_es} ${chapter}:${verseNum} (${c.version.short_name})`;
    navigator.clipboard.writeText(text);
    setCopiedSingle(c.version.id);
    setTimeout(() => setCopiedSingle(null), 1800);
  }, [book, chapter, verseNum]);

  if (!isOpen || !book) return null;

  return (
    <div className="verse-compare-backdrop" onClick={onClose}>
      <div className="verse-compare-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="verse-compare-header">
          <div className="verse-compare-title-group">
            <SplitSquareVertical size={19} color="var(--accent-gold)" />
            <h3 className="verse-compare-title">
              Comparar: {book.name_es} {chapter}:{verseNum}
            </h3>
          </div>

          <div className="verse-compare-actions">
            <button
              className="verse-compare-copy-all-btn"
              onClick={handleCopyAll}
              title="Copiar todas las traducciones al portapapeles"
            >
              {copiedAll ? <Check size={14} color="var(--accent-gold)" /> : <Copy size={14} />}
              <span>{copiedAll ? '¡Copiado!' : 'Copiar todo'}</span>
            </button>
            <button className="icon-btn" onClick={onClose} title="Cerrar (Esc)">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body list of translations */}
        <div className="verse-compare-body">
          {isLoading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span>Cargando traducciones...</span>
            </div>
          ) : comparisons.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span>No se encontraron versiones para este versículo.</span>
            </div>
          ) : (
            comparisons.map((c) => (
              <div key={c.version.id} className="verse-compare-item">
                <div className="verse-compare-item-header">
                  <div className="verse-compare-version-name">
                    <span>{c.version.name}</span>
                    <span className="verse-compare-lang-pill">{c.version.short_name}</span>
                    <span className="verse-compare-lang-pill">{c.version.language.toUpperCase()}</span>
                  </div>

                  <button
                    className="verse-compare-copy-single-btn"
                    onClick={() => handleCopySingle(c)}
                    title="Copiar solo este versículo"
                  >
                    {copiedSingle === c.version.id ? (
                      <>
                        <Check size={12} color="#22c55e" />
                        <span style={{ color: '#22c55e' }}>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="verse-compare-text">{c.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});
