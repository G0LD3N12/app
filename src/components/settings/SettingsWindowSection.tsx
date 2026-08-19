import React, { useState } from 'react';
import { setWindowDecorations } from '../../services/bibleService';

interface SettingsWindowSectionProps {
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
}

export const SettingsWindowSection: React.FC<SettingsWindowSectionProps> = ({
  hideTopBar,
  onToggleHideTopBar,
}) => {
  const [nativeDecorations, setNativeDecorations] = useState(
    () => localStorage.getItem('verbum_native_decorations') === 'true'
  );

  const toggleDecorations = async () => {
    const next = !nativeDecorations;
    setNativeDecorations(next);
    localStorage.setItem('verbum_native_decorations', String(next));
    try {
      await setWindowDecorations(next);
    } catch (error) {
      console.error('Failed to toggle window decorations:', error);
    }
  };

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

        <div className="settings-compact-row">
          <div>
            <strong>Marco del sistema</strong>
            <span>Usa los controles nativos de la ventana.</span>
          </div>
          <button
            type="button"
            className={`verbum-switch ${nativeDecorations ? 'active' : ''}`}
            onClick={toggleDecorations}
            aria-label="Alternar marco del sistema"
          >
            <i className="verbum-switch-knob" />
          </button>
        </div>
      </div>
    </section>
  );
};
