import { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
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
  // Persist the user's preferred width across sessions
  const saved = localStorage.getItem('leftRailWidth');
  const parsed = saved ? parseInt(saved, 10) : 80;
  return isNaN(parsed) ? 80 : clamp(parsed, 60, 400);
});

useEffect(() => {
  localStorage.setItem('leftRailWidth', String(leftRailWidth));
}, [leftRailWidth]);

  useEffect(() => {
    setCurrentPage(contentStart);
  }, [contentStart]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // pdfBlob might be an ArrayBuffer (from IndexedDB) or a Blob/File (fresh upload).
// Handle both.
const buf = caseEntry.pdfBlob instanceof ArrayBuffer
  ? caseEntry.pdfBlob
  : await caseEntry.pdfBlob.arrayBuffer();
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
  <LeftRail
    caseEntry={caseEntry}
    visiblePages={visiblePages}
    currentPage={currentPage}
    gatePages={visiblePages}
    onJumpToPage={jumpToPage}
    pdf={pdf}
    width={leftRailWidth}
  />
  <ResizeHandle
    onResize={(delta) => setLeftRailWidth(w => clamp(w + delta, 60, 400))}
    onDoubleClick={() => setLeftRailWidth(80)}
  />
</div>

      <ToolPalette
        tool={tool} setTool={setTool}
        color={color} setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
      />

<div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center justify-between text-stone-600 text-xs">
  <span>Page {currentPage} of {caseEntry.totalPages}</span>
  <div className="flex items-center gap-2">
    <button onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} className="p-1 hover:bg-stone-100 rounded text-stone-600"><ZoomOut size={14} /></button>
    <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
    <button onClick={() => setZoom(z => Math.min(3, z + 0.15))} className="p-1 hover:bg-stone-100 rounded text-stone-600"><ZoomIn size={14} /></button>
  </div>
</div>
   <div>
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6">
          {pdf && visiblePages.map(pn => (
            <div
              key={pn}
              ref={el => (pageRefs.current[pn] = el)}
              data-page-num={pn}
              className="flex flex-col items-center"
            >
              <PdfPage
                pdf={pdf}
                pageNum={pn}
                zoom={zoom}
                isFocus={true} // all pages equally in-focus
                tool={tool}
                color={color}
                strokeWidth={strokeWidth}
                annotations={annotations[pn] || []}
                setAnnotations={(list) => setAnnotations(a => ({ ...a, [pn]: list }))}
                zones={zones[pn] || null}
                setZones={(list) => setPageZones(pn, list)}
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

function ResizeHandle({ onResize, onDoubleClick }) {
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const startDrag = (e) => {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      if (delta !== 0) onResize(delta);
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

  return (
    <div
      onMouseDown={startDrag}
      onDoubleClick={onDoubleClick}
      className="w-1 hover:w-1.5 bg-stone-200 hover:bg-sage-400 cursor-col-resize transition-all flex-shrink-0 relative group"
      title="Drag to resize · Double-click to reset"
    >
      {/* Wider invisible hitbox so it's easy to grab */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}