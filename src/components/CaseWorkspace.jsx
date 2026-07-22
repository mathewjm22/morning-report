
// The main reading workspace: gate bar on top, PDF center, whiteboard right.

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Home, GraduationCap, Share2, Copy, Check, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { getCase, loadProgress, saveProgress } from '../lib/storage.js';
import { loadSharedCase, saveCaseShare } from '../lib/api.js';
import PdfViewer from './PdfViewer.jsx';
import Whiteboard from './Whiteboard.jsx';
import PinnedTray from './PinnedTray.jsx';
import Lightbox from './Lightbox.jsx';
import HighlightsTray from './HighlightsTray.jsx';
import DdxCompareModal from './DdxCompareModal.jsx';
import { Brain } from 'lucide-react';
import FrameworksDrawer from './FrameworksDrawer.jsx';
import ResearchTray from './ResearchTray.jsx';
import CompareView from './CompareView.jsx';
import WhiteboardCanvas from './WhiteboardCanvas.jsx';

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
  const [frameworksOpen, setFrameworksOpen] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [compareElements, setCompareElements] = useState(null); // array of pinned items or null
  const [ddxView, setDdxView] = useState('list'); // 'list' | 'anatomic' | 'vindicate'

  const [boardWidth, setBoardWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('boardWidth') || '0', 10);
    return isNaN(saved) ? 0 : Math.min(1400, Math.max(0, saved));
  });
  useEffect(() => {
    localStorage.setItem('boardWidth', String(boardWidth));
  }, [boardWidth]);

  const [rightColumnWidth, setRightColumnWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('rightColumnWidth') || '380', 10);
    return isNaN(saved) ? 380 : Math.max(280, Math.min(900, saved));
  });
  useEffect(() => {
    localStorage.setItem('rightColumnWidth', String(rightColumnWidth));
  }, [rightColumnWidth]);

  const [boardContent, setBoardContent] = useState({});

  const sendToResearch = (text) => {
  setResearchQuery(text);
  setRightTab('research');
  };

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
      setDdxView(p.ddxView || 'list');
      setBoardContent(p.boardContent || {});
    }
  });
}, [caseEntry, shared]);

const [rightLayout, setRightLayout] = useState(() => {
  return localStorage.getItem('rightLayout') === 'horizontal' ? 'horizontal' : 'vertical';
});
useEffect(() => {
  localStorage.setItem('rightLayout', rightLayout);
}, [rightLayout]);

const [horizontalHeight, setHorizontalHeight] = useState(() => {
  const saved = parseInt(localStorage.getItem('horizontalHeight') || '260', 10);
  return isNaN(saved) ? 260 : Math.max(120, Math.min(600, saved));
});
useEffect(() => {
  localStorage.setItem('horizontalHeight', String(horizontalHeight));
}, [horizontalHeight]);

  // Save progress
useEffect(() => {
  if (!caseEntry || shared) return;
  saveProgress(caseEntry.id, {
    ddx, plan, annotations, pinned, committedDdx, finalOutcome, ddxView, boardContent,
  });
}, [caseEntry, shared, ddx, plan, annotations, pinned, committedDdx, finalOutcome, ddxView, boardContent]);

  if (loadError) return <ErrorScreen message={loadError} />;
  if (!caseEntry) return <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-500">Loading...</div>;

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
    <div className="flex flex-col h-screen bg-stone-100 overflow-hidden">
      {/* Top bar */}
<div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
  <div className="flex items-center gap-3 min-w-0">
    <Link
      to="/"
      className="text-stone-500 hover:text-stone-900 p-1.5 hover:bg-stone-100 rounded transition"
      title="Back to library"
    >
      <Home size={18} />
    </Link>
    <div className="min-w-0">
      <h1 className="text-base font-semibold text-stone-900 truncate leading-tight">{caseEntry.title}</h1>
      <p className="text-xs text-stone-500 truncate">{caseEntry.source}{shared && ' • Shared'}</p>
    </div>
  </div>
  <div className="flex items-center gap-1">
    {!shared && (
      <IconButton
        icon={Share2}
        onClick={generateShare}
        disabled={shareState.loading}
        label="Share this case"
      />
    )}
    <IconButton
      icon={Brain}
      onClick={() => setFrameworksOpen(true)}
      label="Clinical reasoning frameworks"
    />
    <IconButton
      icon={GraduationCap}
      onClick={() => setAttendingMode(!attendingMode)}
      active={attendingMode}
      label={attendingMode ? 'Turn off attending mode' : 'Attending mode'}
    />
  </div>
</div>

      {shareState.url && (
        <div className="px-4 py-2 border-b bg-sage-50 border-sage-200 flex items-center gap-2 text-sm">
          <span className="font-medium text-sage-800">Share link:</span>
          <input readOnly value={shareState.url} onFocus={e => e.target.select()}
            className="flex-1 px-2 py-1 border border-sage-300 rounded text-xs bg-white" />
          <button onClick={copyShare} className="text-xs px-2 py-1 bg-white border border-sage-300 rounded flex items-center gap-1">
            {shareState.copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
          </button>
          <button onClick={() => setShareState({ loading: false, url: null, copied: false, error: null })} className="text-stone-400 hover:text-stone-700">×</button>
        </div>
      )}
      
      {/* Main workspace layout */}
<div className="flex-1 flex overflow-hidden flex-col">
  {/* Top row: PDF + (optionally) Whiteboard + (if vertical layout) right panel */}
  <div className="flex-1 flex overflow-hidden">
    <PdfViewer
      caseEntry={caseEntry}
      annotations={annotations}
      setAnnotations={setAnnotations}
      onPinElement={pinElement}
      onOpenLightbox={setLightbox}
      attendingMode={attendingMode}
    />

    {rightTab === 'whiteboard' && (
      <BoardResizeHandle
        currentWidth={boardWidth}
        onResize={(delta) => setBoardWidth(w => Math.max(0, Math.min(1400, w - delta)))}
        onToggle={() => setBoardWidth(w => w > 0 ? 0 : 600)}
      />
    )}

    {rightTab === 'whiteboard' && boardWidth > 0 && (
      <div className="flex-shrink-0 flex overflow-hidden" style={{ width: boardWidth }}>
        <WhiteboardCanvas
          content={boardContent}
          setContent={setBoardContent}
          width={boardWidth}
        />
      </div>
    )}

    {/* Vertical right panel — only in vertical layout */}
{rightLayout === 'vertical' && (
  <>
    <RightColumnResizeHandle
      onResize={(delta) => setRightColumnWidth(w => Math.max(280, Math.min(900, w - delta)))}
      onDoubleClick={() => setRightColumnWidth(380)}
    />
    <RightPanel
      rightTab={rightTab}
      setRightTab={setRightTab}
      highlightCount={highlightCount}
      pinnedCount={pinned.length}
      rightLayout={rightLayout}
      onToggleLayout={() => setRightLayout(l => l === 'vertical' ? 'horizontal' : 'vertical')}
      width={rightColumnWidth}
      ddx={ddx} setDdx={setDdx}
      plan={plan} setPlan={setPlan}
      committedDdx={committedDdx}
      handleCommitDdx={handleCommitDdx}
      handleUncommitDdx={handleUncommitDdx}
      setShowRevealModal={setShowRevealModal}
      ddxView={ddxView} setDdxView={setDdxView}
      annotations={annotations} setAnnotations={setAnnotations}
      researchQuery={researchQuery} setResearchQuery={setResearchQuery}
      sendToResearch={sendToResearch}
      pinned={pinned} unpin={unpin} setLightbox={setLightbox}
      setCompareElements={setCompareElements}
    />
  </>
)}
  </div>

  {/* Horizontal bottom strip — only in horizontal layout */}
  {rightLayout === 'horizontal' && (
    <>
      <HorizontalResizeHandle
        height={horizontalHeight}
        onResize={(delta) => setHorizontalHeight(h => Math.max(120, Math.min(600, h - delta)))}
      />
      <div className="flex-shrink-0 border-t border-stone-200" style={{ height: horizontalHeight }}>
        <RightPanel
          rightTab={rightTab}
          setRightTab={setRightTab}
          highlightCount={highlightCount}
          pinnedCount={pinned.length}
          rightLayout={rightLayout}
          onToggleLayout={() => setRightLayout(l => l === 'vertical' ? 'horizontal' : 'vertical')}
          ddx={ddx} setDdx={setDdx}
          plan={plan} setPlan={setPlan}
          committedDdx={committedDdx}
          handleCommitDdx={handleCommitDdx}
          handleUncommitDdx={handleUncommitDdx}
          setShowRevealModal={setShowRevealModal}
          ddxView={ddxView} setDdxView={setDdxView}
          annotations={annotations} setAnnotations={setAnnotations}
          researchQuery={researchQuery} setResearchQuery={setResearchQuery}
          sendToResearch={sendToResearch}
          pinned={pinned} unpin={unpin} setLightbox={setLightbox}
          setCompareElements={setCompareElements}
        />
      </div>
    </>
  )}
</div>

      {lightbox && (
  <Lightbox
    element={lightbox}
    caseEntry={caseEntry}
    onClose={() => setLightbox(null)}
    onCompare={(elements) => {
      setLightbox(null);
      setCompareElements(elements);
    }}
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
            <FrameworksDrawer open={frameworksOpen} onClose={() => setFrameworksOpen(false)} />
{compareElements && (
  <CompareView
    elements={compareElements}
    onClose={() => setCompareElements(null)}
  />
)}
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg border border-stone-200 p-6 max-w-md text-center">
        <p className="text-stone-700 mb-4">{message}</p>
        <Link to="/" className="text-sage-600 hover:underline text-sm">← Back to library</Link>
      </div>
    </div>
  );
}
function IconButton({ icon: Icon, onClick, disabled, active, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-md transition relative group ${
        active
          ? 'bg-sage-600 text-white hover:bg-sage-700'
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <Icon size={17} />
      {/* Custom tooltip (nicer than the browser default) */}
      <span className="absolute top-full right-0 mt-1.5 px-2 py-1 bg-stone-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-30 shadow-lg">
        {label}
      </span>
    </button>
  );
}

function RightPanel({
  rightTab, setRightTab, highlightCount, pinnedCount,
  rightLayout, onToggleLayout,
  width,
  ddx, setDdx, plan, setPlan,
  committedDdx, handleCommitDdx, handleUncommitDdx, setShowRevealModal,
  ddxView, setDdxView,
  annotations, setAnnotations,
  researchQuery, setResearchQuery, sendToResearch,
  pinned, unpin, setLightbox, setCompareElements,
}) {
  const isHorizontal = rightLayout === 'horizontal';
  const containerClass = isHorizontal
    ? 'w-full h-full bg-white flex flex-col overflow-hidden'
    : 'bg-white border-l border-stone-200 flex flex-col flex-shrink-0';
  const containerStyle = isHorizontal ? {} : { width: width || 380 };

  return (
    <div className={containerClass} style={containerStyle}>
      {/* Tab bar with layout toggle */}
      <div className="flex border-b border-stone-200 items-stretch">
        <TabBtn active={rightTab === 'whiteboard'} onClick={() => setRightTab('whiteboard')}>
          Whiteboard
        </TabBtn>
        <TabBtn active={rightTab === 'highlights'} onClick={() => setRightTab('highlights')}>
          Highlights
          {highlightCount > 0 && <span className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{highlightCount}</span>}
        </TabBtn>
        <TabBtn active={rightTab === 'research'} onClick={() => setRightTab('research')}>
          Research
        </TabBtn>
        <TabBtn active={rightTab === 'pinned'} onClick={() => setRightTab('pinned')}>
          Pinned
          {pinnedCount > 0 && <span className="ml-1 bg-sage-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pinnedCount}</span>}
        </TabBtn>
        <button
          onClick={onToggleLayout}
          className="px-2 border-l border-stone-200 text-stone-500 hover:bg-stone-100 hover:text-sage-700 transition flex items-center justify-center"
          title={isHorizontal ? 'Switch to vertical column' : 'Switch to horizontal strip (more room)'}
        >
          {isHorizontal ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {rightTab === 'whiteboard' && (
          <Whiteboard
            ddx={ddx} setDdx={setDdx}
            plan={plan} setPlan={setPlan}
            committedDdx={committedDdx}
            onCommitDdx={handleCommitDdx}
            onUncommitDdx={handleUncommitDdx}
            onOpenReveal={() => setShowRevealModal(true)}
            ddxView={ddxView}
            setDdxView={setDdxView}
          />
        )}
        {rightTab === 'highlights' && (
          <HighlightsTray
            annotations={annotations}
            setAnnotations={setAnnotations}
            onSendToResearch={sendToResearch}
          />
        )}
        {rightTab === 'research' && (
          <ResearchTray
            initialQuery={researchQuery}
            onQueryConsumed={() => setResearchQuery('')}
          />
        )}
        {rightTab === 'pinned' && (
          <PinnedTray
            elements={pinned}
            onUnpin={unpin}
            onOpenLightbox={setLightbox}
            onOpenCompare={setCompareElements}
          />
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 text-xs font-medium relative transition ${
        active ? 'bg-sage-50 text-sage-700 border-b-2 border-sage-600' : 'text-stone-600 hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  );
}

function HorizontalResizeHandle({ height, onResize }) {
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);

  const startDrag = (e) => {
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const delta = e.clientY - lastYRef.current;
      lastYRef.current = e.clientY;
      if (delta !== 0) onResize(delta);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onResize]);

  return (
    <div
      onMouseDown={startDrag}
      className="flex-shrink-0 h-1.5 bg-stone-200 hover:bg-sage-400 cursor-row-resize transition-colors"
      title="Drag to resize the panel"
    />
  );
}

function BoardResizeHandle({ currentWidth, onResize, onToggle }) {
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const startDrag = (e) => {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      if (delta !== 0) onResize(delta);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onResize]);

  const collapsed = currentWidth === 0;

  if (collapsed) {
    return (
      <div
        onMouseDown={startDrag}
        onDoubleClick={onToggle}
        className="flex-shrink-0 flex items-center justify-center relative bg-sage-600 hover:bg-sage-700 cursor-col-resize transition"
        style={{ width: 24 }}
        title="Drag left to open the board · Double-click to reveal"
      >
        <div className="text-white font-bold text-xs tracking-widest select-none pointer-events-none"
             style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          BOARD
        </div>
      </div>
    );
  }

  // Expanded state: visible sage bar with a collapse chevron button and drag zone
  return (
    <div className="flex-shrink-0 flex flex-col relative bg-sage-100 hover:bg-sage-200 transition" style={{ width: 12 }}>
      {/* Collapse button at top */}
      <button
        onClick={onToggle}
        className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white hover:bg-sage-50 border border-sage-400 rounded p-0.5 shadow-sm"
        title="Close the board"
      >
        <ChevronRight size={12} className="text-sage-700" />
      </button>
      {/* Drag handle */}
      <div
        onMouseDown={startDrag}
        onDoubleClick={onToggle}
        className="flex-1 cursor-col-resize"
        title="Drag to resize · Double-click to close"
      >
        {/* Vertical grip lines for affordance */}
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col gap-1">
            <div className="w-0.5 h-1 bg-sage-500 rounded-full" />
            <div className="w-0.5 h-1 bg-sage-500 rounded-full" />
            <div className="w-0.5 h-1 bg-sage-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
function RightColumnResizeHandle({ onResize, onDoubleClick }) {
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const startDrag = (e) => {
    draggingRef.current = true;
    lastXRef.current = e.clientX;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      if (delta !== 0) onResize(delta);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [onResize]);

  return (
    <div
      onMouseDown={startDrag}
      onDoubleClick={onDoubleClick}
      className="w-1 hover:w-1.5 bg-stone-200 hover:bg-sage-400 cursor-col-resize transition-all flex-shrink-0"
      title="Drag to resize · Double-click to reset"
    />
  );
}