import { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Copy, Check } from 'lucide-react';
import { SEARCH_SITES, searchWith } from '../lib/searchSites.js';

// Small floating popup that appears near a completed highlight,
// offering to open the highlighted text in one of several reference sites.
export default function SearchPopup({ text, x, y, onClose }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  // Auto-dismiss after 8 seconds unless the user interacts
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    // Delay the outside-click handler so the click that spawned us doesn't close it
    const clickTimer = setTimeout(() => window.addEventListener('mousedown', onClick), 100);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      clearTimeout(clickTimer);
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSearch = async (site) => {
    await searchWith(site, text);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // Clamp position to viewport
  const px = Math.min(Math.max(x, 180), window.innerWidth - 180);
  const py = Math.min(Math.max(y, 20), window.innerHeight - 300);

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden"
      style={{ left: px, top: py, transform: 'translate(-50%, 8px)', width: 280 }}
    >
      <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">Look up</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
        <p className="text-xs text-slate-700 italic line-clamp-2">"{text}"</p>
        <button
          onClick={handleCopy}
          className="mt-1.5 text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy text</>}
        </button>
      </div>
      <div className="p-1.5">
        {SEARCH_SITES.map(site => (
          <button
            key={site.id}
            onClick={() => handleSearch(site)}
            className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2 group"
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: site.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">{site.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{site.description}</div>
            </div>
            <ExternalLink size={11} className="text-slate-400 group-hover:text-slate-700 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
