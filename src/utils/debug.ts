// Debug utilities for testing localStorage functionality

export const debugStorage = {
  // Test localStorage functionality
  testStorage: () => {
    try {
      const testKey = 'authorio_test';
      const testData = { test: 'data', timestamp: Date.now() };
      
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = localStorage.getItem(testKey);
      const parsed = JSON.parse(retrieved || '{}');
      
      localStorage.removeItem(testKey);
      
      return {
        success: true,
        message: 'localStorage is working correctly',
        testData: parsed
      };
    } catch (error) {
      return {
        success: false,
        message: `localStorage error: ${error}`,
        error
      };
    }
  },

  // Check current localStorage contents
  checkContents: () => {
    const contents: { [key: string]: any } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          contents[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          contents[key] = localStorage.getItem(key);
        }
      }
    }
    
    return contents;
  },

  // Clear all authorio data
  clearAuthorioData: () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('authorio')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    return {
      cleared: keysToRemove.length,
      keys: keysToRemove
    };
  },

  // Get storage size
  getStorageSize: () => {
    let totalSize = 0;
    const sizes: { [key: string]: number } = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([value]).size;
        sizes[key] = size;
        totalSize += size;
      }
    }
    
    return {
      total: totalSize,
      breakdown: sizes,
      formatted: `${(totalSize / 1024).toFixed(2)} KB`
    };
  }
};

// Make debug utilities available in console
if (typeof window !== 'undefined') {
  (window as any).debugStorage = debugStorage;
}






