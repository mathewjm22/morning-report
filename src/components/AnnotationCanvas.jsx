import { useRef, useState, useEffect } from 'react';
import { Pencil, MoveUpRight, Eraser, Trash2, Undo2 } from 'lucide-react';

// Canvas for annotating a single image (or placeholder).
// Strokes are stored in `annotations[imageKey]` in the parent.
export default function AnnotationCanvas({ imageKey, imageUrl, annotations, setAnnotations, width = 400, height = 300 }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPt, setStartPt] = useState(null);
  const [previewPath, setPreviewPath] = useState(null);

  const strokes = annotations[imageKey] || [];
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#000000', '#ffffff'];

  // Load image if URL provided
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; redraw(); };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // Redraw whenever strokes or preview changes
  useEffect(() => { redraw(); }, [strokes, previewPath]); // eslint-disable-line

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgRef.current) {
      // Fit image while preserving aspect ratio
      const img = imgRef.current;
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(img, x, y, w, h);
    } else {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('[image placeholder]', canvas.width / 2, canvas.height / 2);
    }

    strokes.forEach(s => drawStroke(ctx, s));
    if (previewPath) drawStroke(ctx, previewPath);
  };

  const drawStroke = (ctx, stroke) => {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.type === 'pen') {
      ctx.beginPath();
      stroke.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (stroke.type === 'arrow') {
      const { start, end } = stroke;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const len = 12;
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - len * Math.cos(angle - Math.PI / 6), end.y - len * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - len * Math.cos(angle + Math.PI / 6), end.y - len * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  };

  const getPt = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleDown = (e) => {
    const pt = getPt(e);
    if (tool === 'eraser') {
      const remaining = strokes.filter(s => !strokeNearPoint(s, pt));
      setAnnotations({ ...annotations, [imageKey]: remaining });
      setIsDrawing(true);
      return;
    }
    setIsDrawing(true);
    setStartPt(pt);
    if (tool === 'pen') setPreviewPath({ type: 'pen', color, points: [pt] });
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    const pt = getPt(e);
    if (tool === 'eraser') {
      const remaining = strokes.filter(s => !strokeNearPoint(s, pt));
      if (remaining.length !== strokes.length) setAnnotations({ ...annotations, [imageKey]: remaining });
      return;
    }
    if (tool === 'pen') {
      setPreviewPath(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    } else if (tool === 'arrow' && startPt) {
      setPreviewPath({ type: 'arrow', color, start: startPt, end: pt });
    }
  };

  const handleUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (previewPath) {
      setAnnotations({ ...annotations, [imageKey]: [...strokes, previewPath] });
      setPreviewPath(null);
    }
    setStartPt(null);
  };

  const strokeNearPoint = (stroke, pt) => {
    const threshold = 12;
    if (stroke.type === 'pen') return stroke.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < threshold);
    if (stroke.type === 'arrow') return distToSegment(pt, stroke.start, stroke.end) < threshold;
    return false;
  };
  const distToSegment = (p, a, b) => {
    const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
  };

  const clearAll = () => setAnnotations({ ...annotations, [imageKey]: [] });
  const undo = () => setAnnotations({ ...annotations, [imageKey]: strokes.slice(0, -1) });

  return (
    <div className="border border-slate-300 rounded overflow-hidden bg-white">
      <div className="bg-slate-100 px-2 py-1.5 flex items-center gap-1 border-b border-slate-300 flex-wrap">
        <button onClick={() => setTool('pen')} className={`p-1.5 rounded ${tool === 'pen' ? 'bg-sage-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`} title="Pen"><Pencil size={14} /></button>
        <button onClick={() => setTool('arrow')} className={`p-1.5 rounded ${tool === 'arrow' ? 'bg-sage-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`} title="Arrow"><MoveUpRight size={14} /></button>
        <button onClick={() => setTool('eraser')} className={`p-1.5 rounded ${tool === 'eraser' ? 'bg-sage-600 text-white' : 'hover:bg-slate-200 text-slate-700'}`} title="Eraser"><Eraser size={14} /></button>
        <div className="w-px h-5 bg-slate-300 mx-1" />
        {colors.map(c => (
          <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 ${color === c ? 'border-slate-900 scale-110' : 'border-slate-300'} transition`} style={{ backgroundColor: c }} title={c} />
        ))}
        <div className="flex-1" />
        <button onClick={undo} disabled={strokes.length === 0} className="p-1.5 rounded hover:bg-slate-200 text-slate-700 disabled:opacity-30" title="Undo"><Undo2 size={14} /></button>
        <button onClick={clearAll} disabled={strokes.length === 0} className="p-1.5 rounded hover:bg-red-100 text-red-600 disabled:opacity-30" title="Clear all"><Trash2 size={14} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onMouseLeave={handleUp}
        className={`block ${tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'}`}
      />
    </div>
  );
}
