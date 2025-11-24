import { useState, useEffect } from 'react';
import { Lock, Unlock, GitCompare } from 'lucide-react';
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
  
  // Determine current state
  const getCurrentState = (): EntityState => {
    if (!chapter) return 'new';
    if (chapter.isLocked) return 'locked';
    return 'edit';
  };
  
  const currentState = getCurrentState();

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setContent(chapter.content);
      setIsLocked(chapter.isLocked || false);
    } else {
      setIsLocked(false);
    }
  }, [chapter]);
  
  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  useEffect(() => {
    if (!chapter) return;
    
    // Don't update if values haven't actually changed
    if (title === chapter.title && content === chapter.content) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const updatedChapter: Chapter = {
        ...chapter,
        title,
        content,
        isLocked,
        updatedAt: Date.now(),
      };
      onUpdateChapter(updatedChapter);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, content]);

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

