import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacter extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'main' | 'secondary' | 'tertiary';
  quickDescription: string;
  fullBio: string;
  characterArc?: string;
  age?: string;
  role?: string;
  relationships?: Array<{
    characterId: string;
    type: string;
    description: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const characterSchema = new Schema<ICharacter>({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['main', 'secondary', 'tertiary'],
    required: true
  },
  quickDescription: {
    type: String,
    default: ''
  },
  fullBio: {
    type: String,
    default: ''
  },
  characterArc: {
    type: String,
    default: ''
  },
  age: {
    type: String
  },
  role: {
    type: String
  },
  relationships: {
    type: [{
      characterId: String,
      type: String,
      description: String
    }],
    set: function(relationships: any) {
      // If relationships is a string, parse it
      if (typeof relationships === 'string') {
        try {
          let toParse = relationships.trim();
          // Handle single quotes
          if (toParse.includes("'")) {
            toParse = toParse.replace(/'/g, '"');
          }
          // Handle JavaScript code format
          if (toParse.includes("' +") || toParse.includes("\\n")) {
            toParse = toParse
              .replace(/' \+/g, '')
              .replace(/" \+/g, '')
              .replace(/\\n/g, '')
              .replace(/\n/g, '')
              .replace(/'/g, '"');
            const arrayStart = toParse.indexOf('[');
            const arrayEnd = toParse.lastIndexOf(']');
            if (arrayStart !== -1 && arrayEnd !== -1) {
              toParse = toParse.substring(arrayStart, arrayEnd + 1);
            }
          }
          if (toParse.startsWith('[') && toParse.endsWith(']')) {
            const parsed = JSON.parse(toParse);
            if (Array.isArray(parsed)) {
              console.log('Mongoose setter: Fixed relationships from string to array');
              return parsed;
            }
          }
        } catch (e: any) {
          console.error('Mongoose setter: Failed to parse relationships:', e?.message);
        }
        return [];
      }
      // If it's already an array, return it
      if (Array.isArray(relationships)) {
        return relationships;
      }
      // Otherwise, return empty array
      return [];
    }
  }
}, {
  timestamps: true
});

// Compound index for project's characters
characterSchema.index({ projectId: 1, type: 1 });

export default mongoose.model<ICharacter>('Character', characterSchema);


