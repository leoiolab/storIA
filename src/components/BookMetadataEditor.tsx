import { useState, useEffect } from 'react';
import { BookMetadata } from '../types';
import './BookMetadataEditor.css';

interface BookMetadataEditorProps {
  metadata: BookMetadata;
  onUpdateMetadata: (metadata: BookMetadata) => void;
}

function BookMetadataEditor({ metadata, onUpdateMetadata }: BookMetadataEditorProps) {
  const [localMetadata, setLocalMetadata] = useState(metadata);

  useEffect(() => {
    setLocalMetadata(metadata);
  }, [metadata]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdateMetadata(localMetadata);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [localMetadata]);

  const handleThemeChange = (value: string) => {
    const themes = value.split(',').map(t => t.trim()).filter(t => t);
    setLocalMetadata({ ...localMetadata, themes });
  };

  return (
    <div className="metadata-editor">
      <div className="metadata-header">
        <h2>Book Details</h2>
      </div>

      <div className="metadata-content">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={localMetadata.title}
            onChange={(e) => setLocalMetadata({ ...localMetadata, title: e.target.value })}
            placeholder="Your book title..."
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="author">Author</label>
          <input
            id="author"
            type="text"
            value={localMetadata.author || ''}
            onChange={(e) => setLocalMetadata({ ...localMetadata, author: e.target.value })}
            placeholder="Author name..."
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="genre">Genre</label>
          <input
            id="genre"
            type="text"
            value={localMetadata.genre || ''}
            onChange={(e) => setLocalMetadata({ ...localMetadata, genre: e.target.value })}
            placeholder="e.g., Fantasy, Mystery, Romance..."
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="targetWordCount">Target Word Count</label>
          <input
            id="targetWordCount"
            type="number"
            value={localMetadata.targetWordCount || ''}
            onChange={(e) => setLocalMetadata({ ...localMetadata, targetWordCount: parseInt(e.target.value) || undefined })}
            placeholder="e.g., 80000"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="themes">Themes (comma-separated)</label>
          <input
            id="themes"
            type="text"
            value={localMetadata.themes?.join(', ') || ''}
            onChange={(e) => handleThemeChange(e.target.value)}
            placeholder="e.g., Love, Betrayal, Redemption..."
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="synopsis">Synopsis</label>
          <textarea
            id="synopsis"
            value={localMetadata.synopsis || ''}
            onChange={(e) => setLocalMetadata({ ...localMetadata, synopsis: e.target.value })}
            placeholder="A brief synopsis of your book..."
            className="textarea-field"
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}

export default BookMetadataEditor;







