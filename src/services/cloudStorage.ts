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

    const url = `${API_URL}${endpoint}`;
    console.log(`[CloudStorage] Making request to: ${url}`, { method: options.method || 'GET' });

    try {
      const response = await fetch(url, {
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
        console.error(`[CloudStorage] Request failed: ${response.status}`, error);
        throw new Error(error.error || `Request failed with status ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors, CORS issues, etc.
      console.error(`[CloudStorage] Network error for ${url}:`, error);
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // Network error - could be CORS, server down, or wrong URL
        const errorMessage = `Unable to connect to server. Please check:
1. The backend server is running
2. The API URL is correct (current: ${API_URL})
3. CORS is properly configured on the backend`;
        throw new Error(errorMessage);
      }
      
      // Re-throw other errors as-is
      throw error;
    }
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
    return projects.map(project => CloudStorageService.mapProjectToBook(project));
  }

  static async getProject(id: string): Promise<Book> {
    const project = await this.request(`/projects/${id}`);
    
    // Fetch related data
    const [characters, chapters] = await Promise.all([
      this.getCharactersByProject(id),
      this.getChaptersByProject(id),
    ]);

    return {
      ...CloudStorageService.mapProjectToBook(project),
      characters,
      chapters,
      plotPoints: project.plotPoints ? CloudStorageService.mapPlotPointsFromAPI(project.plotPoints, id) : [],
      timeline: CloudStorageService.mapTimelineFromAPI(project.timeline, id),
    };
  }

  static async createProject(name: string, metadata?: Partial<BookMetadata>): Promise<Book> {
    const project = await this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, metadata }),
    });

    return {
      ...CloudStorageService.mapProjectToBook(project),
      characters: [],
      chapters: [],
      plotPoints: [],
      timeline: CloudStorageService.mapTimelineFromAPI(project.timeline, project._id),
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

    return CloudStorageService.mapProjectToBook(project);
  }

  static async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  // Characters API
  static async getCharactersByProject(projectId: string): Promise<Character[]> {
    const characters = await this.request(`/characters/project/${projectId}`);
    return characters.map(char => CloudStorageService.mapCharacterFromAPI(char));
  }

  static async createCharacter(projectId: string, character: Omit<Character, 'id'>): Promise<Character> {
    if (!projectId) {
      throw new Error('Project ID is required to create a character');
    }

    // Ensure relationships is properly formatted as an array
    const relationships = character.relationships 
      ? character.relationships.map(rel => ({
          characterId: rel.targetCharacterId,
          type: rel.relationshipType,
          description: rel.description || '',
        }))
      : [];

    const payload = {
      projectId,
      name: character.name,
      type: character.type,
      quickDescription: character.description,
      fullBio: character.biography,
      characterArc: character.characterArc,
      age: character.age,
      role: character.role,
      relationships: relationships
    };

    console.log('[CloudStorage] Creating character:', { projectId, name: character.name, payload });

    try {
      const created = await this.request('/characters', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return CloudStorageService.mapCharacterFromAPI(created);
    } catch (error: any) {
      console.error('[CloudStorage] Failed to create character:', error);
      throw new Error(`Failed to create character: ${error.message || 'Unknown error'}`);
    }
  }

  static async updateCharacter(id: string, character: Partial<Character>): Promise<Character> {
    // Ensure relationships is properly formatted as an array
    const relationships = character.relationships 
      ? character.relationships.map(rel => ({
          characterId: rel.targetCharacterId || '',
          type: rel.relationshipType || '',
          description: rel.description || '',
        }))
      : [];

    // Ensure relationships is actually an array (not stringified)
    if (!Array.isArray(relationships)) {
      console.error('Relationships is not an array before sending:', typeof relationships, relationships);
    }

    const requestBody = {
      name: character.name,
      type: character.type,
      quickDescription: character.description,
      fullBio: character.biography,
      characterArc: character.characterArc,
      age: character.age,
      role: character.role,
      relationships: relationships, // This should be an array, not a string
      isLocked: character.isLocked
    };

    // Debug: Log what we're sending
    console.log('Sending relationships:', {
      type: typeof requestBody.relationships,
      isArray: Array.isArray(requestBody.relationships),
      value: requestBody.relationships
    });

    const updated = await this.request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(requestBody),
    });

    return CloudStorageService.mapCharacterFromAPI(updated);
  }

  static async deleteCharacter(id: string): Promise<void> {
    await this.request(`/characters/${id}`, { method: 'DELETE' });
  }

  // Chapters API
  static async getChaptersByProject(projectId: string): Promise<Chapter[]> {
    const chapters = await this.request(`/chapters/project/${projectId}`);
    return chapters.map(chapter => CloudStorageService.mapChapterFromAPI(chapter));
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

    return CloudStorageService.mapChapterFromAPI(created);
  }

  static async updateChapter(id: string, chapter: Partial<Chapter>): Promise<Chapter> {
    const updated = await this.request(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: chapter.title,
        content: chapter.content,
        isLocked: chapter.isLocked,
        synopsis: chapter.synopsis,
        notes: chapter.notes,
        order: chapter.order,
        plotPoints: chapter.plotPoints?.map(point => ({
          category: point.category === 'other' ? 'setup' : point.category,
          description: point.description,
        }))
      }),
    });

    return CloudStorageService.mapChapterFromAPI(updated);
  }

  static async deleteChapter(id: string): Promise<void> {
    await this.request(`/chapters/${id}`, { method: 'DELETE' });
  }

  static async reorderChapters(projectId: string, chapterOrders: Array<{ id: string; order: number }>): Promise<Chapter[]> {
    const chapters = await this.request('/chapters/reorder', {
      method: 'POST',
      body: JSON.stringify({ projectId, chapterOrders }),
    });

    return chapters.map(chapter => CloudStorageService.mapChapterFromAPI(chapter));
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
      isLocked: char.isLocked || false,
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
      plotPoints: CloudStorageService.mapPlotPointsFromAPI(chapter.plotPoints || [], chapter._id),
      wordCount: chapter.wordCount || 0,
      isLocked: chapter.isLocked || false,
      versions: chapter.versions ? chapter.versions.map((v: any) => ({
        content: v.content,
        title: v.title,
        timestamp: v.timestamp ? new Date(v.timestamp).getTime() : Date.now(),
      })) : undefined,
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

