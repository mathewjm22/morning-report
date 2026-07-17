// localStorage helpers for the case library.
// Cases stored as: { id, title, source, addedAt, caseData }

const KEY = 'morning-report.cases.v1';

export function listCases() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getCase(id) {
  return listCases().find(c => c.id === id) || null;
}

export function saveCase(caseData) {
  const all = listCases();
  const idx = all.findIndex(c => c.id === caseData.id);
  const entry = {
    id: caseData.id,
    title: caseData.title,
    source: caseData.source,
    addedAt: Date.now(),
    caseData,
  };
  if (idx >= 0) all[idx] = entry;
  else all.unshift(entry);
  localStorage.setItem(KEY, JSON.stringify(all));
  return entry;
}

export function deleteCase(id) {
  const filtered = listCases().filter(c => c.id !== id);
  localStorage.setItem(KEY, JSON.stringify(filtered));
}

// Per-case user progress (ddx, highlights, annotations) stored separately
// so it doesn't bloat the main library entry.
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
  localStorage.setItem(PROGRESS_PREFIX + caseId, JSON.stringify(progress));
}

export function clearProgress(caseId) {
  localStorage.removeItem(PROGRESS_PREFIX + caseId);
}
