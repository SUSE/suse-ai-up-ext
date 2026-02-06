// UI Persist service

export class UIPersistService {
  // Stub
}

export function persistLoad<T = any>(key: string, defaultValue: T = null as any, ttl?: number): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    const parsed = JSON.parse(item);
    if (ttl && parsed.timestamp && Date.now() - parsed.timestamp > ttl) {
      localStorage.removeItem(key);
      return defaultValue;
    }

    return parsed.data || defaultValue;
  } catch (error) {
    console.warn('Failed to load persisted data:', error);
    return defaultValue;
  }
}

export function persistSave(key: string, data: any): void {
  try {
    const item = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    console.warn('Failed to save persisted data:', error);
  }
}

export function persistClear(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      // Clear all persisted data
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('persist-')) {
          localStorage.removeItem(k);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to clear persisted data:', error);
  }
}