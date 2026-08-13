import { useState, useEffect, useCallback } from 'react';
import {
  BibleVersion,
  Book,
  VerseWithStudy,
  AppTheme,
  ScriptureFont,
  LineHeightPreset,
  MaxWidthPreset,
} from './types';
import { fetchVersions, fetchBooks, fetchChapter } from './services/bibleService';
import { Header } from './components/Header';
import { Sidebar, AppView } from './components/Sidebar';
import { BibleReader } from './components/BibleReader';
import { SettingsView } from './components/SettingsView';
import { StudyCatalogView } from './components/StudyCatalogView';
import { CommandPalette } from './components/CommandPalette';
import { StudyDrawer } from './components/StudyDrawer';
import { BookPickerModal } from './components/BookPickerModal';
import { VerseCompareModal } from './components/VerseCompareModal';
import { BookOpen, Search, PanelTopOpen, Columns2 } from 'lucide-react';

export function App() {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentChapter, setCurrentChapter] = useState<number>(1);
  const [currentVersion, setCurrentVersion] = useState<string>('rv1909');
  const [verses, setVerses] = useState<VerseWithStudy[]>([]);
  const [targetVerseToScroll, setTargetVerseToScroll] = useState<number | null>(null);

  // Parallel Split View
  const [parallelMode, setParallelMode] = useState<boolean>(() => {
    return localStorage.getItem('verbum_parallel_mode') === 'true';
  });
  const [secondaryVersion, setSecondaryVersion] = useState<string>(() => {
    return localStorage.getItem('verbum_secondary_version') || 'kjv';
  });
  const [parallelVerses, setParallelVerses] = useState<VerseWithStudy[]>([]);

  // Navigation View & Sidebar
  const [activeView, setActiveView] = useState<AppView>('reader');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    return localStorage.getItem('verbum_sidebar_expanded') === 'true';
  });

  // TopBar Visibility / Zen Mode
  const [hideTopBar, setHideTopBar] = useState<boolean>(() => {
    return localStorage.getItem('verbum_hide_topbar') === 'true';
  });

  // Modals & Command Palette
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isBookPickerOpen, setIsBookPickerOpen] = useState(false);
  const [activeConceptSlug, setActiveConceptSlug] = useState<string | null>(null);
  const [compareVerseNum, setCompareVerseNum] = useState<number | null>(null);

  // Verse Interaction & Bookmarks
  const [selectedVerse, setSelectedVerse] = useState<number | null>(1);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('verbum_bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  // Appearance & Reader Typography
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('verbum_theme') as AppTheme) || 'obsidian';
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    return parseInt(localStorage.getItem('verbum_font_size') || '19', 10);
  });
  const [fontFamily, setFontFamily] = useState<ScriptureFont>(() => {
    return (localStorage.getItem('verbum_font_family') as ScriptureFont) || 'literata';
  });
  const [lineHeightPreset, setLineHeightPreset] = useState<LineHeightPreset>(() => {
    return (localStorage.getItem('verbum_line_height') as LineHeightPreset) || 'comfortable';
  });
  const [maxWidthPreset, setMaxWidthPreset] = useState<MaxWidthPreset>(() => {
    return (localStorage.getItem('verbum_max_width') as MaxWidthPreset) || 'wide';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('verbum_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('verbum_font_size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('verbum_font_family', fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    localStorage.setItem('verbum_line_height', lineHeightPreset);
  }, [lineHeightPreset]);

  useEffect(() => {
    localStorage.setItem('verbum_max_width', maxWidthPreset);
  }, [maxWidthPreset]);

  useEffect(() => {
    localStorage.setItem('verbum_sidebar_expanded', isSidebarExpanded.toString());
  }, [isSidebarExpanded]);

  useEffect(() => {
    localStorage.setItem('verbum_hide_topbar', hideTopBar.toString());
  }, [hideTopBar]);

  useEffect(() => {
    localStorage.setItem('verbum_parallel_mode', parallelMode.toString());
  }, [parallelMode]);

  useEffect(() => {
    localStorage.setItem('verbum_secondary_version', secondaryVersion);
  }, [secondaryVersion]);

  useEffect(() => {
    localStorage.setItem('verbum_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Initial Load: Versions & Books
  useEffect(() => {
    const initApp = async () => {
      try {
        const [vers, bks] = await Promise.all([fetchVersions(), fetchBooks()]);
        setVersions(vers);
        setBooks(bks);

        const savedBookId = parseInt(localStorage.getItem('verbum_book_id') || '6', 10);
        const savedChapter = parseInt(localStorage.getItem('verbum_chapter') || '15', 10);
        const savedVersion = localStorage.getItem('verbum_version') || 'rv1909';

        const initialBook = bks.find((b) => b.id === savedBookId) || bks[0] || null;
        setCurrentBook(initialBook);
        setCurrentChapter(savedChapter);
        setCurrentVersion(savedVersion);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    initApp();
  }, []);

  // Load Primary Chapter Verses
  useEffect(() => {
    if (!currentBook) return;

    localStorage.setItem('verbum_book_id', currentBook.id.toString());
    localStorage.setItem('verbum_chapter', currentChapter.toString());
    localStorage.setItem('verbum_version', currentVersion);

    fetchChapter(currentVersion, currentBook.id, currentChapter)
      .then((data) => setVerses(data))
      .catch((err) => console.error('Failed to load primary chapter:', err));
  }, [currentBook, currentChapter, currentVersion]);

  // Load Parallel Secondary Verses when Parallel Mode is Active
  useEffect(() => {
    if (!currentBook || !parallelMode) {
      setParallelVerses([]);
      return;
    }

    fetchChapter(secondaryVersion, currentBook.id, currentChapter)
      .then((data) => setParallelVerses(data))
      .catch((err) => console.error('Failed to load parallel chapter:', err));
  }, [currentBook, currentChapter, secondaryVersion, parallelMode]);

  // Global Keyboard Shortcuts (Ctrl+K, J, K, P, ←, →, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      // Command Palette (Ctrl+K or Ctrl+F)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Parallel Mode Shortcut (P)
      if (e.key.toLowerCase() === 'p' && !isInputActive && !e.ctrlKey && !e.metaKey && activeView === 'reader') {
        e.preventDefault();
        setParallelMode((prev) => !prev);
        return;
      }

      // Chapter navigation (Alt+Arrow or Arrow when not in input)
      if (e.altKey && e.key === 'ArrowLeft' && activeView === 'reader') {
        e.preventDefault();
        handleNavigateChapter(-1);
      } else if (e.altKey && e.key === 'ArrowRight' && activeView === 'reader') {
        e.preventDefault();
        handleNavigateChapter(1);
      }

      // Verse focus navigation (J: next verse, K: previous verse)
      if (!isInputActive && activeView === 'reader') {
        if (e.key.toLowerCase() === 'j') {
          e.preventDefault();
          setSelectedVerse((prev) => {
            const current = prev || 1;
            const next = Math.min(verses.length || 1, current + 1);
            setTargetVerseToScroll(next);
            return next;
          });
        } else if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setSelectedVerse((prev) => {
            const current = prev || 1;
            const next = Math.max(1, current - 1);
            setTargetVerseToScroll(next);
            return next;
          });
        }
      }

      // Escape key to close modals
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isBookPickerOpen) setIsBookPickerOpen(false);
        if (compareVerseNum !== null) setCompareVerseNum(null);
        if (activeConceptSlug !== null) setActiveConceptSlug(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isCommandPaletteOpen, isBookPickerOpen, compareVerseNum, activeConceptSlug, verses.length]);

  const handleNavigateChapter = useCallback(
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

  const handleSelectPassage = (book: Book, chapter: number, verse?: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    setSelectedVerse(verse || 1);
    setTargetVerseToScroll(verse || 1);
    setIsBookPickerOpen(false);
    setIsCommandPaletteOpen(false);
    setActiveView('reader');
  };

  const handleToggleBookmark = (verseNum: number) => {
    setBookmarks((prev) =>
      prev.includes(verseNum) ? prev.filter((v) => v !== verseNum) : [...prev, verseNum]
    );
  };

  const handleGoHome = () => {
    setActiveView('reader');
    setSelectedVerse(1);
    setTargetVerseToScroll(1);
    setIsCommandPaletteOpen(false);
    setIsBookPickerOpen(false);
    setActiveConceptSlug(null);
    setCompareVerseNum(null);
  };

  const primaryVersionObj = versions.find((v) => v.id === currentVersion);
  const secondaryVersionObj = versions.find((v) => v.id === secondaryVersion);

  return (
    <div className="app-container">
      {/* Top Header (Collapsible in Zen Mode) */}
      {!hideTopBar && (
        <Header
          currentBook={currentBook}
          currentChapter={currentChapter}
          currentVersion={currentVersion}
          versions={versions}
          onOpenBookPicker={() => setIsBookPickerOpen(true)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onSelectVersion={setCurrentVersion}
          parallelMode={parallelMode}
          onToggleParallelMode={() => setParallelMode((prev) => !prev)}
          secondaryVersion={secondaryVersion}
          onSelectSecondaryVersion={setSecondaryVersion}
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          fontFamily={fontFamily}
          onChangeFontFamily={setFontFamily}
          lineHeightPreset={lineHeightPreset}
          onChangeLineHeight={setLineHeightPreset}
          maxWidthPreset={maxWidthPreset}
          onChangeMaxWidth={setMaxWidthPreset}
          onGoHome={handleGoHome}
        />
      )}

      {/* Body with Collapsible Sidebar & Main Content */}
      <div className="app-body-layout">
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
          activeView={activeView}
          onSelectView={(view) => setActiveView(view)}
          onTriggerSearch={() => setIsCommandPaletteOpen(true)}
          hideTopBar={hideTopBar}
          onToggleHideTopBar={() => setHideTopBar((prev) => !prev)}
        />

        <main className="app-main-viewport">
          {/* Floating Quick Bar when TopBar is Hidden in Reader Mode */}
          {hideTopBar && activeView === 'reader' && (
            <div className="floating-zen-bar">
              <button
                className="floating-zen-passage"
                onClick={() => setIsBookPickerOpen(true)}
                title="Cambiar libro o capítulo"
              >
                <BookOpen size={14} />
                <span>{currentBook ? `${currentBook.name_es} ${currentChapter}` : ''}</span>
              </button>

              <button
                className={`icon-btn ${parallelMode ? 'active-icon-btn' : ''}`}
                onClick={() => setParallelMode((prev) => !prev)}
                title="Alternar Vista Paralela (Atajo: P)"
              >
                <Columns2 size={14} />
              </button>

              <button
                className="icon-btn"
                onClick={() => setIsCommandPaletteOpen(true)}
                title="Buscar en la Biblia (Ctrl+K)"
              >
                <Search size={14} />
              </button>

              <button
                className="icon-btn"
                onClick={() => setHideTopBar(false)}
                title="Restaurar barra superior"
              >
                <PanelTopOpen size={15} />
              </button>
            </div>
          )}

          {activeView === 'reader' && (
            <BibleReader
              currentBook={currentBook}
              currentChapter={currentChapter}
              currentVersion={currentVersion}
              versionShortName={primaryVersionObj?.short_name || 'RV1909'}
              verses={verses}
              parallelVerses={parallelVerses}
              secondaryVersionShortName={secondaryVersionObj?.short_name || 'KJV'}
              parallelMode={parallelMode}
              fontSize={fontSize}
              fontFamily={fontFamily}
              lineHeightPreset={lineHeightPreset}
              maxWidthPreset={maxWidthPreset}
              selectedVerse={selectedVerse}
              onSelectVerse={setSelectedVerse}
              bookmarks={bookmarks}
              onToggleBookmark={handleToggleBookmark}
              onSelectConcept={(slug) => setActiveConceptSlug(slug)}
              onCompareVerse={(vNum) => setCompareVerseNum(vNum)}
              onSearchWord={() => {
                setIsCommandPaletteOpen(true);
              }}
              onNavigateChapter={handleNavigateChapter}
              targetVerseToScroll={targetVerseToScroll}
            />
          )}

          {activeView === 'study' && (
            <StudyCatalogView
              onSelectConcept={(slug) => setActiveConceptSlug(slug)}
              onNavigateToPassage={(bookId, chapter) => {
                const b = books.find((x) => x.id === bookId);
                if (b) handleSelectPassage(b, chapter, 1);
              }}
            />
          )}

          {activeView === 'settings' && (
            <SettingsView
              theme={theme}
              onSelectTheme={setTheme}
              fontSize={fontSize}
              onChangeFontSize={setFontSize}
              versions={versions}
              currentVersion={currentVersion}
              onSelectDefaultVersion={setCurrentVersion}
              hideTopBar={hideTopBar}
              onToggleHideTopBar={() => setHideTopBar((prev) => !prev)}
            />
          )}
        </main>
      </div>

      {/* Slide-over Study Drawer */}
      <StudyDrawer
        slug={activeConceptSlug}
        onClose={() => setActiveConceptSlug(null)}
      />

      {/* Raycast-style Super Command Palette (Ctrl+K & Ctrl+F) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        books={books}
        versions={versions}
        currentVersion={currentVersion}
        onSelectPassage={handleSelectPassage}
        onSelectConcept={(slug) => setActiveConceptSlug(slug)}
        onToggleParallel={() => setParallelMode((prev) => !prev)}
        onSelectTheme={setTheme}
        onOpenSettings={() => setActiveView('settings')}
        onOpenStudyCatalog={() => setActiveView('study')}
      />

      {/* Book & Chapter Navigation Picker */}
      <BookPickerModal
        isOpen={isBookPickerOpen}
        books={books}
        currentBook={currentBook}
        currentChapter={currentChapter}
        onSelectPassage={(book, chapter) => handleSelectPassage(book, chapter, 1)}
        onClose={() => setIsBookPickerOpen(false)}
      />

      {/* Verse Comparison Modal */}
      <VerseCompareModal
        isOpen={compareVerseNum !== null}
        onClose={() => setCompareVerseNum(null)}
        book={currentBook}
        chapter={currentChapter}
        verseNum={compareVerseNum || 1}
        versions={versions}
      />
    </div>
  );
}

export default App;
