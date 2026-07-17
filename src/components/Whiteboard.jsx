import { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react';

// The right-side panel. DDx is the star and always expanded.
// Positives, negatives, plan, history collapse by default.
export default function Whiteboard({
  ddx, setDdx,
  highlights, removeHighlight,
  plan, setPlan,
  ddxSnapshots, gates, showSnapshots,
}) {
  const [expanded, setExpanded] = useState({
    positives: false, negatives: false, plan: false, snapshots: false,
  });

  const addDdx = () => setDdx([...ddx, { id: Date.now(), name: '', notes: '' }]);
  const updateDdx = (id, field, val) => setDdx(ddx.map(d => d.id === id ? { ...d, [field]: val } : d));
  const removeDdx = (id) => setDdx(ddx.filter(d => d.id !== id));
  const moveDdx = (id, dir) => {
    const i = ddx.findIndex(d => d.id === id);
    const j = i + dir;
    if (j < 0 || j >= ddx.length) return;
    const copy = [...ddx];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setDdx(copy);
  };

  const posEntries = Object.entries(highlights).filter(([, v]) => v === 'positive');
  const negEntries = Object.entries(highlights).filter(([, v]) => v === 'negative');

  const Section = ({ id, title, count, children }) => (
    <div className="border-b border-slate-200">
      <button
        onClick={() => setExpanded({ ...expanded, [id]: !expanded[id] })}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        {expanded[id] ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {expanded[id] && <div className="px-3 pb-3">{children}</div>}
    </div>
  );

  return (
    <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto flex flex-col flex-shrink-0">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-slate-800">Whiteboard</h3>
        <p className="text-xs text-slate-500">Your live reasoning</p>
      </div>

      {/* DDx — always expanded, star of the show */}
      <div className="border-b border-slate-200 bg-blue-50/30">
        <div className="px-3 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Differential Diagnosis</span>
          <button onClick={addDdx} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1">
            <Plus size={12} />Add
          </button>
        </div>
        <div className="px-3 pb-3">
          {ddx.length === 0 && (
            <p className="text-xs text-slate-400 italic mb-2">Add diagnoses as you think of them. Ranked top → bottom = most → least likely.</p>
          )}
          <div className="space-y-1.5">
            {ddx.map((d, i) => (
              <div key={d.id} className="bg-white border border-slate-200 rounded p-2 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-bold text-blue-600 w-5">#{i + 1}</span>
                  <input value={d.name} onChange={e => updateDdx(d.id, 'name', e.target.value)} placeholder="Diagnosis" className="flex-1 text-sm px-1 py-0.5 border-b border-slate-300 focus:outline-none focus:border-blue-400 bg-transparent font-medium" />
                  <button onClick={() => moveDdx(d.id, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button onClick={() => moveDdx(d.id, 1)} disabled={i === ddx.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={12} /></button>
                  <button onClick={() => removeDdx(d.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                </div>
                <textarea value={d.notes} onChange={e => updateDdx(d.id, 'notes', e.target.value)} placeholder="For / against..." className="w-full text-xs p-1 border border-slate-200 rounded resize-none bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-300" rows={1} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <Section id="positives" title="Pertinent Positives" count={posEntries.length}>
        {posEntries.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Highlight text in yellow to add.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {posEntries.map(([text]) => (
              <span key={text} className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-yellow-100 text-yellow-900 border border-yellow-200">
                {text}
                <button onClick={() => removeHighlight(text)}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section id="negatives" title="Pertinent Negatives" count={negEntries.length}>
        {negEntries.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Highlight text in blue to add.</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {negEntries.map(([text]) => (
              <span key={text} className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-200">
                {text}
                <button onClick={() => removeHighlight(text)}><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section id="plan" title="Plan">
        <textarea value={plan} onChange={e => setPlan(e.target.value)} placeholder="Your management plan..." rows={4} className="w-full text-sm p-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none" />
      </Section>

      {showSnapshots && (
        <Section id="snapshots" title="DDx History" count={Object.keys(ddxSnapshots).length}>
          {Object.keys(ddxSnapshots).length === 0 ? (
            <p className="text-xs text-slate-400 italic">Snapshots appear as you reveal gates.</p>
          ) : (
            Object.entries(ddxSnapshots).map(([idx, snap]) => (
              <div key={idx} className="mb-3 pb-2 border-b border-slate-100 last:border-0">
                <p className="text-xs font-semibold text-slate-600 mb-1">at {gates[idx]?.label}:</p>
                {snap.length === 0 ? (
                  <p className="text-xs text-slate-400 italic ml-3">empty</p>
                ) : (
                  <ol className="ml-4 list-decimal text-xs text-slate-600 space-y-0.5">
                    {snap.map((d, i) => <li key={i}>{d.name || '(unnamed)'}</li>)}
                  </ol>
                )}
              </div>
            ))
          )}
        </Section>
      )}
    </div>
  );
}
