
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
    <div className="w-20 bg-white border-r border-slate-200 overflow-y-auto p-1.5 space-y-1.5">
      {visiblePages.map(pn => {
        const inGate = gatePages.includes(pn);
        const active = pn === currentPage;
        return (
          <button
            key={pn}
            onClick={() => onJumpToPage(pn)}
            className={`relative w-full aspect-[3/4] rounded border-2 transition overflow-hidden ${
              active
                ? 'border-sage-600 ring-2 ring-blue-300'
                : inGate
                ? 'border-blue-300 hover:border-sage-500'
                : 'border-slate-200 opacity-50 hover:opacity-80'
            }`}
          >
            {thumbs[pn] ? (
              <img src={thumbs[pn]} alt={`p${pn}`} className="w-full h-full object-cover" />
            ) : (
              <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400 text-xs">…</div>
            )}
            <div className="absolute top-0.5 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
              p.{pn}
            </div>
          </button>
        );
      })}
    </div>
  );
}
