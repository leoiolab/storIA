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
  relationships: [{
    characterId: String,
    type: String,
    description: String
  }]
}, {
  timestamps: true
});

// Compound index for project's characters
characterSchema.index({ projectId: 1, type: 1 });

// Pre-save hook to fix relationships if it's a string
characterSchema.pre('save', function(next) {
  if (this.relationships && typeof this.relationships === 'string') {
    try {
      let toParse = (this.relationships as any).trim();
      if (toParse.includes("'")) {
        toParse = toParse.replace(/'/g, '"');
      }
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
          this.relationships = parsed as any;
          console.log('Pre-save hook: Fixed relationships from string to array');
        }
      }
    } catch (e: any) {
      console.error('Pre-save hook: Failed to parse relationships:', e?.message);
      this.relationships = [] as any;
    }
  }
  next();
});

// Pre-update hook for findOneAndUpdate
characterSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  console.log('Pre-update hook: Checking update object');
  
  // Check both $set and direct update
  const relationshipsPath = update?.$set?.relationships || update?.relationships;
  
  if (relationshipsPath && typeof relationshipsPath === 'string') {
    try {
      let toParse = relationshipsPath.trim();
      console.log('Pre-update hook: ⚠️ Detected relationships as string');
      console.log('Pre-update hook: String (first 300 chars):', toParse.substring(0, 300));
      
      // Handle JavaScript code format first
      if (toParse.includes("' +") || toParse.includes('" +') || toParse.includes("\\n") || (toParse.includes('\n') && toParse.includes("' +"))) {
        console.log('Pre-update hook: Detected JavaScript code format');
        toParse = toParse
          .replace(/' \+/g, '')
          .replace(/" \+/g, '')
          .replace(/\s*\+\s*/g, '')
          .replace(/\\n/g, '')
          .replace(/\n/g, '')
          .replace(/\r/g, '')
          .replace(/'/g, '"');
        const arrayStart = toParse.indexOf('[');
        const arrayEnd = toParse.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
          toParse = toParse.substring(arrayStart, arrayEnd + 1);
        }
      } else if (toParse.includes("'")) {
        // Handle single quotes
        console.log('Pre-update hook: Detected single quotes');
        toParse = toParse.replace(/'/g, '"');
      }
      
      if (toParse.startsWith('[') && toParse.endsWith(']')) {
        const parsed = JSON.parse(toParse);
        if (Array.isArray(parsed)) {
          // Modify the update object
          if (update.$set) {
            update.$set.relationships = parsed;
          } else {
            update.relationships = parsed;
          }
          // Also use set() to ensure it's applied
          this.set({ relationships: parsed });
          console.log('Pre-update hook: ✅ Fixed relationships from string to array, got', parsed.length, 'items');
        } else {
          console.error('Pre-update hook: Parsed result is not an array');
          if (update.$set) {
            update.$set.relationships = [];
          } else {
            update.relationships = [];
          }
        }
      } else {
        console.error('Pre-update hook: String does not look like an array after cleaning');
        if (update.$set) {
          update.$set.relationships = [];
        } else {
          update.relationships = [];
        }
      }
    } catch (e: any) {
      console.error('Pre-update hook: ❌ Failed to parse relationships:', e?.message);
      console.error('Pre-update hook: Error stack:', e?.stack);
      if (update.$set) {
        update.$set.relationships = [];
      } else {
        update.relationships = [];
      }
    }
  } else if (relationshipsPath) {
    console.log('Pre-update hook: relationships is not a string, type:', typeof relationshipsPath, 'isArray:', Array.isArray(relationshipsPath));
  }
  next();
});

export default mongoose.model<ICharacter>('Character', characterSchema);


