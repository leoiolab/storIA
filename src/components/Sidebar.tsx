import { Users, BookOpen, BookText, Network, TrendingUp, BookOpenCheck } from 'lucide-react';
import { ReactNode } from 'react';
import './Sidebar.css';

export type View = 'characters' | 'chapters' | 'metadata' | 'relationships' | 'storyarc' | 'reader';

interface SidebarProps {
  view: View;
  onViewChange: (view: View) => void;
  children?: ReactNode;
}

function Sidebar({ view, onViewChange, children }: SidebarProps) {
  return (
    <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">StorIA</h1>
          <p className="sidebar-subtitle">AI Story Creation</p>
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
    </div>
  );
}

export default Sidebar;

