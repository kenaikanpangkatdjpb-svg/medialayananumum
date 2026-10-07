import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_USERS } from '../mockData';
import { UserAccount } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);

// Global flag to track if Firestore write/read quota is exhausted
let isQuotaExceeded = false;

function checkAndSetQuotaError(error: any): boolean {
  if (!error) return false;
  const str = String(error.code || error.message || error).toLowerCase();
  if (str.includes('resource-exhausted') || str.includes('quota') || str.includes('limit exceeded')) {
    if (!isQuotaExceeded) {
      isQuotaExceeded = true;
      console.warn('Firestore write/read quota limit exceeded. Falling back to local state and localStorage.');
    }
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

  if (isQuotaExceeded) return fallback;

  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snapshot = await getDocs(usersRef);

    if (snapshot.empty) {
      console.log('Seeding initial users to Firebase Firestore...');
      try {
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, USERS_COLLECTION, u.id), u);
        }
      } catch (e) {
        checkAndSetQuotaError(e);
      }
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

  if (isQuotaExceeded) return fallback;

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

  if (isQuotaExceeded) return;
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

  if (isQuotaExceeded) return;
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

  // Provide immediate local cache to prevent UI flash while connecting
  try {
    const immediateData = getLocalFallback();
    if (immediateData && immediateData.length > 0) {
      onUpdate(immediateData);
    }
  } catch (e) {}

  if (isQuotaExceeded) {
    onUpdate(getLocalFallback());
    return () => {};
  }

  try {
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        const seededMarkerKey = `melayu_${collectionName}_seeded_v4`;
        const isLocallyMarkedSeeded = localStorage.getItem(seededMarkerKey) === 'true';

        if (snapshot.empty && !isLocallyMarkedSeeded && initialData && initialData.length > 0) {
          console.log(`[Firestore] Seeding initial ${collectionName}...`);
          onUpdate(initialData);
          localStorage.setItem(seededMarkerKey, 'true');
          try {
            localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(initialData));
          } catch (e) {}

          if (!isQuotaExceeded) {
            try {
              for (let i = 0; i < initialData.length; i++) {
                const item = initialData[i];
                const docId = item.id ? String(item.id) : `doc_${i}`;
                await setDoc(doc(db, collectionName, docId), sanitizeForFirestore({ ...item, id: docId }));
              }
            } catch (seedErr) {
              checkAndSetQuotaError(seedErr);
            }
          }
        } else if (!snapshot.empty) {
          localStorage.setItem(seededMarkerKey, 'true');
          const remoteItems: T[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data) {
              const effectiveId = String(data.id || docSnap.id);
              remoteItems.push({ ...data, id: effectiveId } as T);
            }
          });

          // Cloud is the single source of truth across PC & Handphone
          onUpdate(remoteItems);
          try {
            localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(remoteItems));
          } catch (e) {
            console.warn(`Unable to cache ${collectionName} in localStorage:`, e);
          }
        } else {
          // Snapshot is empty and was previously seeded (e.g. all items were deleted from PC)
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
  item: T
): Promise<void> {
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

  if (isQuotaExceeded) return;
  try {
    const itemRef = doc(db, collectionName, docId);
    const sanitized = sanitizeForFirestore({ ...item, id: docId });
    await setDoc(itemRef, sanitized, { merge: true });
    console.log(`[saveFirestoreDoc] Successfully synced ${collectionName}/${docId} to Cloud.`);
  } catch (error) {
    console.error(`[saveFirestoreDoc] Error saving ${collectionName}/${docId} to Firestore:`, error);
    checkAndSetQuotaError(error);
  }
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
      }
    }
  } catch (e) {}

  if (isQuotaExceeded) return;
  try {
    // 2. Delete direct doc by ID in Firestore
    const itemRef = doc(db, collectionName, targetId);
    await deleteDoc(itemRef);

    // 3. Scan and delete any duplicate doc where data.id matches targetId
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const deletePromises: Promise<void>[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (docSnap.id === targetId || data.id === targetId || String(data.id) === targetId) {
        deletePromises.push(deleteDoc(doc(db, collectionName, docSnap.id)));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (error) {
    checkAndSetQuotaError(error);
  }
}

// Generic save entire collection (atomic bulk sync with cleanup of orphaned docs)
export async function saveFirestoreCollection<T extends { id?: string | number }>(
  collectionName: string,
  items: T[]
): Promise<void> {
  // Update local cache immediately
  try {
    localStorage.setItem(`melayu_${collectionName}`, JSON.stringify(items));
    localStorage.setItem(`melayu_${collectionName}_seeded_v4`, 'true');
  } catch (e) {}

  if (isQuotaExceeded) return;
  try {
    const colRef = collection(db, collectionName);
    const existingSnap = await getDocs(colRef);
    const existingIds = new Set<string>();
    existingSnap.forEach((docSnap) => existingIds.add(docSnap.id));

    const newIds = new Set<string>();

    // 1. Write or update all items
    for (let i = 0; i < items.length; i++) {
      if (isQuotaExceeded) break;
      const item = items[i];
      const docId = item.id ? String(item.id) : `doc_${i}`;
      newIds.add(docId);
      const sanitized = sanitizeForFirestore({ ...item, id: docId });
      await setDoc(doc(db, collectionName, docId), sanitized);
    }

    // 2. Clean up any previous documents that no longer exist in the new set
    const deletePromises: Promise<void>[] = [];
    existingIds.forEach((id) => {
      if (!newIds.has(id)) {
        deletePromises.push(deleteDoc(doc(db, collectionName, id)));
      }
    });
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (error) {
    checkAndSetQuotaError(error);
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

