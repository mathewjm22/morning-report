
import { Maximize2, PinOff, Image as ImageIcon } from 'lucide-react';

export default function PinnedTray({ elements, onUnpin, onOpenLightbox }) {
  if (elements.length === 0) {
  return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div className="max-w-[240px]">
        <ImageIcon size={36} className="mx-auto text-stone-300 mb-3" strokeWidth={1.5} />
        <p className="text-sm font-medium text-stone-700 mb-1.5">No pinned elements yet</p>
        <p className="text-xs text-stone-500 leading-relaxed">Hover any figure or table in the PDF, then click <span className="font-medium text-stone-700">+ Pin</span> to keep it in view here.</p>
      </div>
    </div>
  );
}
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {elements.map(el => (
        <div key={el.id} className="border border-stone-200 rounded-md overflow-hidden bg-white hover:shadow-sm transition">
          <div className="px-2 py-1.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-700 truncate">{el.label}</p>
              <p className="text-xs text-stone-500">p.{el.pageNum}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onOpenLightbox(el)} className="p-1 text-stone-500 hover:text-sage-600" title="Open"><Maximize2 size={12} /></button>
              <button onClick={() => onUnpin(el.id)} className="p-1 text-stone-500 hover:text-red-600" title="Unpin"><PinOff size={12} /></button>
            </div>
          </div>
          <div className="h-40 cursor-zoom-in bg-stone-100 flex items-center justify-center" onClick={() => onOpenLightbox(el)}>
            {el.thumbUrl ? (
              <img src={el.thumbUrl} alt={el.label} className="max-w-full max-h-full object-contain" />
            ) : (
              <ImageIcon size={32} className="text-stone-400" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
