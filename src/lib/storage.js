
// IndexedDB-backed case storage. Each case entry stores:
//   { id, title, source, addedAt, pdfBlob, gates, contentPages }
// Progress (annotations, DDx, plan, highlights) is a separate object per case.

const DB_NAME = 'morning-report-db';
const DB_VERSION = 2;
const CASES_STORE = 'cases';
const PROGRESS_STORE = 'progress';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CASES_STORE)) {
        db.createObjectStore(CASES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROGRESS_STORE)) {
        db.createObjectStore(PROGRESS_STORE, { keyPath: 'caseId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function txReq(store, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const s = tx.objectStore(store);
    const req = action(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listCases() {
  try {
    const all = await txReq(CASES_STORE, 'readonly', s => s.getAll());
    all.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    // Return metadata only (skip blobs to keep list light)
    return all.map(({ pdfBlob, ...meta }) => meta);
  } catch (e) {
    console.error('listCases failed', e);
    return [];
  }
}

export async function getCase(id) {
  try {
    return await txReq(CASES_STORE, 'readonly', s => s.get(id));
  } catch (e) {
    console.error('getCase failed', e);
    return null;
  }
}

export async function saveCase(caseData) {
  const entry = {
    id: caseData.id,
    title: caseData.title,
    source: caseData.source || '',
    addedAt: caseData.addedAt || Date.now(),
    pdfBlob: caseData.pdfBlob, // Blob or ArrayBuffer
    gates: caseData.gates || [],
    contentPages: caseData.contentPages || null, // { start, end } or null = all pages
    totalPages: caseData.totalPages,
  };
  return await txReq(CASES_STORE, 'readwrite', s => s.put(entry));
}

export async function deleteCase(id) {
  await txReq(CASES_STORE, 'readwrite', s => s.delete(id));
  await txReq(PROGRESS_STORE, 'readwrite', s => s.delete(id));
}

export async function loadProgress(caseId) {
  try {
    const entry = await txReq(PROGRESS_STORE, 'readonly', s => s.get(caseId));
    return entry?.data || null;
  } catch {
    return null;
  }
}

export async function saveProgress(caseId, data) {
  try {
    await txReq(PROGRESS_STORE, 'readwrite', s => s.put({ caseId, data }));
  } catch (e) {
    console.warn('saveProgress failed', e);
  }
}
