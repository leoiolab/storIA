import mongoose, { Schema, Document } from 'mongoose';

export interface ICharacter extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  type: 'main' | 'secondary' | 'tertiary';
  quickDescription: string;
  fullBio: string;
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

export default mongoose.model<ICharacter>('Character', characterSchema);


