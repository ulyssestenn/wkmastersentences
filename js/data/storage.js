import {
  LIBRARY_SNAPSHOT_KEYS,
  OBJECT_STORES,
  SENTENCE_DB_NAME,
  SENTENCE_DB_VERSION,
  SETTINGS_KEYS,
  sentenceSchemaVersion,
} from './schema.js';

let dbPromise;

function getIndexedDb() {
  if (!globalThis.indexedDB) {
    throw new Error('IndexedDB is not available in this environment.');
  }

  return globalThis.indexedDB;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

function transactionToPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted.'));
  });
}

export function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = getIndexedDb().open(SENTENCE_DB_NAME, SENTENCE_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(OBJECT_STORES.settings)) {
        db.createObjectStore(OBJECT_STORES.settings, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(OBJECT_STORES.librarySnapshots)) {
        db.createObjectStore(OBJECT_STORES.librarySnapshots, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB database.'));
  });

  return dbPromise;
}

export async function saveToken(token) {
  const db = await openDatabase();
  const transaction = db.transaction(OBJECT_STORES.settings, 'readwrite');
  const store = transaction.objectStore(OBJECT_STORES.settings);

  store.put({
    key: SETTINGS_KEYS.auth,
    token,
  });

  await transactionToPromise(transaction);
}

export async function loadToken() {
  const db = await openDatabase();
  const transaction = db.transaction(OBJECT_STORES.settings, 'readonly');
  const store = transaction.objectStore(OBJECT_STORES.settings);
  const request = store.get(SETTINGS_KEYS.auth);

  const record = await requestToPromise(request);
  await transactionToPromise(transaction);

  return record?.token ?? null;
}

export async function saveCurrentSnapshot(snapshot) {
  const db = await openDatabase();
  const transaction = db.transaction(OBJECT_STORES.librarySnapshots, 'readwrite');
  const store = transaction.objectStore(OBJECT_STORES.librarySnapshots);

  // Single-record replace in one readwrite transaction keeps `current` atomic.
  store.put({
    key: LIBRARY_SNAPSHOT_KEYS.current,
    ...snapshot,
    schemaVersion: snapshot?.schemaVersion ?? sentenceSchemaVersion,
    lastSyncedAt: snapshot?.lastSyncedAt ?? null,
    stats: snapshot?.stats ?? null,
  });

  await transactionToPromise(transaction);
}

export async function loadCurrentSnapshot() {
  const db = await openDatabase();
  const transaction = db.transaction(OBJECT_STORES.librarySnapshots, 'readonly');
  const store = transaction.objectStore(OBJECT_STORES.librarySnapshots);
  const request = store.get(LIBRARY_SNAPSHOT_KEYS.current);

  const record = await requestToPromise(request);
  await transactionToPromise(transaction);

  if (!record) {
    return null;
  }

  const { key, ...snapshot } = record;
  return snapshot;
}
