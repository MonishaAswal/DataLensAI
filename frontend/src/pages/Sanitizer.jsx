import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService, historyService } from '../services/api';
import Layout from '../components/Layout';
import { 
  Wand2, 
  Trash2, 
  Sparkles, 
  Download, 
  CheckCircle,
  FileSpreadsheet, 
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Brain
} from 'lucide-react';
import SmartImputationPanel from '../components/SmartImputationPanel';
import ImputationReport from '../components/ImputationReport';



const Sanitizer = ({ isTabbed = false }) => {
  const { activeDataset, setActiveDataset, user } = useAuth();
  
  // Cleaning Config states
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [imputeNumeric, setImputeNumeric] = useState('mean'); // 'mean', 'median', 'none'
  const [imputeCategorical, setImputeCategorical] = useState('mode'); // 'mode', 'none'
  const [removeEmptyCols, setRemoveEmptyCols] = useState(true);
  const [standardizeDates, setStandardizeDates] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [cleaningReport, setCleaningReport] = useState(null);
  const [reportTab, setReportTab] = useState('overview'); // 'overview', 'issues', 'fixes'
  const [cleanSummary, setCleanSummary] = useState([]);
  const [beforeStats, setBeforeStats] = useState(null);
  const [cleaningTab, setCleaningTab] = useState('standard'); // 'standard' or 'smart'
  const [smartImputationResult, setSmartImputationResult] = useState(null);

  const wrapLayout = (el) => {
    if (isTabbed) return el;
    return <Layout>{el}</Layout>;
  };

  const prevDatasetIdRef = useRef(activeDataset?.id || activeDataset?._id);
  useEffect(() => {
    const currentId = activeDataset?.id || activeDataset?._id;
    if (currentId !== prevDatasetIdRef.current) {
      setShowComparison(false);
      setCleanSummary([]);
      setCleaningReport(null);
      setSmartImputationResult(null);
      prevDatasetIdRef.current = currentId;
    }
  }, [activeDataset]);

  useEffect(() => {
    if (activeDataset?.cleaningReport) {
      setCleaningReport(activeDataset.cleaningReport);
      setCleanSummary(activeDataset.cleaningActions || []);
      setShowComparison(true);
    }
  }, [activeDataset]);

  if (!activeDataset) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-slate-400 italic">No dataset active in current workspace.</p>
      </div>
    );
  }

  const { dimensions, duplicate_count, missing_analysis } = activeDataset.edaResults || {};
  const initialRows = activeDataset.rowCount || dimensions?.rows || 0;
  const initialCols = activeDataset.columnCount || dimensions?.columns || 0;
  
  // Calculate total initial missing values
  const initialMissingCount = missing_analysis
    ? Object.values(missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0)
    : 0;

  const handleSanitize = async () => {
    setLoading(true);
    setError('');
    
    setBeforeStats({
      rows: initialRows,
      cols: initialCols,
      duplicates: duplicate_count || 0,
      missing: initialMissingCount
    });

    try {
      const storageUrl = activeDataset.storageUrl;
      const datasetId = activeDataset.id || activeDataset._id;
      
      const responseData = await datasetService.clean(storageUrl, {
        removeDuplicates,
        imputeNumeric,
        imputeCategorical,
        removeEmptyCols,
        standardizeDates,
        datasetId // Pass datasetId to statefully update MongoDB
      });

      const datasetName = activeDataset.fileName || activeDataset.originalName || 'dataset.csv';
      const updatedDataset = responseData.dataset || {};

      // Create audit log in MongoDB
      try {
        await historyService.createHistory({
          datasetId: datasetId,
          datasetName: datasetName,
          operationType: 'Standard Sanitization',
          report: JSON.stringify({
            summary: responseData.cleanSummary,
            rowCountBefore: initialRows,
            rowCountAfter: responseData.rowCount,
            colCountBefore: initialCols,
            colCountAfter: responseData.columnCount,
            cleaningReport: responseData.cleaningReport
          })
        });
      } catch (logErr) {
        console.warn('Failed to save audit history log:', logErr.message);
      }

      const activePayload = {
        id: datasetId,
        _id: datasetId,
        ...activeDataset,
        ...updatedDataset,
        storageUrl: updatedDataset.storageUrl || responseData.storageUrl || activeDataset.storageUrl,
        status: 'cleaned',
        rowCount: responseData.rowCount,
        columnCount: responseData.columnCount,
        columns: responseData.columns,
        edaResults: responseData.edaResults,
        cleaningActions: updatedDataset.cleaningActions || [...(activeDataset.cleaningActions || []), ...responseData.cleanSummary],
        cleaningReport: responseData.cleaningReport
      };
      setActiveDataset(activePayload);

      setCleanSummary(responseData.cleanSummary || []);
      setCleaningReport(responseData.cleaningReport || null);
      setShowComparison(true);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Cleaning execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartImputationSuccess = async (responseData) => {
    setLoading(true);
    setError('');
    try {
      const datasetName = activeDataset.fileName || activeDataset.originalName || 'dataset.csv';
      
      // Convert base64 from ML service to file blob
      const mimeType = 'text/csv';
      const byteCharacters = atob(responseData.cleanedFileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const fileObj = new File([blob], `cleaned_${datasetName}`, { type: mimeType });

      // Persist file locally on backend
      const persistRes = await datasetService.persist(fileObj);
      const cleanedUrl = persistRes.fileUrl;
      
      const datasetId = activeDataset.id || activeDataset._id;
      const newActions = [...(activeDataset.cleaningActions || []), `Applied Smart AI Imputation on ${responseData.columnsProcessed.length} columns.`];
      
      const updatedData = {
        storageUrl: cleanedUrl,
        status: 'cleaned',
        rowCount: responseData.rowCount,
        columnCount: responseData.columnCount,
        columns: responseData.columns,
        edaResults: responseData.edaResults,
        cleaningActions: newActions
      };
      
      // Update dataset in MongoDB
      const updatedDoc = await datasetService.updateDataset(datasetId, updatedData);
      
      // Save history log in MongoDB
      try {
        await historyService.createHistory({
          datasetId: datasetId,
          datasetName: datasetName,
          operationType: 'Smart AI Imputation',
          report: JSON.stringify(responseData.report)
        });
      } catch (logErr) {
        console.warn('Failed to save audit history log for smart imputation:', logErr.message);
      }
      
      const activePayload = {
        id: datasetId,
        _id: datasetId,
        ...activeDataset,
        ...updatedDoc
      };
      setActiveDataset(activePayload);
      setSmartImputationResult(responseData);
      
    } catch (err) {
      console.error('Failed to finalize smart imputation:', err);
      setError('ML Imputation completed, but failed to save file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const storageUrl = activeDataset.storageUrl;
      const blobData = await datasetService.export(storageUrl);
      
      const url = window.URL.createObjectURL(new Blob([blobData]));
      const link = document.createElement('a');
      link.href = url;
      
      const fileExt = format === 'csv' ? 'csv' : 'xlsx';
      const cleanPrefix = activeDataset.status === 'cleaned' ? 'cleaned_' : '';
      const datasetName = activeDataset.fileName || activeDataset.originalName || 'dataset.csv';
      const originalBasename = datasetName.substring(0, datasetName.lastIndexOf('.')) || 'dataset';
      
      link.setAttribute('download', `${cleanPrefix}${originalBasename}.${fileExt}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Failed to export dataset. Please check Firebase storage connectivity.');
    }
  };


  return wrapLayout(
    <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Wand2 className="text-indigo-400" size={28} />
            <span>Dataset Sanitizer</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Remove duplicates, impute missing parameters, and format timelines in <span className="text-indigo-400 font-bold">{activeDataset.originalName}</span>.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          /* Processing Loading Screen */
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center border border-indigo-500/20 text-center min-h-[350px] shadow-lg shadow-indigo-500/5">
            <div className="relative mb-6">
              <div className="w-14 h-14 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                <Wand2 size={20} className="animate-pulse" />
              </div>
            </div>
            <h3 className="text-base font-extrabold text-slate-200">Executing Data Cleaning pipeline...</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm">Applying Pandas imputations, slicing duplicate rows, and standardizing datatypes on local disk files.</p>
          </div>
        ) : smartImputationResult ? (
          /* Smart AI Imputation Success Screen */
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
              <div className="flex items-center gap-2.5 mb-6 text-emerald-400">
                <CheckCircle size={22} />
                <h3 className="text-base font-black text-slate-200">Smart AI Imputation Completed Successfully!</h3>
              </div>

              {/* Report component */}
              <ImputationReport reportData={smartImputationResult} />

              {/* Download and navigation actions */}
              <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-900 pt-6 mt-8">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all"
                >
                  <Download size={15} />
                  <span>Download Cleaned CSV</span>
                </button>
                
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download Cleaned Excel</span>
                </button>

                <button
                  onClick={() => setSmartImputationResult(null)}
                  className="px-5 py-3 text-xs bg-slate-950 border border-slate-900 text-slate-500 hover:text-slate-400 hover:border-slate-800 rounded-xl font-bold uppercase tracking-wider transition-colors"
                >
                  Back to Parameters
                </button>
              </div>
            </div>
          </div>
        ) : showComparison ? (
          /* Before vs After comparison screen (Professional Cleaning Audit Report) */
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <CheckCircle size={22} />
                  <div>
                    <h3 className="text-base font-black text-slate-205">Dataset Sanitize & Audit Completed</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Your data pipeline checks have been completed with validation passes.</p>
                  </div>
                </div>
                
                {/* Score badge */}
                {cleaningReport?.final_assessment && (
                  <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
                    <Sparkles className="text-emerald-400" size={15} />
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">Quality Score</span>
                      <span className="text-xs font-mono font-black text-emerald-400">
                        {cleaningReport.profiling.initial_quality_score} → {cleaningReport.final_assessment.final_quality_score} 
                        {cleaningReport.final_assessment.quality_gain > 0 && ` (+${cleaningReport.final_assessment.quality_gain})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-tabs selector */}
              <div className="flex gap-4 border-b border-slate-900 pb-1 text-[10px] font-bold uppercase tracking-wider">
                <button 
                  onClick={() => setReportTab('overview')} 
                  className={`pb-2 px-1 transition-all border-b-2 ${reportTab === 'overview' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-400'}`}
                >
                  Overview & Profiling
                </button>
                <button 
                  onClick={() => setReportTab('issues')} 
                  className={`pb-2 px-1 transition-all border-b-2 ${reportTab === 'issues' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-400'}`}
                >
                  Issue Diagnostics ({cleaningReport?.issue_detection?.length || 0})
                </button>
                <button 
                  onClick={() => setReportTab('fixes')} 
                  className={`pb-2 px-1 transition-all border-b-2 ${reportTab === 'fixes' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-400'}`}
                >
                  Fixes & Validation
                </button>
              </div>

              {/* Tab 1: Overview & Profiling */}
              {reportTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Profiling Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Row Count</span>
                      <span className="font-mono text-slate-400 line-through text-xs block">{cleaningReport?.profiling?.initial_rows || beforeStats?.rows}</span>
                      <span className="font-mono font-black text-indigo-300 text-sm block mt-0.5">{initialRows}</span>
                    </div>
                    <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Columns</span>
                      <span className="font-mono text-slate-400 line-through text-xs block">{cleaningReport?.profiling?.initial_cols || beforeStats?.cols}</span>
                      <span className="font-mono font-black text-cyan-300 text-sm block mt-0.5">{initialCols}</span>
                    </div>
                    <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Duplicates</span>
                      <span className="font-mono text-slate-400 line-through text-xs block">{cleaningReport?.profiling?.duplicate_rows_before || beforeStats?.duplicates}</span>
                      <span className="font-mono font-black text-emerald-400 text-sm block mt-0.5">{duplicate_count}</span>
                    </div>
                    <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl text-center">
                      <span className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Missing Cells</span>
                      <span className="font-mono text-slate-400 line-through text-xs block">{cleaningReport?.profiling?.missing_cells_before || beforeStats?.missing}</span>
                      <span className="font-mono font-black text-emerald-400 text-sm block mt-0.5">{initialMissingCount}</span>
                    </div>
                  </div>

                  {/* Automated Summary Checklist */}
                  <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-350">Automated Pipeline Summary</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      DataLens AI executed {cleanSummary.length} sanitization rule operations to optimize completeness, redundancy, and datatype consistency.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
                        <CheckCircle className="text-indigo-400" size={14} />
                        <span>Duplicates dropped: {Math.max(0, (cleaningReport?.profiling?.duplicate_rows_before || beforeStats?.duplicates || 0) - (duplicate_count || 0))} rows</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium">
                        <CheckCircle className="text-indigo-400" size={14} />
                        <span>Missing values resolved: {Math.max(0, (cleaningReport?.profiling?.missing_cells_before || beforeStats?.missing || 0) - (initialMissingCount || 0))} values</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Issue Diagnostics */}
              {reportTab === 'issues' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quality Audits & Root Cause Analysis</h4>
                  {cleaningReport?.issue_detection && cleaningReport.issue_detection.length > 0 ? (
                    <div className="border border-slate-900 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3">Column</th>
                            <th className="p-3">Issue</th>
                            <th className="p-3">Root Cause</th>
                            <th className="p-3">Suggestion / Fix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-350">
                          {cleaningReport.issue_detection.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/10">
                              <td className="p-3 font-mono font-bold text-indigo-300">{item.column}</td>
                              <td className="p-3 font-semibold">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.severity === 'high' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' : 
                                  item.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                                  'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                }`}>
                                  {item.issue}
                                </span>
                              </td>
                              <td className="p-3 text-slate-400 leading-normal max-w-[200px]">{item.root_cause}</td>
                              <td className="p-3 text-slate-400 leading-normal max-w-[200px]">{item.suggestion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-900/10 border border-slate-900 rounded-xl">
                      No issues detected in the initial profiling.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Fixes & Validation */}
              {reportTab === 'fixes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  {/* Automated Fixes list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Automated Fixes Applied</h4>
                    {cleanSummary.length > 0 ? (
                      <ul className="space-y-2">
                        {cleanSummary.map((action, i) => (
                          <li key={i} className="text-xs bg-slate-900/40 border border-slate-850 px-4 py-2.5 rounded-xl flex items-center gap-3 text-slate-300 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No modifications were required for this dataset.</p>
                    )}
                  </div>

                  {/* Validation Pass checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Validation Pass</h4>
                    {cleaningReport?.validation_pass && (
                      <div className="space-y-3">
                        <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-3">
                          <CheckCircle className="text-emerald-400" size={18} />
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">Status: {cleaningReport.validation_pass.status}</span>
                            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                              Remaining issues: {cleaningReport.validation_pass.remaining_issues} flagged concerns.
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-2">
                          {cleaningReport.validation_pass.checks_run.map((check, idx) => (
                            <li key={idx} className="flex items-center gap-2.5 text-xs text-slate-400">
                              <span className="w-4 h-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[9px]">
                                ✓
                              </span>
                              <span>{check}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Download and navigation actions */}
              <div className="flex flex-col sm:flex-row gap-4 border-t border-slate-900 pt-6">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-[0.98] transition-all"
                >
                  <Download size={15} />
                  <span>Download Cleaned CSV</span>
                </button>
                
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <FileSpreadsheet size={15} />
                  <span>Download Cleaned Excel</span>
                </button>

                <button
                  onClick={() => {
                    setShowComparison(false);
                    // Clear state to let them re-configure if needed
                    setActiveDataset({
                      ...activeDataset,
                      cleaningReport: null,
                      status: 'analyzed'
                    });
                    setCleaningReport(null);
                  }}
                  className="px-5 py-3 text-xs bg-slate-950 border border-slate-900 text-slate-500 hover:text-slate-400 hover:border-slate-800 rounded-xl font-bold uppercase tracking-wider transition-colors"
                >
                  Modify Configs
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Cleaning Config dashboard form */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sanitizer Settings card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-2 space-y-6 flex flex-col justify-between">
              <div>
                {/* Tab Selector */}
                <div className="flex border border-slate-900 p-1 bg-slate-950/40 rounded-xl text-[10px] font-bold uppercase tracking-wider mb-6">
                  <button
                    onClick={() => setCleaningTab('standard')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      cleaningTab === 'standard'
                        ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    <Wand2 size={12} />
                    <span>Standard Sanitize</span>
                  </button>
                  <button
                    onClick={() => setCleaningTab('smart')}
                    className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                      cleaningTab === 'smart'
                        ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    <Brain size={12} />
                    <span>Smart AI Imputation</span>
                  </button>
                </div>

                {cleaningTab === 'standard' ? (
                  <div className="space-y-6">
                    <h3 className="text-base font-black text-slate-200">Cleaning pipeline parameters</h3>
                    
                    <div className="space-y-4">
                      {/* Drop duplicates checkbox */}
                      <label className="flex items-start gap-3.5 p-3 bg-slate-900/20 border border-slate-900 rounded-xl cursor-pointer hover:border-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={removeDuplicates}
                          onChange={(e) => setRemoveDuplicates(e.target.checked)}
                          className="mt-1 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 border-slate-800"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Remove Duplicate Records</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                            Identify exact matching rows and drop redundant indices. Detects {duplicate_count} duplicate row(s).
                          </span>
                        </div>
                      </label>

                      {/* Impute Numerical parameters dropdown */}
                      <div className="p-3 bg-slate-900/20 border border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Impute Missing Numerical Values</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                            Fill empty numerical cells using central tendency measurements.
                          </span>
                        </div>
                        <select
                          value={imputeNumeric}
                          onChange={(e) => setImputeNumeric(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 focus:outline-none focus:border-indigo-500 w-full sm:w-36 transition-colors"
                        >
                          <option value="mean">Mean (Average)</option>
                          <option value="median">Median (Middle)</option>
                          <option value="none">Do Not Impute</option>
                        </select>
                      </div>

                      {/* Impute Categorical parameters dropdown */}
                      <div className="p-3 bg-slate-900/20 border border-slate-900 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Impute Missing Categorical Values</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                            Fill empty text/category cells using the column's most frequent occurrence.
                          </span>
                        </div>
                        <select
                          value={imputeCategorical}
                          onChange={(e) => setImputeCategorical(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-350 focus:outline-none focus:border-indigo-500 w-full sm:w-36 transition-colors"
                        >
                          <option value="mode">Mode (Frequent)</option>
                          <option value="none">Do Not Impute</option>
                        </select>
                      </div>

                      {/* Remove empty columns checkbox */}
                      <label className="flex items-start gap-3.5 p-3 bg-slate-900/20 border border-slate-900 rounded-xl cursor-pointer hover:border-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={removeEmptyCols}
                          onChange={(e) => setRemoveEmptyCols(e.target.checked)}
                          className="mt-1 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 border-slate-800"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Remove Empty Columns</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                            Prune columns containing only null/empty spaces to reduce memory load and dimensional noise.
                          </span>
                        </div>
                      </label>

                      {/* Standardize Dates checkbox */}
                      <label className="flex items-start gap-3.5 p-3 bg-slate-900/20 border border-slate-900 rounded-xl cursor-pointer hover:border-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={standardizeDates}
                          onChange={(e) => setStandardizeDates(e.target.checked)}
                          className="mt-1 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-950 border-slate-800"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 block">Standardize Date Formats</span>
                          <span className="text-[10px] text-slate-500 font-medium leading-relaxed block mt-0.5">
                            Identify object columns matching time signatures and convert records uniformly to YYYY-MM-DD.
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleSanitize}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                    >
                      <Wand2 size={16} />
                      <span>Sanitize Dataset</span>
                    </button>
                  </div>
                ) : (
                  /* Smart AI Imputation Panel */
                  <SmartImputationPanel 
                    storageUrl={activeDataset.storageUrl}
                    onImputationSuccess={handleSmartImputationSuccess}
                  />
                )}
              </div>
            </div>


            {/* Quality Summary Stats card */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-1 space-y-5 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  <span>Quality Summary</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Missing Records</span>
                    <span className={`text-xs font-mono font-black ${initialMissingCount > 0 ? 'text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded' : 'text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded'}`}>
                      {initialMissingCount} values
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Duplicate Rows</span>
                    <span className={`text-xs font-mono font-black ${duplicate_count > 0 ? 'text-rose-450 bg-rose-500/5 px-2 py-0.5 rounded' : 'text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded'}`}>
                      {duplicate_count} rows
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Total Columns</span>
                    <span className="text-xs font-mono font-black text-cyan-300 bg-cyan-500/5 px-2 py-0.5 rounded">
                      {initialCols}
                    </span>
                  </div>
                </div>
              </div>

              {/* Export Direct Options */}
              <div className="border-t border-slate-900 pt-5 mt-6">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Export Current File</h5>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex-1 py-2 px-3 border border-slate-850 hover:bg-slate-900/60 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                  >
                    <Download size={12} />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="flex-1 py-2 px-3 border border-slate-850 hover:bg-slate-900/60 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                  >
                    <FileSpreadsheet size={12} />
                    <span>Excel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default Sanitizer;
