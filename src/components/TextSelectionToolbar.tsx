import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Copy, Search, SplitSquareVertical, Volume2, Bookmark } from 'lucide-react';
import { useAudioManager } from '../context/AudioManagerContext';
import { showToast } from './ToastHost';

interface TextSelectionToolbarProps {
  onProfundizarAI: (selectedText: string, verseNum: number) => void;
  onSearchSelection: (selectedText: string) => void;
  onCompareVerse: (verseNum: number) => void;
  onToggleBookmark: (verseNum: number) => void;
  bookmarkedVerses: Set<number>;
  bookName: string;
  chapter: number;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  onProfundizarAI,
  onSearchSelection,
  onCompareVerse,
  onToggleBookmark,
  bookmarkedVerses,
  bookName,
  chapter,
}) => {
  const { playSelection } = useAudioManager();
  const [position, setPosition] = useState<{ x: number; y: number; isBelow: boolean } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [sourceVerseNum, setSourceVerseNum] = useState<number>(1);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const checkSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setPosition(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 2) {
      setPosition(null);
      setSelectedText('');
      return;
    }

    // Check if selection is within the reader viewport
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container instanceof HTMLElement ? container : container.parentElement;
    
    if (!element || !element.closest('.reader-viewport')) {
      setPosition(null);
      setSelectedText('');
      return;
    }

    // Resolve source verse number from closest verse row
    const verseRow = element.closest('.verse-row-editorial');
    let vNum = 1;
    if (verseRow) {
      const parsed = parseInt(verseRow.id.replace('verse-', ''), 10);
      if (!isNaN(parsed) && parsed > 0) vNum = parsed;
    }

    setSourceVerseNum(vNum);
    setSelectedText(text);

    // Compute bounding rect in viewport coordinates
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPosition(null);
      return;
    }

    // Determine safe position
    const isBelow = rect.top < 70; // If too close to top bar, place below selection
    const targetY = isBelow ? rect.bottom + 10 : rect.top - 10;
    const clampedX = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));

    setPosition({
      x: clampedX,
      y: targetY,
      isBelow,
    });
  }, []);

  const handleDelayedCheck = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(checkSelection, 40);
  }, [checkSelection]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleDelayedCheck);
    document.addEventListener('mouseup', handleDelayedCheck);
    document.addEventListener('touchend', handleDelayedCheck);
    document.addEventListener('keyup', handleDelayedCheck);

    // Hide toolbar when scrolling reader viewport — passive, no layout block
    const handleScroll = () => handleDelayedCheck();
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true } as any);

    return () => {
      document.removeEventListener('selectionchange', handleDelayedCheck);
      document.removeEventListener('mouseup', handleDelayedCheck);
      document.removeEventListener('touchend', handleDelayedCheck);
      document.removeEventListener('keyup', handleDelayedCheck);
      window.removeEventListener('scroll', handleScroll, true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [handleDelayedCheck]);

  if (!position || !selectedText) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const quote = `«${selectedText}» — ${bookName} ${chapter}:${sourceVerseNum}`;
    navigator.clipboard.writeText(quote).catch(() => showToast('No se pudo copiar'));
    showToast(`Copiado ${bookName} ${chapter}:${sourceVerseNum}`);
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleBookmark(sourceVerseNum);
    const willBookmark = !bookmarkedVerses.has(sourceVerseNum);
    showToast(willBookmark ? `Marcador en ${bookName} ${chapter}:${sourceVerseNum}` : 'Marcador quitado');
  };

  const handleListen = (e: React.MouseEvent) => {
    e.stopPropagation();
    playSelection(selectedText, `${bookName} ${chapter}:${sourceVerseNum}`);
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProfundizarAI(selectedText, sourceVerseNum);
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSearchSelection(selectedText);
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCompareVerse(sourceVerseNum);
    window.getSelection()?.removeAllRanges();
    setPosition(null);
  };

  return (
    <div
      ref={toolbarRef}
      className="text-selection-toolbar"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: position.isBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button className="selection-tool-btn" onClick={handleListen} title="Escuchar texto seleccionado">
        <Volume2 size={13} />
        <span>Escuchar</span>
      </button>

      <button className="selection-tool-btn" onClick={handleCopy} title="Copiar selección">
        <Copy size={13} />
        <span>Copiar</span>
      </button>

      <button
        className={`selection-tool-btn ${bookmarkedVerses.has(sourceVerseNum) ? 'is-active' : ''}`}
        onClick={handleBookmark}
        title={bookmarkedVerses.has(sourceVerseNum) ? 'Quitar marcador' : 'Guardar marcador'}
      >
        <Bookmark size={13} fill={bookmarkedVerses.has(sourceVerseNum) ? 'currentColor' : 'none'} />
        <span>{bookmarkedVerses.has(sourceVerseNum) ? 'Guardado' : 'Marcar'}</span>
      </button>

      <button className="selection-tool-btn" onClick={handleSearch} title="Buscar en toda la Biblia">
        <Search size={13} />
        <span>Buscar</span>
      </button>

      <button className="selection-tool-btn" onClick={handleCompare} title="Comparar versículo en traducciones">
        <SplitSquareVertical size={13} />
        <span>Comparar</span>
      </button>

      <div className="selection-tool-divider" />

      <button className="selection-tool-btn highlight-ai" onClick={handleAI} title="Exégesis y análisis contextual con IA">
        <Sparkles size={14} className="sparkle-pulse" />
        <span>Profundizar con IA</span>
      </button>
    </div>
  );
};
