import { Users, Plus, Link } from 'lucide-react';
import { Character } from '../types';
import './RelationshipMap.css';

interface RelationshipMapProps {
  characters: Character[];
  onUpdateCharacter: (character: Character) => void;
  onCreateCharacter?: () => void;
}

function RelationshipMap({ characters, onCreateCharacter }: RelationshipMapProps) {
  console.log('RelationshipMap render - characters:', characters.length);
  
  if (characters.length === 0) {
    return (
      <div className="relationship-map-empty">
        <div className="empty-content">
          <Users size={48} className="empty-icon" />
          <h3>No Characters Yet</h3>
          <p>Create characters to visualize their relationships and connections.</p>
          {onCreateCharacter && (
            <button className="create-character-button" onClick={onCreateCharacter}>
              <Plus size={16} />
              Create Your First Character
            </button>
          )}
          <div className="empty-features">
            <div className="feature-item">
              <Link size={20} />
              <div>
                <strong>Relationship Mapping</strong>
                <span>Connect characters with relationships</span>
              </div>
            </div>
            <div className="feature-item">
              <Users size={20} />
              <div>
                <strong>Character Groups</strong>
                <span>Organize by Main, Secondary, Tertiary</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group characters by type
  const charactersByType = {
    main: characters.filter(c => c.type === 'main'),
    secondary: characters.filter(c => c.type === 'secondary'),
    tertiary: characters.filter(c => c.type === 'tertiary'),
  };

  // Get all unique relationships
  const relationships: Array<{
    from: Character;
    to: Character;
    type: string;
    description: string;
  }> = [];

  characters.forEach(char => {
    // Safety check: ensure relationships array exists
    if (char.relationships && Array.isArray(char.relationships)) {
      char.relationships.forEach(rel => {
        const target = characters.find(c => c.id === rel.targetCharacterId);
        if (target) {
          relationships.push({
            from: char,
            to: target,
            type: rel.relationshipType,
            description: rel.description,
          });
        }
      });
    }
  });

  const totalCharacters = characters.length;
  const totalRelationships = relationships.length;

  return (
    <div className="relationship-map">
      <div className="relationship-header">
        <div className="header-content">
          <h2>Character Relationships</h2>
          <div className="relationship-stats">
            <div className="stat">
              <Users size={16} />
              <span>{totalCharacters} Characters</span>
            </div>
            <div className="stat">
              <Link size={16} />
              <span>{totalRelationships} Relationships</span>
            </div>
          </div>
        </div>
        {onCreateCharacter && (
          <button className="add-character-button" onClick={onCreateCharacter}>
            <Plus size={16} />
            Add Character
          </button>
        )}
      </div>

      <div className="character-groups">
        {['main', 'secondary', 'tertiary'].map(type => {
          const chars = charactersByType[type as keyof typeof charactersByType];
          if (chars.length === 0) return null;

          const typeLabels = {
            main: 'Main Characters',
            secondary: 'Secondary Characters', 
            tertiary: 'Tertiary Characters'
          };

          return (
            <div key={type} className="character-type-group">
              <div className="group-label">
                {typeLabels[type as keyof typeof typeLabels]}
                <span className="character-count">({chars.length})</span>
              </div>
              <div className="character-nodes">
                {chars.map(char => (
                  <div key={char.id} className="character-node" data-type={type}>
                    <div className="node-content">
                      <div className="node-name">{char.name}</div>
                      {char.role && <div className="node-role">{char.role}</div>}
                      {char.description && (
                        <div className="node-description">{char.description}</div>
                      )}
                    </div>
                    {char.relationships && char.relationships.length > 0 && (
                      <div className="node-relationships">
                        {char.relationships.length} relationship{char.relationships.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {relationships.length > 0 ? (
        <div className="relationships-list">
          <h4>All Relationships</h4>
          {relationships.map((rel, idx) => (
            <div key={idx} className="relationship-item">
              <div className="relationship-characters">
                <span className="char-name">{rel.from.name}</span>
                <span className="relationship-type">{rel.type}</span>
                <span className="char-name">{rel.to.name}</span>
              </div>
              {rel.description && (
                <div className="relationship-desc">{rel.description}</div>
              )}
            </div>
          ))}
        </div>
      ) : totalCharacters > 1 && (
        <div className="no-relationships">
          <div className="no-relationships-content">
            <Link size={32} className="no-relationships-icon" />
            <h4>No Relationships Defined</h4>
            <p>Characters exist but no relationships have been defined yet. You can add relationships in the character editor.</p>
            <div className="relationship-tips">
              <div className="tip">
                <strong>Tip:</strong> Edit characters to add relationships with other characters in your story.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RelationshipMap;

