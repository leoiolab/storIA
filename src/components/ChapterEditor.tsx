import { useState, useEffect } from 'react';
import { Chapter } from '../types';
import ContextAwareEditor from './ContextAwareEditor';
import './ChapterEditor.css';

interface ChapterEditorProps {
  chapter: Chapter | null;
  onUpdateChapter: (chapter: Chapter) => void;
}

function ChapterEditor({ chapter, onUpdateChapter }: ChapterEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setContent(chapter.content);
    }
  }, [chapter]);

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
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapter title..."
            className="chapter-title-input"
          />
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

        <div className="editor-content">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your chapter..."
            className="chapter-content-textarea"
          />
        </div>
      </div>
    </ContextAwareEditor>
  );
}

export default ChapterEditor;

