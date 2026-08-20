import React from 'react';
import { BookOpen, Search, Glasses, Settings, ChevronRight, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';

export type AppView = 'reader' | 'study' | 'deep-study';

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
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
  isSettingsOpen,
  onOpenSettings,
  onTriggerSearch,
  hideTopBar,
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
    },
    {
      id: 'study' as AppView,
      label: 'Estudiar',
      icon: Glasses,
      iconClass: 'icon-anim-glasses',
      action: () => onSelectView('study'),
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
              title={!isExpanded ? item.label : undefined}
            >
              <div className={`sidebar-icon-wrapper ${item.iconClass}`}>
                <Icon size={19} />
              </div>

              {isExpanded && (
                <div className="sidebar-label-group">
                  <span className="sidebar-item-label">{item.label}</span>
                </div>
              )}

              {isExpanded && isActive && <ChevronRight size={14} className="active-chevron" />}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: Settings on bottom-left, Plus icon on bottom-right (Arc style, symmetric) */}
      <div className="sidebar-footer">
        <button
          className={`sidebar-footer-btn ${isSettingsOpen ? 'active' : ''}`}
          onClick={onOpenSettings}
          title="Ajustes"
        >
          <div className="sidebar-icon-wrapper icon-anim-gear">
            <Settings size={19} />
          </div>
        </button>

        {isExpanded && (
          <button
            className="sidebar-footer-btn footer-plus-btn"
            onClick={() => onSelectView('study')}
            title="Nuevo estudio"
          >
            <div className="sidebar-icon-wrapper">
              <Plus size={19} />
            </div>
          </button>
        )}
      </div>
    </aside>
  );
});
