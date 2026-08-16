import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import { setWindowDecorations } from '../../services/bibleService';

interface SettingsWindowSectionProps {
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
}

export const SettingsWindowSection: React.FC<SettingsWindowSectionProps> = ({
  hideTopBar,
  onToggleHideTopBar,
}) => {
  const [nativeDecorations, setNativeDecorations] = useState<boolean>(() => {
    return localStorage.getItem('verbum_native_decorations') === 'true';
  });

  const handleToggleDecorations = async () => {
    const nextVal = !nativeDecorations;
    setNativeDecorations(nextVal);
    localStorage.setItem('verbum_native_decorations', nextVal.toString());
    try {
      await setWindowDecorations(nextVal);
    } catch (e) {
      console.error('Failed to toggle window decorations:', e);
    }
  };

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <Cpu size={18} color="var(--accent-gold)" />
        <h2>Rendimiento & Ventana</h2>
      </div>

      <div className="settings-group">
        {/* Native Titlebar toggle */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Barra de Título del Sistema (GTK)</span>
            <span className="settings-row-desc">
              {nativeDecorations
                ? 'Barra nativa del sistema visible.'
                : 'Diseño inmersivo integrado (barra de título nativa oculta).'}
            </span>
          </div>

          <button
            type="button"
            className={`verbum-switch ${!nativeDecorations ? 'active' : ''}`}
            onClick={handleToggleDecorations}
            title={nativeDecorations ? 'Ocultar barra nativa de Linux' : 'Mostrar barra nativa de Linux'}
            aria-label="Alternar barra de título nativa"
          >
            <div className="verbum-switch-knob" />
          </button>
        </div>

        {/* Modo Zen Inmersivo toggle */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Modo Zen (Inmersión Total)</span>
            <span className="settings-row-desc">
              {hideTopBar
                ? 'Activo: Barra superior y lateral ocultas. La barra lateral aparece al pasar el cursor por el borde izquierdo.'
                : 'Inactivo: Barra superior y lateral siempre visibles.'}
            </span>
          </div>

          <button
            type="button"
            className={`verbum-switch ${hideTopBar ? 'active' : ''}`}
            onClick={onToggleHideTopBar}
            title={hideTopBar ? 'Desactivar Modo Zen' : 'Activar Modo Zen'}
            aria-label="Alternar Modo Zen"
          >
            <div className="verbum-switch-knob" />
          </button>
        </div>

        {/* GPU Acceleration note */}
        <div className="settings-row">
          <div className="settings-label-col">
            <span className="settings-row-title">Aceleración por Hardware</span>
            <span className="settings-row-desc">
              Renderizado WebKitGTK OpenGL/Vulkan activo para transiciones fluidas de 60fps.
            </span>
          </div>

          <div className="live-status-pill">
            <div className="live-status-dot" />
            <span>60 FPS · GPU Activa</span>
          </div>
        </div>
      </div>
    </section>
  );
};
