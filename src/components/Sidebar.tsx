import { Users, BookOpen, BookText, Network, TrendingUp, BookOpenCheck, LogOut } from 'lucide-react';
import { ReactNode } from 'react';
import './Sidebar.css';

export type View = 'characters' | 'chapters' | 'metadata' | 'relationships' | 'storyarc' | 'reader';

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  children?: ReactNode;
  onLogout?: () => void;
  userName?: string | null;
}

function Sidebar({ view, onViewChange, children, onLogout, userName }: SidebarProps) {
  const initials = userName
    ? userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(name => name[0]?.toUpperCase())
        .join('')
    : '';

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <div>
            <h1 className="sidebar-title">StorIA</h1>
            <p className="sidebar-subtitle">AI Story Creation</p>
          </div>
          {onLogout && (
            <button className="logout-button mobile-top" onClick={onLogout} title="Log out">
              <LogOut size={18} />
              <span className="logout-text">Log out</span>
            </button>
          )}
        </div>
      </div>

      {children}
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${view === 'metadata' ? 'active' : ''}`}
          onClick={() => onViewChange('metadata')}
        >
          <BookText size={20} />
          <span>Book Details</span>
        </button>

        <button
          className={`nav-item ${view === 'characters' ? 'active' : ''}`}
          onClick={() => onViewChange('characters')}
        >
          <Users size={20} />
          <span>Characters</span>
        </button>
        
        <button
          className={`nav-item ${view === 'chapters' ? 'active' : ''}`}
          onClick={() => onViewChange('chapters')}
        >
          <BookOpen size={20} />
          <span>Chapters</span>
        </button>

        <button
          className={`nav-item ${view === 'reader' ? 'active' : ''}`}
          onClick={() => onViewChange('reader')}
        >
          <BookOpenCheck size={20} />
          <span>Reader View</span>
        </button>

        <button
          className={`nav-item ${view === 'relationships' ? 'active' : ''}`}
          onClick={() => onViewChange('relationships')}
        >
          <Network size={20} />
          <span>Relationships</span>
        </button>

        <button
          className={`nav-item ${view === 'storyarc' ? 'active' : ''}`}
          onClick={() => onViewChange('storyarc')}
        >
          <TrendingUp size={20} />
          <span>Story Arc</span>
        </button>
      </nav>

      {onLogout && (
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
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;

