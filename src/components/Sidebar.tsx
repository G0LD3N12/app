import React from 'react';
import { Menu, BookOpen, Search, Sparkles, Settings, ChevronRight, PanelTopClose, PanelTopOpen } from 'lucide-react';

export type AppView = 'reader' | 'study' | 'settings';

interface SidebarProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  onTriggerSearch: () => void;
  hideTopBar: boolean;
  onToggleHideTopBar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
      label: 'Búsqueda Rápida',
      icon: Search,
      iconClass: 'icon-anim-search',
      action: onTriggerSearch,
      isAction: true,
      shortcut: 'Ctrl+F',
    },
    {
      id: 'study' as AppView,
      label: 'Catálogo de Estudio',
      icon: Sparkles,
      iconClass: 'icon-anim-sparkles',
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
    <aside className={`app-sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Sidebar Header / Toggle Button */}
      <div className="sidebar-top">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleExpand}
          title={isExpanded ? 'Minimizar barra lateral' : 'Expandir barra lateral'}
        >
          <div className="icon-anim-menu">
            <Menu size={20} />
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
                <Icon size={20} />
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
          title={hideTopBar ? 'Restaurar barra superior fija' : 'Ocultar barra superior (Modo Zen)'}
        >
          <div className="sidebar-icon-wrapper icon-anim-zen">
            {hideTopBar ? <PanelTopOpen size={18} /> : <PanelTopClose size={18} />}
          </div>
          {isExpanded && (
            <div className="sidebar-label-group">
              <span className="sidebar-item-label">{hideTopBar ? 'Ver Barra Superior' : 'Modo Zen (Sin Barra)'}</span>
            </div>
          )}
        </button>
      </div>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        {isExpanded ? (
          <div className="sidebar-footer-expanded">
            <span className="sidebar-footer-text">Verbum Desktop</span>
            <span className="sidebar-footer-badge">100% Offline</span>
          </div>
        ) : (
          <div className="sidebar-footer-collapsed" title="Verbum • 100% Offline">
            <span className="offline-dot" />
          </div>
        )}
      </div>
    </aside>
  );
};
