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
  Calendar,
  Sparkles,
  Edit2,
  Check,
  X,
  Upload
} from 'lucide-react';
import { datasetService } from '../services/api';

const MyDatasets = () => {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
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

  const handleStartRename = (e, dataset) => {
    e.stopPropagation();
    setEditingId(dataset._id || dataset.id);
    setEditName(dataset.datasetName || dataset.originalName || dataset.fileName || '');
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleSaveRename = async (e, datasetId) => {
    e.stopPropagation();
    if (!editName.trim()) return;
    try {
      setError('');
      await datasetService.updateDataset(datasetId, { datasetName: editName.trim() });
      
      setDatasets(datasets.map(d => 
        (d.id === datasetId || d._id === datasetId) 
          ? { ...d, datasetName: editName.trim() } 
          : d
      ));
      
      if (activeDataset?._id === datasetId || activeDataset?.id === datasetId) {
        setActiveDataset({ ...activeDataset, datasetName: editName.trim() });
      }
      
      setEditingId(null);
    } catch (err) {
      console.error('Failed to rename dataset:', err);
      setError('Failed to rename dataset.');
    }
  };

  const handleDeleteDataset = async (e, dataset) => {
    e.stopPropagation();
    const datasetId = dataset._id || dataset.id;
    const displayName = dataset.datasetName || dataset.originalName || dataset.fileName || 'this dataset';
    if (!window.confirm(`Are you sure you want to permanently delete the dataset "${displayName}"? This cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      await datasetService.deleteDataset(datasetId);

      if (activeDataset?._id === datasetId || activeDataset?.id === datasetId) {
        setActiveDataset(null);
      }

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
            <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight flex items-center gap-2.5">
              <Database className="text-indigo-400" size={24} />
              <span>Workspace Datasets</span>
            </h2>
            <p className="text-slate-450 text-xs mt-1">
              Select an active workspace dataset to analyze, clean, or download from cloud storage.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Upload size={13} />
            <span>Upload Dataset</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-455" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          /* Skeleton List Table */
          <div className="glass-card rounded-lg border border-slate-900 bg-slate-950/20 overflow-hidden divide-y divide-slate-900">
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-4 flex items-center justify-between gap-6 animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-slate-900"></div>
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-slate-900 rounded w-1/3"></div>
                    <div className="h-2.5 bg-slate-900 rounded w-1/6"></div>
                  </div>
                </div>
                <div className="h-3 bg-slate-900 rounded w-16"></div>
                <div className="h-3 bg-slate-900 rounded w-16"></div>
                <div className="h-6 bg-slate-900 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : datasets.length > 0 ? (
          /* Premium SaaS Datasets Table */
          <div className="glass-card rounded-lg border border-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-4 pl-6">Workspace Name</th>
                    <th className="p-4">Dimensions</th>
                    <th className="p-4">Quality Score</th>
                    <th className="p-4">Uploaded</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {datasets.map((dataset) => {
                    const datasetId = dataset._id || dataset.id;
                    const isSelected = activeDataset?.id === datasetId || activeDataset?._id === datasetId;
                    const isEditing = editingId === datasetId;
                    const dateStr = new Date(dataset.createdAt || dataset.uploadDate || Date.now()).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const displayName = dataset.datasetName || dataset.originalName || dataset.fileName || 'Unnamed Dataset';
                    const score = dataset.edaResults?.quality_score || dataset.edaResults?.qualityScore || dataset.qualityScore || 100;

                    return (
                      <tr 
                        key={datasetId}
                        onClick={() => !isEditing && handleOpenDataset(dataset)}
                        className={`hover:bg-slate-950/30 cursor-pointer transition-colors group ${
                          isSelected ? 'bg-indigo-500/[0.01]' : ''
                        }`}
                      >
                        {/* Name */}
                        <td className="p-4 pl-6 flex items-center gap-3">
                          <div className={`p-2 rounded border ${
                            isSelected ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-slate-950 border-slate-900 text-slate-550'
                          }`}>
                            <FileSpreadsheet size={15} />
                          </div>
                          
                          <div className="overflow-hidden flex-1 max-w-[280px]">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  className="bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-xs text-slate-101 focus:outline-none w-full font-bold"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => handleSaveRename(e, datasetId)}
                                  className="p-1.5 bg-indigo-650 hover:bg-indigo-600 rounded text-white"
                                >
                                  <Check size={11} />
                                </button>
                                <button
                                  onClick={handleCancelRename}
                                  className="p-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded text-slate-400"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group/name">
                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-slate-101' : 'text-slate-350'}`}>
                                  {displayName}
                                </span>
                                
                                {isSelected && (
                                  <span className="flex items-center gap-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md scale-90">
                                    Active
                                  </span>
                                )}

                                <button
                                  onClick={(e) => handleStartRename(e, dataset)}
                                  className="p-0.5 text-slate-500 hover:text-indigo-400 opacity-0 group-hover/name:opacity-100 transition-opacity"
                                  title="Rename workspace"
                                >
                                  <Edit2 size={10} />
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] text-slate-550 font-mono mt-0.5 truncate">{dataset.originalName || dataset.fileName}</p>
                          </div>
                        </td>

                        {/* Dimensions */}
                        <td className="p-4 font-mono text-[11px]">
                          <span className="text-slate-205 font-bold">{dataset.rowCount?.toLocaleString()}</span> rows • <span className="text-slate-205 font-bold">{dataset.columnCount}</span> cols
                        </td>

                        {/* Quality Score */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-xs ${
                              score > 80 ? 'text-emerald-450' : score > 60 ? 'text-amber-450' : 'text-rose-450'
                            }`}>
                              {score}%
                            </span>
                            <div className="w-12 bg-slate-900 h-1 rounded-full overflow-hidden">
                              <div className={`h-full ${
                                score > 80 ? 'bg-emerald-450' : score > 60 ? 'bg-amber-450' : 'bg-rose-450'
                              }`} style={{ width: `${score}%` }}></div>
                            </div>
                          </div>
                        </td>

                        {/* Upload Date */}
                        <td className="p-4 font-mono text-[11px] text-slate-500">
                          {dateStr}
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={(e) => handleDeleteDataset(e, dataset)}
                              className="p-1.5 bg-slate-950 border border-slate-900 hover:border-rose-500/10 text-slate-550 hover:text-rose-450 rounded-lg transition-colors"
                              title="Delete dataset"
                            >
                              <Trash2 size={12} />
                            </button>
                            <button
                              onClick={() => handleOpenDataset(dataset)}
                              className="px-2.5 py-1 bg-slate-950 border border-slate-900 text-slate-350 hover:text-indigo-400 hover:border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink size={10} />
                              <span>Load</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="glass-card rounded-lg p-12 text-center border border-slate-900 min-h-[280px] flex flex-col items-center justify-center">
            <div className="bg-slate-950 p-4 rounded-lg text-slate-550 border border-slate-900 mb-4">
              <Database size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-202">No cloud datasets found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Upload tabular Excel or CSV datasets to launch workspace analysis.</p>
            
            <button
              onClick={() => navigate('/upload')}
              className="mt-6 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
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
