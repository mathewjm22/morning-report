import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Eye, EyeOff, ClipboardList, Stethoscope, FlaskConical,
  Image as ImageIcon, Target, CheckCircle2, BookOpen, GraduationCap, Highlighter,
  Home as HomeIcon, Share2, Copy, Check, Maximize2,
} from 'lucide-react';
import { getCase, loadProgress, saveProgress } from '../lib/storage.js';
import { loadSharedCase, saveCaseShare } from '../lib/api.js';
import { getSessionFigures } from '../lib/sessionImages.js';
import Whiteboard from './Whiteboard.jsx';
import AnnotationCanvas from './AnnotationCanvas.jsx';
import FigureLightbox from './FigureLightbox.jsx';

const ICON_MAP = { Stethoscope, ClipboardList, FlaskConical, Target, BookOpen, CheckCircle2, Image: ImageIcon };

export default function CaseWalkthrough({ shared }) {
  const { caseId, shareId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [gateIndex, setGateIndex] = useState(0);
  const [revealed, setRevealed] = useState({ 0: true });
  const [ddxSnapshots, setDdxSnapshots] = useState({});
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [attendingMode, setAttendingMode] = useState(false);

  const [ddx, setDdx] = useState([]);
  const [plan, setPlan] = useState('');
  const [imageReads, setImageReads] = useState({});
  const [annotations, setAnnotations] = useState({});
  const [lightbox, setLightbox] = useState(null); // { key, url, label, caption } | null

  // GLOBAL highlights across all gates: { text: 'positive'|'negative' }
  const [highlights, setHighlights] = useState({});
  const [selectionMenu, setSelectionMenu] = useState(null);

  const [shareState, setShareState] = useState({ loading: false, url: null, copied: false, error: null });

  const contentRef = useRef(null);

  // ---- Load case ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (shared) {
          const data = await loadSharedCase(shareId);
          if (!cancelled) setCaseData(data);
        } else {
          const entry = await getCase(decodeURIComponent(caseId));
          if (!entry) {
            if (!cancelled) setLoadError('Case not found in library');
            return;
          }
          if (!cancelled) setCaseData(entry.caseData);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [caseId, shareId, shared]);

  // ---- Load progress from localStorage ----
  useEffect(() => {
    if (!caseData || shared) return;
    const p = loadProgress(caseData.id);
    if (p) {
      setDdx(p.ddx || []);
      setPlan(p.plan || '');
      setHighlights(p.highlights || {});
      setImageReads(p.imageReads || {});
      setAnnotations(p.annotations || {});
      setRevealed(p.revealed || { 0: true });
      setDdxSnapshots(p.ddxSnapshots || {});
      setGateIndex(p.gateIndex || 0);
    }
  }, [caseData, shared]);

  // ---- Save progress on any change ----
  useEffect(() => {
    if (!caseData || shared) return;
    saveProgress(caseData.id, {
      ddx, plan, highlights, imageReads, annotations, revealed, ddxSnapshots, gateIndex,
    });
  }, [caseData, shared, ddx, plan, highlights, imageReads, annotations, revealed, ddxSnapshots, gateIndex]);

  // ---- Selection popup for highlighting ----
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      const text = sel.toString().trim();
      if (!text || text.length < 2) { setSelectionMenu(null); return; }
      if (!contentRef.current || !contentRef.current.contains(sel.anchorNode)) { setSelectionMenu(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionMenu({ text, x: rect.left + rect.width / 2, y: rect.top - 8 });
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6 max-w-md text-center">
          <p className="text-slate-700 mb-4">{loadError}</p>
          <Link to="/" className="text-blue-600 hover:underline text-sm">← Back to library</Link>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading case...</div>
      </div>
    );
  }

  const gates = caseData.gates || [];

  // Merge in session-only figures for any imaging gate that has none saved.
  // (Images live in memory this session; the persisted case has empty figures.)
  const sessionFigures = !shared ? getSessionFigures(caseData.id) : null;
  const gatesWithFigures = gates.map(g => {
    if (g.isImageGate && (!g.figures || g.figures.length === 0) && sessionFigures) {
      return { ...g, figures: sessionFigures };
    }
    return g;
  });

  const gate = gatesWithFigures[gateIndex];
  const isRevealed = revealed[gateIndex];

  const goNext = () => {
    if (gateIndex < gatesWithFigures.length - 1) {
      const newIdx = gateIndex + 1;
      setGateIndex(newIdx);
      if (!revealed[newIdx]) {
        setRevealed(prev => ({ ...prev, [newIdx]: true }));
        setDdxSnapshots(prev => ({ ...prev, [newIdx]: JSON.parse(JSON.stringify(ddx)) }));
      }
    }
  };
  const goPrev = () => gateIndex > 0 && setGateIndex(gateIndex - 1);

  const revealImage = () => {
    if (!revealed[gateIndex]) {
      setRevealed(prev => ({ ...prev, [gateIndex]: true }));
      setDdxSnapshots(prev => ({ ...prev, [gateIndex]: JSON.parse(JSON.stringify(ddx)) }));
    }
  };

  const addHighlight = (type) => {
    if (!selectionMenu) return;
    setHighlights(prev => ({ ...prev, [selectionMenu.text]: type }));
    setSelectionMenu(null);
    window.getSelection().removeAllRanges();
  };

  const removeHighlight = (text) => {
    setHighlights(prev => {
      const copy = { ...prev };
      delete copy[text];
      return copy;
    });
  };

  // Global highlighting: apply all highlights to any string, longest matches first
  const renderTextWithHighlights = (text) => {
    const keys = Object.keys(highlights).sort((a, b) => b.length - a.length);
    if (keys.length === 0) return [{ text, hl: null }];
    let segments = [{ text, hl: null }];
    keys.forEach(key => {
      const next = [];
      segments.forEach(seg => {
        if (seg.hl) { next.push(seg); return; }
        const lowerSeg = seg.text.toLowerCase();
        const lowerKey = key.toLowerCase();
        let lastIdx = 0;
        let idx = lowerSeg.indexOf(lowerKey);
        while (idx !== -1) {
          if (idx > lastIdx) next.push({ text: seg.text.slice(lastIdx, idx), hl: null });
          next.push({ text: seg.text.slice(idx, idx + key.length), hl: highlights[key] });
          lastIdx = idx + key.length;
          idx = lowerSeg.indexOf(lowerKey, lastIdx);
        }
        if (lastIdx < seg.text.length) next.push({ text: seg.text.slice(lastIdx), hl: null });
      });
      segments = next;
    });
    return segments;
  };

  const renderSegments = (segments, keyPrefix) =>
    segments.map((seg, j) => seg.hl
      ? <mark key={`${keyPrefix}-${j}`} className={seg.hl === 'positive' ? 'bg-yellow-200 px-0.5 rounded' : 'bg-blue-200 px-0.5 rounded'}>{seg.text}</mark>
      : <span key={`${keyPrefix}-${j}`}>{seg.text}</span>);

  const renderContent = (text) => {
    const lines = (text || '').split('\n');
    return lines.map((line, i) => {
      if (line.trim() === '') return <div key={i} className="h-2" />;
      let content = line;
      let isListItem = false, isNumbered = false;
      if (line.startsWith('- ')) { content = line.slice(2); isListItem = true; }
      else if (line.match(/^\d+\. /)) { content = line.replace(/^\d+\. /, ''); isNumbered = true; }

      const segs = renderTextWithHighlights(content);
      const rendered = renderSegments(segs, i);

      if (isListItem) return <li key={i} className="ml-6 list-disc text-slate-700 text-sm">{rendered}</li>;
      if (isNumbered) return <li key={i} className="ml-6 list-decimal text-slate-700 text-sm mb-2">{rendered}</li>;
      return <p key={i} className="text-slate-700 text-sm leading-relaxed">{rendered}</p>;
    });
  };

  const IconEl = ({ name, size = 16 }) => {
    const C = ICON_MAP[name] || Stethoscope;
    return <C size={size} />;
  };

  // ---- Share ----
  const generateShare = async () => {
    setShareState({ loading: true, url: null, copied: false, error: null });
    try {
      const id = await saveCaseShare(caseData);
      const url = `${window.location.origin}${window.location.pathname}#/shared/${id}`;
      setShareState({ loading: false, url, copied: false, error: null });
    } catch (e) {
      setShareState({ loading: false, url: null, copied: false, error: e.message });
    }
  };

  const copyShare = async () => {
    if (!shareState.url) return;
    await navigator.clipboard.writeText(shareState.url);
    setShareState(s => ({ ...s, copied: true }));
    setTimeout(() => setShareState(s => ({ ...s, copied: false })), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-slate-500 hover:text-slate-800 flex-shrink-0" title="Back to library">
            <HomeIcon size={18} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">{caseData.title}</h1>
            <p className="text-xs text-slate-500 truncate">{caseData.source}{shared && ' • Shared (read-only progress)'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={generateShare}
            disabled={shareState.loading}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 text-slate-700 disabled:opacity-50"
            title="Generate a shareable link"
          >
            <Share2 size={14} /> Share
          </button>
          <button
            onClick={() => setAttendingMode(!attendingMode)}
            className={`text-xs px-3 py-1.5 rounded flex items-center gap-1 transition ${
              attendingMode ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={14} /> Attending
          </button>
          <button
            onClick={() => setShowSnapshots(!showSnapshots)}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 text-slate-700"
          >
            {showSnapshots ? <EyeOff size={14} /> : <Eye size={14} />} History
          </button>
        </div>
      </div>

      {/* Share URL banner */}
      {(shareState.url || shareState.error) && (
        <div className={`px-4 py-2 border-b flex items-center gap-2 text-sm ${shareState.error ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
          {shareState.error ? (
            <span>Share failed: {shareState.error}</span>
          ) : (
            <>
              <span className="font-medium">Share link:</span>
              <input readOnly value={shareState.url} className="flex-1 px-2 py-1 border border-green-300 rounded text-xs bg-white text-slate-700" onFocus={e => e.target.select()} />
              <button onClick={copyShare} className="text-xs px-2 py-1 bg-white border border-green-300 rounded hover:bg-green-100 flex items-center gap-1">
                {shareState.copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
            </>
          )}
          <button onClick={() => setShareState({ loading: false, url: null, copied: false, error: null })} className="ml-2 text-slate-400 hover:text-slate-700">×</button>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {gatesWithFigures.map((g, i) => (
          <button
            key={g.id}
            onClick={() => setGateIndex(i)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition ${
              i === gateIndex ? 'bg-blue-600 text-white' :
              revealed[i] ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' :
              'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <IconEl name={g.icon} size={12} />
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      {/* Selection popup */}
      {selectionMenu && (
        <div
          className="fixed z-50 bg-slate-900 rounded shadow-lg flex overflow-hidden text-xs"
          style={{ left: selectionMenu.x, top: selectionMenu.y, transform: 'translate(-50%, -100%)' }}
        >
          <button onClick={() => addHighlight('positive')} className="px-3 py-2 hover:bg-yellow-600 text-white flex items-center gap-1">
            <Highlighter size={12} /> Pertinent +
          </button>
          <button onClick={() => addHighlight('negative')} className="px-3 py-2 hover:bg-blue-600 text-white flex items-center gap-1 border-l border-slate-700">
            <Highlighter size={12} /> Pertinent −
          </button>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-blue-100 text-blue-700 p-2 rounded"><IconEl name={gate.icon} size={18} /></div>
              <h2 className="text-xl font-semibold text-slate-900">{gate.title}</h2>
            </div>

            <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
              <Highlighter size={12} /> Select text to highlight globally as pertinent + (yellow) or − (blue).
            </p>

            <div ref={contentRef} className="bg-white rounded-lg border border-slate-200 p-5" style={{ userSelect: 'text' }}>
              {gate.isImageGate ? (
                <div>
                  {(gate.figures || []).map((fig, figIdx) => (
  <div key={figIdx} className="mb-5">
    <p className="text-xs font-semibold text-slate-700 mb-2">{fig.caption}</p>
    <div className={`grid gap-3 ${(fig.images || []).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {(fig.images || []).map((img, imgIdx) => {
        const key = `${gate.id}-fig${figIdx}-img${imgIdx}`;
        return (
          <div key={imgIdx} className="relative group">
            {img.label && <p className="text-xs text-slate-600 mb-1 font-medium">{img.label}</p>}
            <AnnotationCanvas
              imageKey={key}
              imageUrl={img.url}
              annotations={annotations}
              setAnnotations={setAnnotations}
            />
            <button
              onClick={() => setLightbox({ key, url: img.url, label: img.label || `Figure ${figIdx + 1}`, caption: fig.caption })}
              className="absolute top-8 right-1 bg-white/90 hover:bg-white border border-slate-300 rounded p-1.5 shadow opacity-0 group-hover:opacity-100 transition"
              title="Open full size"
            >
              <Maximize2 size={14} className="text-slate-700" />
            </button>
          </div>
        );
      })}
    </div>
  </div>
))}
                  <div className="mb-3 mt-4">
                    <label className="text-sm font-semibold text-slate-700 block mb-2">Your interpretation:</label>
                    <textarea
                      value={imageReads[gate.id] || ''}
                      onChange={e => setImageReads({ ...imageReads, [gate.id]: e.target.value })}
                      placeholder="Describe what you see. Be systematic — findings, then impression..."
                      className="w-full h-24 text-sm p-3 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  {isRevealed ? (
                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      {renderContent(gate.officialRead || gate.content)}
                    </div>
                  ) : (
                    <button onClick={revealImage} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded flex items-center gap-2">
                      <Eye size={14} /> Reveal Official Read
                    </button>
                  )}
                </div>
              ) : (
                renderContent(gate.content)
              )}
            </div>

            {gate.prompt && isRevealed && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-900"><strong>Discussion prompt:</strong> {gate.prompt}</p>
              </div>
            )}

            {attendingMode && gate.teachingNotes && gate.teachingNotes.length > 0 && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap size={16} className="text-indigo-700" />
                  <p className="text-sm font-semibold text-indigo-900">Teaching notes</p>
                </div>
                <ul className="space-y-1.5">
                  {gate.teachingNotes.map((note, i) => (
                    <li key={i} className="text-sm text-indigo-900 flex gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button onClick={goPrev} disabled={gateIndex === 0} className="flex items-center gap-1 px-4 py-2 text-sm bg-white border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50">
                <ChevronLeft size={16} /> Previous
              </button>
              <button onClick={goNext} disabled={gateIndex === gatesWithFigures.length - 1} className="flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-40 hover:bg-blue-700">
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <Whiteboard
          ddx={ddx} setDdx={setDdx}
          highlights={highlights} removeHighlight={removeHighlight}
          plan={plan} setPlan={setPlan}
          ddxSnapshots={ddxSnapshots}
          gates={gatesWithFigures}
          showSnapshots={showSnapshots}
        />
      </div>
      {lightbox && (
        <FigureLightbox
          open={!!lightbox}
          onClose={() => setLightbox(null)}
          imageKey={lightbox.key}
          imageUrl={lightbox.url}
          label={lightbox.label}
          caption={lightbox.caption}
          annotations={annotations}
          setAnnotations={setAnnotations}
        />
      )}
    </div>
  );
}
