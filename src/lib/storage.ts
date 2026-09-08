import type { AppSettings, DocumentRecord, Lookup, SavedWord } from '../types';

const DB_NAME = 'context-reader';
const DB_VERSION = 1;
const DEFAULT_SETTINGS: AppSettings = {
  provider: 'dummy',
  model: 'dummy-local',
  rememberKey: false,
  theme: 'system',
  panelOpen: true,
  panelWidth: 360
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('documents')) db.createObjectStore('documents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('lookups')) db.createObjectStore('lookups', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('saved')) db.createObjectStore('saved', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put<T extends object>(storeName: string, value: T) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  const result = await new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function saveDocument(doc: DocumentRecord) { return put('documents', doc); }
export async function deleteDocument(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function clearDocuments() {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite');
    tx.objectStore('documents').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function saveLookup(lookup: Lookup) { return put('lookups', lookup); }
export async function saveWord(word: SavedWord) { return put('saved', word); }
export async function getLookups() { return (await getAll<Lookup>('lookups')).sort((a, b) => b.createdAt - a.createdAt); }
export async function getSavedWords() { return (await getAll<SavedWord>('saved')).sort((a, b) => b.createdAt - a.createdAt); }
export async function getDocuments() { return (await getAll<DocumentRecord>('documents')).sort((a, b) => b.createdAt - a.createdAt); }

export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.local.get('settings');
  const settings = { ...DEFAULT_SETTINGS, ...(result.settings ?? {}) } as AppSettings;
  if (settings.provider !== 'gemini' && settings.provider !== 'dummy') {
    settings.provider = 'dummy';
    settings.model = 'dummy-local';
  }
  if (settings.provider === 'gemini' && settings.model !== 'gemini-3.6-flash') {
    settings.model = 'gemini-3.6-flash';
  }
  return settings;
}

export async function saveSettings(settings: AppSettings) {
  const { apiKey, rememberKey, ...safeSettings } = settings;
  await chrome.storage.local.set({ settings: safeSettings });
  const normalizedApiKey = apiKey?.trim();
  if (normalizedApiKey) {
    if (rememberKey) {
      await chrome.storage.local.set({ apiKey: normalizedApiKey });
      if (chrome.storage.session) await chrome.storage.session.remove('apiKey');
    } else {
      if (chrome.storage.session) await chrome.storage.session.set({ apiKey: normalizedApiKey });
      await chrome.storage.local.remove('apiKey');
    }
  } else if (apiKey === undefined) {
    const existingApiKey = await getApiKey();
    if (existingApiKey) {
      await saveSettings({ ...settings, apiKey: existingApiKey });
    }
  } else {
    await chrome.storage.local.remove('apiKey');
    if (chrome.storage.session) await chrome.storage.session.remove('apiKey');
  }
}

export async function getApiKey(): Promise<string | undefined> {
  if (chrome.storage.session) {
    const session = await chrome.storage.session.get('apiKey');
    if (typeof session.apiKey === 'string' && session.apiKey.trim()) return session.apiKey.trim();
  }
  const local = await chrome.storage.local.get('apiKey');
  return typeof local.apiKey === 'string' && local.apiKey.trim() ? local.apiKey.trim() : undefined;
}
