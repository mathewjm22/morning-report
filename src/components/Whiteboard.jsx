
import { Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

export default function Whiteboard({ ddx, setDdx, plan, setPlan }) {
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="border-b border-slate-200 bg-blue-50/30">
        <div className="px-3 py-2.5 flex items-center justify-between sticky top-0 bg-blue-50/95 backdrop-blur border-b border-blue-100 z-10">
          <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">Differential Diagnosis</span>
          <button onClick={addDdx} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="px-3 py-3">
          {ddx.length === 0 && (
            <p className="text-xs text-slate-400 italic">Add diagnoses as you reason through the case. Ranked top → bottom.</p>
          )}
          <div className="space-y-2">
            {ddx.map((d, i) => (
              <div key={d.id} className="bg-white border border-slate-200 rounded p-2 shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-bold text-blue-600 w-6">#{i + 1}</span>
                  <input
                    value={d.name}
                    onChange={e => updateDdx(d.id, 'name', e.target.value)}
                    placeholder="Diagnosis"
                    className="flex-1 text-sm px-1 py-0.5 border-b border-slate-300 focus:outline-none focus:border-blue-400 bg-transparent font-medium"
                  />
                  <button onClick={() => moveDdx(d.id, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={12} /></button>
                  <button onClick={() => moveDdx(d.id, 1)} disabled={i === ddx.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={12} /></button>
                  <button onClick={() => removeDdx(d.id)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                </div>
                <textarea
                  value={d.notes}
                  onChange={e => updateDdx(d.id, 'notes', e.target.value)}
                  placeholder="For / against..."
                  className="w-full text-xs p-1.5 border border-slate-200 rounded resize-none bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-300"
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-700 uppercase mb-2 tracking-wide">Plan</p>
        <textarea
          value={plan}
          onChange={e => setPlan(e.target.value)}
          placeholder="Your management plan..."
          rows={5}
          className="w-full text-sm p-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
        />
      </div>
    </div>
  );
}

