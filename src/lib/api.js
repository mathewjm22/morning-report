
// Cloudflare Worker endpoint — only used for sharing.
export const WORKER_URL = 'https://humandx-attempt-mathew.sweet-dream-0ed6.workers.dev';

// Share a case: uploads the PDF (base64) + gate metadata to the worker.
export async function saveCaseShare(caseData, pdfBlob) {
  // Convert Blob to base64
  const buf = pdfBlob instanceof ArrayBuffer ? pdfBlob : await pdfBlob.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);
  const payload = {
    id: caseData.id,
    title: caseData.title,
    source: caseData.source,
    gates: caseData.gates,
    contentPages: caseData.contentPages,
    totalPages: caseData.totalPages,
    pdfBase64: b64,
  };
  const res = await fetch(`${WORKER_URL}/save-case`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseData: payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.shareId;
}

export async function loadSharedCase(shareId) {
  const res = await fetch(`${WORKER_URL}/get-case/${shareId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  const meta = data.data;
  const pdfBlob = base64ToBlob(meta.pdfBase64, 'application/pdf');
  return { ...meta, pdfBlob };
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBlob(b64, type) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

