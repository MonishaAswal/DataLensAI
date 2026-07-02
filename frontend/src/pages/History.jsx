import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  History, 
  Trash2, 
  ExternalLink, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2,
  FileText,
  Brain,
  Sparkles,
  Layers,
  X,
  Database
} from 'lucide-react';

import { historyService } from '../services/api';

const HistoryPage = () => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  // Modal Report state
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await historyService.getHistory();
      const mapped = data.map(item => ({
        id: item._id || item.id,
        _id: item._id || item.id,
        ...item
      }));
      setHistoryList(mapped);
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load analysis history logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleDeleteLog = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently delete this analysis audit record?')) {
      return;
    }

    try {
      await historyService.deleteHistory(id);
      setHistoryList(historyList.filter(item => item.id !== id && item._id !== id));
    } catch (err) {
      console.error(err);
      setError('Failed to delete history log.');
    }
  };

  const handleOpenReportModal = (logItem) => {
    let parsedReport = null;
    try {
      parsedReport = JSON.parse(logItem.report);
    } catch (e) {
      parsedReport = logItem.report; // If string
    }

    setSelectedReport({
      ...logItem,
      details: parsedReport
    });
    setShowModal(true);
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

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <History className="text-indigo-400" size={28} />
            <span>Analysis & Operations Audit</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Browse through previous data processing activities, ML imputations, and AI reports executed on your datasets.
          </p>
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
        ) : historyList.length > 0 ? (
          /* Logs List Board */
          <div className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-slate-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-400 border-b border-slate-900 font-semibold select-none">
                    <th className="px-5 py-3.5">Dataset Name</th>
                    <th className="px-5 py-3.5">Operation Executed</th>
                    <th className="px-5 py-3.5">Timestamp</th>
                    <th className="px-5 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-medium text-slate-350">
                  {historyList.map((item) => {
                    const dateStr = new Date(item.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-slate-900/20 transition-all"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-900 border border-slate-850 text-slate-500">
                              <FileSpreadsheet size={16} />
                            </div>
                            <span className="font-bold text-slate-200 truncate max-w-[240px]" title={item.datasetName}>
                              {item.datasetName}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="flex items-center gap-2 text-slate-300 font-semibold">
                            {getIcon(item.operationType)}
                            <span>{item.operationType}</span>
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-500 font-semibold">
                          {dateStr}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-3.5">
                            <button
                              onClick={() => handleOpenReportModal(item)}
                              className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 rounded-xl font-bold uppercase tracking-wider text-[9px] flex items-center gap-1 transition-all"
                              title="Review operation report"
                            >
                              <FileText size={12} />
                              <span>View Report</span>
                            </button>
                            <button
                              onClick={(e) => handleDeleteLog(e, item.id)}
                              className="p-1.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-455 rounded-lg hover:border-rose-500/35 transition-all"
                              title="Delete audit log"
                            >
                              <Trash2 size={13} />
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
          /* Empty state view */
          <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 min-h-[300px] flex flex-col items-center justify-center">
            <div className="bg-slate-900/60 p-4 rounded-full text-slate-650 border border-slate-850 mb-4 shadow-md">
              <History size={30} />
            </div>
            <h4 className="text-sm font-bold text-slate-200">No actions logged yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Cleaning steps, visual chart compilations, and LLM insights audits will be cataloged here.</p>
            
            <button
              onClick={() => navigate('/my-datasets')}
              className="mt-6 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-[0.98] transition-all"
            >
              Go to Workspace
            </button>
          </div>
        )}
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
                <p className="text-[10px] text-slate-500 font-semibold font-mono">Dataset: {selectedReport.datasetName}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
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
                      <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Rows Offset</span>
                      <span className="font-mono text-slate-200 text-sm font-black">
                        {selectedReport.details.rowCountBefore} ➔ {selectedReport.details.rowCountAfter}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                      <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Columns Offset</span>
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
                      <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Total Null Cells Before</span>
                      <span className="font-mono text-slate-200 text-sm font-black text-rose-400">{selectedReport.details.beforeCount}</span>
                    </div>
                    <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                      <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Total Null Cells After</span>
                      <span className="font-mono text-slate-200 text-sm font-black text-emerald-400">{selectedReport.details.afterCount}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider">Imputed Dimensions list:</span>
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
                          <div className="text-slate-500 text-[10px] mt-1 flex flex-wrap gap-1 font-mono">
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
    </Layout>
  );
};

export default HistoryPage;
