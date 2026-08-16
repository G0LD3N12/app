import React from 'react';
import { AppTheme, BibleVersion, AIProviderConfig } from '../types';
import { VerbumLogo } from './VerbumLogo';
import { SettingsWindowSection } from './settings/SettingsWindowSection';
import { SettingsAISection } from './settings/SettingsAISection';
import { SettingsTypographySection } from './settings/SettingsTypographySection';
import { SettingsThemesSection } from './settings/SettingsThemesSection';
import { SettingsVersionsSection } from './settings/SettingsVersionsSection';
import { SettingsSearchSection } from './settings/SettingsSearchSection';

interface SettingsViewProps {
  theme: AppTheme;
  onSelectTheme: (theme: AppTheme) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
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

export const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  onSelectTheme,
  fontSize,
  onChangeFontSize,
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
  return (
    <div className="settings-viewport">
      <div className="settings-content-wrapper">
        {/* Header */}
        <div className="settings-header">
          <h1 className="settings-title">Configuración</h1>
          <p className="settings-subtitle">Preferencias de lectura, personalización visual y motores de estudio</p>
        </div>

        <SettingsWindowSection
          hideTopBar={hideTopBar}
          onToggleHideTopBar={onToggleHideTopBar}
        />

        <SettingsAISection
          aiConfig={aiConfig}
          onUpdateAIConfig={onUpdateAIConfig}
        />

        <SettingsTypographySection
          fontSize={fontSize}
          onChangeFontSize={onChangeFontSize}
        />

        <SettingsThemesSection
          theme={theme}
          onSelectTheme={onSelectTheme}
        />

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

        {/* Footer Branding */}
        <div className="settings-footer-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px 0 10px 0', opacity: 0.75, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <VerbumLogo size={20} className="brand-icon" />
          <span>Verbum Desktop · Estudio Bíblico de Alta Fidelidad</span>
        </div>
      </div>
    </div>
  );
};
export default SettingsView;
