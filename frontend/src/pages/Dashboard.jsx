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
  CheckCircle,
  Loader2,
  Edit2,
  Check,
  X,
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
        return <Brain className="text-indigo-400" size={13} />;
      case 'Standard Sanitization':
        return <CheckCircle className="text-emerald-450" size={13} />;
      case 'AI Insights Generation':
        return <Sparkles className="text-cyan-400" size={13} />;
      case 'Visualization Generation':
        return <Layers className="text-indigo-400" size={13} />;
      default:
        return <FileSpreadsheet className="text-slate-555" size={13} />;
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
        <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
          <Loader2 size={24} className="text-indigo-500 animate-spin" />
          <p className="text-slate-450 text-xs font-semibold">Retrieving dataset workspace history...</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-900 pb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight">Analytics Workspace</h2>
            <p className="text-slate-450 text-xs mt-1">
              Select a previously analyzed dataset or upload a new spreadsheet file to launch your AI cleaning pipeline.
            </p>
          </div>
          
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>Upload New Dataset</span>
          </button>
        </div>

        {workspaceError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold">
            {workspaceError}
          </div>
        )}

        {/* Previously Analyzed Datasets */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="text-slate-450" size={16} />
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Recently Accessed Datasets</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {userDatasets.length === 0 ? (
              <div className="glass-card rounded-lg p-10 text-center border border-slate-900 min-h-[200px] flex flex-col items-center justify-center col-span-full">
                <div className="bg-slate-950 p-3 rounded-lg text-slate-550 border border-slate-900 mb-4">
                  <Database size={22} />
                </div>
                <h4 className="text-xs font-bold text-slate-202">No workspace datasets found</h4>
                <p className="text-[11px] text-slate-550 mt-1 max-w-xs">Upload your first CSV or Excel file to get started.</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="mt-4 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
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
                  <div key={dataset._id || dataset.id} className="glass-card rounded-lg p-5 border border-slate-900 flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 rounded bg-slate-950 border border-slate-900 text-slate-550 flex-shrink-0">
                            <FileSpreadsheet size={15} />
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-slate-202 truncate pr-2" title={dataset.datasetName || dataset.originalName}>
                              {dataset.datasetName || dataset.originalName}
                            </h4>
                            <p className="text-[9px] text-slate-550 mt-0.5">Uploaded {dateStr}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteDataset(e, dataset._id || dataset.id)}
                          className="p-1.5 rounded bg-slate-950 border border-slate-900 text-slate-550 hover:text-rose-455 hover:border-rose-500/20 transition-colors flex-shrink-0"
                          title="Delete dataset permanently"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-900 text-[10px] font-semibold text-slate-450">
                        <div>
                          <span className="text-[8px] text-slate-550 block uppercase tracking-wider">Dimensions</span>
                          <span className="text-slate-205 font-mono mt-0.5 block">{dataset.rowCount?.toLocaleString()} × {dataset.columnCount}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-550 block uppercase tracking-wider">Size</span>
                          <span className="text-slate-205 font-mono mt-0.5 block">{sizeKb} KB</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-bold">
                          <span className="text-slate-550 uppercase tracking-wider">Quality Score</span>
                          <span className={`font-mono ${score >= 80 ? 'text-emerald-455' : score >= 50 ? 'text-amber-455' : 'text-rose-455'}`}>{score}%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                          <div 
                            className={`h-full ${score >= 80 ? 'bg-emerald-450' : score >= 50 ? 'bg-amber-450' : 'bg-rose-450'}`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenDataset(dataset)}
                      className="w-full mt-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-indigo-500/20 text-slate-350 hover:text-indigo-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight size={11} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center gap-2">
            <History className="text-slate-450" size={16} />
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Recent Activity</h3>
          </div>
          
          <div className="glass-card rounded-lg border border-slate-900 p-4 space-y-2">
            {recentActivity.length === 0 ? (
              <p className="text-[11px] text-slate-550 italic text-center py-4">No operations executed yet.</p>
            ) : (
              recentActivity.slice(0, 4).map((item) => {
                const activityDate = new Date(item.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div key={item._id || item.id} className="p-3 bg-slate-950 border border-slate-900 rounded-lg flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-1.5 rounded bg-slate-900 border border-slate-850 flex-shrink-0">
                        {getIcon(item.operationType)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-slate-205 block truncate">{item.operationType}</span>
                        <span className="text-[9px] text-slate-500 block truncate font-mono mt-0.5">Dataset: {item.datasetName} • {activityDate}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleOpenReportModal(item)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-850 text-slate-400 hover:text-indigo-400 rounded-lg font-bold uppercase tracking-wider text-[9px] flex items-center gap-1 transition-colors flex-shrink-0"
                    >
                      <FileText size={10} />
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
          <div className="fixed inset-0 bg-slate-955/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-slate-950 border border-slate-900 rounded-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-950">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getIcon(selectedReport.operationType)}
                    <h3 className="text-sm font-bold text-slate-202">{selectedReport.operationType} Report</h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Dataset: {selectedReport.datasetName}</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-202 rounded-lg transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs leading-relaxed text-slate-350">
                {selectedReport.operationType === 'Standard Sanitization' && selectedReport.details && (
                  <div className="space-y-4 font-semibold">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Rows Offset</span>
                        <span className="font-mono text-slate-202 text-xs font-black">
                          {selectedReport.details.rowCountBefore} ➔ {selectedReport.details.rowCountAfter}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Columns Offset</span>
                        <span className="font-mono text-slate-202 text-xs font-black">
                          {selectedReport.details.colCountBefore} ➔ {selectedReport.details.colCountAfter}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Modifications Applied:</span>
                      <ul className="space-y-1.5">
                        {selectedReport.details.summary?.map((act, i) => (
                          <li key={i} className="bg-slate-900/20 border border-slate-900 px-3 py-2 rounded-lg flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-450"></span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {selectedReport.operationType === 'Smart AI Imputation' && selectedReport.details && (
                  <div className="space-y-4 font-semibold">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Total Null Cells Before</span>
                        <span className="font-mono text-slate-202 text-xs font-black text-rose-455">{selectedReport.details.beforeCount}</span>
                      </div>
                      <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Total Null Cells After</span>
                        <span className="font-mono text-slate-202 text-xs font-black text-emerald-450">{selectedReport.details.afterCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[9px] text-slate-555 font-bold uppercase tracking-wider">Imputed Columns:</span>
                      <div className="space-y-2">
                        {selectedReport.details.summary?.map((col, i) => (
                          <div key={i} className="bg-slate-900/20 border border-slate-900 p-3 rounded-lg flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-202">{col.column}</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-500 uppercase tracking-widest font-mono rounded">
                                {col.type}
                              </span>
                            </div>
                            <div className="text-slate-455 text-[10px]">
                              Method: <span className="text-indigo-400 font-extrabold">{col.method}</span>
                            </div>
                            {col.samplePredictions && col.samplePredictions.length > 0 && (
                              <div className="text-slate-550 text-[9px] mt-1 flex flex-wrap gap-1 font-mono">
                                Sample Predictions: {col.samplePredictions?.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport.operationType === 'AI Insights Generation' && (
                  <div className="markdown-content font-medium bg-slate-900/20 border border-slate-900 p-4 rounded-lg max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-300">
                    {selectedReport.report}
                  </div>
                )}

                {selectedReport.operationType === 'Visualization Generation' && (
                  <div className="p-4 bg-slate-900/20 border border-slate-900 text-center rounded-lg font-bold">
                    <Layers className="mx-auto text-indigo-400 mb-2.5" size={20} />
                    <p className="text-slate-350">Visualized Category Densities and Correlation Matrix grids in workspace.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-900 bg-slate-950 text-right">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-355 hover:text-slate-202 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
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
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
        <Loader2 size={24} className="text-indigo-500 animate-spin" />
        <p className="text-slate-455 text-xs font-semibold">Loading dataset analytics profile...</p>
      </div>
    );
  }

  if (error) {
    return wrapLayout(
      <div className="glass-card rounded-lg p-8 border border-rose-500/10 bg-rose-500/5 text-center my-6">
        <h4 className="text-rose-455 font-bold text-xs mb-2">Error Loading Workspace</h4>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-4">{error}</p>
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
    createdAt,
    data_quality_issues
  } = overviewData;

  const totalIssues = data_quality_issues?.length || 0;
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

  const uploadDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return wrapLayout(
    <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight">Dataset Dashboard</h2>
            <div className="text-slate-455 text-xs mt-1 flex items-center gap-2 flex-wrap">
              <span>Profiling database features for workspace:</span>
              {isRenaming ? (
                <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-indigo-500/35">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-transparent text-indigo-400 font-bold border-none outline-none text-[11px] w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setIsRenaming(false);
                    }}
                  />
                  <button onClick={handleRename} className="text-emerald-450 hover:text-emerald-400">
                    <Check size={12} />
                  </button>
                  <button onClick={() => setIsRenaming(false)} className="text-rose-450 hover:text-rose-400">
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-indigo-405 font-bold bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 text-[11px]">{displayName}</span>
                  <button
                    onClick={() => {
                      setTempName(displayName);
                      setIsRenaming(true);
                    }}
                    className="text-slate-550 hover:text-indigo-400 transition-colors p-1"
                    title="Rename dataset"
                  >
                    <Edit2 size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 border border-slate-900 rounded-lg">
            <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider">Status:</span>
            {overviewData.status === 'cleaned' ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-450 font-bold uppercase tracking-wider">
                <CheckCircle size={12} />
                <span>Sanitized</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                <span className="w-1 h-1 rounded-full bg-indigo-550 animate-pulse"></span>
                <span>Analyzed</span>
              </span>
            )}
          </div>
        </div>

        {/* Quality Score Breakdown Detail */}
        {qualityScoreBreakdown && Object.keys(qualityScoreBreakdown).length > 0 && (
          <div className="glass-card rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-350">Quality Score Deductions Audit</h3>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Score: {qualityScore}/100</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-500 block uppercase tracking-wider mb-1">Base</span>
                <span className="font-mono text-xs font-bold text-slate-300">100</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-500 block uppercase tracking-wider mb-1">Nulls</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.missing_values_penalty || 0}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-500 block uppercase tracking-wider mb-1">Dups</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.duplicates_penalty || 0}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-500 block uppercase tracking-wider mb-1">Outliers</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.outliers_penalty || 0}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-550 block uppercase tracking-wider mb-1">Constants</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.constant_columns_penalty || 0}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-550 block uppercase tracking-wider mb-1">Cardinality</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.cardinality_penalty || 0}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-550 block uppercase tracking-wider mb-1">Correlations</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.correlation_penalty || 0}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-900 rounded-lg text-center">
                <span className="text-[8px] text-slate-550 block uppercase tracking-wider mb-1">Imbalance</span>
                <span className="font-mono text-xs font-bold text-rose-455">-{qualityScoreBreakdown.imbalance_penalty || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Overview StatCards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            title="Total Records" 
            value={rowCount.toLocaleString()} 
            icon={Database} 
            subtext="Rows in dataset"
            color="indigo"
          />
          <StatCard 
            title="Total Columns" 
            value={columnCount.toLocaleString()} 
            icon={Grid} 
            subtext="Available features"
            color="cyan"
          />
          <StatCard 
            title="Quality Index" 
            value={`${qualityScore}%`} 
            icon={Cpu} 
            subtext="Calculated profile health"
            color={qualityScore > 80 ? 'emerald' : qualityScore > 50 ? 'amber' : 'rose'}
          />
          <StatCard 
            title="Quality Concerns" 
            value={totalIssues > 0 ? `${totalIssues} Concerns` : "Clean Health"} 
            icon={AlertTriangle} 
            subtext={`${duplicateCount} dups • ${missingValueCount} null cells`}
            color={totalIssues > 0 ? 'rose' : 'emerald'}
          />
        </div>

        {/* Automated Quality Flags */}
        <div className="glass-card rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-900 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-550" size={16} />
              <h3 className="text-[10px] font-bold text-slate-202 uppercase tracking-wider">Quality Audits & Alerts</h3>
            </div>
            <span className="text-[9px] bg-slate-950 border border-slate-900 text-slate-450 font-bold px-2 py-0.5 rounded font-mono">
              {totalIssues} flagged anomalies
            </span>
          </div>

          {totalIssues === 0 ? (
            <div className="p-8 text-center space-y-2.5">
              <CheckCircle size={24} className="text-emerald-450 mx-auto" />
              <p className="text-xs font-bold text-slate-205">No Quality Issues Flagged</p>
              <p className="text-[11px] text-slate-550 max-w-sm mx-auto">This dataset passed all sanitization rules including duplicates, formatting inconsistency, numeric boundary errors, and outliers audits.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-955 text-slate-450 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-3 pl-4">Column/Feature</th>
                    <th className="p-3">Audit Concern</th>
                    <th className="p-3">Severity</th>
                    <th className="p-3 pr-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {data_quality_issues.map((issue, idx) => {
                    const sev = (issue.severity || 'low').toLowerCase();
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-950/20">
                        <td className="p-3 pl-4 font-bold text-slate-205 font-mono text-[10.5px]">
                          {issue.column || 'Dataset Context'}
                        </td>
                        <td className="p-3 font-semibold text-slate-300">
                          {issue.issue}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${
                            sev === 'high' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' : 
                            sev === 'medium' ? 'bg-amber-500/10 text-amber-450 border border-amber-500/20' : 
                            'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          }`}>
                            {issue.severity || 'low'}
                          </span>
                        </td>
                        <td className="p-3 pr-4 text-slate-450 text-[10.5px] leading-relaxed max-w-[280px]">
                          {issue.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dataset Details & Column Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="glass-card rounded-lg p-5 space-y-5">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-350 border-b border-slate-900 pb-2">File Characteristics</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">File path in cloud</p>
                <p className="text-xs font-bold text-slate-205 truncate mt-1" title={originalName}>
                  {originalName}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">Last Profile Check</p>
                <p className="text-xs font-bold text-slate-205 mt-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-550" />
                  <span>{uploadDate}</span>
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">Storage size</p>
                <p className="text-xs font-bold text-slate-205 font-mono mt-1">
                  {(size / 1024).toFixed(2)} KB
                </p>
              </div>

              {cleaningActions?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-2">Sanitization Run Pipeline</p>
                  <ul className="space-y-1">
                    {cleaningActions.map((action, i) => (
                      <li key={i} className="text-[9.5px] bg-emerald-500/5 text-emerald-450 font-bold border border-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <span>✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Columns Definitions Card */}
          <div className="glass-card rounded-lg p-5 lg:col-span-2 flex flex-col">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-350 border-b border-slate-900 pb-2 mb-3">Feature Columns Datatypes</h4>
            
            <div className="flex-1 overflow-y-auto max-h-[250px] border border-slate-900 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-2.5 pl-4">#</th>
                    <th className="p-2.5">Dimension Name</th>
                    <th className="p-2.5">Datatype</th>
                    <th className="p-2.5 pr-4">Null Cell Metrics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {columns.map((col, idx) => {
                    const missingInfo = activeDataset.edaResults?.missing_analysis?.[col.name];
                    const hasMissing = missingInfo && missingInfo.count > 0;
                    
                    return (
                      <tr key={col.name} className="hover:bg-slate-955/40">
                        <td className="p-2.5 pl-4 font-mono text-slate-550">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-205">{col.name}</td>
                        <td className="p-2.5">
                          <span className="font-mono text-[9px] text-slate-450 border border-slate-850 px-1.5 py-0.5 rounded bg-slate-950 font-bold uppercase tracking-wider">
                            {col.type}
                          </span>
                        </td>
                        <td className="p-2.5 pr-4">
                          {hasMissing ? (
                            <span className={`inline-block px-2 py-0.5 text-[9.5px] font-bold rounded ${
                              missingInfo.percentage > 15 
                                ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' 
                                : 'bg-amber-500/5 text-amber-450 border border-amber-500/10'
                            }`}>
                              {missingInfo.count} nulls ({missingInfo.percentage}%)
                            </span>
                          ) : (
                            <span className="inline-block text-[9.5px] font-bold text-emerald-450 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded">
                              0% Empty
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
        <div className="glass-card rounded-lg p-5">
          <DataPreviewTable 
            rows={previewRows || []} 
            columns={columns || []} 
          />
        </div>
      </div>
  );
};

export default Dashboard;
