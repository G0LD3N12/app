import { useCallback, useEffect, useState } from 'react';
import { Book, VerseWithStudy } from '../types';
import { fetchChapter } from '../services/bibleService';

/**
 * Current passage (book / chapter / version), verse loading for the
 * primary and parallel columns, adjacent-chapter pre-warming and
 * the reading focus (selected verse + scroll target).
 */
export function usePassageNavigation(
  books: Book[],
  parallelMode: boolean,
  secondaryVersion: string
) {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [currentVersion, setCurrentVersion] = useState<string>('rv1909');
  const [verses, setVerses] = useState<VerseWithStudy[]>([]);
  const [parallelVerses, setParallelVerses] = useState<VerseWithStudy[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(1);
  const [targetVerseToScroll, setTargetVerseToScroll] = useState<number | null>(null);

  // Resolve the initial passage from localStorage once the book
  // catalog has been loaded
  useEffect(() => {
    if (currentBook || books.length === 0) return;
    const savedBookId = parseInt(localStorage.getItem('verbum_book_id') || '6', 10);
    const savedChapter = parseInt(localStorage.getItem('verbum_chapter') || '15', 10);
    const savedVersion = localStorage.getItem('verbum_version') || 'rv1909';
    setCurrentBook(books.find((b) => b.id === savedBookId) || books[0] || null);
    setCurrentChapter(savedChapter);
    setCurrentVersion(savedVersion);
  }, [books, currentBook]);

  // Persist current passage
  useEffect(() => {
    if (!currentBook) return;
    localStorage.setItem('verbum_book_id', currentBook.id.toString());
    localStorage.setItem('verbum_chapter', currentChapter.toString());
    localStorage.setItem('verbum_version', currentVersion);
  }, [currentBook, currentChapter, currentVersion]);

  // Load Primary Chapter Verses
  useEffect(() => {
    if (!currentBook) return;

    let cancelled = false;
    fetchChapter(currentVersion, currentBook.id, currentChapter)
      .then((data) => {
        if (!cancelled) setVerses(data);
      })
      .catch((err) => console.error('Failed to load primary chapter:', err));
    return () => {
      cancelled = true;
    };
  }, [currentBook, currentChapter, currentVersion]);

  // Load Parallel Secondary Verses when Parallel Mode is Active
  useEffect(() => {
    if (!currentBook || !parallelMode) {
      setParallelVerses([]);
      return;
    }

    let cancelled = false;
    fetchChapter(secondaryVersion, currentBook.id, currentChapter)
      .then((data) => {
        if (!cancelled) setParallelVerses(data);
      })
      .catch((err) => console.error('Failed to load parallel chapter:', err));
    return () => {
      cancelled = true;
    };
  }, [currentBook, currentChapter, secondaryVersion, parallelMode]);

  // Warm adjacent chapters so next/prev navigation is instant
  useEffect(() => {
    if (!currentBook) return;
    const neighbors = [currentChapter - 1, currentChapter + 1].filter(
      (ch) => ch >= 1 && ch <= currentBook.total_chapters
    );
    for (const ch of neighbors) {
      void fetchChapter(currentVersion, currentBook.id, ch);
      if (parallelMode) {
        void fetchChapter(secondaryVersion, currentBook.id, ch);
      }
    }
  }, [currentBook, currentChapter, currentVersion, parallelMode, secondaryVersion]);

  const navigateChapter = useCallback(
    (delta: number) => {
      if (!currentBook) return;
      const target = currentChapter + delta;
      if (target >= 1 && target <= currentBook.total_chapters) {
        setCurrentChapter(target);
        setSelectedVerse(1);
        setTargetVerseToScroll(1);
      }
    },
    [currentBook, currentChapter]
  );

  const selectPassage = useCallback((book: Book, chapter: number, verse?: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    setSelectedVerse(verse || 1);
    setTargetVerseToScroll(verse || 1);
  }, []);

  return {
    currentBook,
    currentChapter,
    currentVersion,
    setCurrentVersion,
    verses,
    parallelVerses,
    selectedVerse,
    setSelectedVerse,
    targetVerseToScroll,
    setTargetVerseToScroll,
    navigateChapter,
    selectPassage,
  };
}
