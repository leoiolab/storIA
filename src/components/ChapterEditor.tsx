import { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Unlock, GitCompare, Save } from 'lucide-react';
import { Chapter } from '../types';
import ContextAwareEditor from './ContextAwareEditor';
import ChapterVersionComparison from './ChapterVersionComparison';
import './ChapterEditor.css';
import type { EntityState } from './CharacterEditor';

interface ChapterEditorProps {
  chapter: Chapter | null;
  onUpdateChapter: (chapter: Chapter) => void;
  onStateChange?: (state: EntityState) => void;
}

function ChapterEditor({ chapter, onUpdateChapter, onStateChange }: ChapterEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastChapterIdRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determine current state
  const getCurrentState = (): EntityState => {
    if (!chapter) return 'new';
    if (chapter.isLocked) return 'locked';
    return 'edit';
  };
  
  const currentState = getCurrentState();

  // Only sync when chapter ID changes or when content actually differs
  useEffect(() => {
    if (!chapter) {
      setIsLocked(false);
      lastChapterIdRef.current = null;
      return;
    }

    // Only update if this is a different chapter
    if (chapter.id !== lastChapterIdRef.current) {
      setTitle(chapter.title);
      setContent(chapter.content);
      setIsLocked(chapter.isLocked || false);
      lastChapterIdRef.current = chapter.id;
      isInternalUpdateRef.current = false;
    } else if (!isInternalUpdateRef.current) {
      // Only sync if the actual content is different (not just object reference)
      // This prevents unnecessary updates that cause cursor jumps
      if (title !== chapter.title || content !== chapter.content) {
        setTitle(chapter.title);
        setContent(chapter.content);
      }
      if (isLocked !== (chapter.isLocked || false)) {
        setIsLocked(chapter.isLocked || false);
      }
    }
  }, [chapter, title, content, isLocked]);
  
  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  const saveChapter = useCallback(() => {
    if (!chapter) return;
    
    // Don't update if values haven't actually changed
    if (title === chapter.title && content === chapter.content && isLocked === (chapter.isLocked || false)) {
      return;
    }

    isInternalUpdateRef.current = true;
    const updatedChapter: Chapter = {
      ...chapter,
      title,
      content,
      isLocked,
      updatedAt: Date.now(),
    };
    onUpdateChapter(updatedChapter);
    // Reset flag after state propagates back
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 200);
  }, [chapter, title, content, isLocked, onUpdateChapter]);

  useEffect(() => {
    if (!chapter) return;
    
    // Don't update if values haven't actually changed
    if (title === chapter.title && content === chapter.content && isLocked === (chapter.isLocked || false)) {
      return;
    }

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new autosave timeout (20 minutes)
    autosaveTimeoutRef.current = setTimeout(() => {
      saveChapter();
    }, 20 * 60 * 1000); // 20 minutes

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [title, content, isLocked, chapter, saveChapter]);

  // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isLocked && chapter) {
          saveChapter();
          if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, isLocked, saveChapter]);

  if (!chapter) {
    return (
      <div className="editor-empty">
        <div className="empty-content">
          <h3>No Chapter Selected</h3>
          <p>Select a chapter from the list or create a new one to start writing.</p>
        </div>
      </div>
    );
  }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getCharCount = (text: string) => {
    return text.length;
  };

  const wordCount = getWordCount(content);
  const charCount = getCharCount(content);

  return (
    <ContextAwareEditor
      entityId={chapter.id}
      entityType="chapter"
      onSave={onUpdateChapter}
      getCurrentData={() => chapter}
    >
      <div className="chapter-editor">
        <div className="editor-header">
          <div className="editor-header-content">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter title..."
              className="chapter-title-input"
              disabled={isLocked}
            />
            <div className="editor-header-actions">
              <button
                type="button"
                onClick={() => {
                  const newLockedState = !isLocked;
                  setIsLocked(newLockedState);
                  onUpdateChapter({
                    ...chapter,
                    isLocked: newLockedState,
                    updatedAt: Date.now(),
                  });
                }}
                className={`lock-btn ${isLocked ? 'locked' : ''}`}
                title={isLocked ? 'Unlock to edit' : 'Lock to prevent editing'}
              >
                {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  saveChapter();
                  // Clear autosave timeout since we just saved
                  if (autosaveTimeoutRef.current) {
                    clearTimeout(autosaveTimeoutRef.current);
                  }
                }}
                className="save-btn"
                title="Save now (Ctrl+S or Cmd+S)"
              >
                <Save size={18} />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => setShowVersionComparison(true)}
                className="version-btn"
                title="Compare versions"
              >
                <GitCompare size={18} />
                <span>Versions</span>
              </button>
              <div className="chapter-stats">
                <span className="stat-item">{wordCount} words</span>
                <span className="stat-divider">·</span>
                <span className="stat-item">{charCount} characters</span>
                <span className="stat-divider">·</span>
                <span className="stat-item">
                  Last edited: {new Date(chapter.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="editor-content">
          <textarea
            ref={contentTextareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your chapter..."
            className="chapter-content-textarea"
            disabled={isLocked}
          />
        </div>
      </div>
      {showVersionComparison && chapter && (
        <ChapterVersionComparison
          chapter={chapter}
          onClose={() => setShowVersionComparison(false)}
        />
      )}
    </ContextAwareEditor>
  );
}

export default ChapterEditor;

