// In-memory only, same pattern as sessionImages.js.
// Table images are large (rendered page crops), so we keep them out of IndexedDB.

const store = new Map(); // caseId -> tables[]

export function setSessionTables(caseId, tables) {
  store.set(caseId, tables);
}

export function getSessionTables(caseId) {
  return store.get(caseId) || null;
}

export function clearSessionTables(caseId) {
  store.delete(caseId);
}
