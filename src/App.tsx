import { useState, useEffect, useCallback } from 'react';
import {
  BibleVersion,
  Book,
  VerseWithStudy,
  AppTheme,
  ScriptureFont,
  LineHeightPreset,
  MaxWidthPreset,
  SelectionStudyRequest,
  StudyExegesisResult,
  AIProviderConfig,
} from './types';
import { fetchVersions, fetchBooks, fetchChapter } from './services/bibleService';
import { Header } from './components/Header';
import { Sidebar, AppView } from './components/Sidebar';
import { BibleReader } from './components/BibleReader';
import { SettingsView } from './components/SettingsView';
import { StudyCatalogView } from './components/StudyCatalogView';
import { DeepStudyView } from './components/DeepStudyView';
import { CommandPalette } from './components/CommandPalette';
import { StudyDrawer } from './components/StudyDrawer';
import { TextSelectionToolbar } from './components/TextSelectionToolbar';
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

  // Parallel Mode State (Two Column Reader)
  const [parallelMode, setParallelMode] = useState<boolean>(() => {
    return localStorage.getItem('verbum_parallel_mode') === 'true';
  });
  const [secondaryVersion, setSecondaryVersion] = useState<string>(() => {
    return localStorage.getItem('verbum_secondary_version') || 'kjv';
  });
  const [parallelVerses, setParallelVerses] = useState<VerseWithStudy[]>([]);

  // Navigation & View State
  const [activeView, setActiveView] = useState<AppView>('reader');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    return localStorage.getItem('verbum_sidebar_expanded') === 'true';
  });
  const [hideTopBar, setHideTopBar] = useState<boolean>(() => {
    return localStorage.getItem('verbum_hide_topbar') === 'true';
  });

  // Search language filter (empty array = all languages)
  const [searchLanguages, setSearchLanguages] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('verbum_search_languages') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const handleChangeSearchLanguages = (langs: string[]) => {
    setSearchLanguages(langs);
    localStorage.setItem('verbum_search_languages', JSON.stringify(langs));
  };

  // Concept Drawer & Modals
  const [activeConceptSlug, setActiveConceptSlug] = useState<string | null>(null);
  const [isBookPickerOpen, setIsBookPickerOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isVersionLibraryOpen, setIsVersionLibraryOpen] = useState<boolean>(false);
  const [versionLibraryTarget, setVersionLibraryTarget] = useState<'primary' | 'secondary'>('primary');
  const [compareVerseNum, setCompareVerseNum] = useState<number | null>(null);

  const handleOpenVersionLibrary = (target: 'primary' | 'secondary' = 'primary') => {
    setVersionLibraryTarget(target);
    setIsVersionLibraryOpen(true);
  };

  // AI & Deep Study State
  const [activeAIRequest, setActiveAIRequest] = useState<SelectionStudyRequest | null>(null);
  const [deepStudyResult, setDeepStudyResult] = useState<StudyExegesisResult | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(1);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('verbum_bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  // AI Config
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem('verbum_ai_config');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {
      provider_type: 'gemini',
      ollama_endpoint: 'http://localhost:11434',
      model_name: 'gemini-1.5-flash',
      confirm_before_send: true,
      local_only_privacy: false,
    };
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
    const isDark = theme !== 'white' && theme !== 'sepia' && theme !== 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', isDark);
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

  const handleSelectPassage = useCallback((book: Book, chapter: number, verse?: number) => {
    setCurrentBook(book);
    setCurrentChapter(chapter);
    setSelectedVerse(verse || 1);
    setTargetVerseToScroll(verse || 1);
    setIsBookPickerOpen(false);
    setIsCommandPaletteOpen(false);
    setActiveView('reader');
  }, []);

  const handleToggleBookmark = useCallback((verseNum: number) => {
    setBookmarks((prev) =>
      prev.includes(verseNum) ? prev.filter((v) => v !== verseNum) : [...prev, verseNum]
    );
  }, []);

  const handleProfundizarAI = useCallback(
    (selectedText: string, verseNum: number) => {
      if (!currentBook) return;
      const req: SelectionStudyRequest = {
        selected_text: selectedText,
        book_id: currentBook.id,
        book_name: currentBook.name_es,
        chapter: currentChapter,
        start_verse: verseNum,
        end_verse: verseNum,
        version_id: currentVersion,
        depth: 'quick',
      };
      setActiveConceptSlug(null);
      setActiveAIRequest(req);
    },
    [currentBook, currentChapter, currentVersion]
  );

  const handleOpenDeepStudy = useCallback((result: StudyExegesisResult) => {
    setDeepStudyResult(result);
    setActiveView('deep-study');
  }, []);

  const handleNavigateToPassage = useCallback(
    (bookName: string, chapter: number, verse: number) => {
      const targetBook = books.find(
        (b) =>
          b.name_es.toLowerCase() === bookName.toLowerCase() ||
          b.name_en.toLowerCase() === bookName.toLowerCase()
      );
      if (targetBook) {
        handleSelectPassage(targetBook, chapter, verse);
        setActiveConceptSlug(null);
        setActiveAIRequest(null);
      }
    },
    [books, handleSelectPassage]
  );

  const handleSelectConcept = useCallback((slug: string) => {
    setActiveAIRequest(null);
    setActiveConceptSlug(slug);
  }, []);

  const handleCompareVerse = useCallback((vNum: number) => {
    setCompareVerseNum(vNum);
  }, []);

  const handleSearchWord = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const handleGoHome = useCallback(() => {
    setActiveView('reader');
    setSelectedVerse(1);
    setTargetVerseToScroll(1);
    setIsCommandPaletteOpen(false);
    setIsBookPickerOpen(false);
    setActiveConceptSlug(null);
    setActiveAIRequest(null);
    setCompareVerseNum(null);
  }, []);

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
        if (isVersionLibraryOpen) setIsVersionLibraryOpen(false);
        if (compareVerseNum !== null) setCompareVerseNum(null);
        if (activeConceptSlug !== null) setActiveConceptSlug(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isCommandPaletteOpen, isBookPickerOpen, isVersionLibraryOpen, compareVerseNum, activeConceptSlug, verses.length, handleNavigateChapter]);

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
          theme={theme}
          onSelectTheme={setTheme}
          isVersionPopoverOpen={isVersionLibraryOpen}
          onCloseVersionPopover={() => setIsVersionLibraryOpen(false)}
          versionPopoverTarget={versionLibraryTarget}
          onOpenVersionPopover={handleOpenVersionLibrary}
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
              onSelectConcept={handleSelectConcept}
              onCompareVerse={handleCompareVerse}
              onSearchWord={handleSearchWord}
              onNavigateChapter={handleNavigateChapter}
              targetVerseToScroll={targetVerseToScroll}
              onOpenVersionLibrary={handleOpenVersionLibrary}
            />
          )}

          {activeView === 'study' && (
            <StudyCatalogView
              onSelectConcept={handleSelectConcept}
              onNavigateToPassage={(bookId, chapter) => {
                const b = books.find((x) => x.id === bookId);
                if (b) handleSelectPassage(b, chapter, 1);
              }}
            />
          )}

          {activeView === 'deep-study' && deepStudyResult && (
            <DeepStudyView
              initialResult={deepStudyResult}
              aiRequest={activeAIRequest}
              aiConfig={aiConfig}
              onBackToReader={() => setActiveView('reader')}
              onNavigateToPassage={handleNavigateToPassage}
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
              aiConfig={aiConfig}
              onUpdateAIConfig={setAiConfig}
              searchLanguages={searchLanguages}
              onChangeSearchLanguages={handleChangeSearchLanguages}
            />
          )}
        </main>
      </div>

      {/* Slide-over Study Drawer */}
      <StudyDrawer
        slug={activeConceptSlug}
        aiRequest={activeAIRequest}
        aiConfig={aiConfig}
        onClose={() => {
          setActiveConceptSlug(null);
          setActiveAIRequest(null);
        }}
        onOpenDeepStudy={handleOpenDeepStudy}
        onNavigateToPassage={handleNavigateToPassage}
      />

      {/* Raycast-style Super Command Palette (Ctrl+K & Ctrl+F) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        books={books}
        versions={versions}
        currentVersion={currentVersion}
        searchLanguages={searchLanguages}
        onSelectPassage={handleSelectPassage}
        onSelectConcept={handleSelectConcept}
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

      {/* Root-level Floating Context Selection Toolbar */}
      {activeView === 'reader' && (
        <TextSelectionToolbar
          onProfundizarAI={handleProfundizarAI}
          onSearchSelection={handleSearchWord}
          onCompareVerse={handleCompareVerse}
          bookName={currentBook?.name_es || ''}
          chapter={currentChapter}
        />
      )}
    </div>
  );
}

export default App;
