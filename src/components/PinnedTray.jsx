import { useState } from 'react';
import { Maximize2, PinOff, Image as ImageIcon, Copy, Check } from 'lucide-react';

export default function PinnedTray({ elements, onUnpin, onOpenLightbox, onOpenCompare }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 4) next.add(id);
    else return; // cap at 4
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const startCompare = () => {
    const chosen = elements.filter(el => selected.has(el.id));
    if (chosen.length < 2) return;
    onOpenCompare(chosen);
    clearSelection();
  };

  if (elements.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-[240px]">
          <ImageIcon size={36} className="mx-auto text-stone-300 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-stone-700 mb-1.5">No pinned elements yet</p>
          <p className="text-xs text-stone-500 leading-relaxed">Hover any figure or table in the PDF, then click <span className="font-medium text-stone-700">+ Pin</span> to keep it in view here.</p>
        </div>
      </div>
    );
  }

  const selectionMode = selected.size > 0;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {selectionMode && (
        <div className="px-3 py-2 bg-sage-50 border-b border-sage-200 flex items-center justify-between text-xs">
          <span className="text-sage-800 font-medium">
            {selected.size} of {elements.length} selected {elements.length >= 4 && '(max 4)'}
          </span>
          <button
            onClick={clearSelection}
            className="text-sage-700 hover:text-sage-900 underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {elements.map(el => {
          const isChecked = selected.has(el.id);
          return (
            <div
              key={el.id}
              className={`border rounded-md overflow-hidden bg-white transition group ${
                isChecked ? 'border-sage-500 ring-2 ring-sage-300' : 'border-stone-200 hover:border-sage-300 hover:shadow-sm'
              }`}
            >
              <div className="px-2 py-1.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(el.id)}
                    className={`w-3.5 h-3.5 accent-sage-600 ${selectionMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-stone-700 truncate">{el.label}</p>
                    <p className="text-xs text-stone-500">p.{el.pageNum}</p>
                  </div>
                </label>
                <div className="flex items-center gap-1">
                  <button onClick={() => onOpenLightbox(el)} className="p-1 text-stone-500 hover:text-sage-600" title="Open"><Maximize2 size={12} /></button>
                  <button onClick={() => onUnpin(el.id)} className="p-1 text-stone-500 hover:text-red-600" title="Unpin"><PinOff size={12} /></button>
                </div>
              </div>
              <div className="h-40 cursor-zoom-in bg-stone-100 flex items-center justify-center" onClick={() => onOpenLightbox(el)}>
                {el.thumbUrl ? (
                  <img src={el.thumbUrl} alt={el.label} className="max-w-full max-h-full object-contain" />
                ) : (
                  <ImageIcon size={32} className="text-stone-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Compare button */}
      {selected.size >= 2 && (
        <div className="p-3 border-t border-stone-200 bg-white shadow-lg">
          <button
            onClick={startCompare}
            className="w-full py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-md font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <Copy size={14} /> Compare {selected.size} images
          </button>
        </div>
      )}
      {selected.size === 1 && (
        <div className="px-3 py-2 border-t border-stone-200 bg-stone-50 text-xs text-stone-600 text-center">
          Select at least one more to compare.
        </div>
      )}
    </div>
  );
}