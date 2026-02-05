import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { PlotPoint, Chapter, Character } from '../types';
import './PlotPointEditor.css';

export type EntityState = 'new' | 'edit' | 'locked';

interface PlotPointEditorProps {
  plotPoint: PlotPoint | null;
  allPlotPoints: PlotPoint[];
  chapters: Chapter[];
  characters: Character[];
  onUpdatePlotPoint: (plotPoint: PlotPoint) => void;
  onDeletePlotPoint?: (id: string) => void;
  onStateChange?: (state: EntityState) => void;
}

function PlotPointEditor({ 
  plotPoint, 
  allPlotPoints, 
  chapters, 
  characters,
  onUpdatePlotPoint,
  onDeletePlotPoint,
  onStateChange 
}: PlotPointEditorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [chapterId, setChapterId] = useState<string>('');
  const [characterIds, setCharacterIds] = useState<string[]>([]);
  const [order, setOrder] = useState(0);
  const [category, setCategory] = useState<PlotPoint['category']>('other');
  const lastPlotPointIdRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef(false);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedPlotPointRef = useRef<PlotPoint | null>(null);

  // Determine current state
  const getCurrentState = (): EntityState => {
    if (!plotPoint) return 'new';
    return 'edit';
  };

  const currentState = getCurrentState();

  // Sync when plot point ID changes or when props actually change
  useEffect(() => {
    if (!plotPoint) {
      setTitle('');
      setDescription('');
      setChapterId('');
      setCharacterIds([]);
      setOrder(0);
      setCategory('other');
      lastPlotPointIdRef.current = null;
      lastSyncedPlotPointRef.current = null;
      return;
    }

    // Only update if this is a different plot point
    if (plotPoint.id !== lastPlotPointIdRef.current) {
      setTitle(plotPoint.title);
      setDescription(plotPoint.description);
      setChapterId(plotPoint.chapterId || '');
      setCharacterIds(plotPoint.characterIds || []);
      setOrder(plotPoint.order);
      setCategory(plotPoint.category);
      lastPlotPointIdRef.current = plotPoint.id;
      lastSyncedPlotPointRef.current = plotPoint;
      isInternalUpdateRef.current = false;
    } else if (!isInternalUpdateRef.current) {
      // Only sync FROM props if the props actually changed (external update)
      const lastSynced = lastSyncedPlotPointRef.current;
      if (lastSynced && (
        lastSynced.title !== plotPoint.title ||
        lastSynced.description !== plotPoint.description ||
        (lastSynced.chapterId || '') !== (plotPoint.chapterId || '') ||
        JSON.stringify(lastSynced.characterIds || []) !== JSON.stringify(plotPoint.characterIds || []) ||
        lastSynced.order !== plotPoint.order ||
        lastSynced.category !== plotPoint.category
      )) {
        // Props changed externally, sync them
        if (title !== plotPoint.title) setTitle(plotPoint.title);
        if (description !== plotPoint.description) setDescription(plotPoint.description);
        if (chapterId !== (plotPoint.chapterId || '')) setChapterId(plotPoint.chapterId || '');
        const characterIdsEqual = JSON.stringify(characterIds) === JSON.stringify(plotPoint.characterIds || []);
        if (!characterIdsEqual) setCharacterIds(plotPoint.characterIds || []);
        if (order !== plotPoint.order) setOrder(plotPoint.order);
        if (category !== plotPoint.category) setCategory(plotPoint.category);
        lastSyncedPlotPointRef.current = plotPoint;
      }
    }
  }, [plotPoint]);

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  const savePlotPoint = useCallback(() => {
    if (!plotPoint) return;

    const characterIdsEqual = JSON.stringify(characterIds) === JSON.stringify(plotPoint.characterIds || []);

    if (
      title === plotPoint.title &&
      description === plotPoint.description &&
      chapterId === (plotPoint.chapterId || '') &&
      characterIdsEqual &&
      order === plotPoint.order &&
      category === plotPoint.category
    ) {
      return;
    }

    isInternalUpdateRef.current = true;
    const updatedPlotPoint: PlotPoint = {
      ...plotPoint,
      title,
      description,
      chapterId: chapterId || undefined,
      characterIds: characterIds.length > 0 ? characterIds : undefined,
      order,
      category,
    };
    onUpdatePlotPoint(updatedPlotPoint);
    setTimeout(() => {
      isInternalUpdateRef.current = false;
    }, 200);
  }, [plotPoint, title, description, chapterId, characterIds, order, category, onUpdatePlotPoint]);

  useEffect(() => {
    if (!plotPoint) return;

    const characterIdsEqual = JSON.stringify(characterIds) === JSON.stringify(plotPoint.characterIds || []);

    if (
      title === plotPoint.title &&
      description === plotPoint.description &&
      chapterId === (plotPoint.chapterId || '') &&
      characterIdsEqual &&
      order === plotPoint.order &&
      category === plotPoint.category
    ) {
      return;
    }

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new autosave timeout (20 minutes)
    autosaveTimeoutRef.current = setTimeout(() => {
      savePlotPoint();
    }, 20 * 60 * 1000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [title, description, chapterId, characterIds, order, category, plotPoint, savePlotPoint]);

  // Keyboard shortcut for manual save (Ctrl+S / Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (plotPoint) {
          savePlotPoint();
          if (autosaveTimeoutRef.current) {
            clearTimeout(autosaveTimeoutRef.current);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [plotPoint, savePlotPoint]);

  const handleToggleCharacter = (characterId: string) => {
    if (characterIds.includes(characterId)) {
      setCharacterIds(characterIds.filter(id => id !== characterId));
    } else {
      setCharacterIds([...characterIds, characterId]);
    }
  };

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

  if (!plotPoint) {
    return (
      <div className="editor-empty">
        <div className="empty-content">
          <h3>No Plot Point Selected</h3>
          <p>Select a plot point from the list or create a new one to start editing.</p>
        </div>
      </div>
    );
  }

  const categoryLabels = {
    setup: 'Setup',
    conflict: 'Conflict',
    climax: 'Climax',
    resolution: 'Resolution',
    other: 'Other',
  };

  return (
    <div className="plot-point-editor">
      <div className="editor-header">
        <div className="editor-header-content">
          <span className="plot-point-category-badge" style={{
            backgroundColor: {
              setup: '#5856d6',
              conflict: '#ff9500',
              climax: '#ff3b30',
              resolution: '#34c759',
              other: '#888',
            }[category]
          }}>
            {categoryLabels[category]}
          </span>
          <div className="editor-header-actions">
            <button
              type="button"
              onClick={() => {
                savePlotPoint();
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
            {onDeletePlotPoint && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this plot point?')) {
                    onDeletePlotPoint(plotPoint.id);
                  }
                }}
                className="delete-btn"
                title="Delete plot point"
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="editor-content">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Plot point title..."
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happens in this plot point..."
            className="textarea-field textarea-medium"
            rows={6}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as PlotPoint['category'])}
              className="select-field"
            >
              <option value="setup">Setup</option>
              <option value="conflict">Conflict</option>
              <option value="climax">Climax</option>
              <option value="resolution">Resolution</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="order">Order</label>
            <input
              id="order"
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="input-field"
              min="0"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="chapter">Chapter (Optional)</label>
          <select
            id="chapter"
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            className="select-field"
          >
            <option value="">No chapter assigned</option>
            {sortedChapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                Chapter {chapter.order + 1}: {chapter.title}
              </option>
            ))}
          </select>
        </div>

        <div className="form-section">
          <div className="section-header">
            <label>Characters (Optional)</label>
            <span className="section-subtitle">Select characters involved in this plot point</span>
          </div>

          {characters.length === 0 ? (
            <div className="no-characters-message">
              <p>No characters available. Create characters first to associate them with plot points.</p>
            </div>
          ) : (
            <div className="characters-checklist">
              {characters.map(character => (
                <label key={character.id} className="character-checkbox">
                  <input
                    type="checkbox"
                    checked={characterIds.includes(character.id)}
                    onChange={() => handleToggleCharacter(character.id)}
                  />
                  <span className="checkbox-label">{character.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PlotPointEditor;
