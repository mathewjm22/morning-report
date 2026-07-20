import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, Loader2, X, ImagePlus } from 'lucide-react';
import { extractPdf } from '../lib/pdfExtract.js';
import { parseCase } from '../lib/api.js';
import { saveCase } from '../lib/storage.js';
import { setSessionFigures } from '../lib/sessionImages.js';
import { setSessionTables } from '../lib/sessionTables.js'; // ← NEW
import { validateAndRepairGates } from '../lib/gateValidator.js';

export default function PdfUploader({ onClose, onSuccess }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'extracting' | 'parsing' | 'error' | 'success'
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  const [manualFigures, setManualFigures] = useState([]); // user-pasted images
  const [extractedFigures, setExtractedFigures] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      setStatus('error');
      return;
    }

    setStatus('extracting');
    setError(null);
    setProgress('Reading PDF...');

    try {
      // ---- Extract text + images locally ----

const { fullText, figures, tables, numPages } = await extractPdf(file, (p) => {
  if (p.stage === 'text') setProgress(`Extracting text: page ${p.pageIndex}/${p.numPages}`);
  else if (p.stage === 'images') setProgress(`Extracting images: page ${p.pageIndex}/${p.numPages}`);
  else if (p.stage === 'tables') setProgress(`Extracting tables: page ${p.pageIndex}/${p.numPages}`);
});

      if (!fullText || fullText.length < 500) {
        throw new Error('PDF text is too short — is this really a NEJM Case Record?');
      }

      setExtractedFigures(figures);

      // ---- Send text to Worker for parsing ----
      setStatus('parsing');
      setProgress(`Parsing case (this takes ~60 seconds — one call per section)...`);

      const result = await parseCase(fullText);
      const caseData = validateAndRepairGates(result.data);

      // ---- Add imaging gate if any figures were extracted or pasted ----
      const allFigures = [...figures, ...manualFigures];
      if (allFigures.length > 0) {
        caseData.gates.push({
          id: 'imaging',
          icon: 'Image',
          label: 'Figures',
          title: 'Figures from this Case',
          isImageGate: true,
          figures: allFigures,
          officialRead: 'Figures extracted from the source PDF. Use the pen and arrow tools to annotate. Refer to the discussion sections for interpretation context.',
        });
      }


if (tables && tables.length > 0) {
  caseData.gates.push({
    id: 'tables',
    icon: 'ClipboardList',
    label: 'Tables',
    title: 'Tables from this Case',
    isTableGate: true,       // NEW flag, parallel to isImageGate
    tables: [],              // empty; session store holds the real ones
    content: `${tables.length} table${tables.length === 1 ? '' : 's'} extracted from source PDF. Click a table to zoom in.`,
  });
}

      
      // ---- Save case (text-only) to storage; images to session-only store ----
      await saveCase(caseData);
      setSessionFigures(caseData.id, allFigures);
      setSessionTables(caseData.id, tables || []);
      
      if (onSuccess) onSuccess();
      setStatus('success');
      navigate(`/case/${encodeURIComponent(caseData.id)}`);

    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong');
      setStatus('error');
    }
  };

  // ---- Manual image paste ----
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          setManualFigures(prev => [...prev, {
            caption: `Pasted image ${prev.length + 1}`,
            pageNum: null,
            images: [{ url: reader.result, label: '' }],
          }]);
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const removeManualFigure = (idx) => {
    setManualFigures(prev => prev.filter((_, i) => i !== idx));
  };

  const busy = status === 'extracting' || status === 'parsing';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Upload NEJM Case PDF</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" disabled={busy}>
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {status === 'idle' || status === 'error' ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-sage-400 hover:bg-slate-50 transition cursor-pointer"
              >
                <Upload className="mx-auto text-slate-400 mb-3" size={40} />
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Drop a PDF here or click to browse
                </p>
                <p className="text-xs text-slate-500">NEJM Case Records format expected</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>

              {status === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <ImagePlus size={16} className="text-slate-500" />
                  <p className="text-sm font-semibold text-slate-700">Manual image paste (optional)</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  If figure extraction fails or misses images, paste screenshots below before uploading the PDF.
                </p>
                <div
                  onPaste={handlePaste}
                  tabIndex={0}
                  className="min-h-[80px] border border-slate-300 rounded p-3 focus:outline-none focus:ring-2 focus:ring-sage-400"
                >
                  {manualFigures.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      Click here, then paste (⌘V / Ctrl+V) an image
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {manualFigures.map((fig, idx) => (
                        <div key={idx} className="relative group">
                          <img src={fig.images[0].url} alt="" className="w-full h-24 object-contain border border-slate-200 rounded bg-slate-50" />
                          <button
                            onClick={() => removeManualFigure(idx)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : status === 'success' ? (
            <div className="text-center py-8">
              <p className="text-slate-700">Success — loading walkthrough...</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Loader2 className="mx-auto text-sage-600 animate-spin mb-4" size={40} />
              <p className="text-sm font-semibold text-slate-800 mb-1">
                {status === 'extracting' ? 'Extracting from PDF' : 'Parsing case with AI'}
              </p>
              <p className="text-xs text-slate-500">{progress}</p>
              {status === 'parsing' && (
                <p className="text-xs text-slate-400 mt-3">
                  Free-tier model rate limits require sequential processing — this takes ~60 seconds. Grab a coffee.
                </p>
              )}
              {extractedFigures.length > 0 && (
                <p className="text-xs text-slate-500 mt-3">
                  <FileText size={12} className="inline mr-1" />
                  Extracted {extractedFigures.length} figure{extractedFigures.length === 1 ? '' : 's'} from PDF
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
