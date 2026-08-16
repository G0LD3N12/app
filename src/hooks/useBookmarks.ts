import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bookmark, Book } from '../types';

/**
 * Bookmarks scoped by book & chapter (the same verse number in different
 * passages never collides). Exposes the set of bookmarked verse numbers
 * for the chapter currently open so lookups stay O(1).
 */
export function useBookmarks(currentBook: Book | null, currentChapter: number) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('verbum_bookmarks') || '[]');
      if (Array.isArray(saved)) {
        return saved.filter(
          (b): b is Bookmark =>
            !!b &&
            typeof b === 'object' &&
            typeof b.book_id === 'number' &&
            typeof b.chapter === 'number' &&
            typeof b.verse === 'number'
        );
      }
    } catch {
      // ignore malformed storage
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('verbum_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  const toggleBookmark = useCallback(
    (verseNum: number) => {
      if (!currentBook) return;
      setBookmarks((prev) => {
        const idx = prev.findIndex(
          (b) =>
            b.book_id === currentBook.id &&
            b.chapter === currentChapter &&
            b.verse === verseNum
        );
        if (idx >= 0) {
          return prev.filter((_, i) => i !== idx);
        }
        return [
          ...prev,
          { book_id: currentBook.id, chapter: currentChapter, verse: verseNum, created_at: Date.now() },
        ];
      });
    },
    [currentBook, currentChapter]
  );

  const bookmarkedVerses = useMemo(() => {
    const set = new Set<number>();
    if (currentBook) {
      for (const b of bookmarks) {
        if (b.book_id === currentBook.id && b.chapter === currentChapter) {
          set.add(b.verse);
        }
      }
    }
    return set;
  }, [bookmarks, currentBook, currentChapter]);

  return { bookmarks, bookmarkedVerses, toggleBookmark };
}
