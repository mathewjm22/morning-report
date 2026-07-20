import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, FlipHorizontal2, FlipVertical2, Undo2, Trash2, Pencil, ArrowUpRight, Circle, Ruler, Activity, StickyNote, Eraser, Highlighter } from 'lucide-react';
import AnnotationLayer from './AnnotationLayer.jsx';
import { COLORS } from '../lib/constants.js';

// Tools shown in each pane's toolbar (subset — no Select/Region here)
const PANE_TOOLS = [
  { id: 'pen',     icon: Pencil,       label: 'Pen' },
  { id: 'arrow',   icon: ArrowUpRight, label: 'Arrow' },
  { id: 'circle',  icon: Circle,       label: 'Circle' },
  { id: 'ruler',   icon: Ruler,        label: 'Ruler' },
  { id: 'caliper', icon: Activity,     label: 'Caliper' },
  { id: 'note',    icon: StickyNote,   label: 'Note' },
  { id: 'eraser',  icon: Eraser,       label: 'Erase' },
];

export default function CompareView({ elements, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Layout: 2 items = 2 columns, 3 = 3 columns, 4 = 2x2 grid
  const layoutClass =
    elements.length === 2 ? 'grid-cols-2' :
    elements.length === 3 ? 'grid-cols-3' :
    'grid-cols-2 grid-rows-2';

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={onClose}>
      <div
        className="flex flex-col flex-1 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-stone-900 border-b border-stone-700 px-6 py-3 flex items-center justify-between text-white">
          <div>
            <p className="font-semibold text-base">Compare — {elements.length} images</p>
            <p className="text-xs text-stone-400">Each pane has independent zoom, rotation, and annotations.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-700 rounded"><X size={20} /></button>
        </div>

        {/* Pane grid */}
        <div className={`flex-1 grid ${layoutClass} gap-1 bg-stone-950 p-1 overflow-hidden`}>
          {elements.map(el => (
            <ComparePane key={el.id} element={el} />
          ))}
        </div>

        {/* Footer */}
        <div className="bg-stone-900 border-t border-stone-700 px-6 py-2 flex items-center justify-center gap-2 text-white text-xs">
          <span className="text-stone-400">Press <kbd className="px-1.5 py-0.5 bg-stone-700 rounded">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

function ComparePane({ element }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [tool, setTool] = useState('arrow');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth] = useState(2.5);
  const [strokes, setStrokes] = useState([]);

  const w = element.naturalWidth || 800;
  const h = element.naturalHeight || 600;
  const rotated = rotation % 180 !== 0;
  const displayW = rotated ? h : w;
  const displayH = rotated ? w : h;
  const transform = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  return (
    <div className="bg-stone-800 flex flex-col overflow-hidden relative">
      {/* Pane header */}
      <div className="bg-stone-900 px-3 py-1.5 border-b border-stone-700 flex items-center justify-between text-xs">
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium truncate">{element.label}</p>
          <p className="text-stone-400 text-xs">page {element.pageNum}</p>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center overflow-auto bg-stone-950 p-4">
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
              src={element.imageUrl || element.thumbUrl}
              alt=""
              draggable={false}
              className="absolute inset-0 w-full h-full select-none"
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

      {/* Pane toolbar (bottom, compact) */}
      <div className="bg-stone-900 px-2 py-1.5 border-t border-stone-700 flex flex-wrap items-center justify-center gap-1 text-white">
        {/* Tools */}
        {PANE_TOOLS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-1.5 rounded ${
                tool === t.id ? 'bg-sage-600 text-white' : 'text-stone-400 hover:bg-stone-700'
              }`}
              title={t.label}
            >
              <Icon size={13} />
            </button>
          );
        })}
        <span className="mx-1 text-stone-600">|</span>
        {/* Colors — compact 4 shown, click to cycle */}
        {COLORS.slice(0, 5).map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-white' : 'border-stone-600'}`}
            style={{ backgroundColor: c }}
          />
        ))}
        <span className="mx-1 text-stone-600">|</span>
        {/* Zoom */}
        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} className="p-1.5 hover:bg-stone-700 rounded" title="Zoom out"><ZoomOut size={13} /></button>
        <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(4, z + 0.2))} className="p-1.5 hover:bg-stone-700 rounded" title="Zoom in"><ZoomIn size={13} /></button>
        <span className="mx-1 text-stone-600">|</span>
        {/* Rotation */}
        <button onClick={() => setRotation(r => (r + 270) % 360)} className="p-1.5 hover:bg-stone-700 rounded" title="Rotate CCW"><RotateCcw size={13} /></button>
        <button onClick={() => setRotation(r => (r + 90) % 360)} className="p-1.5 hover:bg-stone-700 rounded" title="Rotate CW"><RotateCw size={13} /></button>
        <button
          onClick={() => setFlipH(f => !f)}
          className={`p-1.5 rounded ${flipH ? 'bg-sage-600' : 'hover:bg-stone-700'}`}
          title="Flip horizontal"
        ><FlipHorizontal2 size={13} /></button>
        <button
          onClick={() => setFlipV(f => !f)}
          className={`p-1.5 rounded ${flipV ? 'bg-sage-600' : 'hover:bg-stone-700'}`}
          title="Flip vertical"
        ><FlipVertical2 size={13} /></button>
        <span className="mx-1 text-stone-600">|</span>
        {/* Annotation controls */}
        <button
          onClick={() => setStrokes(s => s.slice(0, -1))}
          disabled={strokes.length === 0}
          className="p-1.5 hover:bg-stone-700 rounded disabled:opacity-30"
          title="Undo"
        ><Undo2 size={13} /></button>
        <button
          onClick={() => setStrokes([])}
          disabled={strokes.length === 0}
          className="p-1.5 hover:bg-red-900/50 text-red-400 rounded disabled:opacity-30"
          title="Clear all"
        ><Trash2 size={13} /></button>
      </div>
    </div>
  );
}