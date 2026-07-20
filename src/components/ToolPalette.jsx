
import { TOOLS, COLORS } from '../lib/constants.js';

export default function ToolPalette({ tool, setTool, color, setColor, strokeWidth, setStrokeWidth }) {
  return (
    <div className="w-14 bg-white border-r border-stone-200 flex flex-col p-1.5 gap-0.5 overflow-y-auto">
      {TOOLS.map(t => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`p-2 rounded flex items-center justify-center transition group relative ${
              tool === t.id ? 'bg-sage-600 text-white' : 'text-stone-700 hover:bg-stone-100'
            }`}
            title={`${t.label} — ${t.hint}`}
          >
            <Icon size={16} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-stone-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-30 shadow-lg">
              {t.label}
              <span className="block text-xs text-stone-400">{t.hint}</span>
            </span>
          </button>
        );
      })}
      <div className="border-t border-stone-200 my-2" />
      <div className="grid grid-cols-2 gap-1 px-0.5">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-full aspect-square rounded-full border-2 transition ${
              color === c ? 'border-stone-900 scale-110' : 'border-stone-300'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="border-t border-stone-200 my-2" />
      <div className="px-1 text-xs text-stone-500 text-center mb-1">Width</div>
      {[1.5, 2.5, 4, 6].map(w => (
        <button
          key={w}
          onClick={() => setStrokeWidth(w)}
          className={`h-6 rounded flex items-center justify-center ${
            strokeWidth === w ? 'bg-sage-100' : 'hover:bg-stone-100'
          }`}
        >
          <div className="rounded-full bg-stone-800" style={{ width: w * 2, height: w * 2 }} />
        </button>
      ))}
    </div>
  );
}
