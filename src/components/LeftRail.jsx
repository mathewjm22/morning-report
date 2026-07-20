
import { useEffect, useState } from 'react';
import { renderPage } from '../lib/pdfLoader.js';

export default function LeftRail({ caseEntry, visiblePages, currentPage, gatePages, onJumpToPage, pdf }) {
  const [thumbs, setThumbs] = useState({});

  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const newThumbs = {};
      for (const pn of visiblePages) {
        if (cancelled) return;
        const cnv = document.createElement('canvas');
        await renderPage(pdf, pn, cnv, 0.25);
        newThumbs[pn] = cnv.toDataURL('image/jpeg', 0.6);
        setThumbs(t => ({ ...t, [pn]: newThumbs[pn] }));
      }
    })();
    return () => { cancelled = true; };
  }, [pdf]); // eslint-disable-line

  return (
    <div className="w-20 bg-stone-50 border-r border-stone-200 overflow-y-auto p-2 space-y-2">
      {visiblePages.map(pn => {
        const inGate = gatePages.includes(pn);
        const active = pn === currentPage;
        return (
          <button
  key={pn}
  onClick={() => onJumpToPage(pn)}
  className={`relative w-full aspect-[3/4] rounded border transition overflow-hidden ${
    active
      ? 'border-sage-600 ring-2 ring-sage-300 shadow'
      : 'border-stone-200 hover:border-sage-400 hover:shadow-sm'
  }`}
>
            {thumbs[pn] ? (
              <img src={thumbs[pn]} alt={`p${pn}`} className="w-full h-full object-cover" />
            ) : (
              <div className="bg-stone-100 w-full h-full flex items-center justify-center text-stone-400 text-xs">…</div>
            )}
            <div className="absolute top-1 left-1 bg-stone-900/70 text-white text-xs px-1.5 py-0.5 rounded">
  {pn}
</div>
          </button>
        );
      })}
    </div>
  );
}
