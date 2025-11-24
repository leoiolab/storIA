import { useState, useEffect, useRef, useCallback } from 'react';
import { BookMetadata } from '../types';
import { Image, X, Save } from 'lucide-react';
import './BookMetadataEditor.css';

interface BookMetadataEditorProps {
  metadata: BookMetadata;
  onUpdateMetadata: (metadata: BookMetadata) => void;
}

function BookMetadataEditor({ metadata, onUpdateMetadata }: BookMetadataEditorProps) {
  const [localMetadata, setLocalMetadata] = useState(metadata);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const authorInputRef = useRef<HTMLInputElement>(null);
  const genreInputRef = useRef<HTMLInputElement>(null);
  const targetWordCountInputRef = useRef<HTMLInputElement>(null);
  const themesInputRef = useRef<HTMLInputElement>(null);
  const synopsisTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lastMetadataIdRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only sync when metadata actually changes (not just reference)
  useEffect(() => {
    // Create a simple ID from metadata to detect actual changes
    const metadataId = JSON.stringify({
      title: metadata.title,
      author: metadata.author,
      genre: metadata.genre,
      coverImage: metadata.coverImage
    });

    // Only update if this is different metadata
    if (metadataId !== lastMetadataIdRef.current) {
      setLocalMetadata(metadata);
      lastMetadataIdRef.current = metadataId;
      isInternalUpdateRef.current = false;
    } else if (!isInternalUpdateRef.current) {
      // Only sync if the actual content is different (not just object reference)
      // This prevents unnecessary updates that cause cursor jumps
      const hasChanges = 
        localMetadata.title !== metadata.title ||
        localMetadata.author !== metadata.author ||
        localMetadata.genre !== metadata.genre ||
        localMetadata.synopsis !== metadata.synopsis ||
        localMetadata.targetWordCount !== metadata.targetWordCount ||
        JSON.stringify(localMetadata.themes) !== JSON.stringify(metadata.themes) ||
        localMetadata.coverImage !== metadata.coverImage;

      if (hasChanges) {
        setLocalMetadata(metadata);
      }
    }
  }, [metadata, localMetadata]);

  const saveMetadata = useCallback(() => {
    // Don't update if values haven't actually changed
    const hasChanges = 
      localMetadata.title !== metadata.title ||
      localMetadata.author !== metadata.author ||
      localMetadata.genre !== metadata.genre ||
      localMetadata.synopsis !== metadata.synopsis ||
      localMetadata.targetWordCount !== metadata.targetWordCount ||
      JSON.stringify(localMetadata.themes) !== JSON.stringify(metadata.themes) ||
      localMetadata.coverImage !== metadata.coverImage;

    if (!hasChanges) {
      return;
    }

    isInternalUpdateRef.current = true;
    onUpdateMetadata(localMetadata);
    // Reset flag after state propagates back
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 200);
  }, [localMetadata, metadata, onUpdateMetadata]);

  useEffect(() => {
    // Don't update if values haven't actually changed
    const hasChanges = 
      localMetadata.title !== metadata.title ||
      localMetadata.author !== metadata.author ||
      localMetadata.genre !== metadata.genre ||
      localMetadata.synopsis !== metadata.synopsis ||
      localMetadata.targetWordCount !== metadata.targetWordCount ||
      JSON.stringify(localMetadata.themes) !== JSON.stringify(metadata.themes) ||
      localMetadata.coverImage !== metadata.coverImage;

    if (!hasChanges) {
      return;
    }

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new autosave timeout (20 minutes)
    autosaveTimeoutRef.current = setTimeout(() => {
      saveMetadata();
    }, 20 * 60 * 1000); // 20 minutes

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [localMetadata, metadata, onUpdateMetadata, saveMetadata]);

  // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveMetadata();
        if (autosaveTimeoutRef.current) {
          clearTimeout(autosaveTimeoutRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveMetadata]);

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
        <button
          type="button"
          onClick={() => {
            saveMetadata();
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
            ref={titleInputRef}
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
            ref={authorInputRef}
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
            ref={genreInputRef}
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
            ref={targetWordCountInputRef}
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
            ref={themesInputRef}
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
            ref={synopsisTextareaRef}
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







