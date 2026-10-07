// Safe LocalStorage & Media Optimization Utilities for Melayu DJPb Riau

/**
 * Compresses an image file or DataURL to optimal web dimensions and file size.
 * Reduces raw 5-15MB phone camera/camera photos down to ~35-70KB JPEG while preserving crisp quality.
 * Ensures data easily fits within Firestore's 1MB document limit and localStorage quotas.
 */
export async function compressImage(
  fileOrDataUrl: File | string,
  maxWidth = 1000,
  maxHeight = 700,
  quality = 0.68
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      // Calculate constrained aspect ratio
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to original
        if (typeof fileOrDataUrl === 'string') {
          resolve(fileOrDataUrl);
        } else {
          const reader = new FileReader();
          reader.onload = e => resolve((e.target?.result as string) || '');
          reader.onerror = reject;
          reader.readAsDataURL(fileOrDataUrl);
        }
        return;
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (e) {
        // Fallback
        if (typeof fileOrDataUrl === 'string') {
          resolve(fileOrDataUrl);
        } else {
          const reader = new FileReader();
          reader.onload = ev => resolve((ev.target?.result as string) || '');
          reader.onerror = reject;
          reader.readAsDataURL(fileOrDataUrl);
        }
      }
    };

    img.onerror = () => {
      // If error loading image, fallback to raw reader if File
      if (typeof fileOrDataUrl === 'string') {
        resolve(fileOrDataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = e => resolve((e.target?.result as string) || '');
        reader.onerror = reject;
        reader.readAsDataURL(fileOrDataUrl);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = e => {
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Safely writes to localStorage with automatic QuotaExceededError protection.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    console.warn(`[safeLocalStorageSet] Quota exceeded or error when writing '${key}':`, error);

    // If quota exceeded, attempt smart recovery
    try {
      // 1. Purge non-essential caches
      const keysToClean = [
        'melayu_hero_bg_image',
        'melayu_cek_seribu_jpeg',
        'melayu_security_roster_preview'
      ];
      for (const k of keysToClean) {
        if (k !== key) {
          localStorage.removeItem(k);
        }
      }

      // Retry setting key
      localStorage.setItem(key, value);
      return true;
    } catch (retryError) {
      console.error(`[safeLocalStorageSet] Unable to store '${key}' in localStorage, keeping in-memory.`, retryError);
      return false;
    }
  }
}

/**
 * Safely reads from localStorage with type fallback.
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[safeLocalStorageGet] Failed parsing '${key}', using fallback:`, error);
    return fallback;
  }
}

/**
 * Safely writes to sessionStorage (session-scoped: automatically cleared when browser closes).
 */
export function safeSessionStorageSet(key: string, value: string): boolean {
  try {
    sessionStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[safeSessionStorageSet] Error writing to '${key}':`, error);
    return false;
  }
}

/**
 * Safely reads from sessionStorage with type fallback.
 */
export function safeSessionStorageGet<T>(key: string, fallback: T): T {
  try {
    const item = sessionStorage.getItem(key);
    if (!item) return fallback;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[safeSessionStorageGet] Failed parsing '${key}', using fallback:`, error);
    return fallback;
  }
}

/**
 * Safely removes from sessionStorage.
 */
export function safeSessionStorageRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`[safeSessionStorageRemove] Error removing '${key}':`, error);
  }
}
