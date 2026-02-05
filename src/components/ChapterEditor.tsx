import { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Unlock, GitCompare, Save, FileText, Eye, Edit } from 'lucide-react';
import { Chapter } from '../types';
import ContextAwareEditor from './ContextAwareEditor';
import ChapterVersionComparison from './ChapterVersionComparison';
import ChapterSectionsEditor, { ChapterSectionsEditorRef } from './ChapterSectionsEditor';
import { formatTextWithDialogue } from '../utils/textFormatting';
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
  const [useSections, setUseSections] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const sectionsEditorRef = useRef<ChapterSectionsEditorRef>(null);
  const lastChapterIdRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedChapterRef = useRef<Chapter | null>(null);
  
  // Determine current state
  const getCurrentState = (): EntityState => {
    if (!chapter) return 'new';
    if (chapter.isLocked) return 'locked';
    return 'edit';
  };
  
  const currentState = getCurrentState();

  // Only sync when chapter ID changes or when props actually change (not when local state changes)
  useEffect(() => {
    if (!chapter) {
      setIsLocked(false);
      lastChapterIdRef.current = null;
      lastSyncedChapterRef.current = null;
      return;
    }

    // Only update if this is a different chapter
    if (chapter.id !== lastChapterIdRef.current) {
      setTitle(chapter.title);
      // If chapter has sections, use combined content from sections, otherwise use content
      const chapterContent = chapter.sections && chapter.sections.length > 0
        ? chapter.sections
            .sort((a, b) => a.order - b.order)
            .map(s => s.content)
            .join('\n\n')
        : chapter.content || '';
      setContent(chapterContent);
      setIsLocked(chapter.isLocked || false);
      // Enable sections if chapter has sections or content is long
      const hasSections = !!(chapter.sections && chapter.sections.length > 0);
      const isLongContent = !!(chapter.content && chapter.content.trim().split(/\s+/).length > 2000);
      setUseSections(hasSections || isLongContent);
      lastChapterIdRef.current = chapter.id;
      lastSyncedChapterRef.current = chapter;
      isInternalUpdateRef.current = false;
    } else if (!isInternalUpdateRef.current) {
      // Only sync FROM props if the props actually changed (external update)
      // Don't sync if only local state changed (user typing)
      const lastSynced = lastSyncedChapterRef.current;
      const sectionsChanged = lastSynced?.sections !== chapter.sections || 
        (chapter.sections && lastSynced?.sections && 
         JSON.stringify(chapter.sections) !== JSON.stringify(lastSynced.sections));
      
      if (lastSynced && (
        lastSynced.title !== chapter.title ||
        lastSynced.content !== chapter.content ||
        sectionsChanged ||
        (lastSynced.isLocked || false) !== (chapter.isLocked || false)
      )) {
        // Props changed externally (e.g., from autosave), sync them
        if (title !== chapter.title) setTitle(chapter.title);
        
        // If sections changed, update content from sections
        if (sectionsChanged && chapter.sections && chapter.sections.length > 0) {
          const sortedSections = chapter.sections.sort((a, b) => a.order - b.order);
          // Section titles are for reference only - don't include them in the final text
          const combinedContent = sortedSections
            .map((s) => {
              if (!s.content || !s.content.trim()) return '';
              return s.content.trim();
            })
            .filter(Boolean)
            .join('\n\n')
            .trim();
          if (content !== combinedContent) setContent(combinedContent);
        } else if (content !== chapter.content) {
          setContent(chapter.content);
        }
        
        if (isLocked !== (chapter.isLocked || false)) setIsLocked(chapter.isLocked || false);
        lastSyncedChapterRef.current = chapter;
      }
    }
  }, [chapter]); // Only depend on chapter, not local state
  
  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  const saveChapter = useCallback(() => {
    if (!chapter) return;
    
    isInternalUpdateRef.current = true;
    
    // If in sections view, we need to get the latest sections from the chapter
    // and ensure everything is synced
    if (useSections && chapter.sections && chapter.sections.length > 0) {
      // In sections view - ensure sections are saved with current title and lock status
      const sortedSections = chapter.sections.sort((a, b) => a.order - b.order);
      // Section titles are for reference only - don't include them in the final text
      const combinedContent = sortedSections
        .map((s) => {
          if (!s.content || !s.content.trim()) return '';
          return s.content.trim();
        })
        .filter(Boolean)
        .join('\n\n')
        .trim();
      
      const totalWordCount = chapter.sections.reduce((sum, s) => {
        return sum + (s.wordCount || s.content.trim().split(/\s+/).filter((w: string) => w.length > 0).length);
      }, 0);
      
      const updatedChapter: Chapter = {
        ...chapter,
        title,
        content: combinedContent, // Sync content from sections
        sections: chapter.sections, // Keep current sections
        wordCount: totalWordCount,
        isLocked,
        updatedAt: Date.now(),
      };
      onUpdateChapter(updatedChapter);
    } else {
      // In single view - check if values have changed
      if (title === chapter.title && content === chapter.content && isLocked === (chapter.isLocked || false)) {
        isInternalUpdateRef.current = false;
        return;
      }
      
      // If chapter has sections, we need to update sections from the single content view
      let updatedSections = chapter.sections;
      if (chapter.sections && chapter.sections.length > 0 && content !== chapter.content) {
        // Content was edited in single view - need to update sections
        // Try to preserve section structure by splitting content proportionally
        const words = content.trim().split(/\s+/);
        const totalWords = words.length;
        const sectionCount = chapter.sections.length;
        const wordsPerSection = Math.ceil(totalWords / sectionCount);
        
        updatedSections = chapter.sections.map((section, index) => {
          const startIndex = index * wordsPerSection;
          const endIndex = Math.min(startIndex + wordsPerSection, totalWords);
          const sectionWords = words.slice(startIndex, endIndex);
          const sectionContent = sectionWords.join(' ');
          
          return {
            ...section,
            content: sectionContent,
            wordCount: sectionWords.length,
            updatedAt: Date.now(),
          };
        });
      }
      
      const updatedChapter: Chapter = {
        ...chapter,
        title,
        content,
        sections: updatedSections,
        isLocked,
        updatedAt: Date.now(),
      };
      onUpdateChapter(updatedChapter);
    }
    
    // Reset flag after state propagates back
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 200);
  }, [chapter, title, content, isLocked, useSections, onUpdateChapter]);

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
          // If in sections view, trigger save from sections editor
          if (useSections && sectionsEditorRef.current) {
            sectionsEditorRef.current.save();
          } else {
            saveChapter();
          }
          if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapter, isLocked, useSections, saveChapter]);

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
                  // If in sections view, trigger save from sections editor
                  if (useSections && sectionsEditorRef.current) {
                    sectionsEditorRef.current.save();
                  } else {
                    saveChapter();
                  }
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
                onClick={() => {
                  // When switching views, sync the data first
                  if (useSections && chapter.sections && chapter.sections.length > 0) {
                    // Switching from sections to single - update content from sections
                    const sortedSections = chapter.sections.sort((a, b) => a.order - b.order);
                    // Section titles are for reference only - don't include them in the final text
                    const combinedContent = sortedSections
                      .map((s) => {
                        if (!s.content || !s.content.trim()) return '';
                        return s.content.trim();
                      })
                      .filter(Boolean)
                      .join('\n\n')
                      .trim();
                    if (content !== combinedContent) {
                      setContent(combinedContent);
                    }
                  } else if (!useSections && content && chapter.sections && chapter.sections.length > 0) {
                    // Switching from single to sections - update sections from content
                    // Split content proportionally back into sections
                    const words = content.trim().split(/\s+/);
                    const totalWords = words.length;
                    const sectionCount = chapter.sections.length;
                    const wordsPerSection = Math.ceil(totalWords / sectionCount);
                    
                    const updatedSections = chapter.sections.map((section, index) => {
                      const startIndex = index * wordsPerSection;
                      const endIndex = Math.min(startIndex + wordsPerSection, totalWords);
                      const sectionWords = words.slice(startIndex, endIndex);
                      const sectionContent = sectionWords.join(' ');
                      
                      return {
                        ...section,
                        content: sectionContent,
                        wordCount: sectionWords.length,
                        updatedAt: Date.now(),
                      };
                    });
                    
                    // Save updated sections immediately
                    isInternalUpdateRef.current = true;
                    onUpdateChapter({
                      ...chapter,
                      sections: updatedSections,
                      content: content,
                      updatedAt: Date.now(),
                    });
                    setTimeout(() => {
                      isInternalUpdateRef.current = false;
                    }, 200);
                  }
                  setUseSections(!useSections);
                }}
                className={`toggle-btn ${useSections ? 'active' : ''}`}
                title={useSections ? 'Switch to single editor' : 'Switch to sections'}
              >
                <FileText size={18} />
                <span>{useSections ? 'Sections' : 'Single'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`toggle-btn ${showPreview ? 'active' : ''}`}
                title={showPreview ? 'Switch to edit mode' : 'Preview formatted text'}
              >
                {showPreview ? <Edit size={18} /> : <Eye size={18} />}
                <span>{showPreview ? 'Edit' : 'Preview'}</span>
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
          {useSections ? (
            <ChapterSectionsEditor
              ref={sectionsEditorRef}
              chapter={chapter}
              onUpdateChapter={onUpdateChapter}
              isLocked={isLocked}
              showPreview={showPreview}
            />
          ) : showPreview ? (
            <div className="chapter-content-preview">
              {content.split(/\n\n+/).map((para, idx) => {
                if (!para.trim()) return <br key={idx} />;
                const formattedSegments = formatTextWithDialogue(para);
                return (
                  <p key={idx} className="preview-paragraph">
                    {formattedSegments.map((segment, segIdx) => {
                      if (segment.text === '\n\n') return null;
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
              })}
            </div>
          ) : (
            <textarea
              ref={contentTextareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your chapter..."
              className="chapter-content-textarea"
              disabled={isLocked}
            />
          )}
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

