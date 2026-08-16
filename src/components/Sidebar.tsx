import React from 'react';
import { BookOpen, Search, Glasses, Settings, ChevronRight, PanelTopClose, PanelTopOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export type AppView = 'reader' | 'study' | 'settings' | 'deep-study';

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onTriggerSearch: () => void;
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
  onGoHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isExpanded,
  onToggleExpand,
  activeView,
  onSelectView,
  onTriggerSearch,
  hideTopBar,
  onToggleHideTopBar,
  onGoHome,
}) => {
  const navItems = [
    {
      id: 'reader' as AppView,
      label: 'Lectura Bíblica',
      icon: BookOpen,
      iconClass: 'icon-anim-book',
      action: () => onSelectView('reader'),
    },
    {
      id: 'search',
      label: 'Buscar',
      icon: Search,
      iconClass: 'icon-anim-search',
      action: onTriggerSearch,
      isAction: true,
      shortcut: 'Ctrl+K',
    },
    {
      id: 'study' as AppView,
      label: 'Estudiar',
      icon: Glasses,
      iconClass: 'icon-anim-glasses',
      action: () => onSelectView('study'),
    },
    {
      id: 'settings' as AppView,
      label: 'Configuración',
      icon: Settings,
      iconClass: 'icon-anim-gear',
      action: () => onSelectView('settings'),
    },
  ];

  return (
    <aside className={`app-sidebar ${isExpanded ? 'expanded' : 'collapsed'} ${hideTopBar ? 'zen-mode' : ''}`}>
      {/* Zen Mode Edge Hover Sensor */}
      {hideTopBar && <div className="sidebar-zen-sensor" title="Pasar cursor para mostrar barra lateral" />}

      {/* Sidebar Header / Brand & Toggle Button */}
      <div className="sidebar-top">
        {isExpanded && (
          <button
            className="app-brand"
            onClick={onGoHome || (() => onSelectView('reader'))}
            title="Ir a Lectura Principal (Inicio)"
          >
            <span className="app-brand-text">
              {'VERBUM'.split('').map((char, i) => (
                <span
                  key={i}
                  className="app-brand-char"
                  style={{ '--char-idx': i } as React.CSSProperties}
                >
                  {char}
                </span>
              ))}
            </span>
          </button>
        )}

        <button
          className="sidebar-toggle-btn"
          onClick={onToggleExpand}
          title={isExpanded ? 'Colapsar barra lateral (Ctrl+B)' : 'Expandir barra lateral (Ctrl+B)'}
        >
          <div className="sidebar-icon-wrapper icon-anim-panel">
            {isExpanded ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </div>
        </button>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isAction && activeView === item.id;

          return (
            <button
              key={item.id}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => item.action()}
              title={!isExpanded ? `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}` : undefined}
            >
              <div className={`sidebar-icon-wrapper ${item.iconClass}`}>
                <Icon size={19} />
              </div>

              {isExpanded && (
                <div className="sidebar-label-group">
                  <span className="sidebar-item-label">{item.label}</span>
                  {item.shortcut && <span className="sidebar-shortcut-tag">{item.shortcut}</span>}
                </div>
              )}

              {isExpanded && isActive && <ChevronRight size={14} className="active-chevron" />}
            </button>
          );
        })}
      </nav>

      {/* Zen Mode / TopBar Visibility Toggle */}
      <div className="sidebar-zen-section">
        <button
          className={`sidebar-nav-item ${hideTopBar ? 'active' : ''}`}
          onClick={onToggleHideTopBar}
          title={hideTopBar ? 'Salir del Modo Zen' : 'Modo Zen'}
        >
          <div className="sidebar-icon-wrapper icon-anim-zen">
            {hideTopBar ? <PanelTopOpen size={18} /> : <PanelTopClose size={18} />}
          </div>
          {isExpanded && (
            <div className="sidebar-label-group">
              <span className="sidebar-item-label">Modo Zen</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
});
