
import { useEffect, useRef, useState } from 'react';
import { Maximize2, Plus } from 'lucide-react';
import { getPageTextItems, renderPage, detectImageZones, detectTableZones } from '../lib/pdfLoader.js';
import AnnotationLayer from './AnnotationLayer.jsx';

export default function PdfPage({
  pdf, pageNum, zoom, isFocus,
  tool, color, strokeWidth,
  annotations, setAnnotations,
  zones, setZones,
  onPinElement, onOpenLightbox,
}) {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState(null);
  const [hoveredZoneIdx, setHoveredZoneIdx] = useState(null);
  const hoverTimeoutRef = useRef(null);
  const [rendering, setRendering] = useState(true);
  const [textItems, setTextItems] = useState(null);

const showZoneMenu = (i) => {
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  }
  setHoveredZoneIdx(i);
};

const hideZoneMenu = () => {
  if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  hoverTimeoutRef.current = setTimeout(() => {
    setHoveredZoneIdx(null);
    hoverTimeoutRef.current = null;
  }, 200);
};
  // Cleanup on unmount so a pending timeout doesn't fire after the component is gone
useEffect(() => {
  return () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };
}, []);

  
  // Render page whenever zoom changes
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    setRendering(true);
    (async () => {
      const { viewport: vp } = await renderPage(pdf, pageNum, canvasRef.current, zoom);
      if (cancelled) return;
      setViewport(vp);
      setRendering(false);

      // Detect zones once per page (cache in state; only re-detect if zones is null)
      if (!zones) {
        const imgZones = await detectImageZones(pdf, pageNum, vp);
        const tabZones = await detectTableZones(pdf, pageNum, vp);
        if (!cancelled) setZones([...imgZones, ...tabZones]);
      }

      if (!textItems) {
  const items = await getPageTextItems(pdf, pageNum, vp);
  if (!cancelled) setTextItems(items);
}
    })();
    return () => { cancelled = true; };
  }, [pdf, pageNum, zoom]); // eslint-disable-line

  const width = viewport?.width || 800;
  const height = viewport?.height || 1000;

  const handlePinZone = async (zone) => {
    // Render the zone's region to a smaller data URL for the pinned tray thumbnail
    const cnv = document.createElement('canvas');
    cnv.width = zone.bbox.w;
    cnv.height = zone.bbox.h;
    const ctx = cnv.getContext('2d');
    ctx.drawImage(
      canvasRef.current,
      zone.bbox.x, zone.bbox.y, zone.bbox.w, zone.bbox.h,
      0, 0, zone.bbox.w, zone.bbox.h,
    );
    const thumbUrl = cnv.toDataURL('image/jpeg', 0.7);
    onPinElement({
      id: `${pageNum}-${zone.bbox.x | 0}-${zone.bbox.y | 0}-${Date.now()}`,
      pageNum,
      kind: zone.kind,
      label: zone.label || `Page ${pageNum} — ${zone.kind}`,
      bbox: zone.bbox,
      thumbUrl,
    });
  };

  const handleOpenZone = (zone) => {
    // Grab the region as a data URL for the lightbox
    const cnv = document.createElement('canvas');
    // Render at higher resolution for the lightbox
    const upScale = 2;
    cnv.width = zone.bbox.w * upScale;
    cnv.height = zone.bbox.h * upScale;
    const ctx = cnv.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      canvasRef.current,
      zone.bbox.x, zone.bbox.y, zone.bbox.w, zone.bbox.h,
      0, 0, cnv.width, cnv.height,
    );
    const url = cnv.toDataURL('image/png');
    onOpenLightbox({
      id: `${pageNum}-${zone.bbox.x | 0}-${zone.bbox.y | 0}`,
      pageNum,
      kind: zone.kind,
      label: zone.label || `Page ${pageNum} — ${zone.kind}`,
      imageUrl: url,
      naturalWidth: cnv.width,
      naturalHeight: cnv.height,
    });
  };

  const isSelect = tool === 'select';

  return (
    <div
      className={`relative bg-white shadow-2xl transition ${
        isFocus ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-700 opacity-70 hover:opacity-100'
      }`}
      style={{ width, height }}
    >
      <div className="absolute -left-10 top-2 bg-slate-900 text-white text-xs px-2 py-1 rounded font-mono z-10">
        {pageNum}
      </div>
      {!isFocus && (
        <div className="absolute -left-10 top-10 bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.5 rounded z-10">
          outside gate
        </div>
      )}

      <canvas ref={canvasRef} className="block" />

      {/* Zone overlay — only interactive when Select tool is active */}
      {viewport && zones && zones.map((zone, i) => {
  const hovered = hoveredZoneIdx === i;
  return (
    <div
      key={i}
onMouseEnter={() => isSelect && showZoneMenu(i)}
onMouseLeave={() => hideZoneMenu()}
      className={`absolute pointer-events-${isSelect ? 'auto' : 'none'} transition ${
        isSelect && hovered ? 'ring-4 ring-blue-500 bg-blue-500/10' : ''
      }`}
      style={{
        left: zone.bbox.x,
        top: zone.bbox.y,
        width: zone.bbox.w,
        height: zone.bbox.h,
        cursor: isSelect ? 'pointer' : 'default',
      }}
    >
      {isSelect && hovered && (
        <>
          {/* Invisible bridge — extends hover area upward to the buttons
              so moving between zone and buttons doesn't lose the hover */}
          <div
            className="absolute left-0 right-0"
            style={{ top: -40, height: 40 }}
          />
          {/* Button popup — sits flush against the top edge of the zone */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-slate-200 px-1.5 py-1 flex items-center gap-1 whitespace-nowrap"
            style={{ top: -36 }}
          >
            <button
              onClick={() => handleOpenZone(zone)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded flex items-center gap-1"
            >
              <Maximize2 size={11} /> Open
            </button>
            <button
              onClick={() => handlePinZone(zone)}
              className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded flex items-center gap-1"
            >
              <Plus size={11} /> Pin
            </button>
          </div>
        </>
      )}
    </div>
  );
})}

      {/* Annotation layer */}
      <AnnotationLayer
  width={width}
  height={height}
  tool={tool}
  color={color}
  strokeWidth={strokeWidth}
  strokes={annotations}
  setStrokes={setAnnotations}
  textItems={textItems}        // ← NEW
  pageNum={pageNum}            // ← NEW
/>

      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 pointer-events-none">
          <span className="text-xs text-slate-500">Rendering page {pageNum}...</span>
        </div>
      )}
    </div>
  );
}
