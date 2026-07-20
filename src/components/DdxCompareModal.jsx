import { useState } from 'react';
import { X, Award, Target, CheckCircle2, XCircle, Sparkles } from 'lucide-react';

// The "morning report moment" — compare committed DDx against the actual diagnosis
// the user reveals from the case. Auto-evaluates match by fuzzy name match, shows
// rank position, and collects learning points.
export default function DdxCompareModal({ committedDdx, existingOutcome, onSave, onClose }) {
  const [actualDx, setActualDx] = useState(existingOutcome?.actualDiagnosis || '');
  const [learningPoints, setLearningPoints] = useState(existingOutcome?.learningPoints || '');
  const [submitted, setSubmitted] = useState(!!existingOutcome);

  const matchInfo = actualDx.trim() ? evaluateMatch(actualDx, committedDdx) : null;

  const handleSubmit = () => {
    if (!actualDx.trim()) return;
    setSubmitted(true);
  };

  const handleSave = () => {
    onSave({
      actualDiagnosis: actualDx.trim(),
      learningPoints: learningPoints.trim(),
      matchInfo,
      savedAt: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-stone-200 flex items-center justify-between bg-gradient-to-r from-amber-100 to-orange-100">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-amber-700" />
            <h2 className="text-base font-semibold text-stone-900">DDx vs. Reveal</h2>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800 p-1 hover:bg-white/50 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Committed DDx column */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-sage-700" />
              <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wide">Your committed DDx</h3>
            </div>
            <div className="border border-stone-200 rounded overflow-hidden">
              {committedDdx.map((d, i) => {
                const isMatch = matchInfo?.matchedRank === i + 1;
                return (
                  <div
                    key={d.id}
                    className={`px-3 py-2 flex items-center gap-3 border-b border-stone-100 last:border-b-0 ${
                      isMatch ? 'bg-sage-100' : (i % 2 === 0 ? 'bg-sage-50' : 'bg-stone-50')
                    }`}
                  >
                    <span className="text-xs font-bold text-sage-700 w-6 flex-shrink-0">#{i + 1}</span>
                    <span className="text-sm text-stone-800 flex-1">{d.name || '(unnamed)'}</span>
                    {isMatch && (
                      <span className="text-xs bg-sage-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                        <CheckCircle2 size={11} /> Match
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actual diagnosis input */}
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
              Actual final diagnosis (from the case)
            </label>
            <input
              value={actualDx}
              onChange={e => { setActualDx(e.target.value); setSubmitted(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }}}
              placeholder="e.g. Periprosthetic joint infection with M. bovis BCG"
              className="w-full text-sm px-3 py-2 border-2 border-stone-300 rounded focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {!submitted && actualDx.trim() && (
              <button
                onClick={handleSubmit}
                className="mt-2 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded font-medium"
              >
                Judge my DDx
              </button>
            )}
          </div>

          {/* Verdict */}
          {submitted && matchInfo && (
            <div className={`rounded-lg p-4 border-2 ${
              matchInfo.matchedRank === 1 ? 'bg-sage-50 border-sage-400' :
              matchInfo.matchedRank ? 'bg-sage-50 border-sage-400' :
              'bg-orange-50 border-orange-400'
            }`}>
              <div className="flex items-start gap-3">
                {matchInfo.matchedRank ? (
                  <CheckCircle2 size={22} className="text-sage-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={22} className="text-orange-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-900">
                    {matchInfo.matchedRank === 1 && '🎯 Nailed it — #1 on your list.'}
                    {matchInfo.matchedRank > 1 && `On your list at position #${matchInfo.matchedRank}.`}
                    {!matchInfo.matchedRank && 'Not on your list.'}
                  </p>
                  <p className="text-xs text-stone-600 mt-1">
                    {matchInfo.matchedRank === 1 && 'Perfect calibration. You had the right leading diagnosis.'}
                    {matchInfo.matchedRank === 2 && 'Very close — you were nearby but ranked something else higher.'}
                    {matchInfo.matchedRank > 2 && `You considered it, but at rank ${matchInfo.matchedRank} — what would have shifted it higher?`}
                    {!matchInfo.matchedRank && 'A learning opportunity. What features should have prompted this diagnosis?'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Learning points */}
          {submitted && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles size={14} className="text-amber-600" />
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wide">
                  Learning points
                </label>
              </div>
              <textarea
                value={learningPoints}
                onChange={e => setLearningPoints(e.target.value)}
                placeholder="What did this case teach you? Key features, cognitive traps, next-time-I'll..."
                rows={5}
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {submitted && (
          <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-between bg-stone-50">
            <p className="text-xs text-stone-500">
              Saved outcomes appear in your progress; you can reopen and edit anytime.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-200 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-sage-600 hover:bg-sage-700 text-white text-sm rounded font-medium"
              >
                Save outcome
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Fuzzy match the actual diagnosis against the committed list.
// Returns { matchedRank: 1-based position, or null if no match }.
function evaluateMatch(actual, ddx) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const actualNorm = norm(actual);
  const actualWords = new Set(actualNorm.split(' ').filter(w => w.length > 2));

  for (let i = 0; i < ddx.length; i++) {
    const cand = norm(ddx[i].name || '');
    if (!cand) continue;

    // Exact substring match either way
    if (actualNorm.includes(cand) || cand.includes(actualNorm)) {
      return { matchedRank: i + 1 };
    }

    // Word overlap ≥ 60% of the shorter phrase's meaningful words
    const candWords = new Set(cand.split(' ').filter(w => w.length > 2));
    if (candWords.size === 0) continue;
    let overlap = 0;
    for (const w of candWords) if (actualWords.has(w)) overlap++;
    const shorterSize = Math.min(candWords.size, actualWords.size);
    if (shorterSize > 0 && overlap / shorterSize >= 0.6) {
      return { matchedRank: i + 1 };
    }
  }

  return { matchedRank: null };
}
