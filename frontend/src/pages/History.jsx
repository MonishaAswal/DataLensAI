import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  History, 
  Trash2, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle,
  FileText,
  Brain,
  Sparkles,
  Layers,
  X
} from 'lucide-react';
import { historyService } from '../services/api';

const HistoryPage = ({ isTabbed = false }) => {
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const wrapLayout = (el) => {
    if (isTabbed) return el;
    return <Layout>{el}</Layout>;
  };

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
        return <Brain className="text-indigo-400" size={13} />;
      case 'Standard Sanitization':
        return <CheckCircle className="text-emerald-450" size={13} />;
      case 'AI Insights Generation':
        return <Sparkles className="text-cyan-400" size={13} />;
      case 'Visualization Generation':
        return <Layers className="text-indigo-400" size={13} />;
      default:
        return <FileSpreadsheet className="text-slate-550" size={13} />;
    }
  };

  return wrapLayout(
    <>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight flex items-center gap-2.5">
            <History className="text-indigo-400" size={24} />
            <span>Operations Audit Log</span>
          </h2>
          <p className="text-slate-450 text-xs mt-1">
            Browse through previous data processing activities, ML imputations, and AI reports executed on your datasets.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-455" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          /* Skeletons loader */
          <div className="space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="glass-card rounded-lg p-5 border border-slate-900 animate-pulse min-h-[60px]"></div>
            ))}
          </div>
        ) : historyList.length > 0 ? (
          /* Logs List Board */
          <div className="glass-card rounded-lg border border-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-450 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-4 pl-6">Dataset Name</th>
                    <th className="p-4">Operation Executed</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
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
                        className="hover:bg-slate-950/20 transition-colors"
                      >
                        {/* Dataset name */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded border bg-slate-950 border-slate-900 text-slate-550">
                              <FileSpreadsheet size={15} />
                            </div>
                            <span className="font-bold text-slate-205 truncate max-w-[200px]" title={item.datasetName}>
                              {item.datasetName}
                            </span>
                          </div>
                        </td>

                        {/* Operation */}
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded text-[10px] text-slate-300 font-bold">
                            {getIcon(item.operationType)}
                            <span>{item.operationType}</span>
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="p-4 font-mono text-[11px] text-slate-500">
                          {dateStr}
                        </td>

                        {/* Actions */}
                        <td className="p-4 pr-6 text-right" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleOpenReportModal(item)}
                              className="px-2.5 py-1 bg-slate-950 border border-slate-900 text-slate-350 hover:text-indigo-400 hover:border-indigo-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                              title="Review operation report"
                            >
                              <FileText size={11} />
                              <span>View Report</span>
                            </button>
                            <button
                              onClick={(e) => handleDeleteLog(e, item.id)}
                              className="p-1.5 bg-slate-950 border border-slate-900 text-slate-550 hover:text-rose-455 rounded-lg hover:border-rose-500/10 transition-colors"
                              title="Delete audit log"
                            >
                              <Trash2 size={12} />
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
          <div className="glass-card rounded-lg p-12 text-center border border-slate-900 min-h-[280px] flex flex-col items-center justify-center">
            <div className="bg-slate-950 p-4 rounded-lg text-slate-550 border border-slate-900 mb-4">
              <History size={24} />
            </div>
            <h4 className="text-sm font-bold text-slate-202">No operations logged</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Cleaning, visual charts, and LLM insights audits will be cataloged here.</p>
            
            <button
              onClick={() => navigate('/my-datasets')}
              className="mt-6 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
            >
              Go to Workspace
            </button>
          </div>
        )}
      </div>

      {/* Modal Dialog for displaying Operation Report details */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
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
                className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
              >
                <X size={14} />
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
                          <span className="w-1 h-1 rounded-full bg-emerald-450"></span>
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
                      <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Null Cells Before</span>
                      <span className="font-mono text-slate-202 text-xs font-black text-rose-450">{selectedReport.details.beforeCount}</span>
                    </div>
                    <div className="p-3 bg-slate-900/30 border border-slate-900 rounded-lg">
                      <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-0.5">Null Cells After</span>
                      <span className="font-mono text-slate-202 text-xs font-black text-emerald-450">{selectedReport.details.afterCount}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[9px] text-slate-550 font-bold uppercase tracking-wider">Imputed Columns:</span>
                    <div className="space-y-2">
                      {selectedReport.details.summary?.map((col, i) => (
                        <div key={i} className="bg-slate-900/20 border border-slate-900 p-3.5 rounded-lg flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-202">{col.column}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-500 uppercase tracking-widest font-mono rounded">
                              {col.type}
                            </span>
                          </div>
                          <div className="text-slate-450 text-[10px]">
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

              {/* AI Insights Generation (markdown) */}
              {selectedReport.operationType === 'AI Insights Generation' && (
                <div className="markdown-content font-medium bg-slate-900/20 border border-slate-900 p-4 rounded-lg max-h-[300px] overflow-y-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-300">
                  {selectedReport.report}
                </div>
              )}

              {/* Visualization Generation details */}
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
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-slate-202 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HistoryPage;
