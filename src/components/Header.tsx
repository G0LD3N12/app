import React, { useState } from 'react';
import { Book, BibleVersion, ScriptureFont, LineHeightPreset, MaxWidthPreset } from '../types';
import { VerbumLogo } from './VerbumLogo';
import { VersionPickerPopover } from './VersionPickerPopover';
import { ReaderPreferencesPopover } from './ReaderPreferencesPopover';
import { Search, BookOpen, ChevronDown, Columns2, Sliders, Minus, Square, X } from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from '../services/bibleService';

interface HeaderProps {
  currentBook: Book | null;
  currentChapter: number;
  currentVersion: string;
  versions: BibleVersion[];
  onOpenBookPicker: () => void;
  onOpenCommandPalette: () => void;
  onSelectVersion: (versionId: string) => void;
  parallelMode: boolean;
  onToggleParallelMode: () => void;
  secondaryVersion: string;
  onSelectSecondaryVersion: (versionId: string) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  fontFamily: ScriptureFont;
  onChangeFontFamily: (font: ScriptureFont) => void;
  lineHeightPreset: LineHeightPreset;
  onChangeLineHeight: (preset: LineHeightPreset) => void;
  maxWidthPreset: MaxWidthPreset;
  onChangeMaxWidth: (preset: MaxWidthPreset) => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentBook,
  currentChapter,
  currentVersion,
  versions,
  onOpenBookPicker,
  onOpenCommandPalette,
  onSelectVersion,
  parallelMode,
  onToggleParallelMode,
  secondaryVersion,
  onSelectSecondaryVersion,
  fontSize,
  onChangeFontSize,
  fontFamily,
  onChangeFontFamily,
  lineHeightPreset,
  onChangeLineHeight,
  maxWidthPreset,
  onChangeMaxWidth,
  onGoHome,
}) => {
  const [isVersionPopoverOpen, setIsVersionPopoverOpen] = useState(false);
  const [isPrefPopoverOpen, setIsPrefPopoverOpen] = useState(false);

  const currentVerObj = versions.find((v) => v.id === currentVersion);
  const secondaryVerObj = versions.find((v) => v.id === secondaryVersion);

  return (
    <header
      className="app-header"
      data-tauri-drag-region
      onDoubleClick={(e) => {
        // Double click empty titlebar area to toggle maximize window
        if ((e.target as HTMLElement).classList.contains('app-header')) {
          toggleMaximizeWindow();
        }
      }}
    >
      {/* Left Segment: Brand & Passage Pill */}
      <div className="header-left no-drag">
        {/* Brand Home Shortcut */}
        <button
          className="app-brand"
          onClick={onGoHome}
          title="Ir a Lectura Principal (Inicio)"
        >
          <div className="app-brand-logo-container">
            <VerbumLogo size={22} />
          </div>
          <span className="app-brand-text">VERBUM</span>
        </button>

        <span className="header-subtle-divider" />

        {/* Passage Selector Pill */}
        <button className="nav-picker-btn" onClick={onOpenBookPicker} title="Cambiar libro o capítulo">
          <BookOpen size={14} />
          <span>
            {currentBook ? `${currentBook.name_es} ${currentChapter}` : 'Seleccionar pasaje'}
          </span>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Center Segment: Command Palette Pill (Raycast / Linear / Arc style) */}
      <div className="header-center no-drag" data-tauri-drag-region>
        <button
          className="search-trigger-btn"
          onClick={onOpenCommandPalette}
          title="Buscar en la Biblia, concepto o comando (Ctrl+K o Ctrl+F)"
        >
          <Search size={13} className="search-pill-icon" />
          <span className="search-pill-text">Buscar en la Biblia...</span>
          <span className="kbd-shortcut">Ctrl+K</span>
        </button>
      </div>

      {/* Right Segment: Translation Selector, Parallel, Prefs, Window Controls */}
      <div className="header-right no-drag">
        {/* Rich Version Selector Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className={`version-dropdown-btn ${parallelMode ? 'has-parallel' : ''}`}
            onClick={() => setIsVersionPopoverOpen((prev) => !prev)}
            title="Seleccionar traducción bíblica o configurar vista paralela"
          >
            <span className="version-primary-tag">{currentVerObj?.short_name || 'RV1909'}</span>
            {parallelMode && (
              <>
                <span className="version-parallel-sep">⇄</span>
                <span className="version-secondary-tag">{secondaryVerObj?.short_name || 'KJV'}</span>
              </>
            )}
            <ChevronDown size={11} />
          </button>

          <VersionPickerPopover
            isOpen={isVersionPopoverOpen}
            onClose={() => setIsVersionPopoverOpen(false)}
            versions={versions}
            currentVersion={currentVersion}
            onSelectVersion={onSelectVersion}
            parallelMode={parallelMode}
            onToggleParallelMode={onToggleParallelMode}
            secondaryVersion={secondaryVersion}
            onSelectSecondaryVersion={onSelectSecondaryVersion}
          />
        </div>

        {/* Parallel Mode Quick Toggle */}
        <button
          className={`icon-btn ${parallelMode ? 'active-icon-btn' : ''}`}
          onClick={onToggleParallelMode}
          title={parallelMode ? 'Desactivar vista paralela (Atajo: P)' : 'Activar vista paralela lado a lado (Atajo: P)'}
        >
          <Columns2 size={15} />
        </button>

        {/* Typography & Reading Preferences Popover Trigger */}
        <div style={{ position: 'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setIsPrefPopoverOpen((prev) => !prev)}
            title="Ajustes de tipografía, tamaño e interlineado"
          >
            <Sliders size={15} />
          </button>

          <ReaderPreferencesPopover
            isOpen={isPrefPopoverOpen}
            onClose={() => setIsPrefPopoverOpen(false)}
            fontFamily={fontFamily}
            onChangeFontFamily={onChangeFontFamily}
            fontSize={fontSize}
            onChangeFontSize={onChangeFontSize}
            lineHeightPreset={lineHeightPreset}
            onChangeLineHeight={onChangeLineHeight}
            maxWidthPreset={maxWidthPreset}
            onChangeMaxWidth={onChangeMaxWidth}
          />
        </div>

        {/* Integrated Window Controls (Native Titlebar Pill) */}
        <div className="win-controls-group">
          <button className="win-btn" onClick={minimizeWindow} title="Minimizar ventana">
            <Minus size={12} />
          </button>
          <button className="win-btn" onClick={toggleMaximizeWindow} title="Maximizar / Restaurar ventana">
            <Square size={10} />
          </button>
          <button className="win-btn close-btn" onClick={closeWindow} title="Cerrar aplicación">
            <X size={12} />
          </button>
        </div>
      </div>
    </header>
  );
};
