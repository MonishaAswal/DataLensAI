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
  X,
  FileText,
  Brain,
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
        const datasets = await datasetService.getDatasets();
        const datasetsCount = datasets.length;
        setDatasetsList(datasets);

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
        return <Brain className="text-indigo-400" size={13} />;
      case 'Standard Sanitization':
        return <User className="text-emerald-450" size={13} />;
      case 'AI Insights Generation':
        return <Sparkles className="text-indigo-400" size={13} />;
      case 'Visualization Generation':
        return <Layers className="text-cyan-400" size={13} />;
      default:
        return <FileSpreadsheet className="text-slate-550" size={13} />;
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
        <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
          <Loader2 size={24} className="text-indigo-500 animate-spin" />
          <p className="text-slate-455 text-xs font-semibold">Retrieving account workspace profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight flex items-center gap-2.5">
            <User className="text-indigo-400" size={24} />
            <span>Workspace Profile</span>
          </h2>
          <p className="text-slate-455 text-xs mt-1">
            Manage your cloud storage metrics, track uploaded assets, and review audit activity records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="glass-card rounded-lg p-5 md:col-span-1 flex flex-col items-center text-center space-y-4 justify-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-2xl font-extrabold select-none">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-202">{user?.name}</h3>
              <p className="text-[10.5px] text-slate-550 truncate max-w-[190px] font-semibold">{user?.email}</p>
            </div>

            <div className="badge-indigo inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] uppercase tracking-wider">
              <ShieldCheck size={9} />
              <span>Verified Identity</span>
            </div>
          </div>

          {/* Cloud Usage Metrics Card */}
          <div className="glass-card rounded-lg p-5 md:col-span-2 space-y-6 flex flex-col justify-between">
            <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Storage & Analytics Metrics</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex items-center gap-3.5">
                <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 rounded-lg">
                  <Database size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block">Datasets Count</span>
                  <span className="text-sm font-bold font-mono text-slate-205 block mt-0.5">{metrics.datasetsCount} files</span>
                </div>
              </div>

              <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex items-center gap-3.5">
                <div className="p-2.5 bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 rounded-lg">
                  <History size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider block">Analyses Count</span>
                  <span className="text-sm font-bold font-mono text-slate-205 block mt-0.5">{metrics.historyCount} times</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900 pt-4 space-y-2 text-xs text-slate-450 font-semibold">
              <div className="flex items-center gap-2">
                <Key size={12} className="text-slate-550" />
                <span className="text-[9px] uppercase font-bold text-slate-550">Account ID:</span>
                <span className="font-mono text-[9px] truncate max-w-[200px] text-slate-400 font-bold">{user?.uid}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-slate-550" />
                <span className="text-[9px] uppercase font-bold text-slate-550">Active Scope:</span>
                <span className="text-indigo-400 text-[10.5px]">Firebase Storage Space</span>
              </div>
            </div>
          </div>
        </div>

        {/* Previously Analyzed Datasets & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-900 pt-6">
          {/* Previously Analyzed Datasets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="text-indigo-405" size={15} />
                <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider">Dataset Registry</h4>
              </div>
              <span className="text-[9px] bg-slate-955 text-slate-455 border border-slate-900 px-2 py-0.5 rounded font-mono font-bold select-none">
                {datasetsList.length} Total
              </span>
            </div>

            <div className="glass-card rounded-lg p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
              {datasetsList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-555 italic">
                  No datasets uploaded yet.
                </div>
              ) : (
                datasetsList.map((dataset) => {
                  const score = dataset.edaResults?.quality_score || dataset.qualityScore || 85;
                  return (
                    <div 
                      key={dataset._id || dataset.id} 
                      className="p-2.5 bg-slate-955 border border-slate-900 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded bg-slate-950 text-slate-455 border border-slate-900">
                          <FileSpreadsheet size={13} />
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-205 block truncate max-w-[160px]" title={dataset.datasetName || dataset.originalName}>
                            {dataset.datasetName || dataset.originalName}
                          </span>
                          <span className="text-[9px] text-slate-550 block font-semibold mt-0.5">
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
                          className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-600 text-white rounded text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ArrowRight size={10} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteDataset(e, dataset._id || dataset.id)}
                          className="p-1 bg-slate-950 border border-slate-900 hover:border-rose-500/20 text-slate-500 hover:text-rose-455 rounded transition-colors"
                          title="Delete dataset permanently"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="text-indigo-405" size={15} />
                <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider">Activity Audits</h4>
              </div>
              <span className="text-[9px] bg-slate-955 text-slate-455 border border-slate-900 px-2 py-0.5 rounded font-mono font-bold select-none">
                {historyList.length} Total
              </span>
            </div>

            <div className="glass-card rounded-lg p-4 space-y-2.5 max-h-[340px] overflow-y-auto">
              {historyList.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-555 italic">
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
                      className="p-2.5 bg-slate-955 border border-slate-900 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded bg-slate-950 border border-slate-900 flex-shrink-0">
                          {getIcon(item.operationType)}
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-xs font-bold text-slate-205 block truncate max-w-[160px]" title={item.operationType}>
                            {item.operationType}
                          </span>
                          <span className="text-[9px] text-slate-550 block truncate font-semibold mt-0.5">
                            {item.datasetName} • {dateStr}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenReportModal(item)}
                        className="px-2.5 py-1 bg-slate-950 border border-slate-900 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20 rounded text-[9px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1 flex-shrink-0"
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="w-full max-w-xl bg-slate-950 border border-slate-900 rounded-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-slate-900 flex justify-between items-center bg-slate-955/40">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {getIcon(selectedReport.operationType)}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-202">{selectedReport.operationType} Report</h3>
                  </div>
                  <p className="text-[9px] text-slate-550 font-bold font-mono">File: {selectedReport.datasetName}</p>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs leading-relaxed text-slate-350">
                {selectedReport.operationType === 'Standard Sanitization' && selectedReport.details && (
                  <div className="space-y-4 font-semibold">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Rows Offset</span>
                        <span className="font-mono text-slate-202 text-xs font-bold">
                          {selectedReport.details.rowCountBefore} ➔ {selectedReport.details.rowCountAfter}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Columns Offset</span>
                        <span className="font-mono text-slate-202 text-xs font-bold">
                          {selectedReport.details.colCountBefore} ➔ {selectedReport.details.colCountAfter}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider">Modifications Applied:</span>
                      <ul className="space-y-1.5">
                        {selectedReport.details.summary?.map((act, i) => (
                          <li key={i} className="bg-slate-955 border border-slate-900 px-3 py-2 rounded-lg flex items-center gap-2 text-slate-300 font-bold">
                            <span className="w-1 h-1 rounded-full bg-emerald-450"></span>
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
                      <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Nulls Before</span>
                        <span className="font-mono text-rose-455 text-xs font-bold">{selectedReport.details.beforeCount}</span>
                      </div>
                      <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg">
                        <span className="text-[9px] text-slate-555 block uppercase tracking-wider mb-0.5">Nulls After</span>
                        <span className="font-mono text-emerald-450 text-xs font-bold">{selectedReport.details.afterCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] text-slate-555 font-bold uppercase tracking-wider">Imputed Dimensions:</span>
                      <div className="space-y-2">
                        {selectedReport.details.summary?.map((col, i) => (
                          <div key={i} className="bg-slate-955 border border-slate-900 p-3 rounded-lg flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-202">{col.column}</span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-550 border border-slate-900 uppercase tracking-widest font-mono rounded">
                                {col.type}
                              </span>
                            </div>
                            <div className="text-slate-455 text-[10px]">
                              Method: <span className="text-indigo-400 font-bold">{col.method}</span>
                            </div>
                            {col.samplePredictions && (
                              <div className="text-slate-550 text-[9px] mt-1 flex flex-wrap gap-1 font-mono">
                                Sample Predictions: {col.samplePredictions.slice(0, 5).join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedReport.operationType === 'AI Insights Generation' && (
                  <div className="font-medium bg-slate-955 border border-slate-900 p-4 rounded-lg max-h-[250px] overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-300">
                    {selectedReport.report}
                  </div>
                )}

                {selectedReport.operationType === 'Visualization Generation' && (
                  <div className="p-4 bg-slate-955 border border-slate-900 text-center rounded-lg font-bold">
                    <Layers className="mx-auto text-cyan-400 mb-2" size={20} />
                    <p className="text-slate-350">Visualized Category Densities and Correlation Matrix grids in workspace.</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3 border-t border-slate-900 bg-slate-955 text-right">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
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
