import { useState, useEffect, useRef } from 'react';
import { Type, Pencil, Eraser, Undo2, Trash2, ChevronsUp, ChevronsDown, X } from 'lucide-react';

const COLORS = ['#1f2937', '#dc2626', '#2563eb', '#059669'];
const FONT_SIZES = [
  { id: 'sm', label: 'S', px: 13 },
  { id: 'md', label: 'M', px: 16 },
  { id: 'lg', label: 'L', px: 22 },
];

// Fixed template layout — designed to match the drawn morning-report whiteboard.
// Cells use fractional coordinates (0-1) so they scale with the canvas width.
const TEMPLATE = {
  cells: [
    { id: 'cc',       label: 'CC',              x: 0.00, y: 0.00, w: 0.44, h: 0.10 },
    { id: 'hpi',      label: 'HPI',             x: 0.00, y: 0.10, w: 0.44, h: 0.40 },
    { id: 'pmh',      label: 'PMH',             x: 0.00, y: 0.50, w: 0.22, h: 0.50 },
    { id: 'meds',     label: 'Meds',            x: 0.00, y: 0.85, w: 0.22, h: 0.15 },
    { id: 'famhx',    label: 'Fam Hx',          x: 0.22, y: 0.50, w: 0.22, h: 0.13 },
    { id: 'sochx',    label: 'Soc Hx',          x: 0.22, y: 0.63, w: 0.22, h: 0.13 },
    { id: 'surghx',   label: 'Surgical Hx',     x: 0.22, y: 0.76, w: 0.22, h: 0.13 },
    { id: 'allergies',label: 'Allergies',       x: 0.22, y: 0.89, w: 0.22, h: 0.11 },
    { id: 'vitals',   label: 'Vitals / Exam',   x: 0.44, y: 0.00, w: 0.56, h: 0.22 },
    { id: 'labs',     label: 'Notable Labs & Imaging', x: 0.44, y: 0.22, w: 0.56, h: 0.56 },
    { id: 'assess',   label: 'Assessment',      x: 0.44, y: 0.78, w: 0.56, h: 0.22 },
  ],
  // Fishbone diagrams live inside the "labs" cell at relative positions
  fishbones: [
    // CBC fishbone
    {
      id: 'cbc',
      cell: 'labs',
      relX: 0.15, relY: 0.30, relW: 0.35,
      slots: [
        { id: 'wbc', label: 'WBC', dx: 0.00, dy: 0.50 },
        { id: 'hgb', label: 'Hgb', dx: 0.50, dy: 0.15 },
        { id: 'hct', label: 'Hct', dx: 1.00, dy: 0.50 },
        { id: 'plt', label: 'Plt', dx: 0.50, dy: 0.85 },
      ],
    },
    // BMP fishbone
    {
      id: 'bmp',
      cell: 'labs',
      relX: 0.55, relY: 0.30, relW: 0.40,
      slots: [
        { id: 'na',  label: 'Na',   dx: 0.00, dy: 0.30 },
        { id: 'cl',  label: 'Cl',   dx: 0.35, dy: 0.30 },
        { id: 'bun', label: 'BUN',  dx: 0.75, dy: 0.30 },
        { id: 'k',   label: 'K',    dx: 0.00, dy: 0.70 },
        { id: 'co2', label: 'CO₂',  dx: 0.35, dy: 0.70 },
        { id: 'cr',  label: 'Cr',   dx: 0.75, dy: 0.70 },
        { id: 'glu', label: 'Glu',  dx: 1.05, dy: 0.50 },
      ],
    },
  ],
};

export default function WhiteboardCanvas({ content, setContent, width }) {
  const [tool, setTool] = useState('text');
  const [color, setColor] = useState(COLORS[0]);
  const [fontSize, setFontSize] = useState('md');
  const [drawing, setDrawing] = useState(null); // current pen stroke in progress
  const [editing, setEditing] = useState(null); // { id, x, y, initialText? } for text-tool click
  const canvasRef = useRef(null);
  const editInputRef = useRef(null);

  // Data model (all stored in content object which is persisted)
  const texts = content.texts || [];
  const strokes = content.strokes || [];
  const fishboneValues = content.fishboneValues || {}; // { 'cbc.wbc': '11.3', ... }

  const updateContent = (patch) => setContent({ ...content, ...patch });

  // Canvas dimensions — pixel width follows the parent, height is proportional to typical whiteboard aspect
  const height = Math.round(width * 0.68);

  const getPt = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // ----- Text tool -----
  const handleCanvasClick = (e) => {
    // Don't fire if clicking a text item, fishbone slot, etc. (those stopPropagation)
    if (tool !== 'text') return;
    const pt = getPt(e);
    // Start editing a new text at this location
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
            id: editing.id,
            x: editing.x,
            y: editing.y,
            text: trimmed,
            color,
            size: fontSize,
          }],
        });
      }
    } else {
      // Existing text edit
      if (trimmed) {
        updateContent({
          texts: texts.map(t => t.id === editing.id ? { ...t, text: trimmed } : t),
        });
      } else {
        // Empty on edit = delete
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
      // Rough hitbox around each text
      const px = FONT_SIZES.find(f => f.id === t.size)?.px || 16;
      return !(pt.x >= t.x - 4 && pt.x <= t.x + 200 && pt.y >= t.y - px && pt.y <= t.y + 4);
    });
    if (survivingStrokes.length !== strokes.length || survivingTexts.length !== texts.length) {
      updateContent({ strokes: survivingStrokes, texts: survivingTexts });
    }
  };

  const undo = () => {
    // Undo the last thing added, whether text or stroke
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
    if (!confirm('Clear the entire whiteboard? Fishbone values stay.')) return;
    updateContent({ texts: [], strokes: [] });
  };

  const cursor =
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

        {/* Color swatches */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${
                color === c ? 'border-stone-900 scale-110' : 'border-stone-300'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-stone-200" />

        {/* Font size (only relevant for text tool) */}
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
          {/* Template cells (border grid + labels) */}
          {TEMPLATE.cells.map(cell => (
            <div
              key={cell.id}
              className="absolute border border-stone-400 p-1.5 pointer-events-none"
              style={{
                left: cell.x * width, top: cell.y * height,
                width: cell.w * width, height: cell.h * height,
              }}
            >
              <span className="text-xs font-semibold text-stone-700">{cell.label}:</span>
            </div>
          ))}

          {/* Fishbone diagrams */}
          {TEMPLATE.fishbones.map(fb => {
            const parent = TEMPLATE.cells.find(c => c.id === fb.cell);
            if (!parent) return null;
            const fbX = (parent.x + parent.w * fb.relX) * width;
            const fbY = (parent.y + parent.h * fb.relY) * height;
            const fbW = parent.w * fb.relW * width;
            const fbH = fbW * 0.5; // fishbones roughly 2:1 aspect
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

          {/* Committed pen strokes */}
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

          {/* Committed text items */}
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
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1,
                  padding: '0 2px',
                }}
              >
                {t.text}
              </div>
            );
          })}

          {/* Active text editor (input for the item being edited/created) */}
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

// Fishbone SVG with clickable value slots.
// CBC has 4 slots in a diamond; BMP has 6 slots plus a glucose off-shoot.
function Fishbone({ fb, x, y, w, h, values, onChange }) {
  const isCbc = fb.id === 'cbc';
  return (
    <div className="absolute" style={{ left: x, top: y, width: w, height: h }}>
      {/* Skeleton lines */}
      <svg className="absolute inset-0" width={w} height={h}>
        {isCbc ? (
          // CBC: X shape — 4 lines from center to each corner-ish slot
          <>
            <line x1={w * 0.0} y1={h * 0.5} x2={w * 0.5} y2={h * 0.15} stroke="#78716c" strokeWidth={1.5} />
            <line x1={w * 0.5} y1={h * 0.15} x2={w * 1.0} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
            <line x1={w * 1.0} y1={h * 0.5} x2={w * 0.5} y2={h * 0.85} stroke="#78716c" strokeWidth={1.5} />
            <line x1={w * 0.5} y1={h * 0.85} x2={w * 0.0} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
          </>
        ) : (
          // BMP: horizontal line + verticals
          <>
            <line x1={0} y1={h * 0.5} x2={w * 0.85} y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
            <line x1={w * 0.15} y1={h * 0.2} x2={w * 0.15} y2={h * 0.8} stroke="#78716c" strokeWidth={1.5} />
            <line x1={w * 0.5}  y1={h * 0.2} x2={w * 0.5}  y2={h * 0.8} stroke="#78716c" strokeWidth={1.5} />
            <line x1={w * 0.85} y1={h * 0.5} x2={w * 1.0}  y2={h * 0.5} stroke="#78716c" strokeWidth={1.5} />
          </>
        )}
      </svg>
      {/* Clickable value slots */}
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

// Inline text editor. Uses a contenteditable-ish input positioned absolutely
// where the user clicked, so text appears exactly at the cursor.
import { forwardRef } from 'react';

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

  // Expose focus to parent through ref
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
        left: x,
        top: y - fontSize,
        color,
        fontSize,
        fontFamily: 'inherit',
        lineHeight: 1.1,
        border: '1px dashed #5a865e',
        background: 'rgba(255,255,240,0.95)',
        padding: '0 2px',
        margin: 0,
        outline: 'none',
        resize: 'none',
        minWidth: 60,
        overflow: 'hidden',
      }}
      rows={1}
    />
  );
});