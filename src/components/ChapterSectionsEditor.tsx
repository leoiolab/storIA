import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Chapter, ChapterSection } from '../types';
import './ChapterSectionsEditor.css';

interface ChapterSectionsEditorProps {
  chapter: Chapter;
  onUpdateChapter: (chapter: Chapter) => void;
  isLocked: boolean;
}

function ChapterSectionsEditor({ chapter, onUpdateChapter, isLocked }: ChapterSectionsEditorProps) {
  const [sections, setSections] = useState<ChapterSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const sectionTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastChapterIdRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      setSections(chapter.sections);
      // Ensure active section still exists
      if (activeSectionId && !chapter.sections.find(s => s.id === activeSectionId)) {
        setActiveSectionId(chapter.sections[0]?.id || null);
      } else if (!activeSectionId && chapter.sections.length > 0) {
        setActiveSectionId(chapter.sections[0].id);
      }
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
    const combinedContent = updatedSections
      .sort((a, b) => a.order - b.order)
      .map(s => s.content)
      .join('\n\n');

    const updatedChapter: Chapter = {
      ...chapter,
      sections: updatedSections,
      content: combinedContent, // Keep for backward compatibility - always sync this
      wordCount: totalWordCount,
      updatedAt: Date.now(),
    };

    onUpdateChapter(updatedChapter);
  }, [chapter, onUpdateChapter]);

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
    setActiveSectionId(newSection.id);
    saveSections(updated);
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
      saveSections(updated);
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
              <span className="section-word-count-display">
                {activeSectionWordCount.toLocaleString()} words
                {isOverLimit && <span className="warning-badge"> (Will auto-split)</span>}
              </span>
            </div>
          </div>
          
          <div className="section-editor-content">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default ChapterSectionsEditor;

