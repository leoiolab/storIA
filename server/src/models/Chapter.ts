import mongoose, { Schema, Document } from 'mongoose';

export interface ChapterVersion {
  content: string;
  title: string;
  timestamp: Date;
}

export interface IChapter extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  synopsis?: string;
  notes?: string;
  order: number;
  plotPoints?: Array<{
    category: 'setup' | 'conflict' | 'climax' | 'resolution';
    description: string;
  }>;
  wordCount: number;
  isLocked?: boolean;
  versions?: ChapterVersion[];
  createdAt: Date;
  updatedAt: Date;
}

const chapterSchema = new Schema<IChapter>({
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  synopsis: {
    type: String
  },
  notes: {
    type: String
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  plotPoints: [{
    category: {
      type: String,
      enum: ['setup', 'conflict', 'climax', 'resolution']
    },
    description: String
  }],
  wordCount: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  versions: [{
    content: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound index for project's chapters in order
chapterSchema.index({ projectId: 1, order: 1 });

// Update word count and save version before saving
chapterSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('title')) {
    this.wordCount = this.content.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    // Save version if content or title changed
    if (!this.isNew && (this.isModified('content') || this.isModified('title'))) {
      if (!this.versions) {
        this.versions = [];
      }
      
      // Add current version before updating
      this.versions.push({
        content: this.content,
        title: this.title,
        timestamp: new Date()
      });
      
      // Keep only last 50 versions
      if (this.versions.length > 50) {
        this.versions = this.versions.slice(-50);
      }
    }
  }
  next();
});

export default mongoose.model<IChapter>('Chapter', chapterSchema);


