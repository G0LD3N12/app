import React from 'react';
import { isWindowsPlatform } from '../../utils/platform';

interface SettingsWindowSectionProps {
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
}

export const SettingsWindowSection: React.FC<SettingsWindowSectionProps> = ({
  hideTopBar,
  onToggleHideTopBar,
}) => {
  const isWindows = isWindowsPlatform();

  return (
    <section className="settings-block">
      <div className="settings-block-title">
        <h2>Interfaz</h2>
      </div>
      <div className="settings-compact-list">
        <div className="settings-compact-row">
          <div>
            <strong>Modo Zen</strong>
            <span>Oculta la barra superior al leer.</span>
          </div>
          <button
            type="button"
            className={`verbum-switch ${hideTopBar ? 'active' : ''}`}
            onClick={onToggleHideTopBar}
            aria-label="Alternar modo Zen"
          >
            <i className="verbum-switch-knob" />
          </button>
        </div>

        {isWindows && (
          <div className="settings-compact-row settings-native-status-row">
            <div>
              <strong>Integración con Windows</strong>
              <span>Mica, Snap Layouts y el marco DWM siguen las preferencias del sistema.</span>
            </div>
            <span className="settings-native-status">DWM</span>
          </div>
        )}
      </div>
    </section>
  );
};
