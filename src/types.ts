export type CharacterType = 'main' | 'secondary' | 'tertiary';

export interface ProjectSettings {
  aiProvider?: 'openai' | 'anthropic';
  aiModel?: string;
  aiApiKey?: string;
}

export interface Character {
  id: string;
  name: string;
  type: CharacterType;
  description: string;
  biography: string;
  characterArc?: string;
  age?: number;
  role?: string;
  relationships: CharacterRelationship[];
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterRelationship {
  targetCharacterId: string;
  relationshipType: string;
  description: string;
}

export interface ChapterVersion {
  content: string;
  title: string;
  timestamp: number;
}

export interface ChapterSection {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Chapter {
  id: string;
  title: string;
  content: string; // Legacy field - kept for backward compatibility
  order: number;
  synopsis?: string;
  notes?: string;
  wordCount?: number;
  plotPoints?: PlotPoint[];
  isLocked?: boolean;
  versions?: ChapterVersion[];
  sections?: ChapterSection[]; // New: sections within chapter
  createdAt: number;
  updatedAt: number;
}

export interface PlotPoint {
  id: string;
  title: string;
  description: string;
  chapterId?: string;
  characterIds?: string[];
  order: number;
  category: 'setup' | 'conflict' | 'resolution' | 'climax' | 'other';
}

export interface Timeline {
  id: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  chapterId?: string;
  characterIds: string[];
}

export interface BookMetadata {
  title: string;
  author: string;
  genre: string;
  subtitle?: string;
  targetWordCount?: number;
  synopsis?: string;
  themes?: string[];
  coverImage?: string; // Base64 encoded image or URL
}

export interface Book {
  id: string;
  metadata: BookMetadata;
  characters: Character[];
  chapters: Chapter[];
  plotPoints: PlotPoint[];
  timeline: Timeline;
  settings?: ProjectSettings;
  createdAt: number;
  updatedAt: number;
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'none';
  apiKey: string;
  model: string;
}

export interface AppData {
  books: Book[];
  currentBookId: string | null;
  aiConfig: AIConfig;
}
