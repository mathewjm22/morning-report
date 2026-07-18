import { useEffect, useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import AnnotationCanvas from './AnnotationCanvas.jsx';

// Full-screen lightbox for viewing/annotating a figure at large size.
// Reads and writes the SAME `annotations` map used by inline canvases,
// so marks made in the lightbox appear on the thumbnail and vice versa.
//
// Note: annotation coordinates are in canvas pixels. Because the inline
// canvas is fixed at 400x300 and the lightbox canvas is bigger, we scale
// annotations when they cross between sizes. To keep this simple and
// non-lossy, the lightbox uses its OWN key (imageKey + ':zoom') so the
// two sets of strokes don't conflict. If you'd rather they share, remove
// the ':zoom' suffix — but strokes will visually shift due to scaling.

export default function FigureLightbox({ open, onClose, imageKey, imageUrl, label, caption, annotations, setAnnotations }) {
  const [size, setSize] = useState({ w: 900, h: 700 });
  const containerRef = useRef(null);

  // Fit canvas to viewport, leaving room for chrome
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const w = Math.min(1400, window.innerWidth - 80);
      const h = Math.min(1000, window.innerHeight - 180);
      setSize({ w, h });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-lg shadow-2xl max-w-full max-h-full flex flex-col"
        style={{ width: size.w + 40, maxHeight: '95vh' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-200 gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{label || 'Figure'}</p>
            {caption && <p className="text-xs text-slate-500 truncate">{caption}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-slate-500 hover:text-slate-800 p-1 hover:bg-slate-100 rounded"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Canvas — uses zoom-specific key so strokes at this scale live in their own bucket */}
        <div className="flex-1 overflow-auto p-4 bg-slate-50 flex items-center justify-center">
          <AnnotationCanvas
            imageKey={`${imageKey}:zoom`}
            imageUrl={imageUrl}
            annotations={annotations}
            setAnnotations={setAnnotations}
            width={size.w}
            height={size.h}
          />
        </div>

        <div className="px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Annotations here are saved separately from the thumbnail (different scale).</span>
          <span>Press <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-700">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
