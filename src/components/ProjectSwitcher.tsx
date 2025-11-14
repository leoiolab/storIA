import { useState } from 'react';
import { Book, ChevronDown, Plus, Settings, FileDown } from 'lucide-react';
import { Book as BookType } from '../types';
import './ProjectSwitcher.css';

interface ProjectSwitcherProps {
  books: BookType[];
  currentBook: BookType | null;
  onSelectBook: (bookId: string) => void;
  onCreateBook: () => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
}

function ProjectSwitcher({
  books,
  currentBook,
  onSelectBook,
  onCreateBook,
  onOpenSettings,
  onOpenExport,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="project-switcher">
      <button
        className="current-project"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Book size={16} />
        <span className="project-name">
          {currentBook?.metadata.title || 'No Project'}
        </span>
        <ChevronDown size={16} className={isOpen ? 'rotated' : ''} />
      </button>

      {isOpen && (
        <>
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
          <div className="project-dropdown">
            <div className="dropdown-section">
              <div className="dropdown-header">Projects</div>
              {books.map(book => (
                <button
                  key={book.id}
                  className={`dropdown-item ${currentBook?.id === book.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectBook(book.id);
                    setIsOpen(false);
                  }}
                >
                  <Book size={14} />
                  <span>{book.metadata.title}</span>
                </button>
              ))}
              <button className="dropdown-item create" onClick={() => {
                onCreateBook();
                setIsOpen(false);
              }}>
                <Plus size={14} />
                <span>New Project</span>
              </button>
            </div>

            <div className="dropdown-divider" />

            <div className="dropdown-section">
              <button className="dropdown-item" onClick={() => {
                onOpenExport();
                setIsOpen(false);
              }}>
                <FileDown size={14} />
                <span>Export</span>
              </button>
              <button className="dropdown-item" onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}>
                <Settings size={14} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProjectSwitcher;






