import { useState, useEffect, useRef, forwardRef } from 'react';
import { Type, Pencil, Eraser, Undo2, Trash2, Grid, EyeOff } from 'lucide-react';

const COLORS = ['#1f2937', '#dc2626', '#2563eb', '#059669'];
const FONT_SIZES = [
  { id: 'sm', label: 'S', px: 13 },
  { id: 'md', label: 'M', px: 16 },
  { id: 'lg', label: 'L', px: 22 },
];

// The template describes:
//  - Vertical dividers by their x position (fraction 0-1). Named for reference.
//  - Horizontal dividers by their y position, scoped to the column region they belong to.
//  - Cells reference the dividers that form their edges.
const DEFAULT_DIVIDERS = {
  // Main column boundaries (whole page height)
  colLeft:      0.22, // between "left column" (PMH/Meds) and "middle column" (Fam/Soc/Surg/Allergies)
  colMiddle:    0.44, // between "middle column" and "right column" (Vitals/Labs/Assess)

  // Horizontal splits in the LEFT column
  leftRow1:     0.10, // CC vs HPI
  leftRow2:     0.50, // HPI vs PMH+Meds
  leftRow3:     0.85, // PMH vs Meds

  // Horizontal splits in the MIDDLE column
  middleRow1:   0.50, // (aligned with leftRow2) — HPI/CC section vs Fam/Soc stack
  middleRow2:   0.63, // Fam Hx vs Soc Hx
  middleRow3:   0.76, // Soc Hx vs Surgical Hx
  middleRow4:   0.89, // Surgical Hx vs Allergies

  // Horizontal splits in the RIGHT column
  rightRow1:    0.22, // Vitals/Exam vs Notable Labs
  rightRow2:    0.78, // Notable Labs vs Assessment
};


const showTemplate = content.showTemplate !== false; // default true
const toggleTemplate = () => updateContent({ showTemplate: !showTemplate });

// Each cell is defined by four dividers (or fixed edges 0/1).
// Type: 'v' or 'h' or fixed literal number.
const CELLS = [
  { id: 'cc',       label: 'CC',                 left: 0,           right: 'colLeft',   top: 0,             bottom: 'leftRow1' },
  { id: 'hpi',      label: 'HPI',                left: 0,           right: 'colLeft',   top: 'leftRow1',    bottom: 'leftRow2' },
  { id: 'pmh',      label: 'PMH',                left: 0,           right: 'colLeft',   top: 'leftRow2',    bottom: 'leftRow3' },
  { id: 'meds',     label: 'Meds',               left: 0,           right: 'colLeft',   top: 'leftRow3',    bottom: 1 },
  { id: 'famhx',    label: 'Fam Hx',             left: 'colLeft',   right: 'colMiddle', top: 'middleRow1',  bottom: 'middleRow2' },
  { id: 'sochx',    label: 'Soc Hx',             left: 'colLeft',   right: 'colMiddle', top: 'middleRow2',  bottom: 'middleRow3' },
  { id: 'surghx',   label: 'Surgical Hx',        left: 'colLeft',   right: 'colMiddle', top: 'middleRow3',  bottom: 'middleRow4' },
  { id: 'allergies',label: 'Allergies',          left: 'colLeft',   right: 'colMiddle', top: 'middleRow4',  bottom: 1 },
  { id: 'vitals',   label: 'Vitals / Exam',      left: 'colMiddle', right: 1,           top: 0,             bottom: 'rightRow1' },
  { id: 'labs',     label: 'Notable Labs & Imaging', left: 'colMiddle', right: 1,       top: 'rightRow1',   bottom: 'rightRow2' },
  { id: 'assess',   label: 'Assessment',         left: 'colMiddle', right: 1,           top: 'rightRow2',   bottom: 1 },
];

// Which dividers are "column dividers" (vertical, span the full height)
const COLUMN_DIVIDERS = ['colLeft', 'colMiddle'];
// The rest are row dividers, each scoped to one column range
const ROW_DIVIDER_SCOPES = {
  leftRow1:   { left: 0,           right: 'colLeft' },
  leftRow2:   { left: 0,           right: 'colLeft' },
  leftRow3:   { left: 0,           right: 'colLeft' },
  middleRow1: { left: 'colLeft',   right: 'colMiddle' },
  middleRow2: { left: 'colLeft',   right: 'colMiddle' },
  middleRow3: { left: 'colLeft',   right: 'colMiddle' },
  middleRow4: { left: 'colLeft',   right: 'colMiddle' },
  rightRow1:  { left: 'colMiddle', right: 1 },
  rightRow2:  { left: 'colMiddle', right: 1 },
};

const FISHBONES = [
  {
    id: 'cbc', cell: 'labs',
    relX: 0.05, relY: 0.30, relW: 0.28,
    slots: [
      { id: 'wbc', label: 'WBC', dx: 0.00, dy: 0.50 },
      { id: 'hgb', label: 'Hgb', dx: 0.50, dy: 0.15 },
      { id: 'hct', label: 'HCT', dx: 0.50, dy: 0.85 },
      { id: 'plt', label: 'PLT', dx: 1.00, dy: 0.50 },
    ],
  },
  {
    id: 'bmp', cell: 'labs',
    relX: 0.42, relY: 0.30, relW: 0.52,
    slots: [
      { id: 'na',  label: 'Na',   dx: 0.05, dy: 0.30 },
      { id: 'k',   label: 'K',    dx: 0.05, dy: 0.70 },
      { id: 'cl',  label: 'Cl',   dx: 0.32, dy: 0.30 },
      { id: 'co2', label: 'CO₂',  dx: 0.32, dy: 0.70 },
      { id: 'bun', label: 'BUN',  dx: 0.58, dy: 0.30 },
      { id: 'cr',  label: 'Cr',   dx: 0.58, dy: 0.70 },
      { id: 'glu', label: 'Glu',  dx: 0.88, dy: 0.50 },
    ],
  },
];

const MIN_GAP = 0.04; // minimum distance between adjacent dividers (as fraction)

export default function WhiteboardCanvas({ content, setContent, width }) {
  const [tool, setTool] = useState('text');
  const [color, setColor] = useState(COLORS[0]);
  const [fontSize, setFontSize] = useState('md');
  const [drawing, setDrawing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [dividerDrag, setDividerDrag] = useState(null); // { id, orientation }
  const canvasRef = useRef(null);
  const editInputRef = useRef(null);

  const texts = content.texts || [];
  const strokes = content.strokes || [];
  const fishboneValues = content.fishboneValues || {};
  const dividers = { ...DEFAULT_DIVIDERS, ...(content.dividers || {}) };

  const updateContent = (patch) => setContent({ ...content, ...patch });
  const setDividers = (newDivs) => updateContent({ dividers: { ...dividers, ...newDivs } });

  const height = Math.round(width * 0.68);

  // Resolve a divider reference (name or literal number) to a fractional position
  const resolveDiv = (ref) => {
    if (typeof ref === 'number') return ref;
    return dividers[ref] ?? 0;
  };

  const getPt = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ----- Divider dragging -----
  useEffect(() => {
    if (!dividerDrag) return;
    const handleMove = (e) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      if (dividerDrag.orientation === 'v') {
        const newX = (e.clientX - r.left) / width;
        // Clamp so dividers don't overlap or leave the canvas
        const clamped = Math.max(MIN_GAP, Math.min(1 - MIN_GAP, newX));
        setDividers({ [dividerDrag.id]: clamped });
      } else {
        const newY = (e.clientY - r.top) / height;
        const clamped = Math.max(MIN_GAP, Math.min(1 - MIN_GAP, newY));
        setDividers({ [dividerDrag.id]: clamped });
      }
    };
    const handleUp = () => setDividerDrag(null);
    document.body.style.cursor = dividerDrag.orientation === 'v' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dividerDrag, width, height]); // eslint-disable-line

  // ----- Text tool -----
  const handleCanvasClick = (e) => {
    if (tool !== 'text') return;
    const pt = getPt(e);
    const newId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setEditing({ id: newId, x: pt.x, y: pt.y, isNew: true });
  };

  const commitEdit = (text) => {
    if (!editing) return;
    const trimmed = text.trim();
    if (editing.isNew) {
      if (trimmed) {
        updateContent({
          texts: [...texts, {
            id: editing.id, x: editing.x, y: editing.y,
            text: trimmed, color, size: fontSize,
          }],
        });
      }
    } else {
      if (trimmed) {
        updateContent({
          texts: texts.map(t => t.id === editing.id ? { ...t, text: trimmed } : t),
        });
      } else {
        updateContent({ texts: texts.filter(t => t.id !== editing.id) });
      }
    }
    setEditing(null);
  };

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select?.();
    }
  }, [editing]);

  // ----- Pen tool -----
  const handleMouseDown = (e) => {
    if (tool !== 'pen') return;
    const pt = getPt(e);
    setDrawing({ id: `s-${Date.now()}`, color, points: [pt] });
  };
  const handleMouseMove = (e) => {
    if (!drawing) return;
    setDrawing(d => ({ ...d, points: [...d.points, getPt(e)] }));
  };
  const handleMouseUp = () => {
    if (!drawing) return;
    if (drawing.points.length > 1) {
      updateContent({ strokes: [...strokes, drawing] });
    }
    setDrawing(null);
  };

  // ----- Eraser -----
  const handleEraserClick = (e) => {
    if (tool !== 'eraser') return;
    const pt = getPt(e);
    const thresh = 12;
    const survivingStrokes = strokes.filter(s =>
      !s.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < thresh)
    );
    const survivingTexts = texts.filter(t => {
      const px = FONT_SIZES.find(f => f.id === t.size)?.px || 16;
      return !(pt.x >= t.x - 4 && pt.x <= t.x + 200 && pt.y >= t.y - px && pt.y <= t.y + 4);
    });
    if (survivingStrokes.length !== strokes.length || survivingTexts.length !== texts.length) {
      updateContent({ strokes: survivingStrokes, texts: survivingTexts });
    }
  };

  const undo = () => {
    if (strokes.length === 0 && texts.length === 0) return;
    const lastStrokeTime = strokes.length ? parseInt(strokes[strokes.length - 1].id.split('-')[1], 10) : 0;
    const lastTextTime = texts.length ? parseInt(texts[texts.length - 1].id.split('-')[1], 10) : 0;
    if (lastStrokeTime > lastTextTime) {
      updateContent({ strokes: strokes.slice(0, -1) });
    } else {
      updateContent({ texts: texts.slice(0, -1) });
    }
  };

  const clearAll = () => {
    if (!confirm('Clear the entire whiteboard? Fishbone values and layout stay.')) return;
    updateContent({ texts: [], strokes: [] });
  };

  const resetLayout = () => {
    if (!confirm('Reset the divider layout to default? Text and drawings stay.')) return;
    updateContent({ dividers: {} });
  };

  const cursor =
    dividerDrag ? (dividerDrag.orientation === 'v' ? 'col-resize' : 'row-resize') :
    tool === 'text' ? 'text' :
    tool === 'pen' ? 'crosshair' :
    tool === 'eraser' ? 'cell' :
    'default';

  return (
    <div className="flex-1 flex flex-col bg-stone-50 overflow-hidden">
      {/* Toolbar */}
      <div className="bg-white border-b border-stone-200 px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 bg-stone-100 rounded p-0.5">
          <ToolBtn active={tool==='text'} onClick={() => setTool('text')} icon={Type} label="Text" />
          <ToolBtn active={tool==='pen'}  onClick={() => setTool('pen')}  icon={Pencil} label="Pen" />
          <ToolBtn active={tool==='eraser'} onClick={() => setTool('eraser')} icon={Eraser} label="Eraser" />
        </div>
        <div className="w-px h-6 bg-stone-200" />
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${color === c ? 'border-stone-900 scale-110' : 'border-stone-300'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="w-px h-6 bg-stone-200" />
        <div className="flex items-center gap-0.5 bg-stone-100 rounded p-0.5">
          {FONT_SIZES.map(f => (
            <button
              key={f.id}
              onClick={() => setFontSize(f.id)}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                fontSize === f.id ? 'bg-sage-600 text-white' : 'text-stone-700 hover:bg-stone-200'
              }`}
              title={`${f.label} — ${f.px}px`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
  onClick={toggleTemplate}
  className={`p-1.5 rounded transition text-xs px-2 flex items-center gap-1 ${
    showTemplate ? 'text-stone-700 hover:bg-stone-100' : 'bg-sage-100 text-sage-700 hover:bg-sage-200'
  }`}
  title={showTemplate ? 'Hide template lines and labels' : 'Show template lines and labels'}
>
  {showTemplate ? <EyeOff size={12} /> : <Grid size={12} />}
  {showTemplate ? 'Hide grid' : 'Show grid'}
</button>
        <button
          onClick={resetLayout}
          className="p-1.5 rounded text-stone-600 hover:bg-stone-100 text-xs px-2"
          title="Reset divider layout"
        >
          Reset layout
        </button>
        <button
          onClick={undo}
          disabled={strokes.length === 0 && texts.length === 0}
          className="p-1.5 rounded text-stone-600 hover:bg-stone-100 disabled:opacity-30"
          title="Undo last"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={clearAll}
          disabled={strokes.length === 0 && texts.length === 0}
          className="p-1.5 rounded text-red-500 hover:bg-red-50 disabled:opacity-30"
          title="Clear all"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-4">
        <div
          ref={canvasRef}
          onMouseDown={tool === 'pen' ? handleMouseDown : (tool === 'eraser' ? handleEraserClick : undefined)}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
          className="relative bg-white border border-stone-300 shadow-sm mx-auto"
          style={{ width, height, cursor }}
        >
          {/* Cell backgrounds and labels */}
{showTemplate && CELLS.map(cell => {
  const left   = resolveDiv(cell.left)   * width;
  const top    = resolveDiv(cell.top)    * height;
  const right  = resolveDiv(cell.right)  * width;
  const bottom = resolveDiv(cell.bottom) * height;
  return (
    <div
      key={cell.id}
      className="absolute pointer-events-none p-1.5"
      style={{ left, top, width: right - left, height: bottom - top }}
    >
      <span className="text-xs font-semibold text-stone-700">{cell.label}:</span>
    </div>
  );
})}

{/* Fishbones */}
          {FISHBONES.map(fb => {
            const parent = CELLS.find(c => c.id === fb.cell);
            if (!parent) return null;
            const pLeft   = resolveDiv(parent.left)   * width;
            const pTop    = resolveDiv(parent.top)    * height;
            const pRight  = resolveDiv(parent.right)  * width;
            const pBottom = resolveDiv(parent.bottom) * height;
            const pW = pRight - pLeft;
            const pH = pBottom - pTop;
            const fbX = pLeft + pW * fb.relX;
            const fbY = pTop + pH * fb.relY;
            const fbW = pW * fb.relW;
            const fbH = fbW * 0.5;
            return (
              <Fishbone
                key={fb.id}
                fb={fb}
                x={fbX} y={fbY} w={fbW} h={fbH}
                values={fishboneValues}
                onChange={(slotId, val) => {
                  updateContent({
                    fishboneValues: { ...fishboneValues, [`${fb.id}.${slotId}`]: val },
                  });
                }}
              />
            );
          })}

          {/* Committed strokes */}
          <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            {strokes.map(s => (
              <path
                key={s.id}
                d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none" stroke={s.color} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"
              />
            ))}
            {drawing && (
              <path
                d={drawing.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none" stroke={drawing.color} strokeWidth={2}
                strokeLinecap="round" strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Text items */}
          {texts.map(t => {
            const px = FONT_SIZES.find(f => f.id === t.size)?.px || 16;
            return (
              <div
                key={t.id}
                onClick={(e) => {
                  if (tool === 'text') {
                    e.stopPropagation();
                    setEditing({ id: t.id, x: t.x, y: t.y, initialText: t.text, isNew: false });
                  }
                }}
                className={tool === 'text' ? 'absolute cursor-text hover:outline hover:outline-1 hover:outline-sage-400 rounded' : 'absolute'}
                style={{
                  left: t.x, top: t.y - px,
                  color: t.color, fontSize: px,
                  fontFamily: 'inherit', whiteSpace: 'pre-wrap',
                  lineHeight: 1, padding: '0 2px',
                }}
              >
                {t.text}
              </div>
            );
          })}

          {/* Divider handles — drawn last, on top of everything, always interactive */}
{/* Vertical column dividers */}
{showTemplate && COLUMN_DIVIDERS.map(name => (
            <div
              key={name}
              className="absolute group"
              style={{
                left: dividers[name] * width - 4,
                top: 0,
                width: 8,
                height,
                cursor: 'col-resize',
                zIndex: 10,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDividerDrag({ id: name, orientation: 'v' });
              }}
            >
              {/* Visible line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-400 group-hover:bg-sage-500 group-hover:w-0.5 transition-all -translate-x-1/2" />
            </div>
          ))}
          {/* Divider handles — drawn last, on top of everything, always interactive */}
{/* Vertical column dividers */}
{showTemplate && COLUMN_DIVIDERS.map(name => (
            const leftPx = resolveDiv(scope.left) * width;
            const rightPx = resolveDiv(scope.right) * width;
            const y = dividers[name] * height;
            return (
              <div
                key={name}
                className="absolute group"
                style={{
                  left: leftPx,
                  top: y - 4,
                  width: rightPx - leftPx,
                  height: 8,
                  cursor: 'row-resize',
                  zIndex: 10,
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDividerDrag({ id: name, orientation: 'h' });
                }}
              >
                <div className="absolute top-1/2 left-0 right-0 h-px bg-stone-400 group-hover:bg-sage-500 group-hover:h-0.5 transition-all -translate-y-1/2" />
              </div>
            );
          })}
          {/* Outer border — part of the template */}
{showTemplate && <div className="absolute inset-0 pointer-events-none border border-stone-400" />}

          {/* Text editor (input for active edit) */}
          {editing && (
            <TextEditor
              ref={editInputRef}
              initialValue={editing.initialText || ''}
              x={editing.x}
              y={editing.y}
              color={color}
              fontSize={FONT_SIZES.find(f => f.id === fontSize)?.px || 16}
              onCommit={commitEdit}
              onCancel={() => setEditing(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded transition ${
        active ? 'bg-sage-600 text-white' : 'text-stone-700 hover:bg-stone-200'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}

function Fishbone({ fb, x, y, w, h, values, onChange }) {
  const isCbc = fb.id === 'cbc';
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h }}>
      <svg className="absolute inset-0" width={w} height={h}>
        {isCbc ? (
          // CBC pattern:
          //      Hgb
          //   WBC───┼───PLT
          //      HCT
          <>
            {/* Horizontal main line WBC to PLT */}
            <line x1={0} y1={h * 0.5} x2={w} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
            {/* Vertical center line through Hgb/HCT */}
            <line x1={w * 0.5} y1={h * 0.15} x2={w * 0.5} y2={h * 0.85} stroke="#78716c" strokeWidth={1.5} />
          </>
        ) : (
  // BMP pattern:
  //   Na │ Cl │ BUN \
  //   ───┼────┼─────── Glu
  //   K  │CO₂│  Cr /
  <>
    {/* Horizontal center line */}
    <line x1={w * 0.05} y1={h * 0.5} x2={w * 0.75} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
    {/* Vertical dividers between cell pairs */}
    <line x1={w * 0.18} y1={h * 0.2} x2={w * 0.18} y2={h * 0.8} stroke="#78716c" strokeWidth={1.5} />
    <line x1={w * 0.45} y1={h * 0.2} x2={w * 0.45} y2={h * 0.8} stroke="#78716c" strokeWidth={1.5} />
    <line x1={w * 0.72} y1={h * 0.2} x2={w * 0.72} y2={h * 0.8} stroke="#78716c" strokeWidth={1.5} />
    {/* Diagonal lines from BUN/Cr converging to Glu */}
    <line x1={w * 0.72} y1={h * 0.2} x2={w * 0.88} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
    <line x1={w * 0.72} y1={h * 0.8} x2={w * 0.88} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
  </>
)}
      </svg>
      {fb.slots.map(slot => {
        const key = `${fb.id}.${slot.id}`;
        const val = values[key] || '';
        return (
          <FishboneSlot
            key={slot.id}
            label={slot.label}
            value={val}
            x={slot.dx * w}
            y={slot.dy * h}
            onChange={(v) => onChange(slot.id, v)}
          />
        );
      })}
    </div>
  );
}

function FishboneSlot({ label, value, x, y, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  return (
    <div
      className="absolute"
      style={{ left: x - 24, top: y - 10, width: 48, textAlign: 'center' }}
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setDraft(value); setEditing(false); }
          }}
          className="w-full text-center text-xs bg-yellow-50 border border-sage-500 rounded px-1 py-0.5"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="text-xs font-medium text-stone-800 bg-white/90 border border-stone-300 rounded px-1 py-0.5 cursor-pointer hover:border-sage-500">
          {value || <span className="text-stone-400">{label}</span>}
        </div>
      )}
    </div>
  );
}

const TextEditor = forwardRef(function TextEditor(
  { initialValue, x, y, color, fontSize, onCommit, onCancel }, ref
) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  useEffect(() => {
    if (ref) {
      if (typeof ref === 'function') ref(inputRef.current);
      else ref.current = inputRef.current;
    }
  }, [ref]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit(value);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <textarea
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={handleKeyDown}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        left: x, top: y - fontSize,
        color, fontSize,
        fontFamily: 'inherit',
        lineHeight: 1.1,
        border: '1px dashed #5a865e',
        background: 'rgba(255,255,240,0.95)',
        padding: '0 2px', margin: 0,
        outline: 'none', resize: 'none',
        minWidth: 60, overflow: 'hidden',
      }}
      rows={1}
    />
  );
});