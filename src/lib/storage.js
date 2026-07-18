// Case storage using IndexedDB (essentially unlimited).
// Progress (per-case user work) still in localStorage — it's small.

const DB_NAME = 'morning-report-db';
const DB_VERSION = 1;
const STORE = 'cases';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('addedAt', 'addedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const result = fn(store);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

// Wrap IndexedDB requests as promises
function req2promise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Public API (async now) ----

export async function listCases() {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const store = transaction.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result || [];
        // Sort newest first
        all.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('listCases failed', e);
    return [];
  }
}

export async function getCase(id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const store = transaction.objectStore(STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('getCase failed', e);
    return null;
  }
}

export async function saveCase(caseData) {
  const entry = {
    id: caseData.id,
    title: caseData.title,
    source: caseData.source,
    addedAt: Date.now(),
    caseData,
  };
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const req = store.put(entry);
      req.onsuccess = () => resolve(entry);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('saveCase failed', e);
    throw e;
  }
}

export async function deleteCase(id) {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('deleteCase failed', e);
    return false;
  }
}

// ---- Progress: still localStorage (small: ddx + highlights + a few strings) ----
const PROGRESS_PREFIX = 'morning-report.progress.';

export function loadProgress(caseId) {
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + caseId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProgress(caseId, progress) {
  try {
    localStorage.setItem(PROGRESS_PREFIX + caseId, JSON.stringify(progress));
  } catch (e) {
    // Localstorage full — drop the oldest progress entries
    console.warn('localStorage full for progress, attempting cleanup', e);
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PROGRESS_PREFIX)) keys.push(k);
      }
      // Drop oldest half
      keys.slice(0, Math.ceil(keys.length / 2)).forEach(k => localStorage.removeItem(k));
      localStorage.setItem(PROGRESS_PREFIX + caseId, JSON.stringify(progress));
    } catch (e2) {
      console.error('Progress save failed even after cleanup', e2);
    }
  }
}

export function clearProgress(caseId) {
  localStorage.removeItem(PROGRESS_PREFIX + caseId);
}

// ---- Migration: move any old localStorage cases into IndexedDB ----
// Run once on app load.
const OLD_KEY = 'morning-report.cases.v1';

export async function migrateOldLocalStorageCases() {
  try {
    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return;
    const oldCases = JSON.parse(raw);
    if (!Array.isArray(oldCases)) return;
    for (const entry of oldCases) {
      if (entry && entry.caseData) {
        try { await saveCase(entry.caseData); } catch {}
      }
    }
    // Remove old localStorage entry to free the quota
    localStorage.removeItem(OLD_KEY);
    console.log(`Migrated ${oldCases.length} cases from localStorage to IndexedDB`);
  } catch (e) {
    console.warn('Migration failed', e);
  }
}
