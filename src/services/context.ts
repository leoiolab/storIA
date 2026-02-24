import { Book } from '../types';

export interface ContextSnapshot {
  id: string;
  timestamp: number;
  type: 'character' | 'chapter' | 'plot' | 'relationship';
  entityId: string;
  previousState: any;
  changes: any;
  dependencies: string[];
  impact: ContextImpact[];
}

export interface ContextImpact {
  type: 'character' | 'chapter' | 'plot' | 'relationship';
  entityId: string;
  impactLevel: 'low' | 'medium' | 'high';
  description: string;
  suggestedActions: string[];
}

export interface ContextHistory {
  snapshots: ContextSnapshot[];
  currentVersion: number;
  lastModified: number;
}

export interface DependencyGraph {
  characters: Map<string, string[]>; // characterId -> dependent chapter/plot IDs
  chapters: Map<string, string[]>; // chapterId -> dependent characters/plots
  plots: Map<string, string[]>; // plotId -> affected characters/chapters
}

class ContextManager {
  private history: ContextHistory = {
    snapshots: [],
    currentVersion: 0,
    lastModified: Date.now(),
  };

  private dependencyGraph: DependencyGraph = {
    characters: new Map(),
    chapters: new Map(),
    plots: new Map(),
  };

  // Create a snapshot before making changes
  createSnapshot(
    type: 'character' | 'chapter' | 'plot' | 'relationship',
    entityId: string,
    previousState: any,
    book: Book
  ): string {
    const snapshotId = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const snapshot: ContextSnapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      type,
      entityId,
      previousState: JSON.parse(JSON.stringify(previousState)),
      changes: null,
      dependencies: this.findDependencies(entityId, type, book),
      impact: [],
    };

    this.history.snapshots.push(snapshot);
    this.history.currentVersion++;
    this.history.lastModified = Date.now();

    return snapshotId;
  }

  // Update snapshot with changes and analyze impact
  updateSnapshot(
    snapshotId: string,
    changes: any,
    book: Book
  ): ContextImpact[] {
    const snapshot = this.history.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return [];

    snapshot.changes = changes;
    snapshot.impact = this.analyzeImpact(snapshot, book);

    return snapshot.impact;
  }

  // Find entities that depend on the given entity
  private findDependencies(
    entityId: string,
    type: 'character' | 'chapter' | 'plot' | 'relationship',
    book: Book
  ): string[] {
    const dependencies: string[] = [];

    switch (type) {
      case 'character':
        // Find chapters that mention this character
        book.chapters.forEach(chapter => {
          if (chapter.content.toLowerCase().includes(book.characters.find(c => c.id === entityId)?.name.toLowerCase() || '')) {
            dependencies.push(chapter.id);
          }
        });
        
        // Find relationships involving this character
        book.characters.forEach(char => {
          if (char.relationships.some(rel => rel.targetCharacterId === entityId)) {
            dependencies.push(char.id);
          }
        });
        break;

      case 'chapter':
        // Find characters mentioned in this chapter
        const chapter = book.chapters.find(c => c.id === entityId);
        if (chapter) {
          book.characters.forEach(char => {
            if (chapter.content.toLowerCase().includes(char.name.toLowerCase())) {
              dependencies.push(char.id);
            }
          });
        }
        break;

      case 'plot':
        // Find chapters and characters related to this plot point
        const plot = book.plotPoints.find(p => p.id === entityId);
        if (plot) {
          if (plot.chapterId) dependencies.push(plot.chapterId);
          dependencies.push(...plot.characterIds || []);
        }
        break;
    }

    return dependencies;
  }

  // Analyze the impact of changes
  private analyzeImpact(snapshot: ContextSnapshot, book: Book): ContextImpact[] {
    const impacts: ContextImpact[] = [];

    // Analyze character changes
    if (snapshot.type === 'character') {
      const character = book.characters.find(c => c.id === snapshot.entityId);
      const previousCharacter = snapshot.previousState;

      if (character && previousCharacter) {
        // Name change impact
        if (character.name !== previousCharacter.name) {
          impacts.push({
            type: 'chapter',
            entityId: '',
            impactLevel: 'high',
            description: `Character name changed from "${previousCharacter.name}" to "${character.name}". All chapters mentioning this character need to be updated.`,
            suggestedActions: [
              'Update all chapter content with the new character name',
              'Review character relationships for consistency',
              'Check plot points that reference this character'
            ],
          });
        }

        // Personality/biography changes
        if (character.biography !== previousCharacter.biography || 
            character.description !== previousCharacter.description) {
          impacts.push({
            type: 'chapter',
            entityId: '',
            impactLevel: 'medium',
            description: 'Character personality or backstory has changed. Existing scenes may need adjustment.',
            suggestedActions: [
              'Review chapters featuring this character for consistency',
              'Update character dialogue and actions to match new personality',
              'Consider adding new scenes that reflect the updated backstory'
            ],
          });
        }
      }
    }

    // Analyze chapter changes
    if (snapshot.type === 'chapter') {
      const chapter = book.chapters.find(c => c.id === snapshot.entityId);
      const previousChapter = snapshot.previousState;

      if (chapter && previousChapter) {
        // Content changes
        if (chapter.content !== previousChapter.content) {
          impacts.push({
            type: 'character',
            entityId: '',
            impactLevel: 'medium',
            description: 'Chapter content has been modified. Character development and plot progression may be affected.',
            suggestedActions: [
              'Review character arcs to ensure consistency',
              'Check if plot points need updating',
              'Verify timeline continuity'
            ],
          });
        }

        // Title changes
        if (chapter.title !== previousChapter.title) {
          impacts.push({
            type: 'plot',
            entityId: '',
            impactLevel: 'low',
            description: `Chapter title changed from "${previousChapter.title}" to "${chapter.title}". Update any plot points that reference this chapter.`,
            suggestedActions: [
              'Update plot point references',
              'Check story arc visualization',
              'Review chapter synopsis'
            ],
          });
        }
      }
    }

    return impacts;
  }

  // Get impact analysis for a proposed change
  getImpactAnalysis(
    type: 'character' | 'chapter' | 'plot' | 'relationship',
    entityId: string,
    proposedChanges: any,
    book: Book
  ): ContextImpact[] {
    const snapshot = this.createSnapshot(type, entityId, {}, book);
    return this.updateSnapshot(snapshot, proposedChanges, book);
  }

  // Get context history for an entity
  getEntityHistory(entityId: string): ContextSnapshot[] {
    return this.history.snapshots.filter(s => s.entityId === entityId);
  }

  // Get recent changes that might affect an entity
  getRelevantChanges(entityId: string, _book: Book): ContextSnapshot[] {
    const relevant: ContextSnapshot[] = [];
    
    for (const snapshot of this.history.snapshots) {
      if (snapshot.dependencies.includes(entityId)) {
        relevant.push(snapshot);
      }
    }

    return relevant.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Suggest actions based on context
  getSuggestedActions(entityId: string, book: Book): string[] {
    const actions: string[] = [];
    const relevantChanges = this.getRelevantChanges(entityId, book);

    if (relevantChanges.length > 0) {
      actions.push('Review recent changes that may affect this item');
      
      const characterChanges = relevantChanges.filter(c => c.type === 'character');
      if (characterChanges.length > 0) {
        actions.push('Update character references in chapters');
      }

      const chapterChanges = relevantChanges.filter(c => c.type === 'chapter');
      if (chapterChanges.length > 0) {
        actions.push('Verify plot continuity and character development');
      }
    }

    return actions;
  }

  // Export context for backup
  exportContext(): string {
    return JSON.stringify({
      history: this.history,
      dependencyGraph: {
        characters: Array.from(this.dependencyGraph.characters.entries()),
        chapters: Array.from(this.dependencyGraph.chapters.entries()),
        plots: Array.from(this.dependencyGraph.plots.entries()),
      },
    }, null, 2);
  }

  // Import context from backup
  importContext(contextData: string): boolean {
    try {
      const data = JSON.parse(contextData);
      this.history = data.history;
      this.dependencyGraph = {
        characters: new Map(data.dependencyGraph.characters),
        chapters: new Map(data.dependencyGraph.chapters),
        plots: new Map(data.dependencyGraph.plots),
      };
      return true;
    } catch (error) {
      console.error('Failed to import context:', error);
      return false;
    }
  }

  // Clear old snapshots (keep last 100)
  cleanup(): void {
    if (this.history.snapshots.length > 100) {
      this.history.snapshots = this.history.snapshots
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
    }
  }
}

// Singleton instance
export const contextManager = new ContextManager();


