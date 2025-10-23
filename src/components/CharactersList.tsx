import { Plus, Trash2 } from 'lucide-react';
import { Character, CharacterType } from '../types';
import './CharactersList.css';

interface CharactersListProps {
  characters: Character[];
  selectedCharacter: Character | null;
  onSelectCharacter: (character: Character) => void;
  onAddCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
}

function CharactersList({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onAddCharacter,
  onDeleteCharacter,
}: CharactersListProps) {
  const handleAddCharacter = (type: CharacterType) => {
    const newCharacter: Character = {
      id: Date.now().toString(),
      name: 'Untitled Character',
      type,
      description: '',
      biography: '',
      relationships: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAddCharacter(newCharacter);
  };

  const groupedCharacters = {
    main: characters.filter(c => c.type === 'main'),
    secondary: characters.filter(c => c.type === 'secondary'),
    tertiary: characters.filter(c => c.type === 'tertiary'),
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this character?')) {
      onDeleteCharacter(id);
    }
  };

  const renderCharacterGroup = (type: CharacterType, title: string) => (
    <div className="character-group">
      <div className="character-group-header">
        <h3>{title}</h3>
        <button
          className="add-button-small"
          onClick={() => handleAddCharacter(type)}
          title={`Add ${title.toLowerCase()} character`}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="character-list">
        {groupedCharacters[type].length === 0 ? (
          <div className="empty-state">No characters yet</div>
        ) : (
          groupedCharacters[type].map(character => (
            <div
              key={character.id}
              className={`character-item ${selectedCharacter?.id === character.id ? 'active' : ''}`}
              onClick={() => onSelectCharacter(character)}
            >
              <div className="character-item-content">
                <div className="character-name">{character.name}</div>
                {character.description && (
                  <div className="character-preview">{character.description}</div>
                )}
              </div>
              <button
                className="delete-button"
                onClick={(e) => handleDelete(e, character.id)}
                title="Delete character"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="characters-list">
      <div className="list-header">
        <h2>Characters</h2>
      </div>
      <div className="list-content">
        {renderCharacterGroup('main', 'Main Characters')}
        {renderCharacterGroup('secondary', 'Secondary Characters')}
        {renderCharacterGroup('tertiary', 'Tertiary Characters')}
      </div>
    </div>
  );
}

export default CharactersList;


