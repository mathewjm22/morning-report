
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { loadPdf, renderPage, detectImageZones, detectTableZones } from '../lib/pdfLoader.js';
import PdfPage from './PdfPage.jsx';
import ToolPalette from './ToolPalette.jsx';
import LeftRail from './LeftRail.jsx';
import { TOOLS, COLORS } from '../lib/constants.js';

export default function PdfViewer({
  caseEntry, gate, annotations, setAnnotations,
  onPinElement, onOpenLightbox, attendingMode,
}) {
  const [pdf, setPdf] = useState(null);
  const [zones, setZones] = useState({});  // { pageNum: [zones] }
  const [zoom, setZoom] = useState(1.4);
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(2.5);
  const [currentPage, setCurrentPage] = useState(gate.pages[0]);
  const scrollRef = useRef(null);
  const pageRefs = useRef({});

  const contentStart = caseEntry.contentPages?.start || 1;
  const contentEnd = caseEntry.contentPages?.end || caseEntry.totalPages;
  const visiblePages = Array.from(
    { length: contentEnd - contentStart + 1 },
    (_, i) => contentStart + i
  );

  // Load PDF once
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const buf = await caseEntry.pdfBlob.arrayBuffer();
      const doc = await loadPdf(buf);
      if (cancelled) return;
      setPdf(doc);
    }
    load();
    return () => { cancelled = true; };
  }, [caseEntry.pdfBlob]);

  // Scroll current gate's first page into view when gate changes
  useEffect(() => {
    setCurrentPage(gate.pages[0]);
    const el = pageRefs.current[gate.pages[0]];
    if (el && scrollRef.current) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [gate.id]); // eslint-disable-line

  // Track which page is most visible in the viewport
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
      <LeftRail
        caseEntry={caseEntry}
        visiblePages={visiblePages}
        currentPage={currentPage}
        gatePages={gate.pages}
        onJumpToPage={jumpToPage}
        pdf={pdf}
      />

      <ToolPalette
        tool={tool} setTool={setTool}
        color={color} setColor={setColor}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
      />

      <div className="flex-1 flex flex-col bg-slate-800 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-slate-900 border-b border-slate-700 px-3 py-1.5 flex items-center justify-between text-slate-300 text-xs">
          <div className="flex items-center gap-2">
            <span>Page {currentPage} of {caseEntry.totalPages}</span>
            <span className="mx-2 text-slate-500">|</span>
            <span>Gate: <span className="text-white font-medium">{gate.label}</span></span>
            {!gate.pages.includes(currentPage) && (
              <span className="ml-2 px-2 py-0.5 bg-amber-900/40 border border-amber-700 rounded text-amber-200 text-[10px]">
                Outside current gate
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(z => Math.max(0.6, z - 0.15))} className="p-1 hover:bg-slate-700 rounded"><ZoomOut size={14} /></button>
            <span className="w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.15))} className="p-1 hover:bg-slate-700 rounded"><ZoomIn size={14} /></button>
          </div>
        </div>

        {/* PDF pages */}
        <div ref={scrollRef} className="flex-1 overflow-auto p-6 flex flex-col items-center gap-6">
          {gate.prompt && (
            <div className="max-w-2xl w-full bg-blue-900/60 border border-blue-700 rounded p-3 text-blue-100 text-sm">
              💭 <span className="font-medium">Focus for this gate:</span> {gate.prompt}
              <p className="text-xs text-blue-300 mt-1">Recommended pages: {gate.pages.join(', ')} — you can still scroll to any page.</p>
            </div>
          )}
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
                isFocus={gate.pages.includes(pn)}
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
