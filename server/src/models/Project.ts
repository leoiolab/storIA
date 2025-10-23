import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  metadata: {
    title: string;
    subtitle?: string;
    author: string;
    genre?: string;
    synopsis?: string;
    themes?: string;
    targetWordCount?: number;
  };
  settings?: {
    aiProvider?: 'openai' | 'anthropic';
    aiModel?: string;
    aiApiKey?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>({
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
  metadata: {
    title: { type: String, default: '' },
    subtitle: { type: String },
    author: { type: String, default: '' },
    genre: { type: String },
    synopsis: { type: String },
    themes: { type: String },
    targetWordCount: { type: Number }
  },
  settings: {
    aiProvider: { 
      type: String, 
      enum: ['openai', 'anthropic'],
      default: 'openai'
    },
    aiModel: { type: String },
    aiApiKey: { type: String }
  }
}, {
  timestamps: true
});

// Compound index for user's projects
projectSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IProject>('Project', projectSchema);


