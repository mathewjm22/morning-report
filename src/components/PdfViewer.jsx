import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, ChevronLeft } from 'lucide-react';
import { loadPdf } from '../lib/pdfLoader.js';
import PdfPage from './PdfPage.jsx';
import ToolPalette from './ToolPalette.jsx';
import LeftRail from './LeftRail.jsx';

export default function PdfViewer({
  caseEntry, annotations, setAnnotations,
  onPinElement, onOpenLightbox,
}) {
  const [pdf, setPdf] = useState(null);
  const [zones, setZones] = useState({});
  const [zoom, setZoom] = useState(1.4);
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollRef = useRef(null);
  const pageRefs = useRef({});

  const contentStart = caseEntry.contentPages?.start || 1;
  const contentEnd = caseEntry.contentPages?.end || caseEntry.totalPages;
  const visiblePages = Array.from(
    { length: contentEnd - contentStart + 1 },
    (_, i) => contentStart + i
  );

  const [leftRailWidth, setLeftRailWidth] = useState(() => {
  const saved = localStorage.getItem('leftRailWidth');
  const parsed = saved ? parseInt(saved, 10) : 80;
  return isNaN(parsed) ? 80 : parsed < 0 ? 0 : Math.min(400, parsed);
});
// Remember last visible width so "show" restores to what the user had before
const [lastVisibleWidth, setLastVisibleWidth] = useState(() => {
  const saved = localStorage.getItem('leftRailWidthPrev');
  const parsed = saved ? parseInt(saved, 10) : 80;
  return isNaN(parsed) ? 80 : Math.min(400, Math.max(60, parsed));
});

useEffect(() => {
  localStorage.setItem('leftRailWidth', String(leftRailWidth));
  if (leftRailWidth > 0) {
    localStorage.setItem('leftRailWidthPrev', String(leftRailWidth));
    setLastVisibleWidth(leftRailWidth);
  }
}, [leftRailWidth]);

const toggleLeftRail = () => {
  if (leftRailWidth === 0) {
    setLeftRailWidth(lastVisibleWidth);
  } else {
    setLeftRailWidth(0);
  }
};

  useEffect(() => {
    setCurrentPage(contentStart);
  }, [contentStart]);

  useEffect(() => {
  let cancelled = false;
  async function load() {
    // Get a fresh ArrayBuffer each time. If pdfBlob is a Blob, .arrayBuffer()
    // creates a new one. If it's already an ArrayBuffer, we clone it so
    // repeated loads don't fail on a consumed buffer.
    let buf;
    if (caseEntry.pdfBlob instanceof ArrayBuffer) {
      buf = caseEntry.pdfBlob.slice(0);
    } else {
      buf = await caseEntry.pdfBlob.arrayBuffer();
    }
    const doc = await loadPdf(buf);
    if (cancelled) return;
    setPdf(doc);
  }
  load();
  return () => { cancelled = true; };
}, [caseEntry.pdfBlob]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const pn = parseInt(visible[0].target.dataset.pageNum, 10);
          if (pn) setCurrentPage(pn);
        }
      },
      { root: container, threshold: [0.25, 0.5, 0.75] }
    );
    Object.values(pageRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [pdf, visiblePages.length]);

  const jumpToPage = (pn) => {
    const el = pageRefs.current[pn];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setPageZones = (pn, list) => setZones(z => ({ ...z, [pn]: list }));

  return (
  <div className="flex-1 flex overflow-hidden">
    <div className="flex flex-shrink-0" style={{ height: '100%' }}>
  {leftRailWidth > 0 && (
    <LeftRail
      caseEntry={caseEntry}
      visiblePages={visiblePages}
      currentPage={currentPage}
      gatePages={visiblePages}
      onJumpToPage={jumpToPage}
      pdf={pdf}
      width={leftRailWidth}
    />
  )}
  <ResizeHandle
    collapsed={leftRailWidth === 0}
    onResize={(delta) => setLeftRailWidth(w => {
      const next = w + delta;
      // Allow drag to close: if dragged small enough, snap to 0
      if (next < 40) return 0;
      return clamp(next, 60, 400);
    })}
    onDoubleClick={() => setLeftRailWidth(80)}
    onToggle={toggleLeftRail}
  />
</div>

    <ToolPalette
      tool={tool}
      setTool={setTool}
      color={color}
      setColor={setColor}
      strokeWidth={strokeWidth}
      setStrokeWidth={setStrokeWidth}
    />

    {/* Main PDF column */}
    <div className="min-w-0 min-h-0 flex-1 flex flex-col">
      <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between text-stone-600 text-xs">
        <span>
          Page {currentPage} of {caseEntry.totalPages}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() =>
              setZoom(value => Math.max(0.6, value - 0.15))
            }
            className="p-1 hover:bg-stone-100 rounded text-stone-600"
          >
            <ZoomOut size={14} />
          </button>

          <span className="w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            aria-label="Zoom in"
            onClick={() =>
              setZoom(value => Math.min(3, value + 0.15))
            }
            className="p-1 hover:bg-stone-100 rounded text-stone-600"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto p-6 flex flex-col items-center gap-6"
      >
        {pdf &&
          visiblePages.map(pn => (
            <div
              key={pn}
              ref={element => {
                pageRefs.current[pn] = element;
              }}
              data-page-num={pn}
              className="flex flex-col items-center"
            >
              <PdfPage
                pdf={pdf}
                pageNum={pn}
                zoom={zoom}
                isFocus={true}
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                annotations={annotations?.[pn] ?? []}
                setAnnotations={list =>
                  setAnnotations(current => ({
                    ...current,
                    [pn]: list,
                  }))
                }
                zones={zones[pn] ?? null}
                setZones={list => setPageZones(pn, list)}
                onPinElement={onPinElement}
                onOpenLightbox={onOpenLightbox}
              />
            </div>
          ))}
      </div>
    </div>
  </div>
);
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function ResizeHandle({ onResize, onDoubleClick, onToggle, collapsed }) {
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const lastXRef = useRef(0);

  const startDrag = (e) => {
    if (collapsed) return; // don't allow drag when collapsed; must toggle first
    draggingRef.current = true;
    dragMovedRef.current = false;
    lastXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      if (delta !== 0) {
        dragMovedRef.current = true;
        onResize(delta);
      }
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onResize]);

  if (collapsed) {
    // Small vertical strip with a "PAGES" label — click to expand back
    return (
      <button
        onClick={onToggle}
        className="flex-shrink-0 flex items-center justify-center bg-sage-600 hover:bg-sage-700 text-white transition"
        style={{ width: 22 }}
        title="Show page thumbnails"
      >
        <span
          className="font-bold text-xs tracking-widest select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          PAGES
        </span>
      </button>
    );
  }

  return (
    <div className="flex-shrink-0 relative group flex flex-col">
      {/* Toggle button (top) */}
      <button
        onClick={onToggle}
        className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white border border-stone-300 hover:border-sage-500 rounded p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition"
        title="Hide page thumbnails"
      >
        <ChevronLeft size={12} className="text-stone-600" />
      </button>
      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        onDoubleClick={onDoubleClick}
        className="w-1 hover:w-1.5 bg-stone-200 hover:bg-sage-400 cursor-col-resize transition-all flex-1"
        title="Drag to resize · Double-click to reset · Drag left edge to close"
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
      </div>
    </div>
  );
}