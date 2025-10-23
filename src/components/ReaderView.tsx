import React, { useState, useEffect } from 'react';
import { Book, Chapter } from '../types';
import { ChevronLeft, ChevronRight, Settings, BookOpen, Type, Palette } from 'lucide-react';
import './ReaderView.css';

interface ReaderViewProps {
  book: Book;
}

type Theme = 'light' | 'sepia' | 'dark' | 'kindle';
type FontSize = 'small' | 'medium' | 'large' | 'xl';
type FontFamily = 'serif' | 'sans' | 'mono';

export function ReaderView({ book }: ReaderViewProps) {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<Theme>('kindle');
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [fontFamily, setFontFamily] = useState<FontFamily>('serif');
  const [lineHeight, setLineHeight] = useState<number>(1.6);
  const [showChapterList, setShowChapterList] = useState(false);

  const chapters = book.chapters.sort((a, b) => a.order - b.order);
  const currentChapter = chapters[currentChapterIndex];

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
      window.scrollTo(0, 0);
    }
  };

  const goToPreviousChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setShowChapterList(false);
    window.scrollTo(0, 0);
  };

  // Calculate reading progress
  const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const wordsRead = chapters
    .slice(0, currentChapterIndex)
    .reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const progressPercent = totalWords > 0 ? Math.round((wordsRead / totalWords) * 100) : 0;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPreviousChapter();
      if (e.key === 'ArrowRight') goToNextChapter();
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowChapterList(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentChapterIndex]);

  if (!currentChapter) {
    return (
      <div className="reader-view">
        <div className="reader-empty">
          <BookOpen size={64} />
          <h2>No Chapters to Read</h2>
          <p>Add chapters to your book to start reading</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`reader-view theme-${theme}`}>
      {/* Header */}
      <div className="reader-header">
        <div className="reader-header-left">
          <button
            className="reader-btn"
            onClick={() => setShowChapterList(!showChapterList)}
            title="Chapters"
          >
            <BookOpen size={20} />
          </button>
          <span className="reader-book-title">{book.metadata.title}</span>
        </div>
        
        <div className="reader-header-right">
          <span className="reader-progress">{progressPercent}%</span>
          <button
            className="reader-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Reading Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Chapter List Sidebar */}
      {showChapterList && (
        <div className="reader-sidebar">
          <div className="reader-sidebar-header">
            <h3>Chapters</h3>
            <button onClick={() => setShowChapterList(false)}>✕</button>
          </div>
          <div className="reader-chapter-list">
            {chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                className={`reader-chapter-item ${index === currentChapterIndex ? 'active' : ''}`}
                onClick={() => goToChapter(index)}
              >
                <div className="chapter-item-number">Chapter {index + 1}</div>
                <div className="chapter-item-title">{chapter.title}</div>
                <div className="chapter-item-words">{chapter.wordCount || 0} words</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="reader-settings-panel">
          <div className="reader-settings-header">
            <h3>Reading Settings</h3>
            <button onClick={() => setShowSettings(false)}>✕</button>
          </div>

          <div className="reader-settings-section">
            <label>
              <Palette size={16} />
              Theme
            </label>
            <div className="reader-theme-options">
              <button
                className={`theme-btn theme-light ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                className={`theme-btn theme-sepia ${theme === 'sepia' ? 'active' : ''}`}
                onClick={() => setTheme('sepia')}
              >
                Sepia
              </button>
              <button
                className={`theme-btn theme-dark ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
              <button
                className={`theme-btn theme-kindle ${theme === 'kindle' ? 'active' : ''}`}
                onClick={() => setTheme('kindle')}
              >
                Kindle
              </button>
            </div>
          </div>

          <div className="reader-settings-section">
            <label>
              <Type size={16} />
              Font Size
            </label>
            <div className="reader-size-options">
              <button
                className={fontSize === 'small' ? 'active' : ''}
                onClick={() => setFontSize('small')}
              >
                A
              </button>
              <button
                className={fontSize === 'medium' ? 'active' : ''}
                onClick={() => setFontSize('medium')}
              >
                A
              </button>
              <button
                className={fontSize === 'large' ? 'active' : ''}
                onClick={() => setFontSize('large')}
              >
                A
              </button>
              <button
                className={fontSize === 'xl' ? 'active' : ''}
                onClick={() => setFontSize('xl')}
              >
                A
              </button>
            </div>
          </div>

          <div className="reader-settings-section">
            <label>Font Family</label>
            <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as FontFamily)}>
              <option value="serif">Serif (Georgia)</option>
              <option value="sans">Sans-serif (System)</option>
              <option value="mono">Monospace (Courier)</option>
            </select>
          </div>

          <div className="reader-settings-section">
            <label>Line Height</label>
            <input
              type="range"
              min="1.2"
              max="2.4"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            />
            <span className="slider-value">{lineHeight.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* Main Reading Content */}
      <div className={`reader-content font-${fontSize} font-family-${fontFamily}`}>
        <div className="reader-page" style={{ lineHeight }}>
          <div className="reader-chapter-header">
            <div className="chapter-number">Chapter {currentChapterIndex + 1}</div>
            <h1 className="chapter-title">{currentChapter.title}</h1>
          </div>

          <div className="reader-text">
            {currentChapter.content.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Chapter Navigation */}
          <div className="reader-chapter-nav">
            <button
              className="nav-btn prev"
              onClick={goToPreviousChapter}
              disabled={currentChapterIndex === 0}
            >
              <ChevronLeft size={24} />
              Previous Chapter
            </button>

            <div className="nav-info">
              Chapter {currentChapterIndex + 1} of {chapters.length}
            </div>

            <button
              className="nav-btn next"
              onClick={goToNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
            >
              Next Chapter
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="reader-progress-bar">
        <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

export default ReaderView;


