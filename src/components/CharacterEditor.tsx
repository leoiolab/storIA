import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Character, CharacterRelationship } from '../types';
import ContextAwareEditor from './ContextAwareEditor';
import './CharacterEditor.css';

interface CharacterEditorProps {
  character: Character | null;
  allCharacters: Character[];
  onUpdateCharacter: (character: Character) => void;
}

function CharacterEditor({ character, allCharacters, onUpdateCharacter }: CharacterEditorProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [biography, setBiography] = useState('');
  const [characterArc, setCharacterArc] = useState('');
  const [relationships, setRelationships] = useState<CharacterRelationship[]>([]);

  useEffect(() => {
    if (character) {
      setName(character.name);
      setDescription(character.description);
      setBiography(character.biography);
      setCharacterArc(character.characterArc || '');
      setRelationships(character.relationships || []);
    }
  }, [character]);

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
      const updatedCharacter: Character = {
        ...character,
        name,
        description,
        biography,
        characterArc,
        relationships,
        updatedAt: Date.now(),
      };
      onUpdateCharacter(updatedCharacter);
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, biography, characterArc, relationships]);

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
            <div className="character-meta">
              Last edited: {new Date(character.updatedAt).toLocaleString()}
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
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRelationship(index)}
                      className="remove-relationship-btn"
                      title="Remove relationship"
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

