
import {
  MousePointer2, Highlighter, Pencil, ArrowUpRight, Circle, Ruler,
  Activity, StickyNote, Eraser,
} from 'lucide-react';

export const TOOLS = [
  { id: 'select',    icon: MousePointer2, label: 'Select',    hint: 'Click regions to extract' },
  { id: 'highlight', icon: Highlighter,   label: 'Highlight', hint: 'Semi-transparent overlay' },
  { id: 'pen',       icon: Pencil,        label: 'Pen',       hint: 'Freehand draw' },
  { id: 'arrow',     icon: ArrowUpRight,  label: 'Arrow',     hint: 'Point at findings' },
  { id: 'circle',    icon: Circle,        label: 'Circle',    hint: 'Circle a region' },
  { id: 'ruler',     icon: Ruler,         label: 'Ruler',     hint: 'Measure distance' },
  { id: 'caliper',   icon: Activity,      label: 'Caliper',   hint: 'Measure R-R interval / BPM' },
  { id: 'note',      icon: StickyNote,    label: 'Note',      hint: 'Sticky note' },
  { id: 'eraser',    icon: Eraser,        label: 'Erase',     hint: 'Remove annotation' },
];

export const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#000000', '#ffffff'];

// Default EKG paper speed: 25 mm/s. Users can recalibrate per-image.
export const DEFAULT_EKG_SPEED_MM_S = 25;
// Rough default: for a page rendered at 96 dpi at scale 1.5, ~14.2 pixels per mm.
// This is only a fallback; the caliper reports "pixels" until the user calibrates.
export const DEFAULT_PIXELS_PER_MM = 14.2;

