import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { Chapter, ChapterSection } from '../types';
import { formatTextWithDialogue } from '../utils/textFormatting';
import './ChapterSectionsEditor.css';

interface ChapterSectionsEditorProps {
  chapter: Chapter;
  onUpdateChapter: (chapter: Chapter) => void;
  isLocked: boolean;
  showPreview?: boolean;
}

export interface ChapterSectionsEditorRef {
  save: () => void;
}

const ChapterSectionsEditor = forwardRef<ChapterSectionsEditorRef, ChapterSectionsEditorProps>(
  ({ chapter, onUpdateChapter, isLocked, showPreview = false }, ref) => {
  const [sections, setSections] = useState<ChapterSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastChapterIdRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingActiveSectionIdRef = useRef<string | null>(null);

  // Initialize sections from chapter
  useEffect(() => {
    if (!chapter) return;

    // If chapter ID changed, reset everything
    if (chapter.id !== lastChapterIdRef.current) {
      lastChapterIdRef.current = chapter.id;
      
      // Migrate legacy content to sections if needed
      if (chapter.sections && chapter.sections.length > 0) {
        setSections(chapter.sections);
        // Set first section as active by default
        if (chapter.sections.length > 0) {
          setActiveSectionId(chapter.sections[0].id);
        }
      } else if (chapter.content && chapter.content.trim()) {
        // Migrate legacy content to a single section
        const words = chapter.content.trim().split(/\s+/);
        const migratedSections: ChapterSection[] = [];
        
        // Split into ~2000 word sections
        for (let i = 0; i < words.length; i += 2000) {
          const sectionWords = words.slice(i, i + 2000);
          const sectionContent = sectionWords.join(' ');
          migratedSections.push({
            id: `section-${Date.now()}-${i}`,
            title: `Section ${migratedSections.length + 1}`,
            content: sectionContent,
            order: migratedSections.length,
            wordCount: sectionWords.length,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        
        if (migratedSections.length === 0) {
          // Empty chapter - create one empty section
          migratedSections.push({
            id: `section-${Date.now()}`,
            title: 'Section 1',
            content: '',
            order: 0,
            wordCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        
        setSections(migratedSections);
        setActiveSectionId(migratedSections[0].id);
        
        // Save migrated sections
        onUpdateChapter({
          ...chapter,
          sections: migratedSections,
          updatedAt: Date.now(),
        });
      } else {
        // No content - create one empty section
        const newSection: ChapterSection = {
          id: `section-${Date.now()}`,
          title: 'Section 1',
          content: '',
          order: 0,
          wordCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSections([newSection]);
        setActiveSectionId(newSection.id);
      }
    } else if (chapter.sections) {
      // Chapter ID same, but sections might have been updated externally
      const newSections = chapter.sections;
      
      // Check if we have a pending active section ID (from handleAddSection)
      const targetActiveSectionId = pendingActiveSectionIdRef.current || activeSectionId;
      const currentActiveSectionExists = targetActiveSectionId && newSections.find(s => s.id === targetActiveSectionId);
      
      // Only update sections if they actually changed (to avoid unnecessary re-renders)
      const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(newSections);
      if (sectionsChanged) {
        setSections(newSections);
      }
      
      // Preserve active section if it still exists, otherwise set to first section
      if (targetActiveSectionId && currentActiveSectionExists) {
        // Pending or current active section exists - use it
        if (targetActiveSectionId !== activeSectionId) {
          setActiveSectionId(targetActiveSectionId);
        }
        pendingActiveSectionIdRef.current = null; // Clear pending
      } else if (targetActiveSectionId && !currentActiveSectionExists) {
        // Pending section doesn't exist (shouldn't happen, but handle gracefully)
        setActiveSectionId(newSections[0]?.id || null);
        pendingActiveSectionIdRef.current = null;
      } else if (activeSectionId && !currentActiveSectionExists) {
        // Active section was deleted or doesn't exist anymore - set to first section
        setActiveSectionId(newSections[0]?.id || null);
      } else if (!activeSectionId && newSections.length > 0) {
        // No active section but sections exist - set to first section
        setActiveSectionId(newSections[0].id);
      }
      // If activeSectionId exists and the section still exists, keep it (don't reset to first)
    }
  }, [chapter, onUpdateChapter, activeSectionId]);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const saveSections = useCallback((updatedSections: ChapterSection[]) => {
    if (!chapter) return;

    // Calculate total word count
    const totalWordCount = updatedSections.reduce((sum, section) => {
      return sum + (section.wordCount || getWordCount(section.content));
    }, 0);

    // Combine all sections for legacy content field (for backward compatibility)
    // Section titles are for reference only - don't include them in the final text
    const sortedSections = updatedSections.sort((a, b) => a.order - b.order);
    const combinedContent = sortedSections
      .map((s) => {
        if (!s.content || !s.content.trim()) return '';
        return s.content.trim();
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();

    const updatedChapter: Chapter = {
      ...chapter,
      sections: updatedSections,
      content: combinedContent, // Keep for backward compatibility - always sync this
      wordCount: totalWordCount,
      updatedAt: Date.now(),
    };

    onUpdateChapter(updatedChapter);
  }, [chapter, onUpdateChapter]);
  
  // Expose save function to parent via ref
  useImperativeHandle(ref, () => ({
    save: () => {
      // Save current sections state immediately
      if (sections.length > 0) {
        saveSections(sections);
      }
    }
  }), [sections, saveSections]);

  const handleSectionUpdate = useCallback((sectionId: string, updates: Partial<ChapterSection>) => {
    setSections(prev => {
      const section = prev.find(s => s.id === sectionId);
      if (!section) return prev;
      
      const updatedSection = {
        ...section,
        ...updates,
        wordCount: updates.content !== undefined ? getWordCount(updates.content) : section.wordCount,
        updatedAt: Date.now(),
      };
      
      // Auto-split if section exceeds 2000 words
      const wordCount = updatedSection.wordCount || 0;
      if (wordCount > 2000 && updates.content) {
        const words = updates.content.trim().split(/\s+/);
        const newSections: ChapterSection[] = [];
        
        // Split into ~2000 word chunks
        for (let i = 0; i < words.length; i += 2000) {
          const sectionWords = words.slice(i, i + 2000);
          const sectionContent = sectionWords.join(' ');
          newSections.push({
            id: i === 0 ? sectionId : `section-${Date.now()}-${i}`,
            title: i === 0 ? section.title : `Section ${prev.length + newSections.length}`,
            content: sectionContent,
            order: section.order + newSections.length,
            wordCount: sectionWords.length,
            createdAt: i === 0 ? section.createdAt : Date.now(),
            updatedAt: Date.now(),
          });
        }
        
        // Replace current section with split sections
        const before = prev.filter(s => s.order < section.order);
        const after = prev.filter(s => s.order > section.order);
        
        // Reorder sections after the split
        const reorderedAfter = after.map(s => ({
          ...s,
          order: s.order + newSections.length - 1,
        }));
        
        const result = [...before, ...newSections, ...reorderedAfter];
        // Clear autosave timeout and set new one
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current);
        }
        
        autosaveTimeoutRef.current = setTimeout(() => {
          saveSections(result);
        }, 20 * 60 * 1000); // 20 minutes
        
        return result;
      }
      
      // Regular update - no split needed
      const updated = prev.map(s => s.id === sectionId ? updatedSection : s);
      
      // Clear autosave timeout and set new one
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      
      autosaveTimeoutRef.current = setTimeout(() => {
        saveSections(updated);
      }, 20 * 60 * 1000); // 20 minutes
      
      return updated;
    });
  }, [saveSections]);

  // Fix formatting for active section - break up large paragraphs
  const fixSectionFormatting = useCallback(() => {
    const currentActiveSection = sections.find(s => s.id === activeSectionId);
    if (!currentActiveSection || !currentActiveSection.content.trim()) return;

    let formatted = currentActiveSection.content.trim();
    
    // If content already has paragraph breaks, just clean them up
    if (formatted.includes('\n\n')) {
      formatted = formatted
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n\n');
    } else {
      // Content is one big paragraph - break it up intelligently
      // Strategy: Break after sentences ending with .!? followed by space and capital letter
      // Also break at dialogue boundaries
      
      // Normalize any existing single newlines
      formatted = formatted.replace(/\n+/g, ' ');
      
      // Break at sentence endings followed by capital letters (new paragraph)
      formatted = formatted.replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2');
      
      // Break at dialogue boundaries - after closing quote followed by capital letter
      formatted = formatted.replace(/([""])\s+([A-Z][a-z])/g, '$1\n\n$2');
      
      // Break before opening quotes after sentence endings
      formatted = formatted.replace(/([.!?])\s+([""])/g, '$1\n\n$2');
      
      // Clean up: remove multiple consecutive newlines
      formatted = formatted.replace(/\n{3,}/g, '\n\n');
      
      // Trim each paragraph
      formatted = formatted
        .split('\n\n')
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n\n');
    }
    
    // Update section content if changed
    if (formatted !== currentActiveSection.content) {
      handleSectionUpdate(currentActiveSection.id, { content: formatted });
    }
  }, [sections, activeSectionId, handleSectionUpdate]);

  const handleAddSection = () => {
    const newSection: ChapterSection = {
      id: `section-${Date.now()}`,
      title: `Section ${sections.length + 1}`,
      content: '',
      order: sections.length,
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const updated = [...sections, newSection];
    setSections(updated);
    // Set pending ref first, then set state, so useEffect knows to preserve this section
    pendingActiveSectionIdRef.current = newSection.id;
    setActiveSectionId(newSection.id);
    saveSections(updated); // Save immediately when adding
  };

  const handleDeleteSection = (sectionId: string) => {
    if (sections.length <= 1) {
      alert('A chapter must have at least one section.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this section?')) {
      const section = sections.find(s => s.id === sectionId);
      if (!section) return;
      
      const updated = sections
        .filter(s => s.id !== sectionId)
        .map(s => s.order > section.order ? { ...s, order: s.order - 1 } : s);
      
      setSections(updated);
      if (activeSectionId === sectionId) {
        setActiveSectionId(updated[0]?.id || null);
      }
      saveSections(updated); // Save immediately when deleting
    }
  };

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const totalWordCount = sections.reduce((sum, s) => sum + (s.wordCount || getWordCount(s.content)), 0);
  const activeSection = sections.find(s => s.id === activeSectionId);
  const activeSectionWordCount = activeSection ? (activeSection.wordCount || getWordCount(activeSection.content)) : 0;
  const isOverLimit = activeSectionWordCount > 2000;

  return (
    <div className="chapter-sections-editor">
      <div className="sections-header">
        <div className="sections-header-left">
          <div className="section-selector-group">
            <label htmlFor="section-select" className="section-selector-label">
              Section:
            </label>
            <select
              id="section-select"
              value={activeSectionId || ''}
              onChange={(e) => setActiveSectionId(e.target.value)}
              className="section-selector"
              disabled={isLocked || sections.length === 0}
            >
              {sortedSections.map((section, index) => (
                <option key={section.id} value={section.id}>
                  Section {index + 1}: {section.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sections-header-info">
            <span className="sections-count">{sections.length} section{sections.length !== 1 ? 's' : ''}</span>
            <span className="sections-word-count">{totalWordCount.toLocaleString()} words total</span>
          </div>
        </div>
        <div className="sections-header-actions">
          {!isLocked && (
            <>
              <button
                className="add-section-btn"
                onClick={handleAddSection}
                title="Add new section"
              >
                <Plus size={18} />
                <span>Add Section</span>
              </button>
              {activeSection && sections.length > 1 && (
                <button
                  className="delete-section-btn"
                  onClick={() => handleDeleteSection(activeSection.id)}
                  title="Delete current section"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {activeSection && (
        <div className="section-editor-container">
          <div className="section-editor-header">
            <input
              type="text"
              value={activeSection.title}
              onChange={(e) => handleSectionUpdate(activeSection.id, { title: e.target.value })}
              className="section-title-input"
              placeholder="Section title..."
              disabled={isLocked}
            />
            <div className="section-editor-meta">
              <button
                type="button"
                onClick={fixSectionFormatting}
                className="section-format-btn"
                title="Fix formatting - break up large paragraphs"
                disabled={isLocked || !activeSection.content.trim()}
              >
                <Wand2 size={16} />
                <span>Fix Format</span>
              </button>
              <span className="section-word-count-display">
                {activeSectionWordCount.toLocaleString()} words
                {isOverLimit && <span className="warning-badge"> (Will auto-split)</span>}
              </span>
            </div>
          </div>
          
          <div className="section-editor-content">
            {showPreview ? (
              <div className="section-content-preview">
                {activeSection.content.split(/\n\n+/).map((para, idx) => {
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
              <>
                <textarea
                  ref={sectionTextareaRef}
                  value={activeSection.content}
                  onChange={(e) => handleSectionUpdate(activeSection.id, { content: e.target.value })}
                  placeholder="Write your section content here..."
                  className="section-content-textarea"
                  disabled={isLocked}
                />
                {isOverLimit && (
                  <div className="section-warning">
                    ⚠️ This section exceeds 2000 words and will be automatically split into multiple sections when saved.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )      }
    </div>
  );
});

ChapterSectionsEditor.displayName = 'ChapterSectionsEditor';

export default ChapterSectionsEditor;

