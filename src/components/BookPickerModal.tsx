import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Book } from '../types';
import { Search, X } from 'lucide-react';
import {
  LITERARY_GROUPS,
  getBookMetadata,
  getBookIconComponent,
} from '../utils/bibleBooksData';

interface BookPickerModalProps {
  isOpen: boolean;
  books: Book[];
  currentBook: Book | null;
  currentChapter: number;
  onSelectPassage: (book: Book, chapter: number) => void;
  onClose: () => void;
}

export const BookPickerModal: React.FC<BookPickerModalProps> = React.memo(({
  isOpen,
  books,
  currentBook,
  currentChapter,
  onSelectPassage,
  onClose,
}) => {
  const [selectedBook, setSelectedBook] = useState<Book | null>(currentBook);
  const [filterQuery, setFilterQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectedBookItemRef = useRef<HTMLButtonElement>(null);

  // Sync selectedBook when modal opens or currentBook changes
  useEffect(() => {
    if (isOpen) {
      setSelectedBook(currentBook || (books.length > 0 ? books[0] : null));
      setFilterQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, currentBook, books]);

  // Scroll active book into view when opening
  useEffect(() => {
    if (isOpen && selectedBookItemRef.current) {
      selectedBookItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter books according to search query
  const filteredBooks = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) return books;
    return books.filter((b) => {
      const nameEs = b.name_es.toLowerCase();
      const nameEn = b.name_en?.toLowerCase() || '';
      const code = b.code.toLowerCase();
      return nameEs.includes(query) || nameEn.includes(query) || code.includes(query);
    });
  }, [books, filterQuery]);

  // Group filtered books by literary genre / testament
  const groupedBooks = useMemo(() => {
    const map = new Map<string, { group: typeof LITERARY_GROUPS[0]; books: Book[] }>();

    // Initialize map with known literary groups in correct biblical order
    for (const group of LITERARY_GROUPS) {
      map.set(group.id, { group, books: [] });
    }

    for (const book of filteredBooks) {
      const meta = getBookMetadata(book.code) || getBookMetadata(book.id);
      const groupId = meta?.groupId || (book.testament === 'OT' ? 'historicos' : 'epistolas_generales');
      if (!map.has(groupId)) {
        map.set(groupId, {
          group: { id: groupId, name: meta?.groupName || 'Libros', testament: book.testament },
          books: [],
        });
      }
      map.get(groupId)!.books.push(book);
    }

    // Return only groups that have matching books
    return Array.from(map.values()).filter((g) => g.books.length > 0);
  }, [filteredBooks]);

  // Update selected book if current selection was filtered out
  useEffect(() => {
    if (filteredBooks.length > 0) {
      const exists = filteredBooks.some((b) => b.id === selectedBook?.id);
      if (!exists) {
        setSelectedBook(filteredBooks[0]);
      }
    }
  }, [filteredBooks, selectedBook]);

  if (!isOpen) return null;

  const totalChapters = selectedBook?.total_chapters || 1;
  const isSelectedCurrent = currentBook && selectedBook && currentBook.id === selectedBook.id;

  const testamentLabel = selectedBook?.testament === 'OT' ? 'Antiguo Testamento' : 'Nuevo Testamento';

  return (
    <div className="book-picker-backdrop" onClick={onClose}>
      <div className="book-picker-card" onClick={(e) => e.stopPropagation()}>
        {/* Close Button Header */}
        <button
          className="book-picker-close-btn"
          onClick={onClose}
          aria-label="Cerrar selector"
          title="Cerrar (Esc)"
        >
          <X size={18} />
        </button>

        {/* Left Column: Book Navigation with Search & Semantic Categorized List */}
        <div className="book-picker-sidebar">
          {/* Search Header */}
          <div className="book-picker-search-container">
            <Search size={15} className="book-picker-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="book-picker-search-input"
              placeholder="Ir a libro..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
            {filterQuery && (
              <button
                className="book-picker-search-clear"
                onClick={() => {
                  setFilterQuery('');
                  searchInputRef.current?.focus();
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Grouped Books List */}
          <div className="book-picker-books-list custom-scrollbar">
            {groupedBooks.length === 0 ? (
              <div className="book-picker-empty">
                <span>No se encontraron libros</span>
              </div>
            ) : (
              groupedBooks.map(({ group, books: groupBooks }) => (
                <div key={group.id} className="book-picker-group">
                  <div className="book-picker-group-title">{group.name}</div>
                  <div className="book-picker-group-items">
                    {groupBooks.map((book) => {
                      const isSelected = selectedBook?.id === book.id;
                      const IconComponent = getBookIconComponent(book);

                      return (
                        <button
                          key={book.id}
                          ref={isSelected ? selectedBookItemRef : null}
                          className={`book-picker-item ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedBook(book)}
                        >
                          <IconComponent
                            size={16}
                            strokeWidth={1.75}
                            className="book-picker-item-icon"
                          />
                          <span className="book-picker-item-name">{book.name_es}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Book Title & Circular Chapters Grid */}
        <div className="book-picker-content">
          {selectedBook ? (
            <div className="book-picker-detail">
              {/* Header Title & Subtitle */}
              <div className="book-picker-detail-header">
                <h2 className="book-picker-book-title">{selectedBook.name_es}</h2>
                <p className="book-picker-book-subtitle">
                  {testamentLabel} · {totalChapters} {totalChapters === 1 ? 'capítulo' : 'capítulos'}
                </p>
              </div>

              {/* Chapters Circular Grid */}
              <div className="book-picker-chapters-grid-container custom-scrollbar">
                <div className="book-picker-chapters-grid">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map((ch) => {
                    const isCurrentChapter = isSelectedCurrent && ch === currentChapter;

                    return (
                      <button
                        key={ch}
                        className={`book-picker-chapter-circle ${isCurrentChapter ? 'active' : ''}`}
                        onClick={() => {
                          onSelectPassage(selectedBook, ch);
                          onClose();
                        }}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="book-picker-no-selection">
              <p>Selecciona un libro para ver sus capítulos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
export default BookPickerModal;
