import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { datasetService, historyService } from '../services/api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import DataPreviewTable from '../components/DataPreviewTable';
import { 
  Database, 
  Grid, 
  Cpu, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Edit2,
  Check,
  X,
  Clock,
  ExternalLink,
  Trash2,
  ArrowRight,
  Sparkles,
  Brain,
  Layers,
  FileSpreadsheet,
  FileText
} from 'lucide-react';

const Dashboard = ({ isTabbed = false }) => {
  const { activeDataset, setActiveDataset } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overviewData, setOverviewData] = useState(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempName, setTempName] = useState('');

  // Landing page states
  const [userDatasets, setUserDatasets] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const wrapLayout = (el) => {
    if (isTabbed) return el;
    return <Layout>{el}</Layout>;
  };

  useEffect(() => {
    const fetchWorkspaceHistory = async () => {
      if (activeDataset?._id || activeDataset?.id) return;
      try {
        setWorkspaceLoading(true);
        setWorkspaceError('');
        const [datasets, history] = await Promise.all([
          datasetService.getDatasets(),
          historyService.getHistory()
        ]);
        const mappedDatasets = datasets.map(d => ({
          id: d._id || d.id,
          _id: d._id || d.id,
          ...d
        }));
        setUserDatasets(mappedDatasets || []);
        setRecentActivity(history || []);
      } catch (err) {
        console.error('Failed to load workspace history:', err);
        setWorkspaceError('Failed to retrieve previously analyzed datasets or recent activity.');
      } finally {
        setWorkspaceLoading(false);
      }
    };
    fetchWorkspaceHistory();
  }, [activeDataset]);

  const handleOpenDataset = (dataset) => {
    const activePayload = {
      id: dataset._id || dataset.id,
      _id: dataset._id || dataset.id,
      ...dataset
    };
    setActiveDataset(activePayload);
  };

  const handleDeleteDataset = async (e, datasetId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this dataset? This cannot be undone.')) {
      return;
    }
    try {
      setWorkspaceError('');
      await datasetService.deleteDataset(datasetId);
      setUserDatasets(userDatasets.filter(d => d._id !== datasetId && d.id !== datasetId));
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      setWorkspaceError('Failed to delete dataset.');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Smart AI Imputation':
        return <Brain className="text-violet-400" size={16} />;
      case 'Standard Sanitization':
        return <CheckCircle2 className="text-emerald-400" size={16} />;
      case 'AI Insights Generation':
        return <Sparkles className="text-indigo-400" size={16} />;
      case 'Visualization Generation':
        return <Layers className="text-cyan-400" size={16} />;
      default:
        return <FileSpreadsheet className="text-slate-500" size={16} />;
    }
  };

  const handleOpenReportModal = (logItem) => {
    let parsedReport = null;
    try {
      parsedReport = JSON.parse(logItem.report);
    } catch (e) {
      parsedReport = logItem.report;
    }

    setSelectedReport({
      ...logItem,
      details: parsedReport
    });
    setShowModal(true);
  };

  const renderLandingDashboard = () => {
    if (workspaceLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Retrieving previous dataset analysis histories...</p>
        </div>
      );
    }

    return (
      <div className="space-y-10 animate-fade-in max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 border-b border-slate-900 pb-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
              <span>Welcome Back!</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Analyze, clean, and explore your tabular datasets using machine learning and AI insights.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/upload')}
            className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg hover:shadow-indigo-600/10 active:scale-[0.98] transition-all"
          >
            Upload New Dataset
          </button>
        </div>

        {workspaceError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold">
            {workspaceError}
          </div>
        )}

        {/* Previously Analyzed Datasets */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Database className="text-indigo-400" size={20} />
            <h3 className="text-base font-extrabold text-slate-205">Previously Analyzed Datasets</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userDatasets.length === 0 ? (
              <div className="glass-card rounded-2xl p-10 text-center border border-slate-800/80 min-h-[220px] flex flex-col items-center justify-center col-span-full">
                <div className="bg-slate-900/60 p-3.5 rounded-full text-slate-600 border border-slate-850 mb-3.5 shadow-md">
                  <Database size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-355">No datasets found in account</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Upload your first CSV or Excel file to launch AI data-cleaning pipelines.</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Upload Dataset
                </button>
              </div>
            ) : (
              userDatasets.map((dataset) => {
                const score = dataset.edaResults?.quality_score || dataset.qualityScore || 85;
                const dateStr = new Date(dataset.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const sizeKb = (dataset.size / 1024).toFixed(1);
                
                return (
                  <div key={dataset._id || dataset.id} className="glass-card rounded-2xl border border-slate-855 p-5 shadow-lg hover:border-indigo-500/30 transition-all flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                            <FileSpreadsheet size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-slate-200 truncate pr-2" title={dataset.datasetName || dataset.originalName}>
                              {dataset.datasetName || dataset.originalName}
                            </h4>
                            <p className="text-[10px] text-slate-505 mt-0.5 font-semibold">Uploaded on {dateStr}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDataset(e, dataset._id || dataset.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-500 hover:text-rose-455 hover:border-rose-500/30 transition-all flex-shrink-0"
                          title="Delete dataset permanently"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5 py-3.5 border-y border-slate-900/60 text-xs font-semibold text-slate-400">
                        <div>
                          <span className="text-[9px] text-slate-655 block uppercase tracking-wider">Dimensions</span>
                          <span className="text-slate-250 font-mono mt-0.5 block">{dataset.rowCount?.toLocaleString()} × {dataset.columnCount}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-655 block uppercase tracking-wider">File Size</span>
                          <span className="text-slate-250 font-mono mt-0.5 block">{sizeKb} KB</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-bold uppercase tracking-wider">Quality Score</span>
                          <span className={`font-mono font-bold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{score}/100</span>
                        </div>
                        <div className="w-full bg-slate-900/80 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenDataset(dataset)}
                      className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-850 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-cyan-600 group-hover:text-white border border-slate-800/80 hover:border-transparent text-slate-350 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center gap-2.5">
            <History className="text-indigo-400" size={20} />
            <h3 className="text-base font-extrabold text-slate-205">Recent Activity</h3>
          </div>
          
          <div className="glass-card rounded-2xl border border-slate-800/80 p-5 space-y-3.5 shadow-lg">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No audit history entries logged yet.</p>
            ) : (
              recentActivity.slice(0, 5).map((item) => {
                const activityDate = new Date(item.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={item._id || item.id} className="p-3.5 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-850 flex-shrink-0">
                        {getIcon(item.operationType)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-200 block truncate">{item.operationType}</span>
                        <span className="text-[10px] text-slate-505 block truncate font-semibold mt-0.5">Dataset: {item.datasetName} • {activityDate}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleOpenReportModal(item)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 rounded-xl font-bold uppercase tracking-wider text-[9px] flex items-center gap-1 transition-all flex-shrink-0"
                    >
                      <FileText size={12} />
                      <span>Report</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Dialog for displaying Operation Report details */}
        {showModal && selectedReport && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500"></div>
              
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-900/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getIcon(selectedReport.operationType)}
                    <h3 className="text-base font-black text-slate-200">{selectedReport.operationType} Report</h3>
                  </div>
                  <p className="text-[10px] text-slate-505 font-semibold font-mono">Dataset: {selectedReport.datasetName}</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 bg-slate-900 border border-slate-855 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs leading-relaxed text-slate-350">
                {/* Standard Sanitization Report */}
                {selectedReport.operationType === 'Standard Sanitization' && selectedReport.details && (
                  <div className="space-y-4 font-semibold">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Rows Offset</span>
                        <span className="font-mono text-slate-200 text-sm font-black">
                          {selectedReport.details.rowCountBefore} ➔ {selectedReport.details.rowCountAfter}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Columns Offset</span>
                        <span className="font-mono text-slate-200 text-sm font-black">
                          {selectedReport.details.colCountBefore} ➔ {selectedReport.details.colCountAfter}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Modifications Applied:</span>
                      <ul className="space-y-1.5">
                        {selectedReport.details.summary?.map((act, i) => (
                          <li key={i} className="bg-slate-900/40 border border-slate-900 px-3.5 py-2 rounded-lg flex items-center gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450"></span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Smart AI Imputation Report */}
                {selectedReport.operationType === 'Smart AI Imputation' && selectedReport.details && (
                  <div className="space-y-4 font-semibold">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Total Null Cells Before</span>
                        <span className="font-mono text-slate-200 text-sm font-black text-rose-450">{selectedReport.details.beforeCount}</span>
                      </div>
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Total Null Cells After</span>
                        <span className="font-mono text-slate-200 text-sm font-black text-emerald-400">{selectedReport.details.afterCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[9px] text-slate-555 font-bold uppercase tracking-wider">Imputed Dimensions list:</span>
                      <div className="space-y-2">
                        {selectedReport.details.summary?.map((col, i) => (
                          <div key={i} className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-lg flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-200">{col.column}</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-500 uppercase tracking-widest font-mono rounded">
                                {col.type}
                              </span>
                            </div>
                            <div className="text-slate-450 text-[11px]">
                              Method: <span className="text-indigo-400 font-extrabold">{col.method}</span>
                            </div>
                            <div className="text-slate-505 text-[10px] mt-1 flex flex-wrap gap-1 font-mono">
                              Sample Predictions: {col.samplePredictions?.join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Insights Generation (markdown) */}
                {selectedReport.operationType === 'AI Insights Generation' && (
                  <div className="markdown-content font-medium bg-slate-900/20 border border-slate-900 p-4 rounded-xl max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-[10.5px] leading-relaxed text-slate-300">
                    {selectedReport.report}
                  </div>
                )}

                {/* Visualization Generation details */}
                {selectedReport.operationType === 'Visualization Generation' && (
                  <div className="p-4 bg-slate-900/35 border border-slate-900 text-center rounded-xl font-bold">
                    <Layers className="mx-auto text-cyan-400 mb-2.5" size={24} />
                    <p className="text-slate-350">Visualized Category Densities and Correlation Matrix grids in workspace.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-900 bg-slate-950 text-right">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchOverview = async () => {
      if (!activeDataset?._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const data = await datasetService.getOverview(activeDataset._id);
        setOverviewData(data);
      } catch (err) {
        console.error('Error fetching overview:', err);
        setError(err.response?.data?.message || 'Failed to load dataset overview statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [activeDataset?._id]);

  if (loading) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Loader2 size={36} className="text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold">Loading dataset overview details...</p>
      </div>
    );
  }

  if (error) {
    return wrapLayout(
      <div className="glass-card rounded-2xl p-8 border border-rose-500/20 bg-rose-500/5 text-center my-6">
        <h4 className="text-rose-500 font-extrabold text-sm mb-2">Error Loading Overview</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{error}</p>
      </div>
    );
  }

  if (!activeDataset || !overviewData) {
    return wrapLayout(renderLandingDashboard());
  }

  const {
    originalName,
    datasetName,
    rowCount,
    columnCount,
    size,
    duplicateCount,
    missingValueCount,
    qualityScore,
    qualityScoreBreakdown,
    columns,
    previewRows,
    cleaningActions,
    createdAt
  } = overviewData;

  const displayName = datasetName || originalName;

  const handleRename = async () => {
    if (!tempName.trim() || tempName === displayName) {
      setIsRenaming(false);
      return;
    }
    try {
      setError('');
      await datasetService.updateDataset(activeDataset._id || activeDataset.id, { datasetName: tempName.trim() });
      const updated = { ...activeDataset, datasetName: tempName.trim() };
      setActiveDataset(updated);
      setOverviewData(prev => ({ ...prev, datasetName: tempName.trim() }));
      setIsRenaming(false);
    } catch (err) {
      console.error('Failed to rename dataset:', err);
      setError('Failed to rename dataset.');
    }
  };

  // Format uploaded time
  const uploadDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return wrapLayout(
    <div className="space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-3">
              <span>Dataset Overview</span>
            </h2>
            <div className="text-slate-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
              <span>General characteristics, columns, and previews of:</span>
              {isRenaming ? (
                <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-indigo-500/30">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-transparent text-indigo-400 font-bold border-none outline-none text-xs w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                  />
                  <button onClick={handleRename} className="text-emerald-400 hover:text-emerald-300">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setIsRenaming(false)} className="text-rose-400 hover:text-rose-350">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">{displayName}</span>
                  <button
                    onClick={() => {
                      setTempName(displayName);
                      setIsRenaming(true);
                    }}
                    className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                    title="Rename dataset"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status:</span>
            {overviewData.status === 'cleaned' ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 size={14} />
                <span>Sanitized</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Analyzed</span>
              </span>
            )}
          </div>
        </div>

        {/* Quality Score Breakdown Detail */}
        {qualityScoreBreakdown && Object.keys(qualityScoreBreakdown).length > 0 && (
          <div className="glass-card rounded-2xl p-5 border border-slate-850 bg-slate-950/20 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Data Quality Score Breakdown</h3>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Final score: {qualityScore}/100</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Base</span>
                <span className="font-mono text-xs font-bold text-slate-300">100.0</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Nulls</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.missing_values_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Dups</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.duplicates_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Outliers</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.outliers_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Constants</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.constant_columns_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Cardinality</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.cardinality_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Correlations</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.correlation_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Imbalance</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.imbalance_penalty || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Overview StatCards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            title="Rows Count" 
            value={rowCount.toLocaleString()} 
            icon={Database} 
            subtext="Total records in dataset"
            color="indigo"
          />
          <StatCard 
            title="Columns Count" 
            value={columnCount.toLocaleString()} 
            icon={Grid} 
            subtext="Available dimensions/features"
            color="cyan"
          />
          <StatCard 
            title="Data Quality Score" 
            value={`${qualityScore}/100`} 
            icon={Cpu} 
            subtext="Calculated database health"
            color={qualityScore > 80 ? 'emerald' : qualityScore > 50 ? 'amber' : 'rose'}
          />
          <StatCard 
            title="Quality Issues" 
            value={duplicateCount + missingValueCount > 0 ? "Issues Found" : "Perfect Health"} 
            icon={AlertTriangle} 
            subtext={`${duplicateCount} dups | ${missingValueCount} nulls`}
            color={duplicateCount + missingValueCount > 0 ? 'rose' : 'emerald'}
          />
        </div>

        {/* Dataset Details & Column Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-1 space-y-6">
            <h4 className="text-sm font-bold text-slate-300">File Metadata</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Filename</p>
                <p className="text-xs font-semibold text-slate-300 truncate mt-1" title={originalName}>
                  {originalName}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Analysis Timestamp</p>
                <p className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-500" />
                  <span>{uploadDate}</span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">File Size</p>
                <p className="text-xs font-semibold text-slate-300 font-mono mt-1">
                  {(size / 1024).toFixed(2)} KB
                </p>
              </div>

              {cleaningActions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sanitizer Actions History</p>
                  <ul className="space-y-1.5">
                    {cleaningActions.map((action, i) => (
                      <li key={i} className="text-[10px] bg-emerald-500/5 text-emerald-400 font-semibold border border-emerald-500/10 px-2 py-1 rounded">
                        ✓ {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Columns Definitions Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-2 flex flex-col">
            <h4 className="text-sm font-bold text-slate-300 mb-4">Features list & Datatypes</h4>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-900 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-950 font-semibold">
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Feature Name</th>
                    <th className="px-4 py-2.5">Detected Type</th>
                    <th className="px-4 py-2.5">Null Values Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-medium text-slate-300">
                  {columns.map((col, idx) => {
                    const missingInfo = activeDataset.edaResults?.missing_analysis?.[col.name];
                    const hasMissing = missingInfo && missingInfo.count > 0;
                    
                    return (
                      <tr key={col.name} className="hover:bg-slate-900/10">
                        <td className="px-4 py-2 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-4 py-2 font-bold text-slate-200">{col.name}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                          {col.type}
                        </td>
                        <td className="px-4 py-2">
                          {hasMissing ? (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${missingInfo.percentage > 15 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {missingInfo.count} null ({missingInfo.percentage}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded">
                              0% (None)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Data Sample Preview Box */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <DataPreviewTable 
            rows={previewRows || []} 
            columns={columns || []} 
          />
        </div>
      </div>
  );
};

export default Dashboard;
