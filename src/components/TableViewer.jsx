import { useState, useEffect } from 'react';
import { Maximize2, X } from 'lucide-react';

// Simple table image viewer. Click to zoom into a lightbox.
// No annotation — tables are reference material.
export default function TableViewer({ tables }) {
  const [zoomed, setZoomed] = useState(null); // table object or null

  if (!tables || tables.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
        <p className="text-stone-500 text-sm">No tables extracted from this case.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tables.map((table, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
            <div className="px-4 py-2 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-700">{table.caption}</p>
              <button
                onClick={() => setZoomed(table)}
                className="text-xs px-2 py-1 bg-white border border-stone-300 rounded hover:bg-stone-100 flex items-center gap-1 text-stone-700"
                title="View full size"
              >
                <Maximize2 size={12} /> Zoom
              </button>
            </div>
            <div
              className="p-3 cursor-zoom-in bg-stone-50 flex justify-center"
              onClick={() => setZoomed(table)}
            >
              <img
                src={table.url}
                alt={table.caption}
                className="max-w-full h-auto max-h-96 object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      {zoomed && <TableLightbox table={zoomed} onClose={() => setZoomed(null)} />}
    </>
  );
}

// Pan + zoom lightbox for tables
function TableLightbox({ table, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setScale(prev => Math.min(5, Math.max(0.5, prev + delta)));
  };

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);

  const reset = () => { setScale(1); setPos({ x: 0, y: 0 }); };

  // Escape to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full h-full max-w-6xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 gap-3">
          <p className="text-sm font-semibold text-stone-900 truncate">{table.caption}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setScale(s => Math.min(5, s + 0.25))}
              className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-stone-700"
              title="Zoom in"
            >+</button>
            <span className="text-xs text-stone-500 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
              className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-stone-700"
              title="Zoom out"
            >−</button>
            <button
              onClick={reset}
              className="text-xs px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded text-stone-700"
              title="Reset"
            >Reset</button>
            <button
              onClick={onClose}
              className="text-stone-500 hover:text-stone-800 p-1 hover:bg-stone-100 rounded"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-hidden bg-stone-100 relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          <img
            src={table.url}
            alt={table.caption}
            draggable={false}
            className="absolute top-1/2 left-1/2 select-none"
            style={{
              transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              transformOrigin: 'center',
              maxWidth: 'none',
              transition: dragging ? 'none' : 'transform 0.1s ease-out',
            }}
          />
        </div>

        <div className="px-4 py-2 border-t border-stone-200 text-xs text-stone-500 flex justify-between">
          <span>Scroll to zoom · Drag to pan</span>
          <span>Press <kbd className="px-1 py-0.5 bg-stone-100 border border-stone-300 rounded text-stone-700">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
