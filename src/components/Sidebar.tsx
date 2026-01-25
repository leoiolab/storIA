import { Users, BookOpen, BookText, Network, TrendingUp, BookOpenCheck, LogOut, Settings, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { ReactNode } from 'react';
import './Sidebar.css';

export type View = 'characters' | 'chapters' | 'metadata' | 'relationships' | 'storyarc' | 'reader';

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  children?: ReactNode;
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  userName?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function Sidebar({ view, onViewChange, children, onLogout, onOpenSettings, onOpenExport, userName, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(name => name[0]?.toUpperCase())
        .join('')
    : '';

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          {!isCollapsed && (
            <div>
              <h1 className="sidebar-title">StorIA</h1>
              <p className="sidebar-subtitle">AI Story Creation</p>
            </div>
          )}
          {onToggleCollapse && (
            <button
              className="sidebar-toggle-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && children}
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === 'metadata' ? 'active' : ''}`}
          onClick={() => onViewChange('metadata')}
          title="Book Details"
        >
          <BookText size={20} />
          {!isCollapsed && <span>Book Details</span>}
        </button>

        <button
          className={`nav-item ${view === 'characters' ? 'active' : ''}`}
          onClick={() => onViewChange('characters')}
          title="Characters"
        >
          <Users size={20} />
          {!isCollapsed && <span>Characters</span>}
        </button>
        
        <button
          className={`nav-item ${view === 'chapters' ? 'active' : ''}`}
          onClick={() => onViewChange('chapters')}
          title="Chapters"
        >
          <BookOpen size={20} />
          {!isCollapsed && <span>Chapters</span>}
        </button>

        <button
          className={`nav-item ${view === 'reader' ? 'active' : ''}`}
          onClick={() => onViewChange('reader')}
          title="Reader View"
        >
          <BookOpenCheck size={20} />
          {!isCollapsed && <span>Reader View</span>}
        </button>

        <button
          className={`nav-item ${view === 'relationships' ? 'active' : ''}`}
          onClick={() => onViewChange('relationships')}
          title="Relationships"
        >
          <Network size={20} />
          {!isCollapsed && <span>Relationships</span>}
        </button>

        <button
          className={`nav-item ${view === 'storyarc' ? 'active' : ''}`}
          onClick={() => onViewChange('storyarc')}
          title="Story Arc"
        >
          <TrendingUp size={20} />
          {!isCollapsed && <span>Story Arc</span>}
        </button>
      </nav>

      {onLogout && !isCollapsed && (
        <div className="sidebar-footer">
          {userName && (
            <div className="sidebar-user">
              <div className="user-avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="user-details">
                <span className="user-label">Signed in as</span>
                <span className="user-name">{userName}</span>
              </div>
            </div>
          )}
          {onOpenExport && (
            <button className="sidebar-action-btn export-btn" onClick={onOpenExport} title="Export Book">
              <FileDown size={18} />
              <span>Export</span>
            </button>
          )}
          {onOpenSettings && (
            <button className="sidebar-action-btn settings-btn" onClick={onOpenSettings} title="Settings">
              <Settings size={18} />
              <span>Settings</span>
            </button>
          )}
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      )}
      
      {/* Collapsed footer with icons only */}
      {onLogout && isCollapsed && (
        <div className="sidebar-footer-collapsed">
          {onOpenExport && (
            <button className="sidebar-icon-btn" onClick={onOpenExport} title="Export Book">
              <FileDown size={18} />
            </button>
          )}
          {onOpenSettings && (
            <button className="sidebar-icon-btn" onClick={onOpenSettings} title="Settings">
              <Settings size={18} />
            </button>
          )}
          <button className="sidebar-icon-btn" onClick={onLogout} title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;

