
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
const [regionDraft, setRegionDraft] = useState(null); // { start: {x,y}, current: {x,y} } while dragging
const [pendingRegion, setPendingRegion] = useState(null); // { bbox } after release, awaiting Pin/Open choice



const isSelect = tool === 'select';
const isRegion = tool === 'region';


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


  return (
    <div
  className="relative bg-white shadow-lg transition ring-1 ring-stone-200"
  style={{ width, height }}
>
      <div className="absolute -left-10 top-2 bg-stone-700 text-white text-xs px-2 py-1 rounded font-mono z-10 shadow-sm">
  {pageNum}
</div>
      
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
        isSelect && hovered ? 'ring-4 ring-sage-500 bg-sage-500/10' : ''
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
            className="absolute left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-stone-200 px-1.5 py-1 flex items-center gap-1 whitespace-nowrap"
            style={{ top: -36 }}
          >
            <button
              onClick={() => handleOpenZone(zone)}
              className="text-xs bg-sage-600 hover:bg-sage-700 text-white px-2.5 py-1 rounded flex items-center gap-1"
            >
              <Maximize2 size={11} /> Open
            </button>
            <button
              onClick={() => handlePinZone(zone)}
              className="text-xs bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 px-2.5 py-1 rounded flex items-center gap-1"
            >
              <Plus size={11} /> Pin
            </button>
          </div>
        </>
      )}
    </div>
  );
})}
{/* Manual region-selection overlay */}
{isRegion && (
  <RegionSelector
    width={width}
    height={height}
    regionDraft={regionDraft}
    setRegionDraft={setRegionDraft}
    pendingRegion={pendingRegion}
    setPendingRegion={setPendingRegion}
    onOpen={(bbox) => {
      handleOpenZone({
        bbox,
        kind: 'region',
        label: `Page ${pageNum} — Selected region`,
      });
      setPendingRegion(null);
    }}
    onPin={(bbox) => {
      handlePinZone({
        bbox,
        kind: 'region',
        label: `Page ${pageNum} — Selected region`,
      });
      setPendingRegion(null);
    }}
    onCancel={() => setPendingRegion(null)}
  />
)}
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
  <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
    <span className="text-xs text-stone-500">Rendering page {pageNum}...</span>
  </div>
)}
    </div>
  );
}
function RegionSelector({
  width, height,
  regionDraft, setRegionDraft,
  pendingRegion, setPendingRegion,
  onOpen, onPin, onCancel,
}) {
  const getPt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const handleMouseDown = (e) => {
    // If a region is pending confirmation, don't start a new one — user should
    // pick Pin/Open/Cancel from the existing popup first.
    if (pendingRegion) return;
    const pt = getPt(e);
    setRegionDraft({ start: pt, current: pt });
  };

  const handleMouseMove = (e) => {
    if (!regionDraft) return;
    setRegionDraft({ ...regionDraft, current: getPt(e) });
  };

  const handleMouseUp = () => {
    if (!regionDraft) return;
    const { start, current } = regionDraft;
    const bbox = {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      w: Math.abs(current.x - start.x),
      h: Math.abs(current.y - start.y),
    };
    setRegionDraft(null);
    // Ignore tiny rectangles — probably an accidental click
    if (bbox.w < 15 || bbox.h < 15) return;
    setPendingRegion({ bbox });
  };

  // The live-preview rectangle while dragging
  const draftBbox = regionDraft ? {
    x: Math.min(regionDraft.start.x, regionDraft.current.x),
    y: Math.min(regionDraft.start.y, regionDraft.current.y),
    w: Math.abs(regionDraft.current.x - regionDraft.start.x),
    h: Math.abs(regionDraft.current.y - regionDraft.start.y),
  } : null;

  return (
    <div
      className="absolute inset-0"
      style={{ cursor: 'crosshair', pointerEvents: 'auto' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Live preview while dragging */}
      {draftBbox && (
        <div
          className="absolute border-2 border-sage-500 bg-sage-500/10 pointer-events-none"
          style={{
            left: draftBbox.x,
            top: draftBbox.y,
            width: draftBbox.w,
            height: draftBbox.h,
          }}
        >
          <div className="absolute -top-6 left-0 bg-sage-600 text-white text-xs px-1.5 py-0.5 rounded font-mono">
            {Math.round(draftBbox.w)} × {Math.round(draftBbox.h)}
          </div>
        </div>
      )}

      {/* Pending region — user picks Open / Pin / Cancel */}
      {pendingRegion && (
        <>
          {/* The captured rectangle, highlighted */}
          <div
            className="absolute border-2 border-sage-600 bg-sage-500/10"
            style={{
              left: pendingRegion.bbox.x,
              top: pendingRegion.bbox.y,
              width: pendingRegion.bbox.w,
              height: pendingRegion.bbox.h,
            }}
          />
          {/* Action popup, positioned above the rectangle */}
          <div
            className="absolute bg-white rounded-lg shadow-lg border border-stone-200 px-1.5 py-1 flex items-center gap-1"
            style={{
              left: pendingRegion.bbox.x + pendingRegion.bbox.w / 2,
              top: pendingRegion.bbox.y - 42,
              transform: 'translateX(-50%)',
            }}
          >
            <button
              onClick={() => onOpen(pendingRegion.bbox)}
              className="text-xs bg-sage-600 hover:bg-sage-700 text-white px-2.5 py-1 rounded"
            >
              Open
            </button>
            <button
              onClick={() => onPin(pendingRegion.bbox)}
              className="text-xs bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 px-2.5 py-1 rounded"
            >
              Pin
            </button>
            <button
              onClick={onCancel}
              className="text-xs text-stone-500 hover:text-stone-800 px-1.5 py-1"
              title="Cancel"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}