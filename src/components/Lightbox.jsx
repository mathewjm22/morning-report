

import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Undo2, Trash2, RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2, ExternalLink, Search, Clipboard, Copy } from 'lucide-react';
import { TOOLS, COLORS } from '../lib/constants.js';
import AnnotationLayer from './AnnotationLayer.jsx';


export default function Lightbox({ element, caseEntry, onClose, onCompare }) {
  const [tool, setTool] = useState('ruler');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [strokes, setStrokes] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // degrees: 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [statdxQuery, setStatdxQuery] = useState('');
  const [pastedImage, setPastedImage] = useState(null); // { imageUrl, naturalWidth, naturalHeight, label } or null
  const [pasteStatus, setPasteStatus] = useState(null); // 'listening' | 'error' | null


  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);


  // Listen for paste events to enable image comparison
useEffect(() => {
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
  const pastedEl = {
    id: `pasted-${Date.now()}`,
    imageUrl: reader.result,
    naturalWidth: img.width,
    naturalHeight: img.height,
    label: 'Pasted image',
    pageNum: '—',
  };
  if (onCompare) {
    onCompare([element, pastedEl]);
  } else {
    setPastedImage(pastedEl);
  }
  setPasteStatus(null);
};
          img.src = reader.result;
        };
        reader.readAsDataURL(blob);
        return;
      }
    }
    // No image found in clipboard
    setPasteStatus('error');
    setTimeout(() => setPasteStatus(null), 2000);
  };
  window.addEventListener('paste', handlePaste);
  return () => window.removeEventListener('paste', handlePaste);
}, []);

  useEffect(() => {
  setRotation(0);
  setFlipH(false);
  setFlipV(false);
  setStrokes([]);
}, [element.id]);


const w = element.naturalWidth || 800;
const h = element.naturalHeight || 600;
// When rotated 90° or 270°, the displayed bounding box swaps width and height
const rotated = rotation % 180 !== 0;
const displayW = rotated ? h : w;
const displayH = rotated ? w : h;

const transform = `
  rotate(${rotation}deg)
  scaleX(${flipH ? -1 : 1})
  scaleY(${flipV ? -1 : 1})
`;


  return (
  <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={onClose}>
    <div
      className="flex flex-col flex-1 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-stone-900 border-b border-stone-700 px-6 py-3 flex items-center justify-between text-white">
        <div>
          <p className="font-semibold">{element.label}</p>
          <p className="text-xs text-stone-400">From page {element.pageNum}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded"><X size={20} /></button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tool rail */}
        <div className="w-14 bg-stone-800 border-r border-stone-700 flex flex-col items-center py-2 gap-1">
          {TOOLS.filter(t => t.id !== 'select').map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`p-2.5 rounded transition ${
                  tool === t.id ? 'bg-sage-600 text-white' : 'text-stone-400 hover:bg-stone-700 hover:text-white'
                }`}
                title={t.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
          <div className="border-t border-stone-700 w-full my-2" />
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-7 h-7 rounded-full border-2 transition ${
                color === c ? 'border-white scale-110' : 'border-stone-600'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="border-t border-stone-700 w-full my-2" />
          <button onClick={() => setStrokes(s => s.slice(0, -1))} className="p-2.5 rounded text-stone-400 hover:bg-stone-700 hover:text-white" title="Undo">
            <Undo2 size={16} />
          </button>
          <button onClick={() => setStrokes([])} className="p-2.5 rounded text-red-400 hover:bg-red-900/50" title="Clear all">
            <Trash2 size={16} />
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-stone-950 overflow-auto p-8">
          <div
            className="relative bg-white shadow-2xl"
            style={{ width: displayW * zoom, height: displayH * zoom }}
          >
            <div
              className="absolute top-1/2 left-1/2"
              style={{
                width: w * zoom,
                height: h * zoom,
                transform: `translate(-50%, -50%) ${transform}`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={element.imageUrl}
                alt=""
                draggable={false}
                className="absolute inset-0 w-full h-full select-none"
                style={{ imageRendering: 'auto' }}
              />
              <AnnotationLayer
                width={w * zoom}
                height={h * zoom}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                strokes={strokes}
                setStrokes={setStrokes}
              />
            </div>
          </div>
        </div>

        {/* Info sidebar */}
        <div className="w-60 bg-stone-800 border-l border-stone-700 p-4 text-white text-sm overflow-y-auto">
  <h3 className="font-semibold mb-2">Annotations ({strokes.length})</h3>
  <div className="space-y-1">
    {strokes.map((s, i) => (
      <div key={i} className="text-xs bg-stone-700/50 px-2 py-1 rounded flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
        <span className="capitalize text-stone-300">{s.type}</span>
      </div>
    ))}
    {strokes.length === 0 && <p className="text-xs text-stone-500 italic">Draw on the image.</p>}
  </div>

  {/* Compare with pasted image */}
<div className="mt-6 pt-4 border-t border-stone-700">
  <p className="text-xs font-semibold text-stone-300 uppercase tracking-wide mb-2">Compare</p>
  <div className="bg-stone-700/40 rounded p-2.5 flex items-start gap-2">
    <Clipboard size={14} className="text-sage-400 flex-shrink-0 mt-0.5" />
    <div className="min-w-0">
      <p className="text-xs text-stone-200 leading-tight">
        Copy an image (e.g., a normal X-ray from another source) and press{' '}
        <kbd className="px-1 py-0.5 bg-stone-800 border border-stone-600 rounded text-stone-300 text-xs">⌘/Ctrl+V</kbd>{' '}
        to open a side-by-side comparison.
      </p>
      {pasteStatus === 'error' && (
        <p className="text-xs text-red-400 mt-1">No image found in clipboard.</p>
      )}
    </div>
  </div>
</div>

{/* Imaging reference lookup */}
<div className="mt-6 pt-4 border-t border-stone-700">
  <p className="text-xs font-semibold text-stone-300 uppercase tracking-wide mb-2">Reference</p>

  {/* StatDx search input */}
  <form
    onSubmit={(e) => {
      e.preventDefault();
      const term = statdxQuery.trim();
      if (!term) return;
      const url = `https://my-statdx-com.va.proxy.liblynxgateway.com/search?term=${encodeURIComponent(term)}&startIndex=0&documentTypeFilters=all&searchType=documents&category=All`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }}
    className="mb-2"
  >
    <div className="relative">
      <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        value={statdxQuery}
        onChange={(e) => setStatdxQuery(e.target.value)}
        placeholder="Search StatDx..."
        className="w-full pl-7 pr-16 py-1.5 text-xs bg-stone-700 border border-stone-600 rounded focus:outline-none focus:border-sage-500 text-white placeholder-stone-400"
      />
      <button
        type="submit"
        disabled={!statdxQuery.trim()}
        className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-sage-600 hover:bg-sage-500 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs text-white"
      >
        Search
      </button>
    </div>
  </form>

  {/* Direct link to StatDx home */}
  
    <a href="https://my-statdx-com.va.proxy.liblynxgateway.com/main"
    target="_blank"
    rel="noopener noreferrer"
    className="w-full px-3 py-2 bg-sage-700 hover:bg-sage-600 rounded text-xs text-white transition flex items-center justify-between group"
  >
    <span className="flex items-center gap-2">
      <span className="font-semibold">Open StatDx home</span>
    </span>
    <ExternalLink size={12} className="text-sage-200 group-hover:text-white" />
  </a>
  <p className="text-xs text-stone-500 mt-1.5 leading-tight">
    Look up imaging findings, differential diagnoses, and reporting templates.
  </p>
</div>

  <div className="mt-6 p-3 bg-sage-900/30 border border-sage-800 rounded">
    <p className="text-xs font-semibold text-sage-200 mb-1">EKG reference</p>
            <p className="text-xs text-sage-300 leading-relaxed">
              25 mm/s, 10 mm/mV<br/>
              1 small box = 40 ms<br/>
              1 large box = 200 ms<br/>
              5 large = 1 second
            </p>
          </div>
          <div className="mt-3 p-3 bg-stone-700/40 rounded text-xs text-stone-300">
            Click and drag any annotation to move it. For arrows/rulers/calipers, drag either endpoint to fine-tune. Select an annotation and press Delete to remove.
          </div>
        </div>
      </div>

      {/* Bottom bar with zoom + rotation controls */}
      <div className="bg-stone-900 border-t border-stone-700 px-6 py-2 flex items-center justify-center gap-2 text-white text-xs">
        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 hover:bg-stone-700 rounded" title="Zoom out"><ZoomOut size={14} /></button>
        <span className="w-14 text-center font-mono">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="p-1.5 hover:bg-stone-700 rounded" title="Zoom in"><ZoomIn size={14} /></button>

        <span className="mx-2 text-stone-600">|</span>

        {/* Rotation */}
        <button
          onClick={() => setRotation(r => (r + 270) % 360)}
          className="p-1.5 hover:bg-stone-700 rounded"
          title="Rotate 90° counter-clockwise"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => setRotation(r => (r + 90) % 360)}
          className="p-1.5 hover:bg-stone-700 rounded"
          title="Rotate 90° clockwise"
        >
          <RotateCw size={14} />
        </button>
        <button
          onClick={() => setFlipH(f => !f)}
          className={`p-1.5 rounded ${flipH ? 'bg-sage-600 hover:bg-sage-700' : 'hover:bg-stone-700'}`}
          title="Flip horizontally"
        >
          <FlipHorizontal2 size={14} />
        </button>
        <button
          onClick={() => setFlipV(f => !f)}
          className={`p-1.5 rounded ${flipV ? 'bg-sage-600 hover:bg-sage-700' : 'hover:bg-stone-700'}`}
          title="Flip vertically"
        >
          <FlipVertical2 size={14} />
        </button>

        {(rotation !== 0 || flipH || flipV) && (
          <button
            onClick={() => { setRotation(0); setFlipH(false); setFlipV(false); }}
            className="ml-1 px-2 py-1 hover:bg-stone-700 rounded text-stone-300 text-xs"
            title="Reset orientation"
          >
            Reset
          </button>
        )}

        <span className="mx-2 text-stone-600">|</span>
        <span className="text-stone-400">Press <kbd className="px-1.5 py-0.5 bg-stone-700 rounded">Esc</kbd> to close</span>
      </div>
</div>
    </div>
  );
}

