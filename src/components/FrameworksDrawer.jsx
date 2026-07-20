import { useState, useEffect } from 'react';
import { X, Brain, Search } from 'lucide-react';
import { FRAMEWORKS, CATEGORIES } from '../lib/frameworks.js';

export default function FrameworksDrawer({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();

  const filtered = FRAMEWORKS.filter(f => {
    if (activeCategory !== 'all' && f.category !== activeCategory) return false;
    if (!q) return true;
    const hay = [
      f.title, f.subtitle,
      ...(f.body || []).flatMap(b => [b.label, b.notes, b.letter]),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-sage-50">
          <div className="flex items-center gap-2">
            <Brain size={18} className="text-sage-700" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Frameworks</h2>
              <p className="text-xs text-slate-500">Reference cards for building differentials</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-white">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b border-slate-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search frameworks..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-sage-500"
              autoFocus
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-3 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveCategory('all')}
            className={`text-xs px-2.5 py-1 rounded whitespace-nowrap transition ${
              activeCategory === 'all'
                ? 'bg-sage-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`text-xs px-2.5 py-1 rounded whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-sage-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={cat.description}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-8">No matches.</p>
          )}
          {filtered.map(f => (
            <div key={f.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                {f.subtitle && <p className="text-[11px] text-slate-600 mt-0.5">{f.subtitle}</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {(f.body || []).map((row, i) => (
                  <div key={i} className="px-3 py-2 flex gap-3">
                    {row.letter && (
                      <div className="w-6 h-6 bg-sage-100 text-sage-800 rounded flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {row.letter}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{row.label}</div>
                      {row.notes && <div className="text-[11px] text-slate-600 mt-0.5">{row.notes}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 bg-slate-50">
          Content adapted from clinical reasoning teaching materials. Press <kbd className="px-1 py-0.5 bg-white border border-slate-300 rounded">Esc</kbd> to close.
        </div>
      </div>
    </>
  );
}
