import { useState, useRef } from 'react';
import { Plus, X, GripVertical, Stethoscope, ListChecks } from 'lucide-react';

export default function Whiteboard({ ddx, setDdx, plan, setPlan }) {
  return (
    <div className="flex-1 overflow-y-auto divide-y-4 divide-slate-200">
      <DdxSection ddx={ddx} setDdx={setDdx} />
      <PlanSection plan={plan} setPlan={setPlan} />
    </div>
  );
}

// ============================================================
// DDx section — enter-to-submit, drag-to-reorder, alternating colors
// ============================================================
function DdxSection({ ddx, setDdx }) {
  const [draftName, setDraftName] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const draftRef = useRef(null);

  const addDdx = (name = '') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setDdx([...ddx, { id: Date.now() + Math.random(), name: trimmed, notes: '' }]);
    setDraftName('');
    // Return focus to draft input so user can keep typing
    setTimeout(() => draftRef.current?.focus(), 0);
  };

  const updateDdx = (id, field, val) => setDdx(ddx.map(d => d.id === id ? { ...d, [field]: val } : d));
  const removeDdx = (id) => setDdx(ddx.filter(d => d.id !== id));

  // Drag handlers
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== i) setDragOverIdx(i);
  };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const copy = [...ddx];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(i, 0, moved);
    setDdx(copy);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  return (
    <div className="bg-blue-50/40">
      <div className="px-3 py-2.5 flex items-center justify-between sticky top-0 bg-blue-100/95 backdrop-blur border-b-2 border-blue-300 z-10">
        <div className="flex items-center gap-1.5">
          <Stethoscope size={13} className="text-blue-800" />
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Differential Diagnosis</span>
        </div>
        <span className="text-[10px] text-blue-700">{ddx.length} {ddx.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="px-3 py-3 space-y-1.5">
        {ddx.map((d, i) => {
          const bg = i % 2 === 0 ? 'bg-sky-100 border-sky-200' : 'bg-slate-100 border-slate-200';
          const isDragging = dragIdx === i;
          const isDragOver = dragOverIdx === i;
          return (
            <div
              key={d.id}
              draggable="true"
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className={`relative border-2 rounded p-2 shadow-sm transition ${bg} ${
                isDragging ? 'opacity-30' : ''
              } ${isDragOver ? 'ring-2 ring-blue-500 -translate-y-0.5' : ''}`}
            >
              <div className="flex items-center gap-1">
                <GripVertical size={14} className="text-slate-400 cursor-move flex-shrink-0" />
                <span className="text-xs font-bold text-blue-700 w-6 flex-shrink-0">#{i + 1}</span>
                <input
                  value={d.name}
                  onChange={e => updateDdx(d.id, 'name', e.target.value)}
                  placeholder="Diagnosis"
                  className="flex-1 text-sm px-1 py-0.5 bg-transparent border-b border-slate-400 focus:outline-none focus:border-blue-500 font-medium min-w-0"
                />
                <button
                  onClick={() => removeDdx(d.id)}
                  className="text-slate-400 hover:text-red-600 flex-shrink-0"
                  title="Remove"
                >
                  <X size={13} />
                </button>
              </div>
              <textarea
                value={d.notes}
                onChange={e => updateDdx(d.id, 'notes', e.target.value)}
                placeholder="For / against..."
                className="w-full text-xs mt-1.5 p-1.5 border border-slate-300 rounded resize-none bg-white/70 focus:outline-none focus:ring-1 focus:ring-blue-400"
                rows={2}
              />
            </div>
          );
        })}

        {/* New-item input — Enter to add */}
        <div className="border-2 border-dashed border-blue-300 rounded p-2 bg-white">
          <div className="flex items-center gap-1">
            <Plus size={14} className="text-blue-500 flex-shrink-0" />
            <input
              ref={draftRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addDdx(draftName); }
              }}
              placeholder="Add diagnosis, press Enter..."
              className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none placeholder-slate-400 min-w-0"
            />
          </div>
        </div>

        {ddx.length === 0 && (
          <p className="text-xs text-slate-500 italic mt-2 text-center">
            Ranked top → bottom. Drag ⋮ to reorder.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Plan section — enter-to-add, list of items, no reorder
// ============================================================
function PlanSection({ plan, setPlan }) {
  // Backwards-compat: if plan is a string (from old saves), convert to array.
  const items = Array.isArray(plan)
    ? plan
    : (typeof plan === 'string' && plan.trim())
      ? plan.split('\n').filter(Boolean).map((text, i) => ({ id: Date.now() + i, text }))
      : [];

  const [draft, setDraft] = useState('');
  const draftRef = useRef(null);

  const setItems = (newItems) => setPlan(newItems);

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setItems([...items, { id: Date.now() + Math.random(), text: trimmed }]);
    setDraft('');
    setTimeout(() => draftRef.current?.focus(), 0);
  };

  const updateItem = (id, text) => setItems(items.map(it => it.id === id ? { ...it, text } : it));
  const removeItem = (id) => setItems(items.filter(it => it.id !== id));

  return (
    <div className="bg-amber-50/50">
      <div className="px-3 py-2.5 flex items-center justify-between sticky top-0 bg-amber-100/95 backdrop-blur border-b-2 border-amber-300 z-10">
        <div className="flex items-center gap-1.5">
          <ListChecks size={13} className="text-amber-800" />
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Plan</span>
        </div>
        <span className="text-[10px] text-amber-700">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="px-3 py-3 space-y-1.5">
        {items.map((it, i) => (
          <div
            key={it.id}
            className="bg-white border border-amber-200 rounded p-1.5 flex items-center gap-2 shadow-sm"
          >
            <span className="text-[10px] font-bold text-amber-600 w-5 flex-shrink-0 text-center">{i + 1}.</span>
            <input
              value={it.text}
              onChange={e => updateItem(it.id, e.target.value)}
              className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none min-w-0"
            />
            <button
              onClick={() => removeItem(it.id)}
              className="text-slate-400 hover:text-red-600 flex-shrink-0"
              title="Remove"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        <div className="border-2 border-dashed border-amber-300 rounded p-2 bg-white">
          <div className="flex items-center gap-1">
            <Plus size={14} className="text-amber-500 flex-shrink-0" />
            <input
              ref={draftRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addItem(); }
              }}
              placeholder="e.g. Order CBC — press Enter..."
              className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none placeholder-slate-400 min-w-0"
            />
          </div>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-slate-500 italic mt-2 text-center">
            Add plan items one at a time.
          </p>
        )}
      </div>
    </div>
  );
}
