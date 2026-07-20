
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Clock, BookOpen } from 'lucide-react';
import { listCases, deleteCase } from '../lib/storage.js';

export default function Home() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = async () => {
    setLoading(true);
    setCases(await listCases());
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const removeCase = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this case? This cannot be undone.')) return;
    await deleteCase(id);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-sage-600 text-white p-2 rounded-lg">
              <BookOpen size={24} />
            </div>
            <h1 className="text-3xl font-bold text-stone-900">Morning Report</h1>
          </div>
          <p className="text-stone-600">
            Interactive clinical reasoning workspace built around the source PDF. Upload a case, define reading gates, and work through it as if it were morning report.
          </p>
        </header>

        <div className="grid gap-4 mb-8">
          <button
            onClick={() => navigate('/author')}
            className="bg-white border-2 border-dashed border-stone-300 rounded-lg p-6 text-left hover:border-sage-400 hover:shadow-md transition"
          >
            <div className="flex items-center gap-2 mb-2 text-stone-700">
              <Plus size={20} />
              <span className="font-semibold">New Case — Upload PDF</span>
            </div>
            <p className="text-sm text-stone-500">
              Drop a PDF, define which pages are the case content, and set reading gates.
            </p>
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-stone-800 mb-3">Your Library</h2>
          {loading ? (
            <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-stone-500 text-sm">
              Loading...
            </div>
          ) : cases.length === 0 ? (
            <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-stone-500">
              No cases yet. Upload a PDF to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {cases.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/case/${encodeURIComponent(c.id)}`)}
                  className="bg-white rounded-lg border border-stone-200 p-4 hover:border-sage-400 hover:shadow-md transition cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-stone-900 truncate">{c.title}</h3>
                    <p className="text-sm text-stone-500 truncate">{c.source}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-stone-400">
                      <Clock size={12} />
                      <span>Added {new Date(c.addedAt).toLocaleDateString()}</span>
                      <span className="mx-1">•</span>
                      <span>{c.gates?.length || 0} gates</span>
                      <span className="mx-1">•</span>
                      <span>{c.totalPages || '?'} pages</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => removeCase(c.id, e)}
                    className="text-stone-400 hover:text-red-600 p-1 rounded transition"
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

