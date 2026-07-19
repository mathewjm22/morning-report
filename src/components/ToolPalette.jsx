
import { TOOLS, COLORS } from '../lib/constants.js';

export default function ToolPalette({ tool, setTool, color, setColor, strokeWidth, setStrokeWidth }) {
  return (
    <div className="w-14 bg-white border-r border-slate-200 flex flex-col p-1.5 gap-0.5 overflow-y-auto">
      {TOOLS.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`p-2 rounded flex items-center justify-center transition group relative ${
              tool === t.id ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
            }`}
            title={`${t.label} — ${t.hint}`}
          >
            <Icon size={16} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-30 shadow-lg">
              {t.label}
              <span className="block text-[10px] text-slate-400">{t.hint}</span>
            </span>
          </button>
        );
      })}
      <div className="border-t border-slate-200 my-2" />
      <div className="grid grid-cols-2 gap-1 px-0.5">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-full aspect-square rounded-full border-2 transition ${
              color === c ? 'border-slate-900 scale-110' : 'border-slate-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="border-t border-slate-200 my-2" />
      <div className="px-1 text-[10px] text-slate-500 text-center mb-1">Width</div>
      {[1.5, 2.5, 4, 6].map(w => (
        <button
          key={w}
          onClick={() => setStrokeWidth(w)}
          className={`h-6 rounded flex items-center justify-center ${
            strokeWidth === w ? 'bg-blue-100' : 'hover:bg-slate-100'
          }`}
        >
          <div className="rounded-full bg-slate-800" style={{ width: w * 2, height: w * 2 }} />
        </button>
      ))}
    </div>
  );
}
