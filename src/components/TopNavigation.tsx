import { useState, useRef, useEffect } from 'react';
import { Users, BookOpen, ChevronDown, Plus, Trash2, Target } from 'lucide-react';
import { Character, Chapter, PlotPoint } from '../types';
import './TopNavigation.css';

interface TopNavigationProps {
  characters: Character[];
  chapters: Chapter[];
  plotPoints: PlotPoint[];
  selectedCharacter: Character | null;
  selectedChapter: Chapter | null;
  selectedPlotPoint: PlotPoint | null;
  onSelectCharacter: (character: Character) => void;
  onSelectChapter: (chapter: Chapter) => void;
  onSelectPlotPoint: (plotPoint: PlotPoint) => void;
  onAddCharacter: (character: Character) => void;
  onAddChapter: (chapter: Chapter) => void;
  onAddPlotPoint: (plotPoint: PlotPoint) => void;
  onDeleteCharacter?: (id: string) => void;
  onDeleteChapter?: (id: string) => void;
  currentView: 'characters' | 'chapters' | 'metadata' | 'relationships' | 'storyarc' | 'reader' | 'plotpoints';
}

function TopNavigation({
  characters,
  chapters,
  plotPoints,
  selectedCharacter,
  selectedChapter,
  selectedPlotPoint,
  onSelectCharacter,
  onSelectChapter,
  onSelectPlotPoint,
  onAddCharacter,
  onAddChapter,
  onAddPlotPoint,
  onDeleteCharacter,
  onDeleteChapter,
  currentView,
}: TopNavigationProps) {
  const [charactersOpen, setCharactersOpen] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [plotPointsOpen, setPlotPointsOpen] = useState(false);
  const charactersRef = useRef<HTMLDivElement>(null);
  const chaptersRef = useRef<HTMLDivElement>(null);
  const plotPointsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (charactersRef.current && !charactersRef.current.contains(event.target as Node)) {
        setCharactersOpen(false);
      }
      if (chaptersRef.current && !chaptersRef.current.contains(event.target as Node)) {
        setChaptersOpen(false);
      }
      if (plotPointsRef.current && !plotPointsRef.current.contains(event.target as Node)) {
        setPlotPointsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
  const sortedPlotPoints = [...plotPoints].sort((a, b) => a.order - b.order);

  return (
    <div className="top-navigation">
      {/* Characters Dropdown */}
      {(currentView === 'characters' || selectedCharacter) && (
        <div className="nav-dropdown" ref={charactersRef}>
          <button
            className={`nav-dropdown-btn ${charactersOpen ? 'open' : ''}`}
            onClick={() => {
              setCharactersOpen(!charactersOpen);
              setChaptersOpen(false);
              setPlotPointsOpen(false);
            }}
          >
            <Users size={18} />
            <span>Characters</span>
            <ChevronDown size={16} className={charactersOpen ? 'rotated' : ''} />
          </button>
          {charactersOpen && (
            <div className="nav-dropdown-menu">
              <div className="dropdown-header">
                <span>Select Character</span>
                <button
                  className="dropdown-add-btn"
                  onClick={() => {
                    const newCharacter: Character = {
                      id: Date.now().toString(),
                      name: 'Untitled Character',
                      type: 'secondary',
                      description: '',
                      biography: '',
                      relationships: [],
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    onAddCharacter(newCharacter);
                    setCharactersOpen(false);
                  }}
                  title="Add new character"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="dropdown-content">
                {characters.length === 0 ? (
                  <div className="dropdown-empty">No characters yet</div>
                ) : (
                  characters.map(character => (
                    <div
                      key={character.id}
                      className={`dropdown-item-wrapper ${selectedCharacter?.id === character.id ? 'active' : ''}`}
                    >
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          onSelectCharacter(character);
                          setCharactersOpen(false);
                        }}
                      >
                        <div className="dropdown-item-content">
                          <div className="dropdown-item-name">{character.name}</div>
                          {character.description && (
                            <div className="dropdown-item-preview">{character.description}</div>
                          )}
                        </div>
                      </button>
                      {onDeleteCharacter && (
                        <button
                          className="dropdown-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this character?')) {
                              onDeleteCharacter(character.id);
                            }
                          }}
                          title="Delete character"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chapters Dropdown */}
      {(currentView === 'chapters' || selectedChapter) && (
        <div className="nav-dropdown" ref={chaptersRef}>
          <button
            className={`nav-dropdown-btn ${chaptersOpen ? 'open' : ''}`}
            onClick={() => {
              setChaptersOpen(!chaptersOpen);
              setCharactersOpen(false);
              setPlotPointsOpen(false);
            }}
          >
            <BookOpen size={18} />
            <span>Chapters</span>
            <ChevronDown size={16} className={chaptersOpen ? 'rotated' : ''} />
          </button>
          {chaptersOpen && (
            <div className="nav-dropdown-menu">
              <div className="dropdown-header">
                <span>Select Chapter</span>
                <button
                  className="dropdown-add-btn"
                  onClick={() => {
                    const newChapter: Chapter = {
                      id: Date.now().toString(),
                      title: 'Untitled Chapter',
                      content: '',
                      order: chapters.length,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    onAddChapter(newChapter);
                    setChaptersOpen(false);
                  }}
                  title="Add new chapter"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="dropdown-content">
                {sortedChapters.length === 0 ? (
                  <div className="dropdown-empty">No chapters yet</div>
                ) : (
                  sortedChapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`dropdown-item-wrapper ${selectedChapter?.id === chapter.id ? 'active' : ''}`}
                    >
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          onSelectChapter(chapter);
                          setChaptersOpen(false);
                        }}
                      >
                        <div className="dropdown-item-content">
                          <div className="dropdown-item-name">
                            Chapter {index + 1}: {chapter.title}
                          </div>
                          {chapter.content && (
                            <div className="dropdown-item-preview">
                              {chapter.content.substring(0, 60)}...
                            </div>
                          )}
                        </div>
                      </button>
                      {onDeleteChapter && (
                        <button
                          className="dropdown-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this chapter?')) {
                              onDeleteChapter(chapter.id);
                            }
                          }}
                          title="Delete chapter"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plot Points Dropdown */}
      {(currentView === 'plotpoints' || selectedPlotPoint) && (
        <div className="nav-dropdown" ref={plotPointsRef}>
          <button
            className={`nav-dropdown-btn ${plotPointsOpen ? 'open' : ''}`}
            onClick={() => {
              setPlotPointsOpen(!plotPointsOpen);
              setCharactersOpen(false);
              setChaptersOpen(false);
            }}
          >
            <Target size={18} />
            <span>Plot Points</span>
            <ChevronDown size={16} className={plotPointsOpen ? 'rotated' : ''} />
          </button>
          {plotPointsOpen && (
            <div className="nav-dropdown-menu">
              <div className="dropdown-header">
                <span>Select Plot Point</span>
                <button
                  className="dropdown-add-btn"
                  onClick={() => {
                    const newPlotPoint: PlotPoint = {
                      id: Date.now().toString(),
                      title: 'Untitled Plot Point',
                      description: '',
                      order: plotPoints.length,
                      category: 'other',
                    };
                    onAddPlotPoint(newPlotPoint);
                    setPlotPointsOpen(false);
                  }}
                  title="Add new plot point"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="dropdown-content">
                {sortedPlotPoints.length === 0 ? (
                  <div className="dropdown-empty">No plot points yet</div>
                ) : (
                  sortedPlotPoints.map(plotPoint => (
                    <div
                      key={plotPoint.id}
                      className={`dropdown-item-wrapper ${selectedPlotPoint?.id === plotPoint.id ? 'active' : ''}`}
                    >
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          onSelectPlotPoint(plotPoint);
                          setPlotPointsOpen(false);
                        }}
                      >
                        <div className="dropdown-item-content">
                          <div className="dropdown-item-name">{plotPoint.title}</div>
                          {plotPoint.description && (
                            <div className="dropdown-item-preview">
                              {plotPoint.description.substring(0, 60)}...
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TopNavigation;

