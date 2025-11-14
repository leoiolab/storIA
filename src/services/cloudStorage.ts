import { Book, Character, Chapter, BookMetadata, PlotPoint, Timeline } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

export class CloudStorageService {
  private static token: string | null = null;

  // Authentication
  static setToken(token: string) {
    this.token = token;
    localStorage.setItem('authorio_token', token);
  }

  static getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('authorio_token');
    }
    return this.token;
  }

  static clearToken() {
    this.token = null;
    localStorage.removeItem('authorio_token');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // API request helper
  private static async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      this.clearToken();
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth API
  static async register(email: string, password: string, name: string): Promise<AuthUser> {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });

    this.setToken(data.token);
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      token: data.token,
    };
  }

  static async login(email: string, password: string): Promise<AuthUser> {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(data.token);
    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      token: data.token,
    };
  }

  static async getCurrentUser(): Promise<AuthUser> {
    const data = await this.request('/auth/me');
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      token: this.getToken()!,
    };
  }

  static logout() {
    this.clearToken();
  }

  // Projects API
  static async getProjects(): Promise<Book[]> {
    const projects = await CloudStorageService.request('/projects');
    return projects.map(CloudStorageService.mapProjectToBook.bind(CloudStorageService));
  }

  static async getProject(id: string): Promise<Book> {
    const project = await this.request(`/projects/${id}`);
    
    // Fetch related data
    const [characters, chapters] = await Promise.all([
      this.getCharactersByProject(id),
      this.getChaptersByProject(id),
    ]);

    return {
      ...this.mapProjectToBook(project),
      characters,
      chapters,
      plotPoints: project.plotPoints ? this.mapPlotPointsFromAPI(project.plotPoints, id) : [],
      timeline: this.mapTimelineFromAPI(project.timeline, id),
    };
  }

  static async createProject(name: string, metadata?: Partial<BookMetadata>): Promise<Book> {
    const project = await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, metadata }),
    });

    return {
      ...this.mapProjectToBook(project),
      characters: [],
      chapters: [],
      plotPoints: [],
      timeline: this.mapTimelineFromAPI(project.timeline, project._id),
    };
  }

  static async updateProject(id: string, data: Partial<Book>): Promise<Book> {
    const sanitizedSettings = data.settings
      ? {
          aiProvider: data.settings.aiProvider,
          aiModel: data.settings.aiModel,
          aiApiKey: data.settings.aiApiKey,
        }
      : undefined;

    const project = await this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.metadata?.title || 'Untitled',
        metadata: data.metadata,
        settings: sanitizedSettings,
      }),
    });

    return this.mapProjectToBook(project);
  }

  static async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Characters API
  static async getCharactersByProject(projectId: string): Promise<Character[]> {
    const characters = await this.request(`/characters/project/${projectId}`);
    return characters.map(this.mapCharacterFromAPI);
  }

  static async createCharacter(projectId: string, character: Omit<Character, 'id'>): Promise<Character> {
    // Ensure relationships is properly formatted as an array
    const relationships = character.relationships 
      ? character.relationships.map(rel => ({
          characterId: rel.targetCharacterId,
          type: rel.relationshipType,
          description: rel.description || '',
        }))
      : [];

    const created = await this.request('/characters', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        name: character.name,
        type: character.type,
        quickDescription: character.description,
        fullBio: character.biography,
        characterArc: character.characterArc,
        age: character.age,
        role: character.role,
        relationships: relationships
      }),
    });

    return this.mapCharacterFromAPI(created);
  }

  static async updateCharacter(id: string, character: Partial<Character>): Promise<Character> {
    // Ensure relationships is properly formatted as an array
    const relationships = character.relationships 
      ? character.relationships.map(rel => ({
          characterId: rel.targetCharacterId,
          type: rel.relationshipType,
          description: rel.description || '',
        }))
      : [];

    const updated = await this.request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: character.name,
        type: character.type,
        quickDescription: character.description,
        fullBio: character.biography,
        characterArc: character.characterArc,
        age: character.age,
        role: character.role,
        relationships: relationships
      }),
    });

    return this.mapCharacterFromAPI(updated);
  }

  static async deleteCharacter(id: string): Promise<void> {
    await this.request(`/characters/${id}`, { method: 'DELETE' });
  }

  // Chapters API
  static async getChaptersByProject(projectId: string): Promise<Chapter[]> {
    const chapters = await this.request(`/chapters/project/${projectId}`);
    return chapters.map(this.mapChapterFromAPI);
  }

  static async createChapter(projectId: string, chapter: Omit<Chapter, 'id'>): Promise<Chapter> {
    const created = await this.request('/chapters', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        title: chapter.title,
        content: chapter.content,
        synopsis: chapter.synopsis,
        notes: chapter.notes,
        order: chapter.order,
        plotPoints: chapter.plotPoints?.map(point => ({
          category: point.category === 'other' ? 'setup' : point.category,
          description: point.description,
        })) || []
      }),
    });

    return this.mapChapterFromAPI(created);
  }

  static async updateChapter(id: string, chapter: Partial<Chapter>): Promise<Chapter> {
    const updated = await this.request(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: chapter.title,
        content: chapter.content,
        synopsis: chapter.synopsis,
        notes: chapter.notes,
        order: chapter.order,
        plotPoints: chapter.plotPoints?.map(point => ({
          category: point.category === 'other' ? 'setup' : point.category,
          description: point.description,
        }))
      }),
    });

    return this.mapChapterFromAPI(updated);
  }

  static async deleteChapter(id: string): Promise<void> {
    await this.request(`/chapters/${id}`, { method: 'DELETE' });
  }

  static async reorderChapters(projectId: string, chapterOrders: Array<{ id: string; order: number }>): Promise<Chapter[]> {
    const chapters = await this.request('/chapters/reorder', {
      method: 'POST',
      body: JSON.stringify({ projectId, chapterOrders }),
    });

    return chapters.map(this.mapChapterFromAPI);
  }

  // Mappers
  private static mapProjectToBook(project: any): Book {
    const createdAt = project.createdAt ? new Date(project.createdAt).getTime() : Date.now();
    const updatedAt = project.updatedAt ? new Date(project.updatedAt).getTime() : createdAt;
    
    // Ensure settings are properly mapped, even if partially defined
    const settings: any = {};
    if (project.settings) {
      if (project.settings.aiProvider !== undefined) {
        settings.aiProvider = project.settings.aiProvider;
      }
      if (project.settings.aiModel !== undefined) {
        settings.aiModel = project.settings.aiModel;
      }
      if (project.settings.aiApiKey !== undefined && project.settings.aiApiKey !== null) {
        settings.aiApiKey = project.settings.aiApiKey;
      }
    }
    
    return {
      id: project._id,
      metadata: {
        title: project.metadata?.title || project.name || 'Untitled',
        subtitle: project.metadata?.subtitle,
        author: project.metadata?.author || '',
        genre: project.metadata?.genre,
        synopsis: project.metadata?.synopsis,
        themes: Array.isArray(project.metadata?.themes)
          ? project.metadata.themes
          : project.metadata?.themes
            ? String(project.metadata.themes).split(',').map((theme: string) => theme.trim()).filter(Boolean)
            : undefined,
        targetWordCount: project.metadata?.targetWordCount,
      },
      characters: [],
      chapters: [],
      plotPoints: [],
      timeline: CloudStorageService.mapTimelineFromAPI(project.timeline, project._id),
      settings,
      createdAt,
      updatedAt,
    };
  }

  private static mapCharacterFromAPI(char: any): Character {
    return {
      id: char._id,
      name: char.name,
      type: char.type,
      description: char.quickDescription || char.description || '',
      biography: char.fullBio || char.biography || '',
      characterArc: char.characterArc || '',
      age: char.age,
      role: char.role,
      relationships: (char.relationships || []).map((rel: any) => ({
        targetCharacterId: rel.characterId,
        relationshipType: rel.type,
        description: rel.description,
      })),
      createdAt: char.createdAt ? new Date(char.createdAt).getTime() : Date.now(),
      updatedAt: char.updatedAt ? new Date(char.updatedAt).getTime() : Date.now(),
    };
  }

  private static mapChapterFromAPI(chapter: any): Chapter {
    return {
      id: chapter._id,
      title: chapter.title,
      content: chapter.content || '',
      synopsis: chapter.synopsis,
      notes: chapter.notes,
      order: chapter.order,
      plotPoints: this.mapPlotPointsFromAPI(chapter.plotPoints, chapter._id),
      wordCount: chapter.wordCount || 0,
      createdAt: chapter.createdAt ? new Date(chapter.createdAt).getTime() : Date.now(),
      updatedAt: chapter.updatedAt ? new Date(chapter.updatedAt).getTime() : Date.now(),
    };
  }

  private static mapPlotPointsFromAPI(points: any[] = [], parentId: string): PlotPoint[] {
    return points.map((point, index) => ({
      id: point._id || `${parentId}-plot-${index}`,
      title: point.title || point.description?.slice(0, 40) || 'Plot Point',
      description: point.description || '',
      chapterId: parentId,
      characterIds: point.characterIds || [],
      order: typeof point.order === 'number' ? point.order : index,
      category: (point.category as PlotPoint['category']) || 'other',
    }));
  }

  private static mapTimelineFromAPI(timeline: any, projectId: string): Timeline {
    if (!timeline) {
      return { id: `${projectId}-timeline`, events: [] };
    }

    return {
      id: timeline._id || `${projectId}-timeline`,
      events: Array.isArray(timeline.events)
        ? timeline.events.map((event: any) => ({
            id: event._id || `${timeline._id}-event-${Math.random().toString(36).slice(2)}`,
            title: event.title || 'Timeline Event',
            description: event.description || '',
            timestamp: event.timestamp || '',
            chapterId: event.chapterId,
            characterIds: event.characterIds || [],
          }))
        : [],
    };
  }
}

