import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, BookOpen, X, ChevronDown, Play, Pause, Volume2 } from 'lucide-react';
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
  const [showTTS, setShowTTS] = useState(false);
  const [theme, setTheme] = useState<Theme>('white');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [lineSpacing, setLineSpacing] = useState<number>(1.6);
  const [margins, setMargins] = useState<number>(2);
  const contentRef = useRef<HTMLDivElement>(null);
  const chapterDropdownRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'forward' | 'backward'>('forward');
  
  // TTS State
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentWordRef = useRef<HTMLSpanElement | null>(null);
  const wordMapRef = useRef<Map<number, string>>(new Map());

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

  // Initialize TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      // Load voices
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || [];
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoice) {
          // Prefer English voices, fallback to first available
          const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
          setSelectedVoice(englishVoice);
        }
      };

      loadVoices();
      // Some browsers load voices asynchronously
      synthRef.current?.addEventListener('voiceschanged', loadVoices);

      return () => {
        synthRef.current?.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Get full chapter text for TTS
  const getChapterText = useMemo(() => {
    if (!currentChapter) return '';
    
    // Use sections if available, otherwise use content
    let content = currentChapter.content;
    if (currentChapter.sections && currentChapter.sections.length > 0) {
      content = currentChapter.sections
        .sort((a, b) => a.order - b.order)
        .map(s => s.content.trim())
        .filter(Boolean)
        .join('\n\n')
        .trim();
    }
    
    return content;
  }, [currentChapter]);

  // Build word map for highlighting
  useEffect(() => {
    if (getChapterText) {
      const words = getChapterText.split(/(\s+)/).filter(w => w.trim().length > 0);
      wordMapRef.current = new Map();
      words.forEach((word, index) => {
        wordMapRef.current.set(index, word);
      });
    }
  }, [getChapterText]);

  // Stop TTS when chapter changes
  useEffect(() => {
    stopTTS();
    setCurrentWordIndex(-1);
  }, [currentChapterIndex]);

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

  // TTS Functions
  const stopTTS = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsTTSPlaying(false);
    setCurrentWordIndex(-1);
    if (utteranceRef.current) {
      utteranceRef.current = null;
    }
  };

  const pauseTTS = () => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
      setIsTTSPlaying(false);
    }
  };

  const resumeTTS = () => {
    if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
      setIsTTSPlaying(true);
    }
  };

  const startTTS = () => {
    if (!synthRef.current || !getChapterText || !selectedVoice) {
      return;
    }

    // Stop any existing speech
    stopTTS();

    const utterance = new SpeechSynthesisUtterance(getChapterText);
    utterance.rate = ttsSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.voice = selectedVoice;

    // Track word boundaries for highlighting
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Find the word index based on character position
        const charIndex = event.charIndex;
        const textBefore = getChapterText.substring(0, charIndex);
        // Count words before this position
        const wordsBefore = textBefore.trim().split(/\s+/).filter(w => w.length > 0);
        const wordIndex = wordsBefore.length;
        
        setCurrentWordIndex(wordIndex);
        
        // Scroll to current word (if visible)
        setTimeout(() => {
          if (currentWordRef.current) {
            currentWordRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    };

    utterance.onend = () => {
      setIsTTSPlaying(false);
      setCurrentWordIndex(-1);
    };

    utterance.onerror = (event) => {
      console.error('TTS Error:', event);
      setIsTTSPlaying(false);
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsTTSPlaying(true);
  };

  const toggleTTS = () => {
    if (isTTSPlaying) {
      pauseTTS();
    } else if (synthRef.current?.paused) {
      resumeTTS();
    } else {
      startTTS();
    }
  };

  const goToNextPage = () => {
    stopTTS();
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
    stopTTS();
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
        setShowTTS(false);
        stopTTS();
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
            <button 
              className={`menu-btn tts-btn ${isTTSPlaying ? 'active' : ''}`}
              onClick={() => {
                setShowTTS(!showTTS);
                if (!showTTS && !isTTSPlaying) {
                  // Auto-start TTS when opening panel
                  setTimeout(() => {
                    if (selectedVoice) startTTS();
                  }, 100);
                }
              }}
              title="Text-to-Speech"
            >
              <Volume2 size={20} />
            </button>
            <button className="menu-btn" onClick={() => setShowSettings(!showSettings)}>
              <Settings size={20} />
            </button>
          </div>
        </div>
      )}

      {/* TTS Panel */}
      {showTTS && (
        <div className="kindle-tts-panel">
          <div className="settings-header">
            <h3>Text-to-Speech</h3>
            <button onClick={() => {
              setShowTTS(false);
              stopTTS();
            }}>×</button>
          </div>

          {!synthRef.current ? (
            <div className="tts-error">
              <p>Text-to-Speech is not supported in your browser.</p>
            </div>
          ) : (
            <>
              <div className="settings-group">
                <div className="tts-controls">
                  <button
                    className="tts-play-btn"
                    onClick={toggleTTS}
                    disabled={!selectedVoice}
                  >
                    {isTTSPlaying ? <Pause size={20} /> : <Play size={20} />}
                    <span>{isTTSPlaying ? 'Pause' : 'Play'}</span>
                  </button>
                  <button
                    className="tts-stop-btn"
                    onClick={stopTTS}
                    disabled={!isTTSPlaying && !synthRef.current?.paused}
                  >
                    Stop
                  </button>
                </div>
              </div>

              <div className="settings-group">
                <label>Speed: {ttsSpeed.toFixed(1)}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsSpeed}
                  onChange={(e) => {
                    const newSpeed = parseFloat(e.target.value);
                    setTtsSpeed(newSpeed);
                    if (utteranceRef.current && synthRef.current) {
                      utteranceRef.current.rate = newSpeed;
                      if (synthRef.current.speaking) {
                        synthRef.current.cancel();
                        startTTS();
                      }
                    }
                  }}
                />
              </div>

              <div className="settings-group">
                <label>Voice</label>
                <select
                  className="voice-selector"
                  value={selectedVoice?.name || ''}
                  onChange={(e) => {
                    const voice = availableVoices.find(v => v.name === e.target.value);
                    if (voice) {
                      setSelectedVoice(voice);
                      if (isTTSPlaying) {
                        stopTTS();
                        setTimeout(() => startTTS(), 100);
                      }
                    }
                  }}
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
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
            {pages[currentPage]?.split('\n\n').map((para, idx) => {
              // Calculate global word index for this paragraph
              const wordsInPreviousPages = pages.slice(0, currentPage).reduce((sum, p) => {
                return sum + p.split(/\s+/).filter(w => w.trim().length > 0).length;
              }, 0);
              
              // Split paragraph into words for highlighting
              const words = para.split(/(\s+)/);
              let wordCounter = wordsInPreviousPages;
              
              // Count words in previous paragraphs on this page
              for (let i = 0; i < idx; i++) {
                const prevPara = pages[currentPage]?.split('\n\n')[i] || '';
                wordCounter += prevPara.split(/\s+/).filter(w => w.trim().length > 0).length;
              }
              
              return (
                <p key={idx} className="kindle-paragraph">
                  {words.map((word, wordIdx) => {
                    const isWord = word.trim().length > 0;
                    let globalWordIndex = -1;
                    
                    if (isWord) {
                      globalWordIndex = wordCounter;
                      wordCounter++;
                    }
                    
                    const isHighlighted = isTTSPlaying && isWord && globalWordIndex === currentWordIndex;
                    
                    return (
                      <span
                        key={wordIdx}
                        ref={isHighlighted ? currentWordRef : null}
                        className={isHighlighted ? 'tts-highlight' : ''}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              );
            })}
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


