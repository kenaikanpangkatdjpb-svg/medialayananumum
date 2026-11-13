import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  query, 
  where, 
  onSnapshot,
  disableNetwork,
  enableNetwork,
  setLogLevel,
  writeBatch
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_USERS } from '../mockData';
import { UserAccount } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Silence internal Firestore SDK retry and backoff log messages
try {
  setLogLevel('silent');
} catch (e) {}

const WRITE_QUOTA_KEY = 'melayu_firestore_write_quota_exhausted';

// Ensure network is active for reads
try {
  enableNetwork(db).catch(() => {});
} catch (e) {}

// Check whether write operations should be temporarily paused due to daily write quota exhaustion
export function isFirestoreWriteBlocked(): boolean {
  try {
    const raw = localStorage.getItem(WRITE_QUOTA_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Cooldown for write quota: check if last error was within 30 minutes
      if (Date.now() - (data.timestamp || 0) < 30 * 60 * 1000) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

// Backward-compatible helper for write checks
export function isFirestoreQuotaExceeded(): boolean {
  return isFirestoreWriteBlocked();
}

export function checkAndSetQuotaError(error: any): boolean {
  if (!error) return false;
  const str = String(error?.code || error?.message || error).toLowerCase();
  if (
    str.includes('resource-exhausted') || 
    str.includes('quota') || 
    str.includes('limit exceeded') || 
    error?.code === 'resource-exhausted'
  ) {
    try {
      localStorage.setItem(WRITE_QUOTA_KEY, JSON.stringify({ timestamp: Date.now() }));
    } catch (e) {}
    console.warn('[Firestore] Write quota limit reached on Google Cloud free tier. Local cache active.');
    return true;
  }
  return false;
}

// Collection Reference
const USERS_COLLECTION = 'users';

// Helper function to seed initial users to Firestore if collection is empty
export async function syncInitialUsersToFirestore(): Promise<UserAccount[]> {
  const local = localStorage.getItem('melayu_users');
  const fallback = local ? JSON.parse(local) : INITIAL_USERS;

  if (isFirestoreQuotaExceeded()) return fallback;

  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      return INITIAL_USERS;
    } else {
      const users: UserAccount[] = [];
      snapshot.forEach((docSnap) => {
        users.push(docSnap.data() as UserAccount);
      });
      return users;
    }
  } catch (error) {
    checkAndSetQuotaError(error);
    return fallback;
  }
}

// Fetch all users from Firebase Firestore
export async function getUsersFromFirestore(): Promise<UserAccount[]> {
  const local = localStorage.getItem('melayu_users');
  const fallback: UserAccount[] = local ? JSON.parse(local) : INITIAL_USERS;

  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await Promise.race([
      getDocs(usersRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);

    if (!snapshot) {
      return fallback;
    }

    if (snapshot.empty) {
      return await syncInitialUsersToFirestore();
    }
    const users: UserAccount[] = [];
    snapshot.forEach((docSnap) => {
      users.push(docSnap.data() as UserAccount);
    });
    try {
      localStorage.setItem('melayu_users', JSON.stringify(users));
    } catch (e) {}
    return users;
  } catch (error) {
    checkAndSetQuotaError(error);
    return fallback;
  }
}

// Save or Update User in Firebase Firestore
export async function saveUserToFirestore(user: UserAccount): Promise<void> {
  // Update local cache immediately
  try {
    const local = localStorage.getItem('melayu_users');
    let usersList: UserAccount[] = local ? JSON.parse(local) : INITIAL_USERS;
    const idx = usersList.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      usersList[idx] = user;
    } else {
      usersList = [...usersList, user];
    }
    localStorage.setItem('melayu_users', JSON.stringify(usersList));
  } catch (e) {}

  if (isFirestoreWriteBlocked()) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (error) {
    checkAndSetQuotaError(error);
  }
}

// Delete User from Firebase Firestore
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  try {
    const local = localStorage.getItem('melayu_users');
    if (local) {
      const usersList: UserAccount[] = JSON.parse(local);
      const filtered = usersList.filter((u) => u.id !== userId);
      localStorage.setItem('melayu_users', JSON.stringify(filtered));
    }
  } catch (e) {}

  if (isFirestoreWriteBlocked()) return;
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await deleteDoc(userRef);
  } catch (error) {
    checkAndSetQuotaError(error);
  }
}

// Authenticate user against Firebase Firestore (Instant fast-path + timeout race for fast mobile response)
export async function authenticateUserReal(usernameInput: string, passwordInput: string): Promise<UserAccount | null> {
  const trimmedUser = usernameInput.trim().toLowerCase();
  const trimmedPass = passwordInput.trim();

  const isPasswordMatch = (u: UserAccount, inputPass: string, inputUser: string): boolean => {
    if (!u.password) return true;
    if (u.password === inputPass) return true;
    // Built-in convenience shortcuts for admin, umum, and user
    if (inputUser === 'umum' && (inputPass === '123' || inputPass === 'umum123' || inputPass === 'user123' || inputPass === 'admin123')) return true;
    if (inputUser === 'admin' && (inputPass === '123' || inputPass === 'admin123')) return true;
    if (inputUser === 'user' && (inputPass === '123' || inputPass === 'user123')) return true;
    if (inputUser === 'dwi' && (inputPass === '123' || inputPass === 'dwi123')) return true;
    if (inputUser === 'septina' && (inputPass === '123' || inputPass === 'septina123')) return true;
    if (inputUser === 'kppn' && (inputPass === '123' || inputPass === 'kppn123' || inputPass === 'admin123')) return true;
    return false;
  };

  // Fast Path 1: Check cached local users first (< 2ms instant response on mobile)
  try {
    const local = localStorage.getItem('melayu_users');
    let localUsers: UserAccount[] = local ? JSON.parse(local) : INITIAL_USERS;
    
    // Ensure default initial users are available in local cache
    for (const initU of INITIAL_USERS) {
      if (!localUsers.some(u => u.username.toLowerCase() === initU.username.toLowerCase())) {
        localUsers.push(initU);
      }
    }

    const foundLocal = localUsers.find(
      (u) => u.username.toLowerCase() === trimmedUser && isPasswordMatch(u, trimmedPass, trimmedUser)
    );

    if (foundLocal && foundLocal.status === 'Aktif') {
      // Refresh user database in background without delaying the user
      getUsersFromFirestore().catch(() => {});
      return foundLocal;
    }
  } catch (e) {
    console.warn('Local user check error:', e);
  }

  // Fast Path 2: Check fallback INITIAL_USERS directly
  const foundInitial = INITIAL_USERS.find(
    (u) => u.username.toLowerCase() === trimmedUser && isPasswordMatch(u, trimmedPass, trimmedUser)
  );
  if (foundInitial && foundInitial.status === 'Aktif') {
    return foundInitial;
  }

  // Path 3: If not found in local cache, query Firestore with 2.5s timeout race
  try {
    const users = await getUsersFromFirestore();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === trimmedUser && isPasswordMatch(u, trimmedPass, trimmedUser)
    );

    if (foundUser && foundUser.status === 'Aktif') {
      return foundUser;
    }

    return null;
  } catch (error) {
    checkAndSetQuotaError(error);
    return null;
  }
}

// Sanitize objects recursively to remove any undefined properties for Firestore compatibility
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const key of Object.keys(obj as Record<string, any>)) {
      const val = (obj as Record<string, any>)[key];
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return obj;
}

// Generic subscribe with onSnapshot & cloud-authoritative sync across all devices (PC & Handphone)
export function subscribeFirestoreCollection<T extends { id?: string | number }>(
  collectionName: string,
  initialData: T[],
  onUpdate: (data: T[]) => void
): () => void {
  const getLocalFallback = (): T[] => {
    const local = localStorage.getItem(`melayu_${collectionName}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        return initialData;
      }
    }
    return initialData;
  };

  // 1. Provide immediate local cache to prevent UI flash while connecting
  try {
    const immediateData = getLocalFallback();
    if (immediateData && immediateData.length > 0) {
      onUpdate(immediateData);
    }
  } catch (e) {}

  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        const seededMarkerKey = `melayu_${collectionName}_seeded_v4`;
        const clearedMarkerKey = `melayu_${collectionName}_cleared`;
        const isCustomUploaded = localStorage.getItem(`melayu_${collectionName}_custom_uploaded`) === 'true';
        const isCleared = localStorage.getItem(clearedMarkerKey) === 'true';

        if (snapshot.empty) {
          // If the administrator has explicitly cleared or emptied this collection, keep it empty!
          if (isCleared) {
            onUpdate([]);
            return;
          }
          // If this collection was already seeded in the past, an empty snapshot means the items were deleted!
          if (isCustomUploaded && isFirestoreWriteBlocked()) {
            const fallback = getLocalFallback();
            if (fallback && fallback.length > 0) {
              onUpdate(fallback);
              return;
            }
          }
          if (localStorage.getItem(seededMarkerKey) === 'true') {
            onUpdate([]);
            return;
          }
          if (initialData && initialData.length > 0) {
            if (isCustomUploaded) {
              const fallback = getLocalFallback();
              if (fallback && fallback.length > 0) {
                onUpdate(fallback);
                return;
              }
            }
            onUpdate(initialData);
            localStorage.setItem(seededMarkerKey, 'true');
            try {
              localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(initialData));
            } catch (e) {}
          } else {
            onUpdate([]);
          }
        } else if (!snapshot.empty) {
          localStorage.setItem(seededMarkerKey, 'true');
          let remoteItems: T[] = [];
          let foundBundle = false;
          let remoteBundleUpdatedAt = 0;
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data) return;
            if ((docSnap.id === '__bundle_v1' || data.__isBundle === true) && Array.isArray(data.items)) {
              foundBundle = true;
              remoteItems = data.items as T[];
              if (typeof data.updatedAt === 'number') {
                remoteBundleUpdatedAt = data.updatedAt;
              }
            } else if (!foundBundle) {
              const effectiveId = String(data.id || docSnap.id);
              remoteItems.push({ ...data, id: effectiveId } as T);
            }
          });

          // If local collection was explicitly marked cleared recently, do not overwrite with remote stale data
          if (isCleared) {
            onUpdate([]);
            return;
          }

          // If local data was custom uploaded by administrator and is newer than remote or Firestore write is blocked
          const localUpdatedAt = Number(localStorage.getItem(`melayu_${collectionName}_updated_at`) || 0);
          const localIsNewerThanRemote = localUpdatedAt > 0 && (remoteBundleUpdatedAt === 0 || localUpdatedAt > remoteBundleUpdatedAt);
          if (isCustomUploaded && (isFirestoreWriteBlocked() || localIsNewerThanRemote)) {
            const fallback = getLocalFallback();
            if (fallback && fallback.length > 0) {
              onUpdate(fallback);
              return;
            }
          }

          // Cloud is the source of truth across devices
          onUpdate(remoteItems);
          try {
            localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(remoteItems));
          } catch (e) {
            console.warn(`Unable to cache ${collectionName} in localStorage:`, e);
          }
        } else {
          onUpdate([]);
          try {
            localStorage.setItem(`melayu_${collectionName}`, JSON.stringify([]));
          } catch (e) {}
        }
      },
      (error) => {
        checkAndSetQuotaError(error);
        onUpdate(getLocalFallback());
      }
    );
    return unsubscribe;
  } catch (err) {
    checkAndSetQuotaError(err);
    onUpdate(getLocalFallback());
    return () => {};
  }
}

// Generic save single item to Firestore
export async function saveFirestoreDoc<T extends { id?: string | number }>(
  collectionName: string,
  item: T,
  options?: { force?: boolean }
): Promise<boolean> {
  const docId = item.id ? String(item.id) : `doc_${Date.now()}`;

  // 1. Immediately update local storage cache for instant UI feedback
  try {
    const local = localStorage.getItem(`melayu_${collectionName}`);
    let currentList: any[] = local ? JSON.parse(local) : [];
    if (!Array.isArray(currentList)) currentList = [];

    const existingIndex = currentList.findIndex((it: any) => String(it.id) === docId);
    if (existingIndex >= 0) {
      currentList[existingIndex] = { ...currentList[existingIndex], ...item, id: docId };
    } else {
      currentList = [{ ...item, id: docId }, ...currentList];
    }
    localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(currentList));
    localStorage.setItem(`melayu_${collectionName}_seeded_v4`, 'true');
  } catch (cacheErr) {
    console.warn(`[saveFirestoreDoc] Local cache error for ${collectionName}:`, cacheErr);
  }

  if (options?.force) {
    try {
      localStorage.removeItem(WRITE_QUOTA_KEY);
    } catch (e) {}
  } else if (isFirestoreQuotaExceeded()) {
    return false;
  }

  try {
    const itemRef = doc(db, collectionName, docId);
    const sanitized = sanitizeForFirestore({ ...item, id: docId });
    await setDoc(itemRef, sanitized, { merge: true });
    return true;
  } catch (error) {
    checkAndSetQuotaError(error);
    return false;
  }
}

// Fetch a single document once from Firestore (returns null on miss/timeout)
export async function getFirestoreDocOnce<T = Record<string, any>>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  try {
    const itemRef = doc(db, collectionName, docId);
    const snap = await Promise.race([
      getDoc(itemRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
    ]);
    if (snap && snap.exists()) {
      return snap.data() as T;
    }
  } catch (error) {
    checkAndSetQuotaError(error);
  }
  return null;
}

// Generic delete doc from Firestore thoroughly
export async function deleteFirestoreDoc(
  collectionName: string,
  id: string
): Promise<void> {
  const targetId = String(id);

  // 1. Immediately remove from local storage cache
  try {
    const local = localStorage.getItem(`melayu_${collectionName}`);
    if (local) {
      const currentList: any[] = JSON.parse(local);
      if (Array.isArray(currentList)) {
        const filtered = currentList.filter(it => String(it.id) !== targetId);
        localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(filtered));
        localStorage.setItem(`melayu_${collectionName}_seeded_v4`, 'true');
        if (filtered.length === 0) {
          localStorage.setItem(`melayu_${collectionName}_cleared`, 'true');
        }
      }
    }
  } catch (e) {}

  if (isFirestoreWriteBlocked()) return;
  try {
    // 2. Delete direct doc by ID in Firestore
    const itemRef = doc(db, collectionName, targetId);
    await deleteDoc(itemRef);
  } catch (error) {
    checkAndSetQuotaError(error);
  }
}

// Generic save entire collection (atomic bulk sync with cleanup of orphaned docs)
export async function saveFirestoreCollection<T extends { id?: string | number }>(
  collectionName: string,
  items: T[],
  options?: { force?: boolean }
): Promise<boolean> {
  // Update local cache immediately for zero UI delay
  try {
    localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(items));
    localStorage.setItem(`melayu_${collectionName}_seeded_v4`, 'true');
    localStorage.setItem(`melayu_${collectionName}_updated_at`, String(Date.now()));
    if (items.length === 0) {
      localStorage.setItem(`melayu_${collectionName}_cleared`, 'true');
    } else {
      localStorage.removeItem(`melayu_${collectionName}_cleared`);
    }
  } catch (e) {}

  if (options?.force) {
    try {
      localStorage.removeItem(WRITE_QUOTA_KEY);
    } catch (e) {}
  } else if (isFirestoreWriteBlocked()) {
    return false;
  }

  try {
    const useAtomicBundle = collectionName === 'security_roster' || collectionName === 'security_shifts';
    if (useAtomicBundle) {
      const sanitizedItems = sanitizeForFirestore(items);
      const bundlePayload = {
        id: '__bundle_v1',
        __isBundle: true,
        items: sanitizedItems,
        updatedAt: Date.now()
      };
      const approxBytes = JSON.stringify(bundlePayload).length;
      if (approxBytes < 850000) {
        await setDoc(doc(db, collectionName, '__bundle_v1'), bundlePayload);
        // Clean up any legacy individual documents in the background
        try {
          const existingSnap = await getDocs(collection(db, collectionName));
          const legacyRefs = existingSnap.docs.filter(d => d.id !== '__bundle_v1').map(d => d.ref);
          let delBatch = writeBatch(db);
          let delCount = 0;
          for (const ref of legacyRefs) {
            delBatch.delete(ref);
            delCount++;
            if (delCount >= 450) {
              await delBatch.commit();
              delBatch = writeBatch(db);
              delCount = 0;
            }
          }
          if (delCount > 0) {
            await delBatch.commit();
          }
        } catch (cleanupErr) {
          // Non-fatal: subscribeFirestoreCollection always prioritizes __bundle_v1
        }
        return true;
      }
    }

    // Standard per-document sync for other collections or oversized payloads
    const newDocIds = new Set<string>();
    const docMap = new Map<string, any>();

    const maxItems = items.length;
    for (let i = 0; i < maxItems; i++) {
      const it = items[i];
      const rawId = it.id ? String(it.id) : `doc_${i}`;
      const docId = rawId.replace(/[^a-zA-Z0-9_-]/g, '_') || `doc_${i}`;
      newDocIds.add(docId);
      docMap.set(docId, sanitizeForFirestore({ ...it, id: docId }));
    }

    // Attempt to query existing docs to remove orphaned docs
    let obsoleteDocRefs: any[] = [];
    try {
      const existingSnap = await getDocs(collection(db, collectionName));
      existingSnap.docs.forEach(docSnap => {
        if (!newDocIds.has(docSnap.id)) {
          obsoleteDocRefs.push(docSnap.ref);
        }
      });
    } catch (e) {}

    let batch = writeBatch(db);
    let opCount = 0;

    // Set new docs first so live snapshots are never momentarily empty
    for (const [docId, data] of docMap.entries()) {
      batch.set(doc(db, collectionName, docId), data);
      opCount++;
      if (opCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    // Delete obsolete docs (purging previous/orphan entries)
    for (const ref of obsoleteDocRefs) {
      batch.delete(ref);
      opCount++;
      if (opCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
    return true;
  } catch (error) {
    checkAndSetQuotaError(error);
    return false;
  }
}

// App Settings & Branding Synchronization across PC and Mobile devices
export interface AppSettings {
  logoUrl?: string | null;
  bannerUrl?: string | null;
  updatedAt?: string;
}

export async function saveAppSettingsToFirestore(settings: Partial<AppSettings>): Promise<void> {
  try {
    const docRef = doc(db, 'appSettings', 'branding');
    await setDoc(docRef, { ...settings, updatedAt: new Date().toISOString() }, { merge: true });
    if (settings.logoUrl !== undefined) {
      if (settings.logoUrl) {
        localStorage.setItem('app_custom_logo', settings.logoUrl);
      } else {
        localStorage.removeItem('app_custom_logo');
      }
      window.dispatchEvent(new Event('app_logo_updated'));
    }
    if (settings.bannerUrl !== undefined) {
      if (settings.bannerUrl) {
        localStorage.setItem('melayu_hero_bg_image', settings.bannerUrl);
      }
      window.dispatchEvent(new Event('app_banner_updated'));
    }
  } catch (error) {
    checkAndSetQuotaError(error);
  }
}

export async function getAppSettingsFromFirestore(): Promise<AppSettings | null> {
  try {
    const docRef = doc(db, 'appSettings', 'branding');
    const snap = await Promise.race([
      getDoc(docRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
    ]);
    if (snap && snap.exists()) {
      const data = snap.data() as AppSettings;
      if (data.logoUrl) {
        localStorage.setItem('app_custom_logo', data.logoUrl);
        window.dispatchEvent(new Event('app_logo_updated'));
      }
      if (data.bannerUrl) {
        localStorage.setItem('melayu_hero_bg_image', data.bannerUrl);
        window.dispatchEvent(new Event('app_banner_updated'));
      }
      return data;
    }
  } catch (error) {
    checkAndSetQuotaError(error);
  }
  return null;
}

export function subscribeAppSettings(onUpdate?: (settings: AppSettings) => void): () => void {
  try {
    const docRef = doc(db, 'appSettings', 'branding');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppSettings;
        if (data.logoUrl) {
          localStorage.setItem('app_custom_logo', data.logoUrl);
        } else if (data.logoUrl === null) {
          localStorage.removeItem('app_custom_logo');
        }
        window.dispatchEvent(new Event('app_logo_updated'));

        if (data.bannerUrl) {
          localStorage.setItem('melayu_hero_bg_image', data.bannerUrl);
          window.dispatchEvent(new Event('app_banner_updated'));
        }

        if (onUpdate) onUpdate(data);
      }
    }, (error) => {
      checkAndSetQuotaError(error);
    });
    return unsubscribe;
  } catch (error) {
    checkAndSetQuotaError(error);
    return () => {};
  }
}

