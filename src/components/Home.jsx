import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Clock, BookOpen } from 'lucide-react';
import { listCases, saveCase, deleteCase } from '../lib/storage.js';
import { SAMPLE_CASE } from '../data/sampleCase.js';

export default function Home() {
  const [cases, setCases] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setCases(listCases());
  }, []);

  const addSampleCase = () => {
    saveCase(SAMPLE_CASE);
    setCases(listCases());
  };

  const removeCase = (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this case from your library? This cannot be undone.')) return;
    deleteCase(id);
    setCases(listCases());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <BookOpen size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Morning Report</h1>
          </div>
          <p className="text-slate-600">
            Stepwise clinical reasoning practice from NEJM Case Records. Upload a case PDF and work through it like morning report.
          </p>
        </header>

        <div className="grid gap-4 mb-8 sm:grid-cols-2">
          <button
            disabled
            className="bg-white border-2 border-dashed border-slate-300 rounded-lg p-6 text-left hover:border-blue-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
            title="PDF upload coming in the next update"
          >
            <div className="flex items-center gap-2 mb-2 text-slate-700">
              <Plus size={20} />
              <span className="font-semibold">Upload PDF</span>
            </div>
            <p className="text-sm text-slate-500">
              Drop an NEJM Case Records PDF to parse it into a walkthrough. <em>(Coming next round)</em>
            </p>
          </button>

          <button
            onClick={addSampleCase}
            className="bg-white border-2 border-slate-200 rounded-lg p-6 text-left hover:border-blue-400 hover:shadow-md transition"
          >
            <div className="flex items-center gap-2 mb-2 text-slate-700">
              <FileText size={20} />
              <span className="font-semibold">Load Sample Case</span>
            </div>
            <p className="text-sm text-slate-500">
              Add the alpha-gal syndrome case to your library to test the walkthrough.
            </p>
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Your Library</h2>
          {cases.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No cases yet. Load the sample case to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/case/${encodeURIComponent(c.id)}`)}
                  className="bg-white rounded-lg border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{c.title}</h3>
                    <p className="text-sm text-slate-500 truncate">{c.source}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                      <Clock size={12} />
                      <span>Added {new Date(c.addedAt).toLocaleDateString()}</span>
                      <span className="mx-1">•</span>
                      <span>{c.caseData.gates?.length || 0} gates</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => removeCase(c.id, e)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
