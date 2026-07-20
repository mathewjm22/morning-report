import { useState, useRef } from 'react';
import { Plus, X, GripVertical, Stethoscope, ListChecks, Lock, Award, List, LayoutGrid, Layers } from 'lucide-react';
import { DDX_VIEWS } from '../lib/ddxViews.js';

export default function Whiteboard({
  ddx, setDdx, plan, setPlan,
  committedDdx, onCommitDdx, onUncommitDdx, onOpenReveal,
  ddxView, setDdxView,
}) {
  return (
    <div className="flex-1 overflow-y-auto divide-y-4 divide-stone-200">
      <DdxSection
        ddx={ddx} setDdx={setDdx}
        committedDdx={committedDdx}
        onCommitDdx={onCommitDdx}
        onUncommitDdx={onUncommitDdx}
        onOpenReveal={onOpenReveal}
        ddxView={ddxView}
        setDdxView={setDdxView}
      />
      <PlanSection plan={plan} setPlan={setPlan} />
    </div>
  );
}

function DdxSection({
  ddx, setDdx,
  committedDdx, onCommitDdx, onUncommitDdx, onOpenReveal,
  ddxView, setDdxView,
}) {
  const currentView = DDX_VIEWS[ddxView] || DDX_VIEWS.list;
  const locked = !!committedDdx;

  return (
    <div className="bg-sage-50/40">
      <div className="px-3 py-2.5 flex items-center justify-between sticky top-0 bg-sage-100/95 backdrop-blur border-b-2 border-sage-300 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <Stethoscope size={13} className="text-sage-800 flex-shrink-0" />
          <span className="text-xs font-bold text-sage-900 uppercase tracking-wide">Differential Diagnosis</span>
          {locked && <Lock size={11} className="text-sage-700 flex-shrink-0" />}
        </div>
        {!locked && (
          <ViewSwitcher currentView={ddxView} onChange={setDdxView} />
        )}
      </div>

      {locked && (
        <div className="bg-sage-600 text-white px-3 py-2 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Lock size={12} className="flex-shrink-0" />
            <span className="truncate">Committed. Keep reading, then reveal.</span>
          </div>
          <button
            onClick={onUncommitDdx}
            className="text-sage-200 hover:text-white text-xs underline flex-shrink-0"
          >
            Un-commit
          </button>
        </div>
      )}

      {currentView.id === 'list' ? (
        <ListView ddx={ddx} setDdx={setDdx} committedDdx={committedDdx} />
      ) : (
        <CategoryView
          ddx={ddx}
          setDdx={setDdx}
          committedDdx={committedDdx}
          categories={currentView.categories}
        />
      )}

      <div className="px-3 pb-3">
        {!locked && ddx.length > 0 && (
          <button
            onClick={onCommitDdx}
            className="w-full mt-2 py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-md font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <Lock size={14} /> Commit DDx ({ddx.length})
          </button>
        )}
        {locked && (
          <button
            onClick={onOpenReveal}
            className="w-full mt-2 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <Award size={14} /> Reveal & judge
          </button>
        )}
      </div>
    </div>
  );
}

function ViewSwitcher({ currentView, onChange }) {
  const options = [
    { id: 'list',      icon: List,       label: 'List' },
    { id: 'anatomic',  icon: LayoutGrid, label: 'Anatomic' },
    { id: 'vindicate', icon: Layers,     label: 'VINDICATE' },
  ];
  return (
    <div className="flex items-center gap-0.5 bg-white rounded border border-sage-300 p-0.5">
      {options.map(opt => {
        const Icon = opt.icon;
        const active = currentView === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`p-1 rounded transition ${
              active ? 'bg-sage-600 text-white' : 'text-sage-700 hover:bg-sage-100'
            }`}
            title={opt.label}
          >
            <Icon size={12} />
          </button>
        );
      })}
    </div>
  );
}

function ListView({ ddx, setDdx, committedDdx }) {
  const [draftName, setDraftName] = useState('');
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const draftRef = useRef(null);
  const locked = !!committedDdx;
  const displayList = locked ? committedDdx : ddx;

  const addDdx = (name = '') => {
    if (locked) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setDdx([...ddx, { id: Date.now() + Math.random(), name: trimmed, notes: '', category: null }]);
    setDraftName('');
    setTimeout(() => draftRef.current?.focus(), 0);
  };
  const updateDdx = (id, field, val) => {
    if (locked) return;
    setDdx(ddx.map(d => d.id === id ? { ...d, [field]: val } : d));
  };
  const removeDdx = (id) => { if (!locked) setDdx(ddx.filter(d => d.id !== id)); };
  const handleDragStart = (i) => { if (!locked) setDragIdx(i); };
  const handleDragOver = (e, i) => {
    if (locked) return;
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== i) setDragOverIdx(i);
  };
  const handleDrop = (e, i) => {
    if (locked) return;
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const copy = [...ddx];
    const [moved] = copy.splice(dragIdx, 1);
    copy.splice(i, 0, moved);
    setDdx(copy);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  return (
    <div className="px-3 py-3 space-y-1.5">
      {displayList.map((d, i) => {
        const bg = i % 2 === 0 ? 'bg-sage-50 border-sage-200' : 'bg-white border-stone-200';
        return (
          <div
            key={d.id}
            draggable={!locked}
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={() => setDragOverIdx(null)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            className={`relative border rounded-md p-3 transition ${bg} ${
              dragIdx === i ? 'opacity-30' : ''
            } ${dragOverIdx === i ? 'ring-2 ring-sage-500 -translate-y-0.5 shadow-md' : ''}`}
          >
            <div className="flex items-center gap-1">
              {!locked && <GripVertical size={14} className="text-stone-400 cursor-move flex-shrink-0" />}
              <span className="text-xs font-bold text-sage-700 w-6 flex-shrink-0">#{i + 1}</span>
              <input
                value={d.name}
                onChange={e => updateDdx(d.id, 'name', e.target.value)}
                placeholder="Diagnosis"
                readOnly={locked}
                className="flex-1 text-sm px-1 py-0.5 bg-transparent border-b border-stone-400 focus:outline-none focus:border-sage-500 font-medium min-w-0"
              />
              {!locked && (
                <button onClick={() => removeDdx(d.id)} className="text-stone-400 hover:text-red-600 flex-shrink-0">
                  <X size={13} />
                </button>
              )}
            </div>
            {(d.notes || !locked) && (
              <textarea
                value={d.notes || ''}
                onChange={e => updateDdx(d.id, 'notes', e.target.value)}
                placeholder="For / against..."
                readOnly={locked}
                className="w-full text-xs mt-1.5 p-1.5 border border-stone-300 rounded resize-none bg-white/70 focus:outline-none focus:ring-1 focus:ring-sage-400"
                rows={2}
              />
            )}
          </div>
        );
      })}
      {!locked && (
        <div className="border-2 border-dashed border-sage-300 rounded-md p-3 bg-white hover:border-sage-400 hover:bg-sage-50/30 transition">
          <div className="flex items-center gap-1">
            <Plus size={14} className="text-sage-500 flex-shrink-0" />
            <input
              ref={draftRef}
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDdx(draftName); } }}
              placeholder="Add diagnosis, press Enter..."
              className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none placeholder-stone-400 min-w-0"
            />
          </div>
        </div>
      )}
      {displayList.length === 0 && (
        <p className="text-xs text-stone-500 italic mt-2 text-center">
          Ranked top → bottom. Drag ⋮ to reorder.
        </p>
      )}
    </div>
  );
}

function CategoryView({ ddx, setDdx, committedDdx, categories }) {
  const [dragId, setDragId] = useState(null);
  const [dragOverCat, setDragOverCat] = useState(null);
  const locked = !!committedDdx;
  const displayList = locked ? committedDdx : ddx;

  const grouped = {};
  for (const cat of categories) grouped[cat.id] = [];
  const unassigned = [];
  for (const item of displayList) {
    if (item.category && grouped[item.category]) grouped[item.category].push(item);
    else unassigned.push(item);
  }

  const updateDdx = (id, field, val) => {
    if (locked) return;
    setDdx(ddx.map(d => d.id === id ? { ...d, [field]: val } : d));
  };
  const removeDdx = (id) => { if (!locked) setDdx(ddx.filter(d => d.id !== id)); };

  const handleDragStart = (id) => { if (!locked) setDragId(id); };
  const handleDragOver = (e, catId) => {
    if (locked || dragId === null) return;
    e.preventDefault();
    setDragOverCat(catId);
  };
  const handleDrop = (e, catId) => {
    if (locked || dragId === null) return;
    e.preventDefault();
    const newCat = catId === '__unassigned__' ? null : catId;
    setDdx(ddx.map(d => d.id === dragId ? { ...d, category: newCat } : d));
    setDragId(null);
    setDragOverCat(null);
  };

  return (
    <div className="px-3 py-3 space-y-3">
      {categories.map(cat => {
        const items = grouped[cat.id] || [];
        const isDragOver = dragOverCat === cat.id;
        return (
          <CategoryGroup
            key={cat.id}
            category={cat}
            items={items}
            locked={locked}
            isDragOver={isDragOver}
            onDragOver={(e) => handleDragOver(e, cat.id)}
            onDragLeave={() => setDragOverCat(null)}
            onDrop={(e) => handleDrop(e, cat.id)}
            onDragStart={handleDragStart}
            onDragEnd={() => { setDragId(null); setDragOverCat(null); }}
            onAddItem={(name) => {
              if (!name.trim()) return;
              setDdx([...ddx, {
                id: Date.now() + Math.random(),
                name: name.trim(), notes: '', category: cat.id,
              }]);
            }}
            onUpdateItem={updateDdx}
            onRemoveItem={removeDdx}
          />
        );
      })}

      {unassigned.length > 0 && (
        <CategoryGroup
          category={{ id: '__unassigned__', label: 'Unassigned', short: 'Unassigned' }}
          items={unassigned}
          locked={locked}
          isDragOver={dragOverCat === '__unassigned__'}
          onDragOver={(e) => handleDragOver(e, '__unassigned__')}
          onDragLeave={() => setDragOverCat(null)}
          onDrop={(e) => handleDrop(e, '__unassigned__')}
          onDragStart={handleDragStart}
          onDragEnd={() => { setDragId(null); setDragOverCat(null); }}
          onAddItem={null}
          onUpdateItem={updateDdx}
          onRemoveItem={removeDdx}
          isUnassigned
        />
      )}

      {displayList.length === 0 && (
        <p className="text-xs text-stone-500 italic mt-4 text-center">
          Type a diagnosis into any category to start.
        </p>
      )}
    </div>
  );
}

function CategoryGroup({
  category, items, locked, isDragOver,
  onDragOver, onDragLeave, onDrop, onDragStart, onDragEnd,
  onAddItem, onUpdateItem, onRemoveItem,
  isUnassigned,
}) {
  const [draft, setDraft] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const draftRef = useRef(null);

  return (
    <div
      className={`border-2 rounded-md transition ${
        isDragOver ? 'border-sage-500 bg-sage-50' : isUnassigned ? 'border-amber-300 bg-amber-50/50' : 'border-stone-200 bg-white'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div
        className="px-2 py-1.5 flex items-center justify-between cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-1.5">
          {category.letter && (
            <span className="w-5 h-5 bg-sage-600 text-white rounded flex items-center justify-center font-bold text-xs">
              {category.letter}
            </span>
          )}
          <span className={`text-xs font-bold uppercase tracking-wide ${isUnassigned ? 'text-amber-800' : 'text-stone-700'}`}>
            {category.label}
          </span>
          <span className="text-xs text-stone-500">({items.length})</span>
        </div>
        <span className="text-xs text-stone-400">{collapsed ? '▶' : '▼'}</span>
      </div>

      {!collapsed && (
        <div className="px-2 pb-2 space-y-1">
          {items.map(item => (
            <div
              key={item.id}
              draggable={!locked}
              onDragStart={() => onDragStart(item.id)}
              onDragEnd={onDragEnd}
              className="flex items-center gap-1 bg-white border border-stone-200 rounded p-1.5 hover:border-sage-300 transition group"
            >
              {!locked && <GripVertical size={12} className="text-stone-400 cursor-move flex-shrink-0" />}
              <input
                value={item.name}
                onChange={e => onUpdateItem(item.id, 'name', e.target.value)}
                readOnly={locked}
                className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none min-w-0"
              />
              {!locked && (
                <button onClick={() => onRemoveItem(item.id)} className="text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
          {items.length === 0 && !isUnassigned && (
            <p className="text-xs text-stone-400 italic px-1 py-1">
              {locked ? '(none)' : 'Drop here or add below'}
            </p>
          )}
          {!locked && onAddItem && (
            <div className="border border-dashed border-sage-300 rounded p-1.5 bg-white hover:border-sage-400 hover:bg-sage-50/30 transition">
              <div className="flex items-center gap-1">
                <Plus size={11} className="text-sage-500 flex-shrink-0" />
                <input
                  ref={draftRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onAddItem(draft);
                      setDraft('');
                      setTimeout(() => draftRef.current?.focus(), 0);
                    }
                  }}
                  placeholder="Add..."
                  className="flex-1 text-xs px-1 py-0.5 bg-transparent focus:outline-none placeholder-stone-400 min-w-0"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanSection({ plan, setPlan }) {
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
        <span className="text-xs text-amber-700">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
      </div>

      <div className="px-3 py-3 space-y-1.5">
        {items.map((it, i) => (
          <div
            key={it.id}
            className="bg-white border border-stone-200 rounded-md p-2 flex items-center gap-2 hover:border-amber-300 transition"
          >
            <span className="text-xs font-bold text-amber-600 w-5 flex-shrink-0 text-center">{i + 1}.</span>
            <input
              value={it.text}
              onChange={e => updateItem(it.id, e.target.value)}
              className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none min-w-0"
            />
            <button
              onClick={() => removeItem(it.id)}
              className="text-stone-400 hover:text-red-600 flex-shrink-0"
              title="Remove"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        <div className="border-2 border-dashed border-amber-300 rounded-md p-3 bg-white hover:border-amber-400 hover:bg-amber-50/30 transition">
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
              className="flex-1 text-sm px-1 py-0.5 bg-transparent focus:outline-none placeholder-stone-400 min-w-0"
            />
          </div>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-stone-500 italic mt-2 text-center">
            Add plan items one at a time.
          </p>
        )}
      </div>
    </div>
  );
}