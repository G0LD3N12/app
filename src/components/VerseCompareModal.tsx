import React, { useState, useEffect } from 'react';
import { Book, BibleVersion } from '../types';
import { fetchChapter } from '../services/bibleService';
import { X, Copy, Check, Layers } from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !book) return;

    const loadAllVersions = async () => {
      const results: { version: BibleVersion; text: string }[] = [];
      for (const v of versions) {
        try {
          const verses = await fetchChapter(v.id, book.id, chapter);
          const match = verses.find((item) => item.verse === verseNum);
          if (match) {
            results.push({ version: v, text: match.text });
          }
        } catch (e) {
          console.error(`Error loading comparison for ${v.id}:`, e);
        }
      }
      setComparisons(results);
    };

    loadAllVersions();
  }, [isOpen, book, chapter, verseNum, versions]);

  if (!isOpen || !book) return null;

  const handleCopyAll = () => {
    const textToCopy = comparisons
      .map((c) => `[${c.version.short_name}] ${book.name_es} ${chapter}:${verseNum}\n"${c.text}"`)
      .join('\n\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="search-input-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--accent-gold)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              Comparar: {book.name_es} {chapter}:{verseNum}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="icon-btn"
              onClick={handleCopyAll}
              title="Copiar todas las traducciones al portapapeles"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', gap: '6px', backgroundColor: 'var(--bg-surface)' }}
            >
              {copied ? <Check size={14} color="var(--accent-gold)" /> : <Copy size={14} />}
              <span>{copied ? 'Copiado' : 'Copiar todo'}</span>
            </button>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {comparisons.map((c) => (
            <div
              key={c.version.id}
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', fontWeight: '700' }}>
                <span style={{ color: 'var(--accent-gold)' }}>{c.version.name} ({c.version.short_name})</span>
                <span style={{ color: 'var(--text-muted)' }}>{c.version.language.toUpperCase()}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {c.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
