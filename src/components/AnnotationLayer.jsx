import { useState, useRef, useEffect } from 'react';
import SearchPopup from './SearchPopup.jsx';

const HANDLE_R = 5;

export default function AnnotationLayer({
  width, height, tool, color, strokeWidth,
  strokes, setStrokes,
  textItems, pageNum,
}) {
  const svgRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [startPt, setStartPt] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [searchPopup, setSearchPopup] = useState(null); // { text, x, y }
  
  const isCreationTool = ['pen', 'highlight', 'arrow', 'circle', 'ruler', 'caliper', 'note'].includes(tool);
  const isEraser = tool === 'eraser';

  const getPt = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const strokeHit = (s, pt, thresh = 10) => {
    if (s.type === 'pen') {
      return s.points.some(p => Math.hypot(p.x - pt.x, p.y - pt.y) < thresh);
    }
    if (s.type === 'highlight') {
      return (s.words || []).some(w =>
        pt.x >= w.x - 2 && pt.x <= w.x + w.w + 2 &&
        pt.y >= w.y - 2 && pt.y <= w.y + w.h + 2
      );
    }
    if (s.type === 'note') {
      return pt.x >= s.x && pt.x <= s.x + (s.w || 140) &&
             pt.y >= s.y && pt.y <= s.y + (s.h || 70);
    }
    if (s.start && s.end) {
      if (s.type === 'circle') {
        const cx = s.start.x, cy = s.start.y;
        const r = Math.hypot(s.end.x - cx, s.end.y - cy);
        const d = Math.hypot(pt.x - cx, pt.y - cy);
        return Math.abs(d - r) < thresh;
      }
      return distToSegment(pt, s.start, s.end) < thresh;
    }
    return false;
  };

  const handleMouseDown = (e) => {
    const pt = getPt(e);

    if (isEraser) {
      setStrokes(strokes.filter(s => !strokeHit(s, pt)));
      return;
    }

    // Check for handle drag on an existing stroke
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.start && s.end && ['arrow', 'ruler', 'caliper', 'circle'].includes(s.type)) {
        if (Math.hypot(s.start.x - pt.x, s.start.y - pt.y) < HANDLE_R + 4) {
          setDragging({ strokeIdx: i, handle: 'start', origPt: pt, origStroke: s });
          setSelectedIdx(i);
          return;
        }
        if (Math.hypot(s.end.x - pt.x, s.end.y - pt.y) < HANDLE_R + 4) {
          setDragging({ strokeIdx: i, handle: 'end', origPt: pt, origStroke: s });
          setSelectedIdx(i);
          return;
        }
      }
      if (strokeHit(s, pt)) {
        setDragging({ strokeIdx: i, handle: 'whole', origPt: pt, origStroke: s });
        setSelectedIdx(i);
        return;
      }
    }

    if (!isCreationTool) { setSelectedIdx(null); return; }

    if (tool === 'note') {
      const text = prompt('Note text:', '');
      if (text) setStrokes([...strokes, { type: 'note', x: pt.x, y: pt.y, w: 140, h: 70, text, color: '#f59e0b' }]);
      return;
    }

    setStartPt(pt);
    setIsCreating(true);
    if (tool === 'pen') {
      setPreview({ type: 'pen', color, strokeWidth, points: [pt] });
    } else if (tool === 'highlight') {
      const initialWords = wordsAtPoint(pt, textItems);
      setPreview({
        type: 'highlight',
        color,
        words: initialWords,
        pageNum,
      });
    }
    setSelectedIdx(null);
  };

  const handleMouseMove = (e) => {
    const pt = getPt(e);

    if (dragging) {
      const dx = pt.x - dragging.origPt.x;
      const dy = pt.y - dragging.origPt.y;
      const orig = dragging.origStroke;
      const newStrokes = [...strokes];
      let updated;
      if (dragging.handle === 'start') {
        updated = { ...orig, start: { x: orig.start.x + dx, y: orig.start.y + dy } };
      } else if (dragging.handle === 'end') {
        updated = { ...orig, end: { x: orig.end.x + dx, y: orig.end.y + dy } };
      } else {
        if (orig.type === 'pen') {
          updated = { ...orig, points: orig.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
        } else if (orig.type === 'highlight') {
          updated = { ...orig, words: (orig.words || []).map(w => ({ ...w, x: w.x + dx, y: w.y + dy })) };
        } else if (orig.type === 'note') {
          updated = { ...orig, x: orig.x + dx, y: orig.y + dy };
        } else {
          updated = {
            ...orig,
            start: { x: orig.start.x + dx, y: orig.start.y + dy },
            end: { x: orig.end.x + dx, y: orig.end.y + dy },
          };
        }
      }
      newStrokes[dragging.strokeIdx] = updated;
      setStrokes(newStrokes);
      return;
    }

    if (!isCreating) return;

    if (tool === 'pen') {
      setPreview(p => p ? { ...p, points: [...p.points, pt] } : null);
    } else if (tool === 'highlight') {
      setPreview(p => {
        if (!p) return null;
        const newWords = wordsAtPoint(pt, textItems);
        const lineWords = wordsAlongSegment(startPt, pt, textItems);
        const combined = mergeWords([...p.words, ...newWords, ...lineWords]);
        return { ...p, words: combined };
      });
    } else if (['arrow', 'circle', 'ruler', 'caliper'].includes(tool)) {
      setPreview({ type: tool, color, strokeWidth, start: startPt, end: pt });
    }
  };

  const handleMouseUp = () => {
    if (dragging) { setDragging(null); return; }
    if (isCreating && preview) {
      let final = preview;
      let isDegenerate = false;

      if (preview.type === 'pen') {
        isDegenerate = preview.points.length < 2;
      } else if (preview.type === 'highlight') {
        isDegenerate = !preview.words || preview.words.length === 0;
        if (!isDegenerate) {
          const sorted = [...preview.words].sort((a, b) => {
            if (Math.abs(a.y - b.y) < 6) return a.x - b.x;
            return a.y - b.y;
          });
          final = {
            ...preview,
            capturedText: sorted.map(w => w.text).join(' ').replace(/\s+/g, ' ').trim(),
          };
        }
      } else if (preview.start && preview.end) {
        isDegenerate = Math.hypot(preview.end.x - preview.start.x, preview.end.y - preview.start.y) < 4;
      }

      if (!isDegenerate) {
  setStrokes([...strokes, final]);
  // If this was a highlight with captured text, offer the search popup
  if (final.type === 'highlight' && final.capturedText && final.words?.length) {
    // Anchor at the middle of the last word (which is where the mouse released)
    const lastWord = final.words[final.words.length - 1];
    const svgRect = svgRef.current.getBoundingClientRect();
    setSearchPopup({
      text: final.capturedText,
      x: svgRect.left + lastWord.x + lastWord.w / 2,
      y: svgRect.top + lastWord.y + lastWord.h,
    });
  }
}
    }
    setIsCreating(false);
    setStartPt(null);
    setPreview(null);
  };

  const deleteStroke = (idx) => {
    setStrokes(strokes.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const editNote = (idx) => {
    const s = strokes[idx];
    const newText = prompt('Edit note:', s.text || '');
    if (newText !== null) {
      const copy = [...strokes];
      copy[idx] = { ...s, text: newText };
      setStrokes(copy);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIdx !== null) {
        e.preventDefault();
        deleteStroke(selectedIdx);
      }
      if (e.key === 'Escape') setSelectedIdx(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIdx, strokes]); // eslint-disable-line

  const cursor = isEraser ? 'cell' : (isCreationTool && !dragging) ? 'crosshair' : 'default';
  const pointerEvents = (isCreationTool || isEraser || strokes.length > 0) ? 'auto' : 'none';

  return (
  <>
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="absolute inset-0"
      style={{ cursor, pointerEvents }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {strokes.map((s, i) => (
        <StrokeRenderer
          key={i}
          stroke={s}
          selected={selectedIdx === i}
          onEditNote={() => editNote(i)}
        />
      ))}
      {preview && <StrokeRenderer stroke={preview} preview />}
      {selectedIdx !== null && strokes[selectedIdx] && (
        <SelectionHandles stroke={strokes[selectedIdx]} onDelete={() => deleteStroke(selectedIdx)} />
      )}
    </svg>
    {searchPopup && (
      <SearchPopup
        text={searchPopup.text}
        x={searchPopup.x}
        y={searchPopup.y}
        onClose={() => setSearchPopup(null)}
      />
    )}
  </>
);

function StrokeRenderer({ stroke: s, selected, preview, onEditNote }) {
  const sw = s.strokeWidth || 2.5;

  if (s.type === 'pen') {
    const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return (
      <path d={d} fill="none" stroke={s.color}
        strokeWidth={sw}
        strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}
      />
    );
  }

  if (s.type === 'highlight') {
    return (
      <g style={{ mixBlendMode: 'multiply' }} opacity={0.4}>
        {(s.words || []).map((w, i) => (
          <rect
            key={i}
            x={w.x - 1}
            y={w.y - 1}
            width={w.w + 2}
            height={w.h + 2}
            fill={s.color}
            rx={2}
            style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}
          />
        ))}
      </g>
    );
  }

  if (s.type === 'arrow') {
    const { start, end } = s;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const len = 14;
    const ax1 = end.x - len * Math.cos(angle - Math.PI / 6);
    const ay1 = end.y - len * Math.sin(angle - Math.PI / 6);
    const ax2 = end.x - len * Math.cos(angle + Math.PI / 6);
    const ay2 = end.y - len * Math.sin(angle + Math.PI / 6);
    return (
      <g style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={s.color} strokeWidth={sw} strokeLinecap="round" />
        <polygon points={`${end.x},${end.y} ${ax1},${ay1} ${ax2},${ay2}`} fill={s.color} />
      </g>
    );
  }

  if (s.type === 'circle') {
    const r = Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y);
    return (
      <circle cx={s.start.x} cy={s.start.y} r={r} fill="none" stroke={s.color} strokeWidth={sw}
        style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}
      />
    );
  }

  if (s.type === 'ruler') {
    const { start, end } = s;
    const dPx = Math.hypot(end.x - start.x, end.y - start.y);
    const dCm = (dPx / 37.8).toFixed(1);
    const mx = (start.x + end.x) / 2, my = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const perp = angle + Math.PI / 2;
    const cap = 7;
    const label = `${dCm} cm`;
    const tw = label.length * 6.5 + 10;
    return (
      <g style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}>
        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={s.color} strokeWidth={sw} />
        <line x1={start.x + cap * Math.cos(perp)} y1={start.y + cap * Math.sin(perp)}
              x2={start.x - cap * Math.cos(perp)} y2={start.y - cap * Math.sin(perp)}
              stroke={s.color} strokeWidth={sw} />
        <line x1={end.x + cap * Math.cos(perp)} y1={end.y + cap * Math.sin(perp)}
              x2={end.x - cap * Math.cos(perp)} y2={end.y - cap * Math.sin(perp)}
              stroke={s.color} strokeWidth={sw} />
        <rect x={mx - tw / 2} y={my - 22} width={tw} height={16} fill={s.color} rx={2} />
        <text x={mx} y={my - 10} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="system-ui">{label}</text>
      </g>
    );
  }

  if (s.type === 'caliper') {
    const { start, end } = s;
    const topY = Math.min(start.y, end.y) - 12;
    const distPx = Math.abs(end.x - start.x);
    const distMm = distPx / 37.8;
    const timeMs = (distMm / 25) * 1000;
    const bpm = timeMs > 0 ? Math.round(60000 / timeMs) : 0;
    const label = `${timeMs.toFixed(0)} ms · ${bpm} bpm`;
    const mx = (start.x + end.x) / 2;
    const tw = label.length * 6.5 + 10;
    return (
      <g style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}>
        <line x1={start.x} y1={start.y - 22} x2={start.x} y2={start.y + 22} stroke={s.color} strokeWidth={2} />
        <line x1={end.x} y1={end.y - 22} x2={end.x} y2={end.y + 22} stroke={s.color} strokeWidth={2} />
        <line x1={start.x} y1={topY} x2={end.x} y2={topY} stroke={s.color} strokeWidth={1.5} strokeDasharray="4 3" />
        <rect x={mx - tw / 2} y={topY - 20} width={tw} height={16} fill={s.color} rx={2} />
        <text x={mx} y={topY - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="system-ui">{label}</text>
      </g>
    );
  }

  if (s.type === 'note') {
    const w = s.w || 140, h = s.h || 70;
    return (
      <g style={{ filter: selected ? 'drop-shadow(0 0 3px rgba(59,130,246,0.8))' : undefined }}>
        <rect x={s.x} y={s.y} width={w} height={h} fill="#fef08a" stroke="#ca8a04" strokeWidth="1" rx="3" />
        <foreignObject x={s.x + 4} y={s.y + 4} width={w - 8} height={h - 8}>
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            onDoubleClick={onEditNote}
            className="text-[11px] text-amber-950 leading-tight cursor-text"
            style={{ overflow: 'hidden', wordBreak: 'break-word' }}
          >
            {s.text || '(empty)'}
          </div>
        </foreignObject>
      </g>
    );
  }

  return null;
}

function SelectionHandles({ stroke: s, onDelete }) {
  if (s.type === 'pen' || s.type === 'highlight') return null;

  if (s.type === 'note') {
    return (
      <g>
        <rect x={s.x - 2} y={s.y - 2} width={(s.w || 140) + 4} height={(s.h || 70) + 4}
          fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" rx="4" />
      </g>
    );
  }

  const pts = [s.start, s.end].filter(Boolean);
  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={HANDLE_R + 2}
          fill="white" stroke="#3b82f6" strokeWidth="2" style={{ cursor: 'grab' }} />
      ))}
    </g>
  );
}

function distToSegment(p, a, b) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

function wordsAtPoint(pt, textItems) {
  if (!textItems) return [];
  return textItems.filter(it =>
    pt.x >= it.x - 1 && pt.x <= it.x + it.w + 1 &&
    pt.y >= it.y - 2 && pt.y <= it.y + it.h + 2
  );
}

function wordsAlongSegment(a, b, textItems) {
  if (!textItems) return [];
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(1, Math.ceil(dist / 4));
  const found = new Set();
  const collected = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    for (const it of textItems) {
      if (found.has(it)) continue;
      if (p.x >= it.x - 1 && p.x <= it.x + it.w + 1 &&
          p.y >= it.y - 2 && p.y <= it.y + it.h + 2) {
        found.add(it);
        collected.push(it);
      }
    }
  }
  return collected;
}

function mergeWords(list) {
  const seen = new Map();
  for (const w of list) {
    const key = `${w.x.toFixed(1)}-${w.y.toFixed(1)}-${w.text}`;
    if (!seen.has(key)) seen.set(key, w);
  }
  return Array.from(seen.values());
}
