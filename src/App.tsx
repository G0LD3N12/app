import { useState, useEffect, useCallback } from 'react';
import {
  BibleVersion,
  Book,
  SelectionStudyRequest,
  StudyExegesisResult,
  AIProviderConfig,
} from './types';
import { fetchVersions, fetchBooks, checkOllamaModelStatus } from './services/bibleService';
import { Header } from './components/Header';
import { Sidebar, AppView } from './components/Sidebar';
import { BibleReader } from './components/BibleReader';
import { SettingsView } from './components/SettingsView';
import { StudyCatalogView } from './components/StudyCatalogView';
import { DeepStudyView } from './components/DeepStudyView';
import { CommandPalette } from './components/CommandPalette';
import { StudyDrawer } from './components/StudyDrawer';
import { TextSelectionToolbar } from './components/TextSelectionToolbar';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { BookPickerModal } from './components/BookPickerModal';
import { VerseCompareModal } from './components/VerseCompareModal';
import { ToastHost } from './components/ToastHost';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { useAudioManager } from './context/AudioManagerContext';
import { usePersistentBoolean } from './hooks/usePersistentBoolean';
import { useReaderPreferences } from './hooks/useReaderPreferences';
import { useBookmarks } from './hooks/useBookmarks';
import { usePassageNavigation } from './hooks/usePassageNavigation';
import { BookOpen, Search, PanelTopOpen, Columns2 } from 'lucide-react';

export function App() {
  const [versions, setVersions] = useState<BibleVersion[]>([]);
  const [books, setBooks] = useState<Book[]>([]);

  // Parallel Mode State (Two Column Reader)
  const [parallelMode, setParallelMode] = usePersistentBoolean('verbum_parallel_mode');
  const [secondaryVersion, setSecondaryVersion] = useState<string>(() => {
    return localStorage.getItem('verbum_secondary_version') || 'kjv';
  });

  // Navigation & View State
  const [activeView, setActiveView] = useState<AppView>('reader');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = usePersistentBoolean('verbum_sidebar_expanded');
  const [hideTopBar, setHideTopBar] = usePersistentBoolean('verbum_hide_topbar');

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
  const [paletteSeed, setPaletteSeed] = useState<string>('');
  const [isVersionLibraryOpen, setIsVersionLibraryOpen] = useState<boolean>(false);
  const [versionLibraryTarget, setVersionLibraryTarget] = useState<'primary' | 'secondary'>('primary');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [compareVerseNum, setCompareVerseNum] = useState<number | null>(null);

  const { playbackState, pause, resume, playChapter, queue } = useAudioManager();

  const handleOpenVersionLibrary = (target: 'primary' | 'secondary' = 'primary') => {
    setVersionLibraryTarget(target);
    setIsVersionLibraryOpen(true);
  };

  // AI & Deep Study State
  const [activeAIRequest, setActiveAIRequest] = useState<SelectionStudyRequest | null>(null);
  const [deepStudyResult, setDeepStudyResult] = useState<StudyExegesisResult | null>(null);

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

  useEffect(() => {
    localStorage.setItem('verbum_ai_config', JSON.stringify(aiConfig));
  }, [aiConfig]);

  // A previously configured local model should be ready without requiring a
  // trip back to Settings. The native status check restarts installed Ollama
  // daemons and re-discovers their persistent model store.
  useEffect(() => {
    if (aiConfig.provider_type === 'ollama') {
      const startupCheck = window.setTimeout(() => {
        void checkOllamaModelStatus(
          aiConfig.ollama_endpoint,
          aiConfig.model_name || 'qwen2.5:3b'
        );
      }, 350);
      return () => window.clearTimeout(startupCheck);
    }
  }, [aiConfig.provider_type, aiConfig.ollama_endpoint, aiConfig.model_name]);

  // Reader appearance (theme + typography), persisted
  const {
    theme,
    setTheme,
    themePreference,
    useSystemTheme,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    lineHeightPreset,
    setLineHeightPreset,
    maxWidthPreset,
    setMaxWidthPreset,
  } = useReaderPreferences();

  // Current passage, chapter loading (primary + parallel), pre-warming
  // and reading focus (selected verse / scroll target)
  const {
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
    isLoading,
  } = usePassageNavigation(books, parallelMode, secondaryVersion);

  // Bookmarks scoped to the chapter currently open
  const { bookmarkedVerses, toggleBookmark } = useBookmarks(currentBook, currentChapter);

  useEffect(() => {
    localStorage.setItem('verbum_secondary_version', secondaryVersion);
  }, [secondaryVersion]);

  // Initial Load: Versions & Books
  useEffect(() => {
    const initApp = async () => {
      try {
        const [vers, bks] = await Promise.all([fetchVersions(), fetchBooks()]);
        setVersions(vers);
        setBooks(bks);
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    initApp();
  }, []);

  const handleSelectPassage = useCallback(
    (book: Book, chapter: number, verse?: number) => {
      selectPassage(book, chapter, verse);
      setIsBookPickerOpen(false);
      setIsCommandPaletteOpen(false);
      setActiveView('reader');
    },
    [selectPassage]
  );

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

  // Single entry point for opening the palette: accepts an optional seed so
  // the searched word (from a verse or a text selection) arrives pre-typed.
  // Guard against onClick handlers leaking their MouseEvent as the argument
  const openCommandPalette = useCallback((seed?: string) => {
    setPaletteSeed(typeof seed === 'string' ? seed : '');
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
  }, [setSelectedVerse]);

  // Global Keyboard Shortcuts (Ctrl+K, J, K, P, ←, →, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInputActive = activeTag === 'input' || activeTag === 'textarea';

      // Settings is a modal workspace over the current page. While it is
      // open, background reader/navigation shortcuts must stay inert.
      if (isSettingsOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsSettingsOpen(false);
        }
        return;
      }

      // Command Palette (Ctrl+K or Ctrl+F)
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Zen Mode Shortcut (Z)
      if (e.key.toLowerCase() === 'z' && !isInputActive && !e.ctrlKey && !e.metaKey && !e.altKey && activeView === 'reader') {
        e.preventDefault();
        setHideTopBar((prev) => !prev);
        return;
      }

      // Toggle sidebar shortcut (Ctrl+B / Cmd+B)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !isInputActive) {
        e.preventDefault();
        setIsSidebarExpanded((prev) => !prev);
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
        navigateChapter(-1);
      } else if (e.altKey && e.key === 'ArrowRight' && activeView === 'reader') {
        e.preventDefault();
        navigateChapter(1);
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

      // Shortcuts Help Modal (?)
      if (e.key === '?' && !isInputActive && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Quick Search (/)
      if (e.key === '/' && !isInputActive && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        openCommandPalette();
        return;
      }

      // Toggle Bookmark (B)
      if (e.key.toLowerCase() === 'b' && !isInputActive && !e.ctrlKey && !e.metaKey && !e.altKey && activeView === 'reader') {
        e.preventDefault();
        toggleBookmark(selectedVerse || 1);
        return;
      }

      // Toggle Audio Play/Pause (Space) in reader
      if (e.key === ' ' && !isInputActive && activeView === 'reader') {
        e.preventDefault();
        if (playbackState === 'playing') {
          pause();
        } else if (playbackState === 'paused') {
          resume();
        } else if (currentBook && verses.length > 0) {
          playChapter(
            verses.map((v) => ({ verseNumber: v.verse, text: v.text })),
            currentBook.id,
            currentBook.name_es,
            currentChapter,
            currentVersion,
            selectedVerse || 1
          );
        }
        return;
      }

      // Escape key to close modals
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        if (isCommandPaletteOpen) setIsCommandPaletteOpen(false);
        if (isBookPickerOpen) setIsBookPickerOpen(false);
        if (isVersionLibraryOpen) setIsVersionLibraryOpen(false);
        if (compareVerseNum !== null) setCompareVerseNum(null);
        if (activeConceptSlug !== null) setActiveConceptSlug(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, isSettingsOpen, isShortcutsModalOpen, isCommandPaletteOpen, isBookPickerOpen, isVersionLibraryOpen, compareVerseNum, activeConceptSlug, verses, currentBook, currentChapter, currentVersion, playbackState, queue, navigateChapter, openCommandPalette, setHideTopBar, setIsSidebarExpanded, setParallelMode, setSelectedVerse, toggleBookmark, pause, resume, playChapter]);

  const primaryVersionObj = versions.find((v) => v.id === currentVersion);
  const secondaryVersionObj = versions.find((v) => v.id === secondaryVersion);

  return (
    <div className="app-container">
      <div className="app-atmosphere" aria-hidden="true" />

      {/* Top Header (Collapsible in Zen Mode) */}
      {!hideTopBar && (
        <Header
          currentBook={currentBook}
          currentChapter={currentChapter}
          currentVersion={currentVersion}
          versions={versions}
          onOpenBookPicker={() => setIsBookPickerOpen(true)}
          onOpenCommandPalette={openCommandPalette}
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
          theme={theme}
          onSelectTheme={setTheme}
          isVersionPopoverOpen={isVersionLibraryOpen}
          onCloseVersionPopover={() => setIsVersionLibraryOpen(false)}
          versionPopoverTarget={versionLibraryTarget}
          onOpenVersionPopover={handleOpenVersionLibrary}
        />
      )}

      {/* Body with Collapsible Sidebar & Main Content */}
      <div className={`app-body-layout ${hideTopBar ? 'zen-mode' : ''}`}>
        <Sidebar
          isExpanded={isSidebarExpanded}
          onToggleExpand={() => setIsSidebarExpanded((prev) => !prev)}
          activeView={activeView}
          onSelectView={(view) => setActiveView(view)}
          isSettingsOpen={isSettingsOpen}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onTriggerSearch={openCommandPalette}
          hideTopBar={hideTopBar}
          onToggleHideTopBar={() => setHideTopBar((prev) => !prev)}
          onGoHome={handleGoHome}
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
                onClick={() => openCommandPalette()}
                title="Buscar en la Biblia (Ctrl+K)"
              >
                <Search size={14} />
              </button>

              <button
                className="icon-btn"
                onClick={() => setHideTopBar(false)}
                title="Salir del Modo Zen (Atajo: Z)"
              >
                <PanelTopOpen size={15} />
              </button>
            </div>
          )}

          {activeView === 'reader' && (
            <BibleReader
              currentBook={currentBook}
              currentChapter={currentChapter}
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
              bookmarkedVerses={bookmarkedVerses}
              onSelectConcept={handleSelectConcept}
              onNavigateChapter={navigateChapter}
              targetVerseToScroll={targetVerseToScroll}
              onOpenVersionLibrary={handleOpenVersionLibrary}
              isLoading={isLoading}
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

        </main>
      </div>

      <SettingsView
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        themePreference={themePreference}
        onSelectTheme={setTheme}
        onSelectSystemTheme={useSystemTheme}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        fontFamily={fontFamily}
        onChangeFontFamily={setFontFamily}
        lineHeightPreset={lineHeightPreset}
        onChangeLineHeight={setLineHeightPreset}
        maxWidthPreset={maxWidthPreset}
        onChangeMaxWidth={setMaxWidthPreset}
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
        initialQuery={paletteSeed}
        books={books}
        versions={versions}
        currentVersion={currentVersion}
        searchLanguages={searchLanguages}
        onSelectPassage={handleSelectPassage}
        onSelectConcept={handleSelectConcept}
        onToggleParallel={() => setParallelMode((prev) => !prev)}
        onSelectTheme={setTheme}
        onOpenSettings={() => {
          setIsCommandPaletteOpen(false);
          setIsSettingsOpen(true);
        }}
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
          onSearchSelection={openCommandPalette}
          onCompareVerse={handleCompareVerse}
          onToggleBookmark={toggleBookmark}
          bookmarkedVerses={bookmarkedVerses}
          bookName={currentBook?.name_es || ''}
          chapter={currentChapter}
        />
      )}

      {/* Global audio player: mounted at the root so `position: fixed` keeps
          it pinned to the bottom of the window in every view and scroll state */}
      <AudioPlayerBar />
      {/* Keyboard Shortcuts Cheatsheet Modal (?) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <ToastHost />
    </div>
  );
}

export default App;
