import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  User, 
  Mail, 
  Database, 
  History, 
  Calendar,
  Key,
  ShieldCheck,
  Loader2,
  FileSpreadsheet,
  Trash2,
  ArrowRight,
  ExternalLink,
  X,
  FileText,
  Brain,
  CheckCircle2,
  Sparkles,
  Layers
} from 'lucide-react';

import { datasetService, historyService } from '../services/api';

const Profile = () => {
  const { user, setActiveDataset } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    datasetsCount: 0,
    historyCount: 0,
  });
  const [datasetsList, setDatasetsList] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // 1. Fetch total datasets count from MongoDB
        const datasets = await datasetService.getDatasets();
        const datasetsCount = datasets.length;
        setDatasetsList(datasets);

        // 2. Fetch total analyses count from MongoDB
        const history = await historyService.getHistory();
        const historyCount = history.length;
        setHistoryList(history);

        setMetrics({
          datasetsCount,
          historyCount
        });
      } catch (err) {
        console.error('Error fetching profile metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  const handleDeleteDataset = async (e, datasetId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this dataset? This cannot be undone.')) {
      return;
    }
    try {
      await datasetService.deleteDataset(datasetId);
      setDatasetsList(datasetsList.filter(d => d._id !== datasetId && d.id !== datasetId));
      setMetrics(prev => ({
        ...prev,
        datasetsCount: prev.datasetsCount - 1
      }));
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Smart AI Imputation':
        return <Brain className="text-violet-400" size={14} />;
      case 'Standard Sanitization':
        return <CheckCircle2 className="text-emerald-400" size={14} />;
      case 'AI Insights Generation':
        return <Sparkles className="text-indigo-400" size={14} />;
      case 'Visualization Generation':
        return <Layers className="text-cyan-400" size={14} />;
      default:
        return <FileSpreadsheet className="text-slate-500" size={14} />;
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

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Retrieving cloud analytics account profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <User className="text-indigo-400" size={28} />
            <span>User Profile</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage your cloud configurations, monitor storage quotas, and audit analysis tallies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/85 bg-gradient-to-b from-slate-950 to-slate-900/60 md:col-span-1 flex flex-col items-center text-center space-y-5 justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/10">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-200">{user?.name}</h3>
              <p className="text-xs text-slate-500 truncate max-w-[190px] font-semibold">{user?.email}</p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-full text-[9px] font-black text-indigo-400 uppercase tracking-widest">
              <ShieldCheck size={11} />
              <span>Verified Account</span>
            </div>
          </div>

          {/* Cloud Usage Metrics Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/85 md:col-span-2 space-y-6 flex flex-col justify-between">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Cloud Statistics</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center gap-4 transition-all">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <Database size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Datasets Uploaded</span>
                  <span className="text-lg font-black font-mono text-slate-200 block mt-0.5">{metrics.datasetsCount} files</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center gap-4 transition-all">
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Analyses Executed</span>
                  <span className="text-lg font-black font-mono text-slate-200 block mt-0.5">{metrics.historyCount} times</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900/80 pt-5 space-y-3.5 text-xs text-slate-450 font-semibold">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-slate-500" />
                <span className="text-[10px] uppercase font-bold text-slate-550">Account ID:</span>
                <span className="font-mono text-[10px] truncate max-w-[200px] text-slate-400 font-bold">{user?.uid}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-[10px] uppercase font-bold text-slate-550">Active Scope:</span>
                <span className="text-indigo-400">Firebase Cloud Space</span>
              </div>
            </div>
          </div>
        </div>

        {/* Previously Analyzed Datasets & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-900/60 pt-8">
          {/* Previously Analyzed Datasets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Database className="text-indigo-400" size={18} />
                <h4 className="text-sm font-black text-slate-205 uppercase tracking-wider">Previously Analyzed Datasets</h4>
              </div>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 px-2 py-0.5 rounded font-black font-mono">
                {datasetsList.length} Total
              </span>
            </div>

            <div className="glass-card rounded-2xl border border-slate-800/80 p-4 space-y-3 max-h-[380px] overflow-y-auto shadow-md">
              {datasetsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  No datasets uploaded yet.
                </div>
              ) : (
                datasetsList.map((dataset) => {
                  const score = dataset.edaResults?.quality_score || dataset.qualityScore || 85;
                  return (
                    <div 
                      key={dataset._id || dataset.id} 
                      className="p-3 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          <FileSpreadsheet size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-200 block truncate max-w-[160px]" title={dataset.datasetName || dataset.originalName}>
                            {dataset.datasetName || dataset.originalName}
                          </span>
                          <span className="text-[9px] text-slate-500 block font-semibold mt-0.5">
                            {dataset.rowCount?.toLocaleString()} rows • Score: {score}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveDataset(dataset);
                            navigate('/overview');
                          }}
                          className="px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-555 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ArrowRight size={10} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDataset(e, dataset._id || dataset.id)}
                          className="p-1.5 bg-slate-950 border border-slate-900 hover:border-rose-500/30 text-slate-500 hover:text-rose-455 rounded-lg transition-colors"
                          title="Delete dataset permanently"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="text-indigo-400" size={18} />
                <h4 className="text-sm font-black text-slate-205 uppercase tracking-wider">Recent Activity</h4>
              </div>
              <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/15 px-2 py-0.5 rounded font-black font-mono">
                {historyList.length} Total
              </span>
            </div>

            <div className="glass-card rounded-2xl border border-slate-800/80 p-4 space-y-3 max-h-[380px] overflow-y-auto shadow-md">
              {historyList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 italic">
                  No activity logged yet.
                </div>
              ) : (
                historyList.slice(0, 8).map((item) => {
                  const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  });
                  return (
                    <div 
                      key={item._id || item.id} 
                      className="p-3 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-850 flex-shrink-0">
                          {getIcon(item.operationType)}
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-200 block truncate max-w-[160px]" title={item.operationType}>
                            {item.operationType}
                          </span>
                          <span className="text-[9px] text-slate-505 block truncate font-semibold mt-0.5">
                            {item.datasetName} • {dateStr}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenReportModal(item)}
                        className="px-2.5 py-1.5 bg-slate-950 border border-slate-900 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 flex-shrink-0"
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
                        <span className="font-mono text-slate-200 text-sm font-black text-rose-455">{selectedReport.details.beforeCount}</span>
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
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-505 uppercase tracking-widest font-mono rounded">
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
    </Layout>
  );
};

export default Profile;
