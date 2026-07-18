// Post-parse safety net. If the Worker misclassifies (e.g. dumps HPI + exam
// + labs into a "follow-up" gate), split them into proper gates client-side.
//
// The rule: any single non-imaging gate over ~4000 chars containing markers
// for multiple sections is suspicious. We re-split by anchors.

const GATE_META = {
  'hpi':        { icon: 'Stethoscope',    label: 'HPI',           title: 'History of Present Illness' },
  'pmh-social': { icon: 'ClipboardList',  label: 'PMH / Social',  title: 'Past Medical History, Medications & Social' },
  'exam-labs':  { icon: 'FlaskConical',   label: 'Exam & Labs',   title: 'Physical Exam & Initial Labs' },
  'workup':     { icon: 'Target',         label: 'Workup',        title: 'Additional Workup Results' },
};

// Ordered list of anchors we scan for within a bloated gate's content.
// Each anchor is { id, pattern }. Order matters — earlier anchors "win"
// their position in the resulting split.
const ANCHORS = [
  { id: 'pmh-social', pattern: /(?:the patient'?s\s+(?:psychiatric|medical|past medical)\s+history\s+was\s+notable|medical history included|past medical history|medications?\s*(?:included|:))/i },
  { id: 'exam-labs',  pattern: /(?:on examination[,.]|on physical examination|physical examination[:\s]|vital signs)/i },
  { id: 'workup',     pattern: /(?:over the course of the following|diagnostic test results were received|additional (?:laboratory|microbiologic|studies)|a diagnosis was made)/i },
];

const BLOAT_THRESHOLD = 4000; // chars

export function validateAndRepairGates(caseData) {
  if (!caseData?.gates || !Array.isArray(caseData.gates)) return caseData;

  const newGates = [];
  const existingIds = new Set(caseData.gates.map(g => g.id));

  for (const gate of caseData.gates) {
    // Only try to repair non-imaging gates that are clearly bloated
    if (gate.isImageGate || !gate.content || gate.content.length < BLOAT_THRESHOLD) {
      newGates.push(gate);
      continue;
    }

    // Skip repair if this gate already looks well-scoped (e.g. is discussant-ddx
    // which is legitimately long).
    const nonRepairable = [
      'discussant-ddx', 'management', 'confirmatory', 'clinical-impression',
      'teaching', 'hospital-course', 'imaging-diagnosis', 'discussant-dx',
      'imaging-studies', 'diagnostic-testing', 'laboratory-testing',
      'additional-pathological', 'additional-surgical', 'operative-management',
    ];
    if (nonRepairable.includes(gate.id)) {
      newGates.push(gate);
      continue;
    }

    // Find anchors inside this gate's content
    const found = [];
    for (const anchor of ANCHORS) {
      // Skip if we'd create a duplicate id
      if (existingIds.has(anchor.id) && anchor.id !== gate.id) continue;
      const m = gate.content.match(anchor.pattern);
      if (m && typeof m.index === 'number') {
        found.push({ id: anchor.id, index: m.index });
      }
    }

    // Need at least 2 anchors inside a bloated gate to justify a split
    // (one anchor might just be an incidental mention).
    if (found.length < 2) {
      newGates.push(gate);
      continue;
    }

    // Sort by position
    found.sort((a, b) => a.index - b.index);

    // Piece 1: the original gate keeps content up to the first anchor.
    // If the original gate is 'hpi' or the first anchor starts near the top,
    // keep gate.id; otherwise force to 'hpi'.
    const firstAnchor = found[0];
    const headContent = gate.content.slice(0, firstAnchor.index).trim();

    let headId = gate.id;
    // If the gate was misclassified as 'followup' or similar, and its head content
    // reads like an HPI (which is what happened for case 4), rename to 'hpi'.
    const looksLikeHpi = /was\s+evaluated|presented\s+(?:to|at|with)|history of present|weeks?\s+before/i.test(headContent);
    if (headId === 'followup' && looksLikeHpi && !existingIds.has('hpi')) {
      headId = 'hpi';
    }

    if (headContent.length > 100) {
      newGates.push({
        ...gate,
        id: headId,
        icon: GATE_META[headId]?.icon || gate.icon,
        label: GATE_META[headId]?.label || gate.label,
        title: GATE_META[headId]?.title || gate.title,
        content: headContent,
      });
      existingIds.add(headId);
    }

    // Middle pieces
    for (let i = 0; i < found.length; i++) {
      const start = found[i].index;
      const end = i + 1 < found.length ? found[i + 1].index : gate.content.length;
      const piece = gate.content.slice(start, end).trim();
      if (piece.length < 80) continue;
      const newId = found[i].id;
      if (existingIds.has(newId)) continue;
      newGates.push({
        id: newId,
        icon: GATE_META[newId]?.icon || 'Stethoscope',
        label: GATE_META[newId]?.label || newId,
        title: GATE_META[newId]?.title || newId,
        content: piece,
        prompt: null,
        teachingNotes: [],
      });
      existingIds.add(newId);
    }
  }

  // Preserve canonical ordering: hpi → pmh-social → exam-labs → imaging → workup
  // → discussant-ddx → clinical-impression → discussant-dx → imaging-studies
  // → imaging-diagnosis → hospital-course → operative-management
  // → diagnostic-testing → laboratory-testing → confirmatory
  // → additional-pathological → additional-surgical → management → followup → teaching
  const order = [
    'hpi', 'pmh-social', 'exam-labs', 'imaging', 'workup',
    'discussant-ddx', 'clinical-impression', 'discussant-dx',
    'imaging-studies', 'imaging-diagnosis', 'hospital-course',
    'operative-management', 'diagnostic-testing', 'laboratory-testing',
    'confirmatory', 'additional-pathological', 'additional-surgical',
    'management', 'followup', 'teaching',
  ];
  newGates.sort((a, b) => {
    const ai = order.indexOf(a.id); const bi = order.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return { ...caseData, gates: newGates };
}
