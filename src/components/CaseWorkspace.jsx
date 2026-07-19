
// The main reading workspace: gate bar on top, PDF center, whiteboard right.

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Home, GraduationCap, Share2, Copy, Check } from 'lucide-react';
import { getCase, loadProgress, saveProgress } from '../lib/storage.js';
import { loadSharedCase, saveCaseShare } from '../lib/api.js';
import PdfViewer from './PdfViewer.jsx';
import Whiteboard from './Whiteboard.jsx';
import PinnedTray from './PinnedTray.jsx';
import Lightbox from './Lightbox.jsx';
import HighlightsTray from './HighlightsTray.jsx';
import DdxCompareModal from './DdxCompareModal.jsx';

export default function CaseWorkspace({ shared }) {
  const { caseId, shareId } = useParams();
  const navigate = useNavigate();
  const [caseEntry, setCaseEntry] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [ddx, setDdx] = useState([]);
  const [plan, setPlan] = useState([]);
  const [annotations, setAnnotations] = useState({}); // { pageNum: [strokes] }
  const [pinned, setPinned] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [attendingMode, setAttendingMode] = useState(false);
  const [rightTab, setRightTab] = useState('whiteboard');
  const [shareState, setShareState] = useState({ loading: false, url: null, copied: false, error: null });
  const highlightCount = Object.values(annotations).flat().filter(s => s.type === 'highlight').length;
  const [committedDdx, setCommittedDdx] = useState(null); // snapshot when user commits
  const [finalOutcome, setFinalOutcome] = useState(null); // { actualDiagnosis, learningPoints, matchInfo }
  const [showRevealModal, setShowRevealModal] = useState(false);

  
  // Load case
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const entry = shared ? await loadSharedCase(shareId) : await getCase(decodeURIComponent(caseId));
        if (!entry) { if (!cancelled) setLoadError('Case not found'); return; }
        if (!cancelled) setCaseEntry(entry);
      } catch (e) { if (!cancelled) setLoadError(e.message); }
    }
    load();
    return () => { cancelled = true; };
  }, [caseId, shareId, shared]);

  // Load progress
  useEffect(() => {
  if (!caseEntry || shared) return;
  loadProgress(caseEntry.id).then(p => {
    if (p) {
      setDdx(p.ddx || []);
      setPlan(p.plan || []);
      setAnnotations(p.annotations || {});
      setPinned(p.pinned || []);
      setCommittedDdx(p.committedDdx || null);
      setFinalOutcome(p.finalOutcome || null);
    }
  });
}, [caseEntry, shared]);

  // Save progress
  useEffect(() => {
  if (!caseEntry || shared) return;
  saveProgress(caseEntry.id, {
    ddx, plan, annotations, pinned, committedDdx, finalOutcome,
  });
}, [caseEntry, shared, ddx, plan, annotations, pinned, committedDdx, finalOutcome]);

  if (loadError) return <ErrorScreen message={loadError} />;
  if (!caseEntry) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>;

  const generateShare = async () => {
    setShareState({ loading: true, url: null, copied: false, error: null });
    try {
      const id = await saveCaseShare(caseEntry, caseEntry.pdfBlob);
      const url = `${window.location.origin}${window.location.pathname}#/shared/${id}`;
      setShareState({ loading: false, url, copied: false, error: null });
    } catch (e) {
      setShareState({ loading: false, url: null, copied: false, error: e.message });
    }
  };

  const copyShare = async () => {
    await navigator.clipboard.writeText(shareState.url);
    setShareState(s => ({ ...s, copied: true }));
    setTimeout(() => setShareState(s => ({ ...s, copied: false })), 2000);
  };

  const pinElement = (el) => setPinned(prev => [...prev, { ...el, pinnedAt: Date.now() }]);
  const unpin = (id) => setPinned(prev => prev.filter(e => e.id !== id));

  const handleCommitDdx = () => {
    const snapshot = ddx.map((d, i) => ({
      id: d.id,
      name: d.name,
      notes: d.notes,
      rank: i + 1,
    }));
    setCommittedDdx(snapshot);
  };

  const handleUncommitDdx = () => {
    if (!confirm('Un-commit your DDx? You can keep editing after this.')) return;
    setCommittedDdx(null);
  };

  const handleSaveOutcome = (outcome) => {
    setFinalOutcome(outcome);
    setShowRevealModal(false);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="text-slate-500 hover:text-slate-800"><Home size={18} /></Link>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{caseEntry.title}</h1>
            <p className="text-xs text-slate-500 truncate">{caseEntry.source}{shared && ' • Shared'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!shared && (
            <button
              onClick={generateShare}
              disabled={shareState.loading}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 disabled:opacity-50"
            >
              <Share2 size={14} /> Share
            </button>
          )}
          <button
            onClick={() => setAttendingMode(!attendingMode)}
            className={`text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition ${
              attendingMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={14} /> Attending
          </button>
        </div>
      </div>

      {shareState.url && (
        <div className="px-4 py-2 border-b bg-green-50 border-green-200 flex items-center gap-2 text-sm">
          <span className="font-medium text-green-800">Share link:</span>
          <input readOnly value={shareState.url} onFocus={e => e.target.select()}
            className="flex-1 px-2 py-1 border border-green-300 rounded text-xs bg-white" />
          <button onClick={copyShare} className="text-xs px-2 py-1 bg-white border border-green-300 rounded flex items-center gap-1">
            {shareState.copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          <button onClick={() => setShareState({ loading: false, url: null, copied: false, error: null })} className="text-slate-400 hover:text-slate-700">×</button>
        </div>
      )}
      
      {/* Main columns */}
      <div className="flex-1 flex overflow-hidden">
        <PdfViewer
  caseEntry={caseEntry}
  annotations={annotations}
  setAnnotations={setAnnotations}
  onPinElement={pinElement}
  onOpenLightbox={setLightbox}
  attendingMode={attendingMode}
/>

        <div className="w-[380px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0">
  <div className="flex border-b border-slate-200">
    <button
      onClick={() => setRightTab('whiteboard')}
      className={`flex-1 py-2.5 text-xs font-medium ${
        rightTab === 'whiteboard' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      Whiteboard
    </button>
    <button
      onClick={() => setRightTab('highlights')}
      className={`flex-1 py-2.5 text-xs font-medium relative ${
        rightTab === 'highlights' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      Highlights
      {highlightCount > 0 && <span className="ml-1 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{highlightCount}</span>}
    </button>
    <button
      onClick={() => setRightTab('pinned')}
      className={`flex-1 py-2.5 text-xs font-medium relative ${
        rightTab === 'pinned' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      Pinned
      {pinned.length > 0 && <span className="ml-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pinned.length}</span>}
    </button>
  </div>
  {rightTab === 'whiteboard' && (
  <Whiteboard
    ddx={ddx} setDdx={setDdx}
    plan={plan} setPlan={setPlan}
    committedDdx={committedDdx}
    onCommitDdx={handleCommitDdx}
    onUncommitDdx={handleUncommitDdx}
    onOpenReveal={() => setShowRevealModal(true)}
  />
)}
  {rightTab === 'highlights' && <HighlightsTray annotations={annotations} setAnnotations={setAnnotations} />}
  {rightTab === 'pinned' && <PinnedTray elements={pinned} onUnpin={unpin} onOpenLightbox={setLightbox} />}
</div>
      </div>

      {lightbox && (
        <Lightbox
          element={lightbox}
          caseEntry={caseEntry}
          onClose={() => setLightbox(null)}
        />
      )}
      {showRevealModal && committedDdx && (
  <DdxCompareModal
    committedDdx={committedDdx}
    existingOutcome={finalOutcome}
    onSave={handleSaveOutcome}
    onClose={() => setShowRevealModal(false)}
  />
)}
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6 max-w-md text-center">
        <p className="text-slate-700 mb-4">{message}</p>
        <Link to="/" className="text-blue-600 hover:underline text-sm">← Back to library</Link>
      </div>
    </div>
  );
}
