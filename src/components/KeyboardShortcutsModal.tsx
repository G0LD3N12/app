import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; desc: string }[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = React.memo(({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const groups: ShortcutGroup[] = [
    {
      title: 'Lectura & Navegación',
      shortcuts: [
        { keys: ['J', 'K'], desc: 'Mover foco al siguiente / anterior versículo' },
        { keys: ['Alt', '← / →'], desc: 'Navegar al capítulo anterior / siguiente' },
        { keys: ['Espacio'], desc: 'Reproducir o pausar lectura de audio' },
        { keys: ['B'], desc: 'Marcar o desmarcar versículo seleccionado' },
        { keys: ['Z'], desc: 'Alternar Modo Zen (lectura inmersiva)' },
        { keys: ['P'], desc: 'Alternar Vista Paralela (2 traducciones lado a lado)' },
      ],
    },
    {
      title: 'Búsqueda & Sistema',
      shortcuts: [
        { keys: ['Ctrl', 'K'], desc: 'Abrir Paleta de Comandos y Búsqueda' },
        { keys: ['/'], desc: 'Buscar rápidamente en la Biblia' },
        { keys: ['Ctrl', 'B'], desc: 'Expandir o colapsar barra lateral' },
        { keys: ['Esc'], desc: 'Cerrar modales, cajón de estudio o cancelar' },
        { keys: ['?'], desc: 'Abrir esta guía de atajos de teclado' },
      ],
    },
  ];

  return (
    <div className="shortcuts-modal-backdrop" onClick={onClose} aria-label="Atajos de teclado">
      <div className="shortcuts-modal-card glass-surface" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shortcuts-modal-header">
          <div className="shortcuts-header-title-group">
            <div className="shortcuts-icon-box">
              <Keyboard size={18} color="var(--accent-gold)" />
            </div>
            <div>
              <h3 className="shortcuts-title">Atajos de Teclado</h3>
              <p className="shortcuts-subtitle">Navegación rápida y controles de Verbum</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Cerrar (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Groups */}
        <div className="shortcuts-modal-body">
          {groups.map((g) => (
            <div key={g.title} className="shortcuts-group">
              <h4 className="shortcuts-group-title">{g.title}</h4>
              <div className="shortcuts-list">
                {g.shortcuts.map((s, idx) => (
                  <div key={idx} className="shortcut-row">
                    <span className="shortcut-desc">{s.desc}</span>
                    <div className="shortcut-keys">
                      {s.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && <span className="shortcut-plus">+</span>}
                          <kbd className="shortcut-kbd">{k}</kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shortcuts-modal-footer">
          <span className="shortcuts-footer-hint">
            Pulsa <kbd className="shortcut-kbd">ESC</kbd> para volver al texto
          </span>
        </div>
      </div>
    </div>
  );
});
