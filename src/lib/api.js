// Cloudflare Worker endpoint
export const WORKER_URL = 'https://humandx-attempt-mathew.sweet-dream-0ed6.workers.dev';

export async function parseCase(text, imageMetadata = []) {
  const res = await fetch(`${WORKER_URL}/parse-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, imageMetadata }),
  });
  const data = await res.json();
  if (!res.ok) {
    // Log full response for debugging structure/parse failures
    console.error('parseCase failed:', data);
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.detail = data.detail;
    err.debug = data.debug;
    throw err;
  }
  return data;
}

export async function saveCaseShare(caseData) {
  const res = await fetch(`${WORKER_URL}/save-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseData }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.shareId;
}

export async function loadSharedCase(shareId) {
  const res = await fetch(`${WORKER_URL}/get-case/${shareId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.data;
}
