import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Lock, Unlock } from 'lucide-react';
import { Character, CharacterRelationship } from '../types';
import ContextAwareEditor from './ContextAwareEditor';
import './CharacterEditor.css';

export type EntityState = 'new' | 'edit' | 'locked';

interface CharacterEditorProps {
  character: Character | null;
  allCharacters: Character[];
  onUpdateCharacter: (character: Character) => void;
  onStateChange?: (state: EntityState) => void;
}

function CharacterEditor({ character, allCharacters, onUpdateCharacter, onStateChange }: CharacterEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [biography, setBiography] = useState('');
  const [characterArc, setCharacterArc] = useState('');
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const lastCharacterIdRef = useRef<string | null>(null);
  const isInternalUpdateRef = useRef(false);
  
  // Determine current state
  const getCurrentState = (): EntityState => {
    if (!character) return 'new';
    if (character.isLocked) return 'locked';
    return 'edit';
  };
  
  const currentState = getCurrentState();

  // Only sync when character ID changes, not on every update
  useEffect(() => {
    if (!character) {
      setIsLocked(false);
      lastCharacterIdRef.current = null;
      return;
    }

    // Only update if this is a different character
    if (character.id !== lastCharacterIdRef.current) {
      setName(character.name);
      setDescription(character.description);
      setBiography(character.biography);
      setCharacterArc(character.characterArc || '');
      setRelationships(character.relationships || []);
      setIsLocked(character.isLocked || false);
      lastCharacterIdRef.current = character.id;
      isInternalUpdateRef.current = false;
    } else if (!isInternalUpdateRef.current) {
      // Only sync if the update came from outside (e.g., another component)
      // Check if values actually changed before updating
      if (
        name !== character.name ||
        description !== character.description ||
        biography !== character.biography ||
        characterArc !== (character.characterArc || '') ||
        JSON.stringify(relationships) !== JSON.stringify(character.relationships || [])
      ) {
        setName(character.name);
        setDescription(character.description);
        setBiography(character.biography);
        setCharacterArc(character.characterArc || '');
        setRelationships(character.relationships || []);
        setIsLocked(character.isLocked || false);
      }
    }
  }, [character, name, description, biography, characterArc, relationships]);
  
  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(currentState);
    }
  }, [currentState, onStateChange]);

  useEffect(() => {
    if (!character) return;
    
    // Don't update if values haven't actually changed
    const currentRelationships = character.relationships || [];
    const relationshipsEqual = JSON.stringify(relationships) === JSON.stringify(currentRelationships);
    
    if (
      name === character.name &&
      description === character.description &&
      biography === character.biography &&
      characterArc === (character.characterArc || '') &&
      relationshipsEqual
    ) {
      return;
    }

    const timeoutId = setTimeout(() => {
      isInternalUpdateRef.current = true;
      const updatedCharacter: Character = {
        ...character,
        name,
        description,
        biography,
        characterArc,
        relationships,
        isLocked,
        updatedAt: Date.now(),
      };
      onUpdateCharacter(updatedCharacter);
      // Reset flag after a short delay to allow state to update
      setTimeout(() => {
        isInternalUpdateRef.current = false;
      }, 100);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, biography, characterArc, relationships, character]);

  const handleAddRelationship = () => {
    const newRelationship: CharacterRelationship = {
      targetCharacterId: '',
      relationshipType: '',
      description: '',
    };
    setRelationships([...relationships, newRelationship]);
  };

  const handleRemoveRelationship = (index: number) => {
    setRelationships(relationships.filter((_, i) => i !== index));
  };

  const handleUpdateRelationship = (index: number, field: keyof CharacterRelationship, value: string) => {
    const updated = [...relationships];
    updated[index] = { ...updated[index], [field]: value };
    setRelationships(updated);
  };

  if (!character) {
    return (
      <div className="editor-empty">
        <div className="empty-content">
          <h3>No Character Selected</h3>
          <p>Select a character from the list or create a new one to start editing.</p>
        </div>
      </div>
    );
  }

  // Filter out the current character from the list
  const availableCharacters = allCharacters.filter(c => c.id !== character.id);

  const typeLabels = {
    main: 'Main Character',
    secondary: 'Secondary Character',
    tertiary: 'Tertiary Character',
  };

  return (
    <ContextAwareEditor
      entityId={character.id}
      entityType="character"
      onSave={onUpdateCharacter}
      getCurrentData={() => character}
    >
      <div className="character-editor">
        <div className="editor-header">
          <div className="editor-header-content">
            <span className="character-type-badge">{typeLabels[character.type]}</span>
            <div className="editor-header-actions">
              <button
                type="button"
                onClick={() => {
                  const newLockedState = !isLocked;
                  setIsLocked(newLockedState);
                  onUpdateCharacter({
                    ...character,
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
              <div className="character-meta">
                Last edited: {new Date(character.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="editor-content">
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name..."
              className="input-field"
              disabled={isLocked}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Quick Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of the character..."
              className="textarea-field textarea-small"
              rows={3}
              disabled={isLocked}
            />
          </div>

          <div className="form-group">
            <label htmlFor="biography">Full Biography</label>
            <textarea
              id="biography"
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              placeholder="Write the complete biography, backstory, personality traits, motivations, and any other details about the character..."
              className="textarea-field textarea-large"
              disabled={isLocked}
            />
          </div>

          <div className="form-group">
            <label htmlFor="characterArc">Character Arc</label>
            <textarea
              id="characterArc"
              value={characterArc}
              onChange={(e) => setCharacterArc(e.target.value)}
              placeholder="Describe how this character changes and develops throughout the story. What do they learn? How do they grow? What challenges transform them?"
              className="textarea-field textarea-medium"
              rows={5}
              disabled={isLocked}
            />
          </div>

          <div className="form-section">
            <div className="section-header">
              <label>Relationships</label>
              <button 
                type="button"
                onClick={handleAddRelationship}
                className="add-relationship-btn"
                title="Add relationship"
                disabled={isLocked}
              >
                <Plus size={16} />
                Add Relationship
              </button>
            </div>

            {relationships.length === 0 ? (
              <div className="no-relationships-message">
                <p>No relationships defined yet. Click "Add Relationship" to connect this character with others in your story.</p>
              </div>
            ) : (
              <div className="relationships-list">
                {relationships.map((rel, index) => (
                  <div key={index} className="relationship-item">
                    <div className="relationship-fields">
                      <div className="relationship-field">
                        <label>Character</label>
                        <select
                          value={rel.targetCharacterId}
                          onChange={(e) => handleUpdateRelationship(index, 'targetCharacterId', e.target.value)}
                          className="select-field"
                          disabled={isLocked}
                        >
                          <option value="">Select a character...</option>
                          {availableCharacters.map(char => (
                            <option key={char.id} value={char.id}>{char.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="relationship-field">
                        <label>Relationship Type</label>
                        <input
                          type="text"
                          value={rel.relationshipType}
                          onChange={(e) => handleUpdateRelationship(index, 'relationshipType', e.target.value)}
                          placeholder="e.g., Friend, Enemy, Mentor, Sibling..."
                          className="input-field"
                          disabled={isLocked}
                        />
                      </div>
                    </div>

                    <div className="relationship-field relationship-description">
                      <label>Description</label>
                      <textarea
                        value={rel.description}
                        onChange={(e) => handleUpdateRelationship(index, 'description', e.target.value)}
                        placeholder="Describe the nature of their relationship, history, dynamics..."
                        className="textarea-field"
                        rows={2}
                        disabled={isLocked}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRelationship(index)}
                      className="remove-relationship-btn"
                      title="Remove relationship"
                      disabled={isLocked}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ContextAwareEditor>
  );
}

export default CharacterEditor;

