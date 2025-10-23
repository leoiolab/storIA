import { AppData, Book, Character, Chapter, BookMetadata } from '../types';

const STORAGE_KEY = 'authorio_app_data';

export class StorageService {
  // Save data to localStorage with error handling
  static saveData(data: AppData): boolean {
    try {
      const serializedData = JSON.stringify(data, null, 2);
      localStorage.setItem(STORAGE_KEY, serializedData);
      console.log('Data saved successfully:', {
        books: data.books.length,
        currentBookId: data.currentBookId,
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Failed to save data:', error);
      return false;
    }
  }

  // Load data from localStorage with error handling
  static loadData(): AppData | null {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) {
        console.log('No saved data found');
        return null;
      }

      const parsedData = JSON.parse(savedData);
      console.log('Data loaded successfully:', {
        books: parsedData.books?.length || 0,
        currentBookId: parsedData.currentBookId,
        timestamp: new Date().toISOString()
      });
      
      return parsedData;
    } catch (error) {
      console.error('Failed to load data:', error);
      return null;
    }
  }

  // Create a backup of current data
  static createBackup(data: AppData): string {
    const backupData = {
      ...data,
      backupTimestamp: Date.now(),
      version: '1.0'
    };
    return JSON.stringify(backupData, null, 2);
  }

  // Restore from backup
  static restoreFromBackup(backupData: string): AppData | null {
    try {
      const parsed = JSON.parse(backupData);
      delete parsed.backupTimestamp;
      delete parsed.version;
      return parsed;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return null;
    }
  }

  // Clear all data
  static clearData(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Data cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  // Get storage info
  static getStorageInfo(): { used: number; available: number } {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const used = data ? new Blob([data]).size : 0;
      
      // Estimate available space (localStorage limit is typically 5-10MB)
      const available = 5 * 1024 * 1024 - used; // 5MB - used
      
      return { used, available };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { used: 0, available: 0 };
    }
  }

  // Validate data structure
  static validateData(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check required fields
    if (!Array.isArray(data.books)) {
      return false;
    }

    // Validate each book
    for (const book of data.books) {
      if (!book.id || !book.metadata || !Array.isArray(book.characters) || !Array.isArray(book.chapters)) {
        return false;
      }

      // Validate metadata
      if (typeof book.metadata !== 'object' || !book.metadata.title) {
        return false;
      }

      // Validate characters
      for (const character of book.characters) {
        if (!character.id || !character.name || !character.type) {
          return false;
        }
      }

      // Validate chapters
      for (const chapter of book.chapters) {
        if (!chapter.id || !chapter.title || typeof chapter.content !== 'string') {
          return false;
        }
      }
    }

    return true;
  }

  // Auto-save with debouncing
  private static saveTimeout: NodeJS.Timeout | null = null;
  
  static debouncedSave(data: AppData, delay: number = 1000): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveData(data);
    }, delay);
  }
}


