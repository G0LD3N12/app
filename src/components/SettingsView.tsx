import React, { useEffect, useRef, useState } from 'react';
import {
  AppTheme,
  BibleVersion,
  AIProviderConfig,
  ScriptureFont,
  LineHeightPreset,
  MaxWidthPreset,
} from '../types';
import { SettingsWindowSection } from './settings/SettingsWindowSection';
import { SettingsAISection } from './settings/SettingsAISection';
import { SettingsVoiceSection } from './settings/SettingsVoiceSection';
import { SettingsTypographySection } from './settings/SettingsTypographySection';
import { SettingsThemesSection } from './settings/SettingsThemesSection';
import { SettingsVersionsSection } from './settings/SettingsVersionsSection';
import { SettingsSearchSection } from './settings/SettingsSearchSection';
import { BookOpen, Palette, Sparkles, Type, Volume2, X } from 'lucide-react';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  fontFamily: ScriptureFont;
  onChangeFontFamily: (font: ScriptureFont) => void;
  lineHeightPreset?: LineHeightPreset;
  onChangeLineHeight?: (preset: LineHeightPreset) => void;
  maxWidthPreset?: MaxWidthPreset;
  onChangeMaxWidth?: (preset: MaxWidthPreset) => void;
  versions: BibleVersion[];
  currentVersion: string;
  onSelectDefaultVersion: (vId: string) => void;
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
  aiConfig: AIProviderConfig;
  onUpdateAIConfig: (cfg: AIProviderConfig) => void;
  searchLanguages: string[];
  onChangeSearchLanguages: (langs: string[]) => void;
}

type SettingsPanel = 'appearance' | 'reading' | 'voice' | 'ai' | 'library';

const PANELS = [
  { id: 'appearance', label: 'Apariencia', icon: Palette },
  { id: 'reading', label: 'Lectura', icon: Type },
  { id: 'voice', label: 'Audio', icon: Volume2 },
  { id: 'ai', label: 'Inteligencia', icon: Sparkles },
  { id: 'library', label: 'Biblioteca', icon: BookOpen },
] as const;

const PANEL_TITLES: Record<SettingsPanel, { title: string; subtitle: string }> = {
  appearance: { title: 'Apariencia', subtitle: 'Elige el carácter visual de Verbum.' },
  reading: { title: 'Lectura', subtitle: 'Ajusta el texto y elimina distracciones.' },
  voice: { title: 'Audio', subtitle: 'Configura una narración natural y continua.' },
  ai: { title: 'Inteligencia', subtitle: 'Elige cómo se generan los estudios.' },
  library: { title: 'Biblioteca', subtitle: 'Define tu edición e idiomas de búsqueda.' },
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  isOpen,
  onClose,
  theme,
  onSelectTheme,
  fontSize,
  onChangeFontSize,
  fontFamily,
  onChangeFontFamily,
  lineHeightPreset,
  onChangeLineHeight,
  maxWidthPreset,
  onChangeMaxWidth,
  versions,
  currentVersion,
  onSelectDefaultVersion,
  hideTopBar,
  onToggleHideTopBar,
  aiConfig,
  onUpdateAIConfig,
  searchLanguages,
  onChangeSearchLanguages,
}) => {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isEntered, setIsEntered] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [activePanel, setActivePanel] = useState<SettingsPanel>(() => {
    const saved = localStorage.getItem('verbum_settings_panel') as SettingsPanel | null;
    return PANELS.some((panel) => panel.id === saved) ? saved! : 'appearance';
  });

  useEffect(() => {
    let frame = 0;
    let focusTimer = 0;
    let unmountTimer = 0;

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setIsMounted(true);
      frame = window.requestAnimationFrame(() => setIsEntered(true));
      focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 80);
    } else {
      setIsEntered(false);
      unmountTimer = window.setTimeout(() => setIsMounted(false), 220);
      previousFocusRef.current?.focus();
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(focusTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [isOpen]);

  const selectPanel = (panel: SettingsPanel) => {
    setActivePanel(panel);
    localStorage.setItem('verbum_settings_panel', panel);
  };

  const heading = PANEL_TITLES[activePanel];

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isMounted) return null;

  return (
    <div
      className={`settings-overlay ${isEntered ? 'open' : 'closing'}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-hidden={!isOpen}
    >
      <section
        ref={dialogRef}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <button
          type="button"
          className="settings-close-button"
          onClick={onClose}
          aria-label="Cerrar ajustes"
          title="Cerrar (Esc)"
        >
          <X size={17} />
        </button>

        <div className="settings-shell">
        <aside className="settings-rail" aria-label="Secciones de configuración">
          <div className="settings-rail-brand">
            <div>
              <strong id="settings-dialog-title">Ajustes</strong>
              <span>Verbum</span>
            </div>
          </div>

          <nav className="settings-nav">
            {PANELS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`settings-nav-item ${activePanel === id ? 'active' : ''}`}
                onClick={() => selectPanel(id)}
                aria-current={activePanel === id ? 'page' : undefined}
              >
                <Icon size={16} />
                <span>
                  <strong>{label}</strong>
                </span>
              </button>
            ))}
          </nav>

          <span className="settings-rail-version">Verbum 0.1</span>
        </aside>

        <div className="settings-panel-wrap">
          <header className="settings-panel-header">
            <span className="settings-panel-kicker">Preferencias</span>
            <h1>{heading.title}</h1>
            <p>{heading.subtitle}</p>
          </header>

          <div className="settings-panel-content" key={activePanel}>
            {activePanel === 'appearance' && (
              <SettingsThemesSection theme={theme} onSelectTheme={onSelectTheme} />
            )}

            {activePanel === 'reading' && (
              <>
                <SettingsTypographySection
                  fontSize={fontSize}
                  onChangeFontSize={onChangeFontSize}
                  fontFamily={fontFamily}
                  onChangeFontFamily={onChangeFontFamily}
                  lineHeightPreset={lineHeightPreset}
                  onChangeLineHeight={onChangeLineHeight}
                  maxWidthPreset={maxWidthPreset}
                  onChangeMaxWidth={onChangeMaxWidth}
                />
                <SettingsWindowSection
                  hideTopBar={hideTopBar}
                  onToggleHideTopBar={onToggleHideTopBar}
                />
              </>
            )}

            {activePanel === 'voice' && <SettingsVoiceSection />}

            {activePanel === 'ai' && (
              <SettingsAISection aiConfig={aiConfig} onUpdateAIConfig={onUpdateAIConfig} />
            )}

            {activePanel === 'library' && (
              <>
                <SettingsVersionsSection
                  versions={versions}
                  currentVersion={currentVersion}
                  onSelectDefaultVersion={onSelectDefaultVersion}
                />
                <SettingsSearchSection
                  versions={versions}
                  searchLanguages={searchLanguages}
                  onChangeSearchLanguages={onChangeSearchLanguages}
                />
              </>
            )}
          </div>
        </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
