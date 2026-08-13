import React, { useState } from 'react';
import { Book } from '../types';
import { X, Search } from 'lucide-react';

interface BookPickerModalProps {
  isOpen: boolean;
  books: Book[];
  currentBook: Book | null;
  currentChapter: number;
  onSelectPassage: (book: Book, chapter: number) => void;
  onClose: () => void;
}

export const BookPickerModal: React.FC<BookPickerModalProps> = ({
  isOpen,
  books,
  currentBook,
  currentChapter: _currentChapter,
  onSelectPassage,
  onClose,
}) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(currentBook);
  const [filterQuery, setFilterQuery] = useState('');

  if (!isOpen) return null;

  const otBooks = books.filter(
    (b) => b.testament === 'OT' && (b.name_es.toLowerCase().includes(filterQuery.toLowerCase()) || b.code.toLowerCase().includes(filterQuery.toLowerCase()))
  );
  const ntBooks = books.filter(
    (b) => b.testament === 'NT' && (b.name_es.toLowerCase().includes(filterQuery.toLowerCase()) || b.code.toLowerCase().includes(filterQuery.toLowerCase()))
  );

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div
        className="search-modal-card"
        style={{ maxWidth: '850px', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="search-input-header">
          <Search size={18} color="var(--text-secondary)" />
          <input
            type="text"
            className="search-input-main"
            placeholder="Filtrar libros bíblicos (ej. Josué, Juan, Romanos)..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            autoFocus
          />
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Books columns */}
          <div
            style={{
              flex: '1.2',
              overflowY: 'auto',
              padding: '16px 20px',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Old Testament */}
            {otBooks.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--accent-gold)', marginBottom: '8px', letterSpacing: '0.06em' }}>
                  Antiguo Testamento ({otBooks.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
                  {otBooks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBook(b)}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: selectedBook?.id === b.id ? '700' : '500',
                        backgroundColor: selectedBook?.id === b.id ? 'var(--accent-gold-soft)' : 'var(--bg-surface-elevated)',
                        color: selectedBook?.id === b.id ? 'var(--accent-gold)' : 'var(--text-primary)',
                        border: selectedBook?.id === b.id ? '1px solid var(--accent-gold)' : '1px solid transparent',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {b.name_es}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* New Testament */}
            {ntBooks.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--badge-biblical)', marginBottom: '8px', letterSpacing: '0.06em' }}>
                  Nuevo Testamento ({ntBooks.length})
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
                  {ntBooks.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBook(b)}
                      style={{
                        padding: '8px 10px',
                        textAlign: 'left',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: selectedBook?.id === b.id ? '700' : '500',
                        backgroundColor: selectedBook?.id === b.id ? 'var(--badge-biblical-bg)' : 'var(--bg-surface-elevated)',
                        color: selectedBook?.id === b.id ? 'var(--badge-biblical)' : 'var(--text-primary)',
                        border: selectedBook?.id === b.id ? '1px solid var(--badge-biblical)' : '1px solid transparent',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      {b.name_es}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chapters grid */}
          <div
            style={{
              flex: '1',
              overflowY: 'auto',
              padding: '16px 20px',
              backgroundColor: 'var(--bg-app)',
            }}
          >
            {selectedBook ? (
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px', color: 'var(--text-primary)' }}>
                  {selectedBook.name_es} — Capítulos (1 al {selectedBook.total_chapters})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: '8px' }}>
                  {Array.from({ length: selectedBook.total_chapters }, (_, i) => i + 1).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => onSelectPassage(selectedBook, ch)}
                      style={{
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.92rem',
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        transition: 'all 0.12s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--accent-gold-soft)';
                        e.currentTarget.style.borderColor = 'var(--accent-gold)';
                        e.currentTarget.style.color = 'var(--accent-gold)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '40px' }}>
                Selecciona un libro a la izquierda para ver sus capítulos
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
