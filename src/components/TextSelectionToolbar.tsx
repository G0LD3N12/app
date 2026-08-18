import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Copy, Search, SplitSquareVertical, Check, Volume2 } from 'lucide-react';
import { useAudioManager } from '../context/AudioManagerContext';

interface TextSelectionToolbarProps {
  onProfundizarAI: (selectedText: string, verseNum: number) => void;
  onSearchSelection: (selectedText: string) => void;
  onCompareVerse: (verseNum: number) => void;
  bookName: string;
  chapter: number;
}

export const TextSelectionToolbar: React.FC<TextSelectionToolbarProps> = ({
  onProfundizarAI,
  onSearchSelection,
  onCompareVerse,
  bookName,
  chapter,
}) => {
  const { playSelection } = useAudioManager();
  const [position, setPosition] = useState<{ x: number; y: number; isBelow: boolean } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [sourceVerseNum, setSourceVerseNum] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
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

    // Hide toolbar when scrolling reader viewport
    const handleScroll = () => {
      if (position) handleDelayedCheck();
    };
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('selectionchange', handleDelayedCheck);
      document.removeEventListener('mouseup', handleDelayedCheck);
      document.removeEventListener('touchend', handleDelayedCheck);
      document.removeEventListener('keyup', handleDelayedCheck);
      window.removeEventListener('scroll', handleScroll, true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [handleDelayedCheck, position]);

  if (!position || !selectedText) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const quote = `«${selectedText}» — ${bookName} ${chapter}:${sourceVerseNum}`;
    navigator.clipboard.writeText(quote);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      window.getSelection()?.removeAllRanges();
      setPosition(null);
    }, 1200);
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
        {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
        <span>{copied ? 'Copiado' : 'Copiar'}</span>
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
