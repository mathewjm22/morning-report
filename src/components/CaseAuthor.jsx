import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronLeft, Save } from 'lucide-react';
import { loadPdf, renderPage } from '../lib/pdfLoader.js';
import { saveCase } from '../lib/storage.js';

export default function CaseAuthor() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('upload'); // 'upload' | 'configure'
  const [pdfFile, setPdfFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [contentStart, setContentStart] = useState(1);
  const [contentEnd, setContentEnd] = useState(1);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [saveError, setSaveError] = useState(null);

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setLoading(true);
    setProgress('Loading PDF...');
    try {
      const buf = await file.arrayBuffer();
      const doc = await loadPdf(buf.slice(0));
      setPdfFile(file);
      setTotalPages(doc.numPages);
      setContentEnd(doc.numPages);
      setTitle(file.name.replace(/\.pdf$/i, ''));

      const thumbs = [];
      for (let p = 1; p <= doc.numPages; p++) {
        setProgress(`Rendering thumbnail ${p} of ${doc.numPages}...`);
        const canvas = document.createElement('canvas');
        await renderPage(doc, p, canvas, 0.3);
        thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
      }
      setThumbnails(thumbs);
      setStage('configure');
    } catch (e) {
      alert('Failed to load PDF: ' + e.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const save = async () => {
  if (!title.trim()) { setSaveError('Title required'); return; }
  setSaveError(null);
  setLoading(true);
  console.log('=== SAVE STARTED ===');
  try {
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    if (!id) throw new Error('Title must contain letters or numbers');
    console.log('ID:', id);
    console.log('pdfFile:', pdfFile);
    console.log('pdfFile type:', pdfFile?.constructor?.name);
    console.log('pdfFile size:', pdfFile?.size);

    // Convert File to ArrayBuffer FIRST so we're not storing a live File handle.
    // File objects can go stale, especially after re-renders.
    console.log('Reading pdfFile into ArrayBuffer...');
    const pdfBuffer = await pdfFile.arrayBuffer();
    console.log('ArrayBuffer size:', pdfBuffer.byteLength);

    const payload = {
      id,
      title: title.trim(),
      source: source.trim(),
      pdfBlob: pdfBuffer, // ArrayBuffer, not File
      gates: [],
      contentPages: { start: contentStart, end: contentEnd },
      totalPages,
      addedAt: Date.now(),
    };
    console.log('Calling saveCase with payload keys:', Object.keys(payload));

    // Add a timeout so we know if it hangs
    const savePromise = saveCase(payload);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('saveCase timed out after 10s — IndexedDB likely stuck')), 10000)
    );
    await Promise.race([savePromise, timeoutPromise]);

    console.log('=== SAVE COMPLETE ===');
    navigate(`/case/${encodeURIComponent(id)}`);
  } catch (e) {
    console.error('=== SAVE FAILED ===', e);
    setSaveError(e.message || String(e));
    setLoading(false);
  }
};

  if (stage === 'upload') {
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="mb-4 text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to library
          </button>
          <h1 className="text-base font-bold mb-4">New Case</h1>
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (!loading) handleFile(e.dataTransfer.files[0]); }}
            className={`border-2 border-dashed border-stone-300 rounded-lg p-12 text-center transition ${
              loading ? 'opacity-50' : 'hover:border-sage-400 hover:bg-sage-50/50 cursor-pointer'
            }`}
          >
            <Upload className="mx-auto text-stone-400 mb-3" size={48} />
            <p className="font-semibold text-stone-700 mb-1">Drop a PDF or click to browse</p>
            <p className="text-sm text-stone-500">Any PDF works; NEJM Case Records are the primary use case.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
          {loading && <div className="mt-4 text-center text-sm text-stone-600">{progress}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={() => navigate('/')} className="mb-4 text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1">
          <ChevronLeft size={14} /> Back to library
        </button>
        <h1 className="text-base font-bold mb-3">Configure case</h1>

        <div className="bg-white border border-stone-200 rounded-lg p-4 mb-4">
          <label className="block text-xs font-semibold text-stone-700 mb-1">Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full text-sm px-2 py-1.5 border border-stone-300 rounded mb-3"
          />
          <label className="block text-xs font-semibold text-stone-700 mb-1">Source (citation)</label>
          <input
            value={source}
            onChange={e => setSource(e.target.value)}
            placeholder="e.g. N Engl J Med 2026;394:907-16"
            className="w-full text-sm px-2 py-1.5 border border-stone-300 rounded"
          />
        </div>

        <div className="bg-white border border-stone-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <p className="text-xs font-semibold text-stone-700">Case content pages:</p>
            <div className="flex items-center gap-1 text-xs">
              <input
                type="number"
                value={contentStart}
                onChange={e => setContentStart(Math.max(1, Math.min(totalPages, +e.target.value || 1)))}
                className="w-14 px-1.5 py-0.5 border border-stone-300 rounded text-center"
                min={1} max={totalPages}
              />
              <span>to</span>
              <input
                type="number"
                value={contentEnd}
                onChange={e => setContentEnd(Math.max(1, Math.min(totalPages, +e.target.value || 1)))}
                className="w-14 px-1.5 py-0.5 border border-stone-300 rounded text-center"
                min={1} max={totalPages}
              />
              <span className="text-stone-500">of {totalPages}</span>
            </div>
            <p className="text-xs text-stone-500 italic">Pages outside this range (ads, references) are hidden in the workspace.</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {thumbnails.map((src, i) => {
              const pageNum = i + 1;
              const inContent = pageNum >= contentStart && pageNum <= contentEnd;
              return (
                <div key={i} className={`relative rounded border-2 overflow-hidden ${
                  inContent ? 'border-stone-300' : 'border-stone-200 opacity-40'
                }`}>
                  <img src={src} alt={`p${pageNum}`} className="w-full block" />
                  <div className="absolute top-0.5 left-1 bg-black/60 text-white text-xs px-1 rounded">p.{pageNum}</div>
                </div>
              );
            })}
          </div>
        </div>

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            Save failed: {saveError}
          </div>
        )}

        <button
          onClick={save}
          disabled={loading || !title.trim()}
          className="w-full py-3 bg-sage-600 hover:bg-sage-700 text-white rounded font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Save size={14} /> {loading ? 'Saving...' : 'Save & open workspace'}
        </button>
      </div>
    </div>
  );
}
