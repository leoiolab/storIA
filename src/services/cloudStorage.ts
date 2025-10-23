import { Book, Character, Chapter, BookMetadata } from '../types';

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
    const projects = await this.request('/projects');
    return projects.map(this.mapProjectToBook);
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
    };
  }

  static async updateProject(id: string, data: Partial<Book>): Promise<Book> {
    const project = await this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.metadata?.title || 'Untitled',
        metadata: data.metadata,
        settings: data.settings,
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
    const created = await this.request('/characters', {
      method: 'POST',
      body: JSON.stringify({ ...character, projectId }),
    });

    return this.mapCharacterFromAPI(created);
  }

  static async updateCharacter(id: string, character: Partial<Character>): Promise<Character> {
    const updated = await this.request(`/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(character),
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
      body: JSON.stringify({ ...chapter, projectId }),
    });

    return this.mapChapterFromAPI(created);
  }

  static async updateChapter(id: string, chapter: Partial<Chapter>): Promise<Chapter> {
    const updated = await this.request(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(chapter),
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
    return {
      id: project._id,
      metadata: {
        title: project.metadata?.title || 'Untitled',
        subtitle: project.metadata?.subtitle,
        author: project.metadata?.author || '',
        genre: project.metadata?.genre,
        synopsis: project.metadata?.synopsis,
        themes: project.metadata?.themes,
        targetWordCount: project.metadata?.targetWordCount,
      },
      characters: [],
      chapters: [],
      settings: project.settings,
    };
  }

  private static mapCharacterFromAPI(char: any): Character {
    return {
      id: char._id,
      name: char.name,
      type: char.type,
      description: char.quickDescription || char.description || '',
      biography: char.fullBio || char.biography || '',
      age: char.age,
      role: char.role,
      relationships: char.relationships || [],
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
      plotPoints: chapter.plotPoints || [],
      wordCount: chapter.wordCount || 0,
    };
  }
}


