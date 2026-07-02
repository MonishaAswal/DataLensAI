import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  Database, 
  FileSpreadsheet, 
  Trash2, 
  ExternalLink, 
  AlertCircle, 
  Loader2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

import { datasetService } from '../services/api';

const MyDatasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, activeDataset, setActiveDataset } = useAuth();
  const navigate = useNavigate();

  const fetchDatasets = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await datasetService.getDatasets();
      const mapped = data.map(d => ({
        id: d._id || d.id,
        _id: d._id || d.id,
        ...d
      }));
      setDatasets(mapped);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError('Failed to load datasets from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [user]);

  const handleOpenDataset = (dataset) => {
    setActiveDataset(dataset);
    navigate('/overview');
  };

  const handleDeleteDataset = async (e, dataset) => {
    e.stopPropagation();
    const datasetId = dataset._id || dataset.id;
    if (!window.confirm(`Are you sure you want to permanently delete the dataset "${dataset.fileName || dataset.originalName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      // Call backend DELETE endpoint
      await datasetService.deleteDataset(datasetId);

      // Clear active workspace state if deleted dataset was loaded
      if (activeDataset?._id === datasetId || activeDataset?.id === datasetId) {
        setActiveDataset(null);
      }

      // Update local state
      setDatasets(datasets.filter(d => d.id !== datasetId && d._id !== datasetId));
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      setError('Failed to fully delete dataset from database.');
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
              <Database className="text-indigo-400 animate-pulse-slow" size={28} />
              <span>My Cloud Datasets</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Access your saved datasets, launch active analytical workspaces, or prune cloud storage directories.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/upload')}
            className="self-start px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            Upload New File
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-455 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-450" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          /* Skeletons loader */
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-card rounded-xl p-5 border border-slate-900/60 animate-shimmer min-h-[70px]"></div>
            ))}
          </div>
        ) : datasets.length > 0 ? (
          /* Datasets Grid Card */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {datasets.map((dataset) => {
              const isSelected = activeDataset?.id === dataset.id || activeDataset?._id === dataset.id;
              const dateStr = new Date(dataset.uploadDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div 
                  key={dataset.id}
                  onClick={() => handleOpenDataset(dataset)}
                  className={`glass-card rounded-2xl p-5 border cursor-pointer transition-all flex flex-col justify-between hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-950/5 relative overflow-hidden group ${
                    isSelected ? 'border-indigo-500/40 bg-indigo-500/[0.02] shadow-indigo-950/10' : 'border-slate-800/80 bg-slate-950/10'
                  }`}
                >
                  {/* Active glow tag */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-violet-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                      <Sparkles size={8} />
                      Active Workspace
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 pr-24">
                      <div className={`p-2.5 rounded-xl border ${
                        isSelected ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-900 border-slate-850 text-slate-500'
                      }`}>
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-200 truncate" title={dataset.fileName}>
                          {dataset.fileName}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {(dataset.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-b border-slate-900/60 py-3.5 text-center text-xs font-semibold text-slate-400">
                      <div>
                        <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Rows</span>
                        <span className="font-mono text-slate-200 font-bold">{dataset.rowCount?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Columns</span>
                        <span className="font-mono text-slate-200 font-bold">{dataset.columnCount}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Quality</span>
                        <span className={`font-mono font-bold ${
                          dataset.edaResults?.qualityScore > 85 ? 'text-emerald-400' : dataset.edaResults?.qualityScore > 65 ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {dataset.edaResults?.qualityScore || 100}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-1 border-t border-slate-950/20">
                    <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar size={12} />
                      {dateStr}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteDataset(e, dataset)}
                        className="p-2 bg-slate-900/60 border border-slate-850 hover:border-rose-500/20 text-slate-450 hover:text-rose-400 rounded-xl transition-all"
                        title="Delete dataset"
                      >
                        <Trash2 size={13} />
                      </button>
                      <button
                        onClick={() => handleOpenDataset(dataset)}
                        className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 group-hover:text-indigo-400 group-hover:border-indigo-500/30 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <ExternalLink size={11} />
                        <span>Load</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state view */
          <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 min-h-[300px] flex flex-col items-center justify-center">
            <div className="bg-slate-900/60 p-4 rounded-full text-slate-650 border border-slate-850 mb-4 shadow-md">
              <Database size={30} />
            </div>
            <h4 className="text-sm font-bold text-slate-200">No datasets found in the cloud</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Datasets you analyze and clean will be saved in your Cloud Firestore space.</p>
            
            <button
              onClick={() => navigate('/upload')}
              className="mt-6 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all"
            >
              Analyze your first file
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyDatasets;
