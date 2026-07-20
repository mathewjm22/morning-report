import { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, Clock, X, Copy, Check } from 'lucide-react';
import { SEARCH_SITES, searchWith } from '../lib/searchSites.js';

const RECENT_KEY = 'research-recent-queries';
const MAX_RECENT = 12;

export default function ResearchTray({ initialQuery, onQueryConsumed }) {
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  // Load recent queries from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  // When a query is sent from elsewhere (e.g., Highlights tab), populate the input
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      if (onQueryConsumed) onQueryConsumed();
      // Focus and select all so user can immediately overwrite if desired
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [initialQuery, onQueryConsumed]);

  const addRecent = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recent.filter(r => r !== trimmed)].slice(0, MAX_RECENT);
    setRecent(updated);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
  };

  const removeRecent = (text) => {
    const updated = recent.filter(r => r !== text);
    setRecent(updated);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
  };

  const clearRecent = () => {
    if (!confirm('Clear all recent search terms?')) return;
    setRecent([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  };

  const handleSearch = async (site) => {
    const text = query.trim();
    if (!text) {
      inputRef.current?.focus();
      return;
    }
    addRecent(text);
    await searchWith(site, text);
  };

  const handleCopy = async () => {
    const text = query.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Search input */}
      <div className="p-3 border-b border-stone-200 bg-white">
        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
          Look up a term
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Enter a word, phrase, or diagnosis..."
            className="w-full pl-8 pr-8 py-2 text-sm border border-stone-300 rounded-md focus:outline-none focus:border-sage-500 focus:ring-1 focus:ring-sage-500"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
              title="Clear"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {query.trim() && (
          <button
            onClick={handleCopy}
            className="mt-2 text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1"
          >
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy text</>}
          </button>
        )}
      </div>

      {/* Search-site buttons */}
      <div className="p-3 border-b border-stone-200">
        <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide mb-2">
          Search in
        </p>
        <div className="space-y-1">
          {SEARCH_SITES.map(site => (
            <button
              key={site.id}
              onClick={() => handleSearch(site)}
              disabled={!query.trim()}
              className="w-full text-left px-3 py-2 rounded-md border border-stone-200 hover:border-sage-400 hover:bg-sage-50 transition flex items-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-stone-200 disabled:hover:bg-white"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: site.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-800 truncate">{site.name}</div>
                <div className="text-xs text-stone-500 truncate">{site.description}</div>
              </div>
              <ExternalLink size={12} className="text-stone-400 group-hover:text-stone-700 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent searches */}
      {recent.length > 0 && (
        <div className="p-3 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-stone-500" />
              <p className="text-xs font-semibold text-stone-700 uppercase tracking-wide">
                Recent
              </p>
            </div>
            <button
              onClick={clearRecent}
              className="text-xs text-stone-500 hover:text-red-600"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1">
            {recent.map((text, i) => (
              <div
                key={i}
                className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-stone-100 cursor-pointer"
                onClick={() => setQuery(text)}
              >
                <span className="flex-1 text-xs text-stone-700 truncate">{text}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeRecent(text); }}
                  className="text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                  title="Remove"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent.length === 0 && !query && (
        <div className="p-8 text-center flex-1 flex items-center justify-center">
          <div className="max-w-[240px]">
            <Search size={36} className="mx-auto text-stone-300 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-stone-700 mb-1.5">Research anything</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Type a term above, or send text from the Highlights tab, to look it up in medical references.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}