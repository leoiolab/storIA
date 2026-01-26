import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, BookOpen, X, ChevronDown } from 'lucide-react';
import { Book, Chapter } from '../types';
import './KindleReader.css';

interface KindleReaderProps {
  book: Book;
}

type Theme = 'white' | 'sepia' | 'black';
type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export function KindleReader({ book }: KindleReaderProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterDropdown, setShowChapterDropdown] = useState(false);
  const [theme, setTheme] = useState<Theme>('white');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineSpacing, setLineSpacing] = useState<number>(1.6);
  const [margins, setMargins] = useState<number>(2);
  const contentRef = useRef<HTMLDivElement>(null);
  const chapterDropdownRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');

  const wordsPerPage = useMemo(() => {
    switch (fontSize) {
      case 'xs': return 400;
      case 'sm': return 350;
      case 'md': return 300;
      case 'lg': return 250;
      case 'xl': return 200;
      case 'xxl': return 150;
      default: return 300;
    }
  }, [fontSize]);

  const chapters = book.chapters.sort((a: Chapter, b: Chapter) => a.order - b.order);
  const currentChapter = chapters[currentChapterIndex];

  // Paginate content
  useEffect(() => {
    if (!currentChapter || !contentRef.current) return;

    const paginateContent = () => {
      const container = contentRef.current;
      if (!container) return;

      // Use sections if available, otherwise use content
      let content = currentChapter.content;
      if (currentChapter.sections && currentChapter.sections.length > 0) {
        // Combine sections without headers (section titles are for reference only)
        content = currentChapter.sections
          .sort((a, b) => a.order - b.order)
          .map(s => s.content.trim())
          .filter(Boolean)
          .join('\n\n')
          .trim();
      }
      
      // Simple pagination - split into chunks
      const allWords = content.split(/\s+/);
      const pageCount = Math.ceil(allWords.length / wordsPerPage);
      
      const newPages: string[] = [];
      for (let i = 0; i < pageCount; i++) {
        const start = i * wordsPerPage;
        const pageWords = allWords.slice(start, start + wordsPerPage);
        newPages.push(pageWords.join(' '));
      }

      setPages(newPages);
      setCurrentPage(0);
    };

    paginateContent();
  }, [currentChapter, fontSize, lineSpacing, margins, wordsPerPage]);

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      setFlipDirection('forward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setIsFlipping(false);
      }, 300);
    } else if (currentChapterIndex < chapters.length - 1) {
      // Next chapter
      setFlipDirection('forward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentChapterIndex(currentChapterIndex + 1);
        setCurrentPage(0);
        setIsFlipping(false);
      }, 300);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setFlipDirection('backward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setIsFlipping(false);
      }, 300);
    } else if (currentChapterIndex > 0) {
      // Previous chapter - go to last page
      setFlipDirection('backward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentChapterIndex(currentChapterIndex - 1);
        // Will be set to last page after pagination
        setIsFlipping(false);
      }, 300);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      goToPreviousPage();
    } else if (x > width * 0.7) {
      goToNextPage();
    } else {
      setShowMenu(!showMenu);
    }
  };

  // Calculate progress
  const totalPages = useMemo(() => {
    const previousChapterPages = chapters.reduce((sum: number, ch: any, idx: number) => {
      if (idx < currentChapterIndex) {
        const words = ch.content.split(/\s+/).length;
        return sum + Math.ceil(words / wordsPerPage);
      }
      return sum;
    }, 0);
    return previousChapterPages + currentPage + 1;
  }, [chapters, currentChapterIndex, currentPage, wordsPerPage]);

  const totalBookPages = useMemo(() => {
    return chapters.reduce((sum: number, ch: any) => {
      const words = ch.content.split(/\s+/).length;
      return sum + Math.ceil(words / wordsPerPage);
    }, 0);
  }, [chapters, wordsPerPage]);

  const progressPercent = Math.round((totalPages / totalBookPages) * 100);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chapterDropdownRef.current && !chapterDropdownRef.current.contains(event.target as Node)) {
        setShowChapterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === 'Escape') {
        setShowMenu(false);
        setShowSettings(false);
        setShowChapterDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentPage, currentChapterIndex, pages.length]);

  if (!currentChapter) {
    return (
      <div className="kindle-reader">
        <div className="kindle-empty">
          <BookOpen size={64} />
          <h2>No Content</h2>
          <p>Add chapters to your book to start reading</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`kindle-reader theme-${theme}`}>
      {/* Top Menu Bar */}
      {showMenu && (
        <div className="kindle-menu-bar">
          <div className="menu-left">
            <button className="menu-btn" onClick={() => setShowMenu(false)}>
              <X size={20} />
            </button>
            <span className="menu-title">{book.metadata.title}</span>
            <div className="chapter-dropdown-container" ref={chapterDropdownRef}>
              <button 
                className="chapter-dropdown-btn"
                onClick={() => setShowChapterDropdown(!showChapterDropdown)}
              >
                <BookOpen size={16} />
                <span>{currentChapter?.title || 'Select Chapter'}</span>
                <ChevronDown size={16} className={showChapterDropdown ? 'rotated' : ''} />
              </button>
              {showChapterDropdown && (
                <div className="chapter-dropdown-menu">
                  {chapters.map((chapter, index) => (
                    <button
                      key={chapter.id}
                      className={`chapter-dropdown-item ${index === currentChapterIndex ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentChapterIndex(index);
                        setCurrentPage(0);
                        setShowChapterDropdown(false);
                        setShowMenu(false);
                      }}
                    >
                      <span className="chapter-number">Chapter {index + 1}</span>
                      <span className="chapter-name">{chapter.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="menu-right">
            <button className="menu-btn" onClick={() => setShowSettings(!showSettings)}>
              <Settings size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="kindle-settings">
          <div className="settings-header">
            <h3>Display Settings</h3>
            <button onClick={() => setShowSettings(false)}>×</button>
          </div>

          <div className="settings-group">
            <label>Color Mode</label>
            <div className="theme-selector">
              <button
                className={`theme-option theme-white ${theme === 'white' ? 'active' : ''}`}
                onClick={() => setTheme('white')}
              >
                White
              </button>
              <button
                className={`theme-option theme-sepia ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => setTheme('sepia')}
              >
                Sepia
              </button>
              <button
                className={`theme-option theme-black ${theme === 'black' ? 'active' : ''}`}
                onClick={() => setTheme('black')}
              >
                Black
              </button>
            </div>
          </div>

          <div className="settings-group">
            <label>Font Size</label>
            <div className="size-selector">
              {['xs', 'sm', 'md', 'lg', 'xl', 'xxl'].map((size) => (
                <button
                  key={size}
                  className={`size-option ${fontSize === size ? 'active' : ''}`}
                  onClick={() => setFontSize(size as FontSize)}
                >
                  A
                </button>
              ))}
            </div>
          </div>

          <div className="settings-group">
            <label>Line Spacing: {lineSpacing.toFixed(1)}</label>
            <input
              type="range"
              min="1.0"
              max="2.5"
              step="0.1"
              value={lineSpacing}
              onChange={(e) => setLineSpacing(parseFloat(e.target.value))}
            />
          </div>

          <div className="settings-group">
            <label>Margins: {margins}</label>
            <input
              type="range"
              min="1"
              max="4"
              step="0.5"
              value={margins}
              onChange={(e) => setMargins(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* Main Reading Area */}
      <div 
        className={`kindle-page-container font-${fontSize} ${isFlipping ? `flipping flip-${flipDirection}` : ''}`}
        onClick={handleTap}
        style={{ 
          padding: `${margins}rem`,
          lineHeight: lineSpacing
        }}
      >
        <div className="kindle-page" ref={contentRef}>
          {/* Chapter Title (only on first page) */}
          {currentPage === 0 && (
            <div className="chapter-header-kindle">
              <div className="chapter-number-kindle">Chapter {currentChapterIndex + 1}</div>
              <h1 className="chapter-title-kindle">{currentChapter.title}</h1>
            </div>
          )}

          {/* Page Content */}
          <div className="page-text">
            {pages[currentPage]?.split('\n\n').map((para, idx) => (
              <p key={idx} className="kindle-paragraph">{para}</p>
            ))}
          </div>

          {/* Page Footer */}
          <div className="page-footer">
            <div className="footer-left">
              {progressPercent}% · Page {currentPage + 1} of {pages.length}
            </div>
            <div className="footer-right">
              {book.metadata.author}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="kindle-progress">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Tap Instructions (fade out after 5 seconds) */}
      <div className="tap-hint">
        <div>← Tap left</div>
        <div>Tap center for menu</div>
        <div>Tap right →</div>
      </div>
    </div>
  );
}

export default KindleReader;


