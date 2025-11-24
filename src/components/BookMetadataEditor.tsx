import { useState, useEffect, useRef } from 'react';
import { BookMetadata } from '../types';
import { Image, X } from 'lucide-react';
import './BookMetadataEditor.css';

interface BookMetadataEditorProps {
  metadata: BookMetadata;
  onUpdateMetadata: (metadata: BookMetadata) => void;
}

function BookMetadataEditor({ metadata, onUpdateMetadata }: BookMetadataEditorProps) {
  const [localMetadata, setLocalMetadata] = useState(metadata);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setLocalMetadata({ ...localMetadata, coverImage: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setLocalMetadata({ ...localMetadata, coverImage: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="metadata-editor">
      <div className="metadata-header">
        <h2>Book Details</h2>
      </div>

      <div className="metadata-content">
        <div className="form-group">
          <label htmlFor="coverImage">Book Cover</label>
          <div className="cover-image-upload">
            {localMetadata.coverImage ? (
              <div className="cover-image-preview">
                <img src={localMetadata.coverImage} alt="Book cover" />
                <button
                  type="button"
                  className="remove-image-btn"
                  onClick={handleRemoveImage}
                  title="Remove cover image"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                className="cover-image-placeholder"
                onClick={() => fileInputRef.current?.click()}
              >
                <Image size={32} />
                <span>Click to upload cover image</span>
                <small>JPG, PNG (max 5MB)</small>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="coverImage"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>

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







