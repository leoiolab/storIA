import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Settings, BookOpen, X, ChevronDown, Play, Pause, Volume2, Loader2 } from 'lucide-react';
import { Book, Chapter } from '../types';
import * as piperTTS from '@mintplex-labs/piper-tts-web';
import { formatTextWithDialogue } from '../utils/textFormatting';
import './KindleReader.css';

interface KindleReaderProps {
  book: Book;
}

type Theme = 'white' | 'sepia' | 'black';
type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface PiperVoice {
  id: string;
  name: string;
}

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
  
  // Piper TTS State
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [isTTSPaused, setIsTTSPaused] = useState(false);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en_US-lessac-medium');
  const [availableVoices, setAvailableVoices] = useState<PiperVoice[]>([]);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [isLoadingVoices, setIsLoadingVoices] = useState(true);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordMapRef = useRef<Map<number, string>>(new Map());
  const audioQueueRef = useRef<Blob[]>([]);
  const isProcessingQueueRef = useRef(false);

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

  // Initialize Piper TTS
  useEffect(() => {
    const initPiperTTS = async () => {
      setIsLoadingVoices(true);
      setTtsError(null);
      
      try {
        console.log('Initializing Piper TTS...');
        
        // Check if piperTTS is available
        if (!piperTTS || typeof piperTTS.voices !== 'function') {
          throw new Error('Piper TTS not available. Make sure @mintplex-labs/piper-tts-web is installed.');
        }
        
        // Get available voices (voices() is async!)
        const voices = await piperTTS.voices();
        console.log('Piper TTS voices:', voices);
        console.log('Voices type:', typeof voices, 'Is array:', Array.isArray(voices));
        if (Array.isArray(voices) && voices.length > 0) {
          console.log('First voice item:', voices[0], 'Type:', typeof voices[0]);
        }
        
        // Handle different return types
        let voiceList: PiperVoice[] = [];
        
        if (Array.isArray(voices)) {
          // Process array of voices
          console.log('Processing array of', voices.length, 'voices');
          voiceList = voices
            .map((v: any, index: number) => {
              // Handle string format (voice ID)
              if (typeof v === 'string') {
                const trimmed = v.trim();
                if (trimmed.length === 0) {
                  console.warn(`Voice at index ${index} is empty string`);
                  return null;
                }
                return {
                  id: trimmed,
                  name: trimmed // Use ID as name if no name provided
                };
              }
              // Handle object format
              if (typeof v === 'object' && v !== null) {
                const id = v.id || v.voiceId || '';
                const name = v.name || v.displayName || v.label || id;
                const idStr = String(id).trim();
                const nameStr = String(name).trim();
                
                if (idStr.length === 0 && nameStr.length === 0) {
                  console.warn(`Voice at index ${index} has no id or name:`, v);
                  return null;
                }
                
                return {
                  id: idStr || nameStr || `voice-${index}`,
                  name: nameStr || idStr || `Voice ${index + 1}`
                };
              }
              
              console.warn(`Voice at index ${index} has unexpected type:`, typeof v, v);
              return null;
            })
            .filter((v: PiperVoice | null): v is PiperVoice => {
              // Filter out null entries and ensure both id and name exist
              const isValid = v !== null && v.id && v.name && v.id.length > 0 && v.name.length > 0;
              if (!isValid && v !== null) {
                console.warn('Filtered out invalid voice:', v);
              }
              return isValid;
            });
        } else if (typeof voices === 'object' && voices !== null && !Array.isArray(voices)) {
          // Handle object format (key-value pairs)
          voiceList = Object.entries(voices)
            .filter(([id, name]) => id && (name || id))
            .map(([id, name]) => ({
              id: String(id).trim(),
              name: typeof name === 'string' ? name.trim() : String(id).trim()
            }))
            .filter((v: PiperVoice) => v.id.length > 0 && v.name.length > 0);
        } else if (voices === null || voices === undefined) {
          throw new Error('Voices API returned null or undefined');
        } else {
          throw new Error(`Unexpected voices format: ${typeof voices}`);
        }
        
        console.log('Final voice list:', voiceList);
        
        console.log('Processed voice list:', voiceList);
        console.log('Voice list length:', voiceList.length);
        if (voiceList.length === 0 && Array.isArray(voices) && voices.length > 0) {
          console.error('All voices were filtered out! First few raw voices:', voices.slice(0, 5));
        }
        setAvailableVoices(voiceList);
        setIsLoadingVoices(false);
        
        // Set default voice if available
        if (voiceList.length > 0) {
          const defaultVoice = voiceList.find(v => v && v.id && v.id !== 'undefined' && v.id.trim().length > 0 && v.id.includes('en_US')) || 
                               voiceList.find(v => v && v.id && v.id !== 'undefined' && v.id.trim().length > 0);
          if (defaultVoice && defaultVoice.id && defaultVoice.id !== 'undefined' && defaultVoice.id.trim().length > 0) {
            setSelectedVoiceId(defaultVoice.id.trim());
            console.log('Selected default voice:', defaultVoice);
          } else {
            console.warn('No valid default voice found');
            setTtsError('No valid voices available.');
          }
        } else {
          console.warn('No voices available');
          setTtsError('No voices available. Please check your connection.');
        }
      } catch (error) {
        console.error('Failed to initialize Piper TTS:', error);
        setIsLoadingVoices(false);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Provide more helpful error messages
        if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
          setTtsError('Network error: Unable to load voices. Please check your internet connection and refresh the page.');
        } else {
          setTtsError(`Failed to initialize TTS: ${errorMessage}. Please refresh the page.`);
        }
      }
    };

    initPiperTTS();
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
  }, [currentChapterIndex]);

  // Paginate content with dialogue formatting
  useEffect(() => {
    if (!currentChapter || !contentRef.current) return;

    const paginateContent = () => {
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

  // Piper TTS Functions
  const ensureVoiceDownloaded = useCallback(async (voiceId: string): Promise<boolean> => {
    // Validate voiceId
    if (!voiceId || voiceId === 'undefined' || voiceId.trim().length === 0) {
      console.error('Invalid voiceId provided:', voiceId);
      setTtsError('Invalid voice selected. Please select a valid voice.');
      return false;
    }

    try {
      // stored() returns a promise
      const stored = await piperTTS.stored();
      if (Array.isArray(stored) && stored.includes(voiceId)) {
        console.log(`Voice ${voiceId} already downloaded`);
        return true;
      }

      setIsLoadingVoice(true);
      setTtsError(null);

      try {
        // Double-check voiceId before downloading
        const trimmedVoiceId = voiceId.trim();
        if (!trimmedVoiceId || trimmedVoiceId === 'undefined' || trimmedVoiceId.length === 0) {
          console.error('CRITICAL: Invalid voiceId detected right before download:', voiceId, 'Type:', typeof voiceId);
          setIsLoadingVoice(false);
          setTtsError('Invalid voice ID. Please select a different voice.');
          return false;
        }

        console.log('Downloading voice:', trimmedVoiceId);
        await piperTTS.download(trimmedVoiceId, (progress) => {
          // Progress callback - could show progress UI if needed
          if (progress && progress.loaded && progress.total) {
            console.log(`Downloading ${trimmedVoiceId}: ${Math.round((progress.loaded * 100) / progress.total)}%`);
          }
        });

        setIsLoadingVoice(false);
        console.log(`Successfully downloaded voice: ${voiceId}`);
        return true;
      } catch (downloadError) {
        console.error('Download error:', downloadError);
        setIsLoadingVoice(false);
        
        // Check if it's a network error
        const errorMessage = downloadError instanceof Error ? downloadError.message : String(downloadError);
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
          setTtsError('Network error: Unable to download voice model. Please check your internet connection and try again.');
        } else {
          setTtsError(`Failed to download voice model: ${errorMessage}`);
        }
        return false;
      }
    } catch (error) {
      console.error('Failed to check/download voice:', error);
      setIsLoadingVoice(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setTtsError(`Voice error: ${errorMessage}`);
      return false;
    }
  }, []);

  const processTextChunk = useCallback(async (text: string, voiceId: string): Promise<Blob | null> => {
    // Validate voiceId
    if (!voiceId || voiceId === 'undefined' || voiceId.trim().length === 0) {
      console.error('Invalid voiceId in processTextChunk:', voiceId);
      return null;
    }

    try {
      // Remove quotes for TTS (they're just formatting)
      const cleanText = text.replace(/[""]/g, '');
      if (!cleanText.trim()) return null;

      const wav = await piperTTS.predict({
        text: cleanText,
        voiceId: voiceId.trim(),
      });
      return wav;
    } catch (error) {
      console.error('TTS synthesis error:', error);
      return null;
    }
  }, []);

  const playAudioQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    
    isProcessingQueueRef.current = true;

    while (audioQueueRef.current.length > 0 && isTTSPlaying && !isTTSPaused) {
      const blob = audioQueueRef.current.shift();
      if (!blob) continue;

      await new Promise<void>((resolve) => {
        const audio = new Audio();
        audio.src = URL.createObjectURL(blob);
        audio.playbackRate = ttsSpeed;
        
        audio.onended = () => {
          URL.revokeObjectURL(audio.src);
          resolve();
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audio.src);
          resolve();
        };

        audio.play().catch((error) => {
          console.error('Audio play error:', error);
          URL.revokeObjectURL(audio.src);
          resolve();
        });

        audioRef.current = audio;
      });
    }

    isProcessingQueueRef.current = false;
    
    if (audioQueueRef.current.length === 0 && isTTSPlaying) {
      setIsTTSPlaying(false);
      setIsTTSPaused(false);
    }
  }, [isTTSPlaying, isTTSPaused, ttsSpeed]);

  const startTTS = useCallback(async () => {
    if (!getChapterText) {
      setTtsError('No text to read.');
      return;
    }

    // Validate selectedVoiceId with detailed logging
    console.log('startTTS called with selectedVoiceId:', selectedVoiceId, 'Type:', typeof selectedVoiceId);
    if (!selectedVoiceId || selectedVoiceId === 'undefined' || selectedVoiceId.trim().length === 0) {
      setTtsError('Please select a valid voice.');
      console.error('Invalid selectedVoiceId in startTTS:', selectedVoiceId, 'Available voices:', availableVoices);
      return;
    }

    // Stop any existing speech
    stopTTS();

    // Ensure voice is downloaded (with validated ID)
    const validatedVoiceId = selectedVoiceId.trim();
    console.log('Calling ensureVoiceDownloaded with:', validatedVoiceId);
    const downloaded = await ensureVoiceDownloaded(validatedVoiceId);
    if (!downloaded) {
      console.error('Voice download failed for:', validatedVoiceId);
      return;
    }

    setIsTTSPlaying(true);
    setIsTTSPaused(false);
    setTtsError(null);
    audioQueueRef.current = [];

    // Use the validated voice ID for all processing
    const voiceIdForProcessing = validatedVoiceId;

    // Split text into chunks (Piper works better with smaller chunks)
    const chunks = getChapterText.split(/([.!?]\s+)/).filter(c => c.trim());
    const sentences: string[] = [];
    
    for (let i = 0; i < chunks.length; i += 2) {
      const sentence = chunks[i] + (chunks[i + 1] || '');
      if (sentence.trim()) {
        sentences.push(sentence.trim());
      }
    }

    // Process sentences sequentially and add to queue
    console.log('Processing text chunks with voice:', voiceIdForProcessing);
    for (const sentence of sentences) {
      if (!isTTSPlaying || isTTSPaused) break;
      
      const blob = await processTextChunk(sentence, voiceIdForProcessing);
      if (blob) {
        audioQueueRef.current.push(blob);
        // Start playing if this is the first chunk
        if (audioQueueRef.current.length === 1) {
          playAudioQueue();
        }
      }
    }
  }, [getChapterText, selectedVoiceId, availableVoices, ensureVoiceDownloaded, processTextChunk, playAudioQueue]);

  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsTTSPlaying(false);
    setIsTTSPaused(false);
    audioQueueRef.current = [];
    isProcessingQueueRef.current = false;
  }, []);

  const pauseTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsTTSPaused(true);
  }, []);

  const resumeTTS = useCallback(() => {
    setIsTTSPaused(false);
    if (audioQueueRef.current.length > 0) {
      playAudioQueue();
    }
  }, [playAudioQueue]);

  const toggleTTS = useCallback(() => {
    if (isTTSPlaying) {
      if (isTTSPaused) {
        resumeTTS();
      } else {
        pauseTTS();
      }
    } else {
      startTTS();
    }
  }, [isTTSPlaying, isTTSPaused, startTTS, pauseTTS, resumeTTS]);

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
      setFlipDirection('backward');
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentChapterIndex(currentChapterIndex - 1);
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
  }, [currentPage, currentChapterIndex, pages.length, stopTTS]);

  // Format page text with dialogue
  const formatPageText = useCallback((text: string) => {
    if (!text) return [];
    return formatTextWithDialogue(text);
  }, []);

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
              onClick={() => setShowTTS(!showTTS)}
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

          {ttsError && (
            <div className="tts-error">
              <p>{ttsError}</p>
            </div>
          )}

          <div className="settings-group">
            <div className="tts-controls">
              <button
                className="tts-play-btn"
                onClick={toggleTTS}
                disabled={isLoadingVoice || !selectedVoiceId}
              >
                {isLoadingVoice ? (
                  <Loader2 size={20} className="spinning" />
                ) : isTTSPlaying ? (
                  isTTSPaused ? <Play size={20} /> : <Pause size={20} />
                ) : (
                  <Play size={20} />
                )}
                <span>
                  {isLoadingVoice ? 'Loading...' : isTTSPlaying ? (isTTSPaused ? 'Resume' : 'Pause') : 'Play'}
                </span>
              </button>
              <button
                className="tts-stop-btn"
                onClick={stopTTS}
                disabled={!isTTSPlaying && !isTTSPaused}
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
                if (audioRef.current) {
                  audioRef.current.playbackRate = newSpeed;
                }
              }}
            />
          </div>

          <div className="settings-group">
            <label>Voice {isLoadingVoices && '(Loading...)'}</label>
            {isLoadingVoices ? (
              <div className="voice-loading">
                <Loader2 size={16} className="spinning" />
                <span>Loading voices...</span>
              </div>
            ) : availableVoices.length === 0 ? (
              <div className="tts-error">
                <p>No voices available. Please refresh the page.</p>
              </div>
            ) : (
              <select
                className="voice-selector"
                value={selectedVoiceId || ''}
                onChange={async (e) => {
                  const voiceId = e.target.value;
                  if (voiceId && voiceId !== 'undefined' && voiceId.trim().length > 0) {
                    console.log('Selected voice:', voiceId);
                    setSelectedVoiceId(voiceId.trim());
                    if (isTTSPlaying) {
                      stopTTS();
                    }
                  } else {
                    console.error('Invalid voice selected:', voiceId);
                    setTtsError('Invalid voice selected. Please choose another voice.');
                  }
                }}
              >
                {availableVoices
                  .filter(voice => voice && voice.id && voice.id !== 'undefined' && voice.id.trim().length > 0)
                  .map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name || voice.id}
                    </option>
                  ))}
              </select>
            )}
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

          {/* Page Content with Dialogue Formatting */}
          <div className="page-text">
            {pages[currentPage] && (() => {
              const pageText = pages[currentPage];
              // Split by paragraphs first
              const paragraphs = pageText.split(/\n\n+/).filter(p => p.trim());
              
              return paragraphs.map((para, paraIdx) => {
                const formattedSegments = formatPageText(para);
                return (
                  <p key={paraIdx} className="kindle-paragraph">
                    {formattedSegments.map((segment, segIdx) => {
                      if (segment.text === '\n\n') {
                        return null;
                      }
                      
                      return (
                        <span
                          key={segIdx}
                          className={segment.isDialogue ? 'dialogue-text' : 'narrative-text'}
                        >
                          {segment.text}
                        </span>
                      );
                    })}
                  </p>
                );
              });
            })()}
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
