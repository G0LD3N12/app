import React, { useState } from 'react';
import { Book, BibleVersion, ScriptureFont, LineHeightPreset, MaxWidthPreset, AppTheme } from '../types';
import { VersionPickerPopover } from './VersionPickerPopover';
import { ReaderPreferencesPopover } from './ReaderPreferencesPopover';
import { Search, BookOpen, ChevronDown, Columns2, Sliders, Minus, Square, X, MoreHorizontal } from 'lucide-react';
import { minimizeWindow, toggleMaximizeWindow, closeWindow } from '../services/bibleService';
import { showWindowsSystemMenu, startWindowsDrag } from '../services/windowsService';
import { isWindowsPlatform } from '../utils/platform';
import { useWindowsCaptionState } from '../hooks/useWindowsCaptionState';

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
  theme?: AppTheme;
  onSelectTheme?: (theme: AppTheme) => void;
  isVersionPopoverOpen?: boolean;
  onCloseVersionPopover?: () => void;
  versionPopoverTarget?: 'primary' | 'secondary';
  onOpenVersionPopover?: (target: 'primary' | 'secondary') => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
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
  theme,
  onSelectTheme,
  isVersionPopoverOpen: controlledIsOpen,
  onCloseVersionPopover: controlledOnClose,
  versionPopoverTarget: controlledTarget,
  onOpenVersionPopover: controlledOnOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalTarget, setInternalTarget] = useState<'primary' | 'secondary'>('primary');
  const [isPrefPopoverOpen, setIsPrefPopoverOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const isWindows = isWindowsPlatform();
  const captionState = useWindowsCaptionState();

  const isPopoverOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const popoverTarget = controlledTarget !== undefined ? controlledTarget : internalTarget;

  const handleOpenPopover = (target: 'primary' | 'secondary' = 'primary') => {
    if (controlledOnOpen) {
      controlledOnOpen(target);
    } else {
      setInternalTarget(target);
      setInternalIsOpen(true);
    }
  };

  const handleClosePopover = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const currentVerObj = versions.find((v) => v.id === currentVersion);
  const secondaryVerObj = versions.find((v) => v.id === secondaryVersion);

  return (
    <header
      className={`app-header ${captionState.focused ? '' : 'window-inactive'}`}
      data-tauri-drag-region
      onMouseDown={(event) => {
        if (!isWindows || event.button !== 0 || event.detail !== 1) return;
        if ((event.target as HTMLElement).closest('button, input, a, [role="button"]')) return;
        void startWindowsDrag();
      }}
      onDoubleClick={(e) => {
        if (!(e.target as HTMLElement).closest('button, input, a, [role="button"]')) {
          toggleMaximizeWindow();
        }
      }}
      onContextMenu={(event) => {
        if ((event.target as HTMLElement).closest('button, input, a, [role="button"]')) return;
        if (isWindows) {
          event.preventDefault();
          void showWindowsSystemMenu(event.screenX, event.screenY);
        }
      }}
    >
      {/* Left Segment: Passage Selector Pill */}
      <div className="header-left" data-tauri-drag-region>
        <button className="nav-picker-btn" onClick={onOpenBookPicker} title="Cambiar libro o capítulo">
          <BookOpen size={14} />
          <span>
            {currentBook ? `${currentBook.name_es} ${currentChapter}` : 'Seleccionar pasaje'}
          </span>
          <ChevronDown size={12} />
        </button>
      </div>

      {/* Center Segment: Command Palette Pill (Raycast / Linear / Arc style) */}
      <div className="header-center" data-tauri-drag-region>
        <button
          className="search-trigger-btn"
          onClick={() => onOpenCommandPalette()}
          title="Buscar en la Biblia, concepto o comando (Ctrl+K o Ctrl+F)"
        >
          <Search size={13} className="search-pill-icon" />
          <span className="search-pill-text">Buscar en la Biblia...</span>
          <span className="kbd-shortcut">Ctrl+K</span>
        </button>
      </div>

      {/* Right Segment: Translation Selector, Parallel, Prefs, Window Controls */}
      <div className="header-right" data-tauri-drag-region>
        {/* Rich Version Selector Dropdown */}
        <div className="header-version-control" style={{ position: 'relative' }}>
          {!parallelMode ? (
            <button
              className="version-dropdown-btn"
              onClick={() => handleOpenPopover('primary')}
              title="Abrir biblioteca de traducciones"
            >
              <span className="version-primary-tag">{currentVerObj?.short_name || 'RV1909'}</span>
              <ChevronDown size={11} />
            </button>
          ) : (
            <div className="version-dropdown-split-btn">
              <button
                className="version-split-side primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPopover('primary');
                }}
                title="Cambiar traducción izquierda (Columna 1)"
              >
                <span>{currentVerObj?.short_name || 'RV1909'}</span>
              </button>

              <span className="version-parallel-sep">⇄</span>

              <button
                className="version-split-side secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPopover('secondary');
                }}
                title="Cambiar traducción derecha (Columna 2)"
              >
                <span>{secondaryVerObj?.short_name || 'KJV'}</span>
              </button>

              <button
                className="version-split-arrow"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenPopover('primary');
                }}
                title="Abrir biblioteca de traducciones"
              >
                <ChevronDown size={11} />
              </button>
            </div>
          )}

          <VersionPickerPopover
            isOpen={isPopoverOpen}
            onClose={handleClosePopover}
            versions={versions}
            targetColumn={popoverTarget}
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
          className={`icon-btn header-parallel-control ${parallelMode ? 'active-icon-btn' : ''}`}
          onClick={onToggleParallelMode}
          title={parallelMode ? 'Desactivar vista paralela (Atajo: P)' : 'Activar vista paralela lado a lado (Atajo: P)'}
        >
          <Columns2 size={15} />
        </button>

        {/* Typography & Reading Preferences Popover Trigger */}
        <div className="header-reading-control" style={{ position: 'relative' }}>
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
            theme={theme}
            onSelectTheme={onSelectTheme}
          />
        </div>

        <div className="header-overflow-control">
          <button
            className={`icon-btn ${isOverflowOpen ? 'active-icon-btn' : ''}`}
            onClick={() => setIsOverflowOpen((current) => !current)}
            title="Más comandos"
            aria-label="Más comandos de la barra superior"
            aria-expanded={isOverflowOpen}
          >
            <MoreHorizontal size={16} />
          </button>
          {isOverflowOpen && (
            <>
              <div className="popover-backdrop" onClick={() => setIsOverflowOpen(false)} />
              <div className="header-overflow-menu">
                <button
                  type="button"
                  onClick={() => {
                    setIsOverflowOpen(false);
                    handleOpenPopover('primary');
                  }}
                >
                  <BookOpen size={15} />
                  <span>Traducciones</span>
                  <small>{currentVerObj?.short_name || 'RV1909'}</small>
                </button>
                <button
                  type="button"
                  className={parallelMode ? 'active' : ''}
                  onClick={() => {
                    setIsOverflowOpen(false);
                    onToggleParallelMode();
                  }}
                >
                  <Columns2 size={15} />
                  <span>Vista paralela</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOverflowOpen(false);
                    setIsPrefPopoverOpen(true);
                  }}
                >
                  <Sliders size={15} />
                  <span>Lectura y tipografía</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Integrated Window Controls (Native Titlebar Pill) */}
        <div className="win-controls-group" aria-label="Controles de ventana">
          <button className="win-btn" onClick={minimizeWindow} title="Minimizar" aria-label="Minimizar ventana">
            {isWindows ? <span className="windows-caption-glyph">&#xE921;</span> : <Minus size={12} />}
          </button>
          <button
            className={`win-btn maximize-btn ${captionState.hovered === 'maximize' ? 'native-hover' : ''}`}
            onClick={toggleMaximizeWindow}
            aria-label={captionState.maximized ? 'Restaurar ventana' : 'Maximizar ventana'}
          >
            {isWindows ? (
              <span className="windows-caption-glyph">
                {captionState.maximized ? '\uE923' : '\uE922'}
              </span>
            ) : (
              <Square size={10} />
            )}
          </button>
          <button className="win-btn close-btn" onClick={closeWindow} title="Cerrar" aria-label="Cerrar aplicación">
            {isWindows ? <span className="windows-caption-glyph">&#xE8BB;</span> : <X size={12} />}
          </button>
        </div>
      </div>
    </header>
  );
});
