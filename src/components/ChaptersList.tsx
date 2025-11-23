import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Chapter } from '../types';
import './ChaptersList.css';

interface ChaptersListProps {
  chapters: Chapter[];
  selectedChapter: Chapter | null;
  onSelectChapter: (chapter: Chapter) => void;
  onAddChapter: (chapter: Chapter) => void;
  onDeleteChapter: (id: string) => void;
}

function ChaptersList({
  chapters,
  selectedChapter,
  onSelectChapter,
  onAddChapter,
  onDeleteChapter,
}: ChaptersListProps) {
  const handleAddChapter = () => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      title: 'Untitled Chapter',
      content: '',
      order: chapters.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAddChapter(newChapter);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chapter?')) {
      onDeleteChapter(id);
    }
  };

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  return (
    <div className="chapters-list">
      <div className="list-header">
        <h2>Chapters</h2>
        <button className="add-button" onClick={handleAddChapter} title="Add new chapter">
          <Plus size={18} />
          <span>New Chapter</span>
        </button>
      </div>
      <div className="list-content">
        {sortedChapters.length === 0 ? (
          <div className="empty-state-large">
            <p>No chapters yet</p>
            <button className="add-button-large" onClick={handleAddChapter}>
              <Plus size={20} />
              <span>Create First Chapter</span>
            </button>
          </div>
        ) : (
          <div className="chapters-container">
            {sortedChapters.map((chapter, index) => (
              <div
                key={chapter.id}
                className={`chapter-item ${selectedChapter?.id === chapter.id ? 'active' : ''}`}
                onClick={() => onSelectChapter(chapter)}
              >
                <div className="chapter-drag-handle">
                  <GripVertical size={16} />
                </div>
                <div className="chapter-item-content">
                  <div className="chapter-header-row">
                    <span className="chapter-number">Chapter {index + 1}</span>
                    <span className="chapter-word-count">
                      {getWordCount(chapter.content)} words
                    </span>
                  </div>
                  <div className="chapter-title">{chapter.title}</div>
                  {chapter.content && (
                    <div className="chapter-preview">{chapter.content}</div>
                  )}
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => handleDelete(e, chapter.id)}
                  title="Delete chapter"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ChaptersList;







