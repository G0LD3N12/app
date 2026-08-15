import React from 'react';
import { BookOpen, Search, Glasses, Settings, ChevronRight, PanelTopClose, PanelTopOpen } from 'lucide-react';

export type AppView = 'reader' | 'study' | 'settings' | 'deep-study';

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onTriggerSearch: () => void;
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
}

const ObsidianSidebarIcon: React.FC<{ isExpanded: boolean; size?: number }> = ({ isExpanded, size = 19 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="obsidian-sidebar-icon"
    >
      {/* Outer rounded window frame */}
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        className="obsidian-sidebar-frame"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner sidebar indicator bar: morphs between thin line and wide solid bar */}
      <rect
        x="6"
        y="6"
        width={isExpanded ? 4.5 : 1.6}
        height="12"
        rx={isExpanded ? 1.5 : 0.8}
        fill="currentColor"
        className={`obsidian-sidebar-bar ${isExpanded ? 'expanded' : 'collapsed'}`}
      />
    </svg>
  );
};

export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isExpanded,
  onToggleExpand,
  activeView,
  onSelectView,
  onTriggerSearch,
  hideTopBar,
  onToggleHideTopBar,
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

      {/* Sidebar Header / Toggle Button */}
      <div className="sidebar-top">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleExpand}
          title={isExpanded ? 'Minimizar barra lateral' : 'Expandir barra lateral'}
        >
          <div className="sidebar-icon-wrapper">
            <ObsidianSidebarIcon isExpanded={isExpanded} size={19} />
          </div>
          {isExpanded && <span className="sidebar-header-title">Navegación</span>}
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
              onClick={item.action}
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
