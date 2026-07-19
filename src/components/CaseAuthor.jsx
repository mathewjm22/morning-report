
// Two-stage authoring: (1) upload PDF, preview all pages;
// (2) select content page range + define gate page ranges.

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Plus, Trash2, ChevronLeft, Save, FileText } from 'lucide-react';
import { loadPdf, renderPage } from '../lib/pdfLoader.js';
import { saveCase } from '../lib/storage.js';

export default function CaseAuthor() {
  const navigate = useNavigate();
  const [stage, setStage] = useState('upload'); // 'upload' | 'define'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [thumbnails, setThumbnails] = useState([]); // dataURL per page
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [contentStart, setContentStart] = useState(1);
  const [contentEnd, setContentEnd] = useState(1);
  const [gates, setGates] = useState([]);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') return;
    setLoading(true);
    setProgress('Loading PDF...');
    try {
      const buf = await file.arrayBuffer();
      const doc = await loadPdf(buf.slice(0)); // clone buffer since pdf.js consumes it
      setPdfFile(file);
      setPdf(doc);
      setTotalPages(doc.numPages);
      setContentEnd(doc.numPages);
      setTitle(file.name.replace(/\.pdf$/i, ''));

      // Generate thumbnails
      const thumbs = [];
      for (let p = 1; p <= doc.numPages; p++) {
        setProgress(`Rendering thumbnail ${p} of ${doc.numPages}...`);
        const canvas = document.createElement('canvas');
        await renderPage(doc, p, canvas, 0.3);
        thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
      }
      setThumbnails(thumbs);
      setStage('define');
    } catch (e) {
      alert('Failed to load PDF: ' + e.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const addGate = () => {
    const last = gates[gates.length - 1];
    const startPage = last ? Math.min(last.pages[last.pages.length - 1] + 1, contentEnd) : contentStart;
    setGates([...gates, {
      id: `gate-${Date.now()}`,
      label: `Gate ${gates.length + 1}`,
      pages: [startPage],
      prompt: '',
    }]);
  };

  const updateGate = (idx, patch) => {
    setGates(gates.map((g, i) => i === idx ? { ...g, ...patch } : g));
  };

  const removeGate = (idx) => setGates(gates.filter((_, i) => i !== idx));

  const togglePageInGate = (gateIdx, pageNum) => {
    const g = gates[gateIdx];
    const has = g.pages.includes(pageNum);
    const newPages = has ? g.pages.filter(p => p !== pageNum) : [...g.pages, pageNum].sort((a, b) => a - b);
    updateGate(gateIdx, { pages: newPages });
  };

  const save = async () => {
    if (!title.trim()) return alert('Title required');
    if (gates.length === 0) return alert('Add at least one gate');
    for (const g of gates) {
      if (g.pages.length === 0) return alert(`Gate "${g.label}" has no pages`);
    }
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    await saveCase({
      id,
      title,
      source,
      pdfBlob: pdfFile,
      gates,
      contentPages: { start: contentStart, end: contentEnd },
      totalPages,
      addedAt: Date.now(),
    });
    navigate(`/case/${encodeURIComponent(id)}`);
  };

  if (stage === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate('/')} className="mb-4 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ChevronLeft size={14} /> Back to library
          </button>
          <h1 className="text-2xl font-bold mb-4">New Case</h1>
          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); if (!loading) handleFile(e.dataTransfer.files[0]); }}
            className={`border-2 border-dashed border-slate-300 rounded-lg p-12 text-center transition ${
              loading ? 'opacity-50' : 'hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
            }`}
          >
            <Upload className="mx-auto text-slate-400 mb-3" size={48} />
            <p className="font-semibold text-slate-700 mb-1">Drop a PDF or click to browse</p>
            <p className="text-sm text-slate-500">Any PDF works; NEJM Case Records are the primary use case.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>
          {loading && (
            <div className="mt-4 text-center text-sm text-slate-600">{progress}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto p-6">
        <button onClick={() => navigate('/')} className="mb-4 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
          <ChevronLeft size={14} /> Back to library
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
          {/* Left: page grid */}
          <div>
            <h1 className="text-xl font-bold mb-3">Configure case</h1>
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded mb-3"
              />
              <label className="block text-xs font-semibold text-slate-700 mb-1">Source (citation)</label>
              <input
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="e.g. N Engl J Med 2026;394:907-16"
                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-3">
                <p className="text-xs font-semibold text-slate-700">Case content pages:</p>
                <div className="flex items-center gap-1 text-xs">
                  <input
                    type="number"
                    value={contentStart}
                    onChange={e => setContentStart(Math.max(1, Math.min(totalPages, +e.target.value || 1)))}
                    className="w-14 px-1.5 py-0.5 border border-slate-300 rounded text-center"
                    min={1} max={totalPages}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={contentEnd}
                    onChange={e => setContentEnd(Math.max(1, Math.min(totalPages, +e.target.value || 1)))}
                    className="w-14 px-1.5 py-0.5 border border-slate-300 rounded text-center"
                    min={1} max={totalPages}
                  />
                  <span className="text-slate-500">of {totalPages}</span>
                </div>
                <p className="text-xs text-slate-500 italic">Pages outside this range (ads, references) are hidden.</p>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {thumbnails.map((src, i) => {
                  const pageNum = i + 1;
                  const inContent = pageNum >= contentStart && pageNum <= contentEnd;
                  const inGates = gates.map((g, gi) => g.pages.includes(pageNum) ? gi : null).filter(x => x !== null);
                  return (
                    <div key={i} className={`relative rounded border-2 overflow-hidden ${
                      inContent ? 'border-slate-300' : 'border-slate-200 opacity-40'
                    }`}>
                      <img src={src} alt={`p${pageNum}`} className="w-full block" />
                      <div className="absolute top-0.5 left-1 bg-black/60 text-white text-[10px] px-1 rounded">p.{pageNum}</div>
                      {inGates.length > 0 && (
                        <div className="absolute bottom-0.5 right-0.5 bg-blue-600 text-white text-[9px] px-1 py-0.5 rounded font-bold">
                          G{inGates.map(g => g + 1).join(',')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: gates editor */}
          <div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Reading gates</h2>
                <button onClick={addGate} className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 hover:bg-blue-700">
                  <Plus size={12} /> Add gate
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Each gate is a reading checkpoint. Click page numbers below to include them in a gate.
              </p>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {gates.map((g, gi) => (
                  <div key={g.id} className="border border-slate-200 rounded p-2 bg-slate-50">
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs font-bold text-blue-600">#{gi + 1}</span>
                      <input
                        value={g.label}
                        onChange={e => updateGate(gi, { label: e.target.value })}
                        className="flex-1 text-sm px-1 py-0.5 border-b border-slate-300 bg-transparent focus:outline-none focus:border-blue-400"
                      />
                      <button onClick={() => removeGate(gi)} className="text-red-400 hover:text-red-600">
                        <X size={12} />
                      </button>
                    </div>
                    <input
                      value={g.prompt}
                      onChange={e => updateGate(gi, { prompt: e.target.value })}
                      placeholder="Reasoning prompt (optional)"
                      className="w-full text-xs px-1.5 py-1 border border-slate-200 rounded mb-2 bg-white"
                    />
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: contentEnd - contentStart + 1 }).map((_, pi) => {
                        const pageNum = contentStart + pi;
                        const inGate = g.pages.includes(pageNum);
                        return (
                          <button
                            key={pageNum}
                            onClick={() => togglePageInGate(gi, pageNum)}
                            className={`w-7 h-7 text-[10px] rounded transition ${
                              inGate ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-blue-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={save}
                disabled={gates.length === 0}
                className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={14} /> Save case & open workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

