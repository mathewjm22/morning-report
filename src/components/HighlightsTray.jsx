import { useState } from 'react';
import { Highlighter, X, Search } from 'lucide-react';
import SearchPopup from './SearchPopup.jsx';

export default function HighlightsTray({ annotations, setAnnotations }) {
  const [popup, setPopup] = useState(null);

  // Flatten highlights from all pages into a single sorted list
  const highlights = [];
  Object.entries(annotations).forEach(([pageNum, strokes]) => {
    strokes.forEach((s, idx) => {
      if (s.type === 'highlight' && s.capturedText) {
        highlights.push({
          pageNum: parseInt(pageNum, 10),
          text: s.capturedText,
          color: s.color,
          strokeIdx: idx,
          key: `${pageNum}-${idx}`,
        });
      }
    });
  });
  highlights.sort((a, b) => a.pageNum - b.pageNum);

  const removeHighlight = (pageNum, strokeIdx) => {
    const pageStrokes = annotations[pageNum] || [];
    const newStrokes = pageStrokes.filter((_, i) => i !== strokeIdx);
    setAnnotations({ ...annotations, [pageNum]: newStrokes });
  };

  if (highlights.length === 0) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div className="max-w-[240px]">
        <Highlighter size={36} className="mx-auto text-stone-300 mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-stone-700 mb-1.5">No highlights yet</p>
        <p className="text-xs text-stone-500 leading-relaxed">Select the <span className="font-medium text-stone-700">Highlighter</span> tool and drag over any text in the PDF. Captured phrases appear here with their page number.</p>
      </div>
    </div>
  );
}

  return (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {highlights.map(h => (
          <div key={h.key} className="bg-white border border-stone-200 rounded-md p-3 hover:border-sage-300 hover:shadow-sm transition group">
            <div className="flex items-start gap-2">
              <div
                className="w-1 flex-shrink-0 rounded-full self-stretch mt-0.5"
                style={{ backgroundColor: h.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-stone-800 leading-snug">{h.text || '(no text captured)'}</p>
                <p className="text-xs text-stone-500 mt-1 font-mono">page {h.pageNum}</p>
              </div>
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPopup({ text: h.text, x: rect.left, y: rect.top });
                }}
                className="text-stone-400 hover:text-sage-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                title="Look up in reference"
              >
                <Search size={12} />
              </button>
              <button
                onClick={() => removeHighlight(h.pageNum, h.strokeIdx)}
                className="text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                title="Remove highlight"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {popup && (
        <SearchPopup
          text={popup.text}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  );
}
