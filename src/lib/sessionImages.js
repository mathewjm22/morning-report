// In-memory only. Images from PDF extraction live here for the current
// browser session. Reload the page → gone. User re-uploads PDF to get them back.
// This keeps localStorage lean and avoids the 5-10MB cap.

const store = new Map(); // caseId -> figures[]

export function setSessionFigures(caseId, figures) {
  store.set(caseId, figures);
}

export function getSessionFigures(caseId) {
  return store.get(caseId) || null;
}

export function clearSessionFigures(caseId) {
  store.delete(caseId);
}
