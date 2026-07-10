import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService, historyService } from '../services/api';
import Layout from '../components/Layout';
import SmartImputationPanel from '../components/SmartImputationPanel';
import ImputationReport from '../components/ImputationReport';
import { 
  Wand2, 
  Brain, 
  HelpCircle, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';

const Sanitizer = ({ isTabbed = false }) => {
  const { activeDataset, setActiveDataset } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [cleaningReport, setCleaningReport] = useState(null);
  const [reportTab, setReportTab] = useState('overview'); // 'overview', 'issues', 'fixes'
  const [cleanSummary, setCleanSummary] = useState([]);
  const [beforeStats, setBeforeStats] = useState(null);
  const [cleaningTab, setCleaningTab] = useState('standard'); // 'standard' or 'smart'
  const [smartImputationResult, setSmartImputationResult] = useState(null);

  // Cleaning Config states
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [imputeNumeric, setImputeNumeric] = useState('mean'); // 'mean', 'median', 'none'
  const [imputeCategorical, setImputeCategorical] = useState('mode'); // 'mode', 'none'
  const [removeEmptyCols, setRemoveEmptyCols] = useState(true);
  const [standardizeDates, setStandardizeDates] = useState(true);

  const wrapLayout = (el) => {
    if (isTabbed) return el;
    return <Layout>{el}</Layout>;
  };

  const prevDatasetIdRef = useRef(activeDataset?.id || activeDataset?._id);

  useEffect(() => {
    const currentId = activeDataset?.id || activeDataset?._id;
    if (currentId !== prevDatasetIdRef.current) {
      setShowComparison(false);
      setCleaningReport(null);
      setSmartImputationResult(null);
      prevDatasetIdRef.current = currentId;
    }
  }, [activeDataset]);

  if (!activeDataset) {
    return wrapLayout(
      <div className="max-w-2xl mx-auto mt-12 text-center space-y-4">
        <div className="bg-slate-950 p-4 rounded-lg text-slate-550 border border-slate-900 inline-block">
          <Wand2 size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-202">No active dataset workspace</h3>
        <p className="text-xs text-slate-550 max-w-sm mx-auto">
          Please select a dataset or upload a new spreadsheet file to launch the Sanitization operations.
        </p>
      </div>
    );
  }

  const { edaResults } = activeDataset;
  const duplicate_count = edaResults?.duplicate_count || 0;
  const initialMissingCount = edaResults?.missing_analysis 
    ? Object.values(edaResults.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) 
    : 0;
  const initialRows = edaResults?.dimensions?.rows || 0;
  const initialCols = edaResults?.dimensions?.columns || 0;

  const handleSanitize = async () => {
    setLoading(true);
    setError('');
    
    // Save current overview stats to compare
    setBeforeStats({
      rows: initialRows,
      cols: initialCols,
      duplicates: duplicate_count,
      missing: initialMissingCount
    });

    const options = {
      removeDuplicates: removeDuplicates,
      imputeNumeric: imputeNumeric,
      imputeCategorical: imputeCategorical,
      removeEmptyCols: removeEmptyCols,
      standardizeDates: standardizeDates,
      datasetId: activeDataset._id || activeDataset.id
    };

    try {
      console.log('[Sanitizer] Cleaning dataset with config options:', options);
      const data = await datasetService.clean(activeDataset.storageUrl, options);
      console.log('[Sanitizer] Clean completed, server returned dataset:', data);

      const activePayload = {
        id: data._id || data.id,
        _id: data._id || data.id,
        ...data
      };
      
      setActiveDataset(activePayload);
      
      if (data.cleaningReport) {
        setCleaningReport(data.cleaningReport);
        setCleanSummary(data.cleaningReport.automated_fixes || []);
      } else {
        setCleaningReport(null);
        setCleanSummary(data.cleaningActions || []);
      }

      setShowComparison(true);
    } catch (err) {
      console.error('[Sanitizer] Cleaning operation failed:', err);
      setError(err.response?.data?.message || err.message || 'Standard sanitization failed. Please verify file columns integrity.');
    } finally {
      setLoading(false);
    }
  };

  const handleSmartImputationSuccess = async (imputationData) => {
    setSmartImputationResult(imputationData);
    
    if (imputationData.dataset) {
      const activePayload = {
        id: imputationData.dataset._id || imputationData.dataset.id,
        _id: imputationData.dataset._id || imputationData.dataset.id,
        ...imputationData.dataset
      };
      setActiveDataset(activePayload);
    }
  };

  const handleExport = async (format) => {
    try {
      setError('');
      await datasetService.download(activeDataset.storageUrl, format, activeDataset.datasetName || activeDataset.originalName);
    } catch (err) {
      console.error(err);
      setError('Export failed. Failed to compile and stream download file.');
    }
  };

  return wrapLayout(
    <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Title */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight flex items-center gap-2.5">
            <Wand2 className="text-indigo-400" size={24} />
            <span>Dataset Sanitization</span>
          </h2>
          <p className="text-slate-455 text-xs mt-1">
            Standardize layouts, prune blank cells, clamp numerical outliers, and impute missing inputs using statistical models or AI models.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-455" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          /* Cleaning Pipeline Loader Screen */
          <div className="glass-card rounded-lg p-12 flex flex-col items-center justify-center text-center min-h-[350px]">
            <Loader2 size={24} className="text-indigo-500 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-202">Executing Sanitization Rules...</h3>
            <p className="text-[10px] text-slate-550 mt-1.5 max-w-sm">
              Standardizing casing, executing null cell imputations, dropping redundant duplicate structures, and checking date format consistency.
            </p>
          </div>
        ) : smartImputationResult ? (
          /* AI Imputation Visual Report view */
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-lg p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2.5 text-emerald-455">
                  <CheckCircle size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-101">Smart AI Imputation Complete</h3>
                    <p className="text-[9px] text-slate-550">Random Forest predictive imputation successfully completed.</p>
                  </div>
                </div>
                
                <div className="badge-indigo inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md">
                  <Sparkles size={8} />
                  <span>ML Complete</span>
                </div>
              </div>

              {/* Imputation Visual Charts/Tables */}
              <ImputationReport reportData={smartImputationResult} />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-900 pt-6">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  <span>Download Cleaned CSV</span>
                </button>
                
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet size={12} />
                  <span>Download Cleaned Excel</span>
                </button>

                <button
                  onClick={() => setSmartImputationResult(null)}
                  className="px-4 py-2 text-[10px] bg-slate-950 border border-slate-900 text-slate-550 hover:text-slate-400 rounded-lg font-bold uppercase tracking-wider transition-colors"
                >
                  Back to Parameters
                </button>
              </div>
            </div>
          </div>
        ) : showComparison ? (
          /* Before vs After comparison screen (Professional Cleaning Audit Report) */
          <div className="space-y-6 animate-fade-in">
            <div className="glass-card rounded-lg p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2 text-emerald-455">
                  <CheckCircle size={18} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-202">Dataset Sanitization Completed</h3>
                    <p className="text-[9px] text-slate-550">Quality validation and cleaning pipeline pass executed successfully.</p>
                  </div>
                </div>
                
                {/* Score badge */}
                {cleaningReport?.final_assessment && (
                  <div className="flex items-center gap-2.5 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-md">
                    <Sparkles className="text-emerald-455" size={13} />
                    <div className="text-right">
                      <span className="text-[8px] text-slate-550 font-bold block uppercase tracking-wider">Quality Score</span>
                      <span className="text-xs font-mono font-bold text-emerald-455">
                        {cleaningReport.profiling.initial_quality_score}% → {cleaningReport.final_assessment.final_quality_score}% 
                        {cleaningReport.final_assessment.quality_gain > 0 && ` (+${cleaningReport.final_assessment.quality_gain}%)`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sub-tabs selector */}
              <div className="flex gap-4 border-b border-slate-900 pb-1 text-[9px] font-bold uppercase tracking-widest">
                <button 
                  onClick={() => setReportTab('overview')} 
                  className={`pb-2 px-1 transition-all border-b-2 ${reportTab === 'overview' ? 'text-indigo-400 border-indigo-500' : 'text-slate-550 border-transparent hover:text-slate-400'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setReportTab('issues')} 
                  className={`pb-2 px-1 transition-all border-b-2 ${reportTab === 'issues' ? 'text-indigo-400 border-indigo-500' : 'text-slate-550 border-transparent hover:text-slate-400'}`}
                >
                  Diagnostics ({cleaningReport?.issue_detection?.length || 0})
                </button>
                <button 
                  onClick={() => setReportTab('fixes')} 
                  className={`pb-2 px-1 transition-all border-b-2 ${reportTab === 'fixes' ? 'text-indigo-400 border-indigo-500' : 'text-slate-550 border-transparent hover:text-slate-400'}`}
                >
                  Fixes Applied
                </button>
              </div>

              {/* Tab 1: Overview & Profiling */}
              {reportTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Profiling Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Row Count</span>
                      <span className="font-mono text-slate-550 line-through text-[11px] block">{cleaningReport?.profiling?.initial_rows || beforeStats?.rows}</span>
                      <span className="font-mono font-bold text-indigo-300 text-xs block mt-0.5">{initialRows}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Columns</span>
                      <span className="font-mono text-slate-550 line-through text-[11px] block">{cleaningReport?.profiling?.initial_cols || beforeStats?.cols}</span>
                      <span className="font-mono font-bold text-cyan-300 text-xs block mt-0.5">{initialCols}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Duplicates</span>
                      <span className="font-mono text-slate-550 line-through text-[11px] block">{cleaningReport?.profiling?.duplicate_rows_before || beforeStats?.duplicates}</span>
                      <span className="font-mono font-bold text-emerald-450 text-xs block mt-0.5">{duplicate_count}</span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-center">
                      <span className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Missing Cells</span>
                      <span className="font-mono text-slate-550 line-through text-[11px] block">{cleaningReport?.profiling?.missing_cells_before || beforeStats?.missing}</span>
                      <span className="font-mono font-bold text-emerald-455 text-xs block mt-0.5">{initialMissingCount}</span>
                    </div>
                  </div>

                  {/* Automated Summary Checklist */}
                  <div className="bg-slate-950 border border-slate-900 rounded-lg p-5 space-y-2.5">
                    <h4 className="text-xs font-bold text-slate-355 uppercase tracking-wider">Pipeline Output Summary</h4>
                    <p className="text-[11px] text-slate-450 leading-relaxed">
                      DataLens AI executed {cleanSummary.length} sanitization operations to optimize completeness, redundancy, and datatype layout.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="flex items-center gap-2 text-xs text-slate-350 font-semibold">
                        <CheckCircle className="text-indigo-400" size={13} />
                        <span>Duplicates dropped: {Math.max(0, (cleaningReport?.profiling?.duplicate_rows_before || beforeStats?.duplicates || 0) - (duplicate_count || 0))} rows</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-350 font-semibold">
                        <CheckCircle className="text-indigo-400" size={13} />
                        <span>Missing values resolved: {Math.max(0, (cleaningReport?.profiling?.missing_cells_before || beforeStats?.missing || 0) - (initialMissingCount || 0))} values</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Issue Diagnostics */}
              {reportTab === 'issues' && (
                <div className="space-y-4 animate-fade-in">
                  <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Quality Audits & Root Cause Analysis</h4>
                  {cleaningReport?.issue_detection && cleaningReport.issue_detection.length > 0 ? (
                    <div className="border border-slate-900 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider">
                            <th className="p-3 pl-4">Column</th>
                            <th className="p-3">Issue</th>
                            <th className="p-3">Root Cause</th>
                            <th className="p-3 pr-4">Suggestion / Fix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900 text-slate-300">
                          {cleaningReport.issue_detection.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-955/20">
                              <td className="p-3 pl-4 font-mono font-bold text-indigo-400">{item.column}</td>
                              <td className="p-3 font-semibold">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide border ${
                                  item.severity === 'high' ? 'bg-rose-500/10 text-rose-455 border-rose-500/20' : 
                                  item.severity === 'medium' ? 'bg-amber-500/10 text-amber-455 border-amber-500/20' : 
                                  'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                }`}>
                                  {item.issue}
                                </span>
                              </td>
                              <td className="p-3 text-slate-450 leading-relaxed max-w-[200px]">{item.root_cause}</td>
                              <td className="p-3 pr-4 text-slate-450 leading-relaxed max-w-[200px]">{item.suggestion}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-550 italic p-4 text-center bg-slate-950 border border-slate-900 rounded-lg">
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
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Automated Fixes Applied</h4>
                    {cleanSummary.length > 0 ? (
                      <ul className="space-y-2">
                        {cleanSummary.map((action, i) => (
                          <li key={i} className="text-xs bg-slate-950 border border-slate-900 px-4 py-2.5 rounded-lg flex items-center gap-2.5 text-slate-300 font-bold">
                            <span className="w-1 h-1 rounded-full bg-emerald-450"></span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-550 italic">No modifications were required for this dataset.</p>
                    )}
                  </div>

                  {/* Validation Pass checklist */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-355 uppercase tracking-wider">Pipeline Validation Pass</h4>
                    {cleaningReport?.validation_pass && (
                      <div className="space-y-3">
                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center gap-3">
                          <CheckCircle className="text-emerald-450 flex-shrink-0" size={16} />
                          <div>
                            <span className="text-xs font-bold text-slate-205 block">Validation: {cleaningReport.validation_pass.status}</span>
                            <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                              Remaining issues: {cleaningReport.validation_pass.remaining_issues} flagged concern(s).
                            </span>
                          </div>
                        </div>

                        <ul className="space-y-1.5">
                          {cleaningReport.validation_pass.checks_run.map((check, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-slate-450 font-semibold">
                              <span className="w-4 h-4 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[9px]">
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
              <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-900 pt-6">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  <span>Download Cleaned CSV</span>
                </button>
                
                <button
                  onClick={() => handleExport('xlsx')}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FileSpreadsheet size={12} />
                  <span>Download Cleaned Excel</span>
                </button>

                <button
                  onClick={() => {
                    setShowComparison(false);
                    setActiveDataset({
                      ...activeDataset,
                      cleaningReport: null,
                      status: 'analyzed'
                    });
                    setCleaningReport(null);
                  }}
                  className="px-4 py-2 text-[10px] bg-slate-950 border border-slate-900 text-slate-550 hover:text-slate-400 rounded-lg font-bold uppercase tracking-wider transition-colors"
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
            <div className="glass-card rounded-lg p-5 lg:col-span-2 space-y-6 flex flex-col justify-between">
              <div>
                {/* Tab Selector */}
                <div className="flex border border-slate-900 p-0.5 bg-slate-955 rounded-lg text-[9px] font-bold uppercase tracking-widest mb-6">
                  <button
                    onClick={() => setCleaningTab('standard')}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-colors ${
                      cleaningTab === 'standard'
                        ? 'bg-slate-900 border border-slate-850 text-indigo-400'
                        : 'text-slate-550 hover:text-slate-400'
                    }`}
                  >
                    <Wand2 size={11} />
                    <span>Standard Sanitize</span>
                  </button>
                  <button
                    onClick={() => setCleaningTab('smart')}
                    className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-2 transition-colors ${
                      cleaningTab === 'smart'
                        ? 'bg-slate-900 border border-slate-850 text-indigo-400'
                        : 'text-slate-555 hover:text-slate-400'
                    }`}
                  >
                    <Brain size={11} />
                    <span>Smart AI Imputation</span>
                  </button>
                </div>

                {cleaningTab === 'standard' ? (
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Sanitization Rules</h3>
                    
                    <div className="space-y-4">
                      {/* Drop duplicates checkbox */}
                      <label className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={removeDuplicates}
                          onChange={(e) => setRemoveDuplicates(e.target.checked)}
                          className="mt-0.5 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-800 w-3.5 h-3.5"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-205 block">Prune Duplicate Records</span>
                          <span className="text-[10px] text-slate-550 font-semibold leading-relaxed block mt-0.5">
                            Identifies exact row matches and drops redundant copies. Found {duplicate_count} duplicate row(s).
                          </span>
                        </div>
                      </label>

                      {/* Impute Numerical parameters dropdown */}
                      <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-205 block">Impute Missing Numerical Values</span>
                          <span className="text-[10px] text-slate-550 font-semibold leading-relaxed block mt-0.5">
                            Fill empty numerical cells using central tendency statistics.
                          </span>
                        </div>
                        <select
                          value={imputeNumeric}
                          onChange={(e) => setImputeNumeric(e.target.value)}
                          className="bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-36 transition-colors"
                        >
                          <option value="mean">Mean (Average)</option>
                          <option value="median">Median (Middle)</option>
                          <option value="none">Do Not Impute</option>
                        </select>
                      </div>

                      {/* Impute Categorical parameters dropdown */}
                      <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold text-slate-205 block">Impute Missing Categorical Values</span>
                          <span className="text-[10px] text-slate-550 font-semibold leading-relaxed block mt-0.5">
                            Fill empty text fields using the column's most frequent occurrence.
                          </span>
                        </div>
                        <select
                          value={imputeCategorical}
                          onChange={(e) => setImputeCategorical(e.target.value)}
                          className="bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-300 focus:outline-none focus:border-indigo-500 w-full sm:w-36 transition-colors"
                        >
                          <option value="mode">Mode (Frequent)</option>
                          <option value="none">Do Not Impute</option>
                        </select>
                      </div>

                      {/* Remove empty columns checkbox */}
                      <label className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={removeEmptyCols}
                          onChange={(e) => setRemoveEmptyCols(e.target.checked)}
                          className="mt-0.5 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-800 w-3.5 h-3.5"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-205 block">Prune Empty Columns</span>
                          <span className="text-[10px] text-slate-550 font-semibold leading-relaxed block mt-0.5">
                            Drops columns containing only null/empty spaces to reduce dimensional noise.
                          </span>
                        </div>
                      </label>

                      {/* Standardize Dates checkbox */}
                      <label className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-900 rounded-lg cursor-pointer hover:border-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={standardizeDates}
                          onChange={(e) => setStandardizeDates(e.target.checked)}
                          className="mt-0.5 rounded text-indigo-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-800 w-3.5 h-3.5"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-205 block">Standardize Date Formats</span>
                          <span className="text-[10px] text-slate-550 font-semibold leading-relaxed block mt-0.5">
                            Uniformly formats identified date-like text strings to ISO YYYY-MM-DD.
                          </span>
                        </div>
                      </label>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={handleSanitize}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                      <Wand2 size={14} />
                      <span>Sanitize Dataset</span>
                    </button>
                  </div>
                ) : (
                  /* Smart AI Imputation Panel */
                  <SmartImputationPanel 
                    storageUrl={activeDataset.storageUrl}
                    datasetId={activeDataset._id || activeDataset.id}
                    onImputationSuccess={handleSmartImputationSuccess}
                  />
                )}
              </div>
            </div>


            {/* Quality Summary Stats card */}
            <div className="glass-card rounded-lg p-5 lg:col-span-1 space-y-5 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <HelpCircle size={13} className="text-slate-455" />
                  <span>Quality Context</span>
                </h4>
                
                <div className="space-y-3">
                  <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-slate-450 font-semibold">Missing Records</span>
                    <span className={`font-mono font-bold ${initialMissingCount > 0 ? 'text-amber-455 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10' : 'text-emerald-450 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10'}`}>
                      {initialMissingCount} nulls
                    </span>
                  </div>

                  <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-slate-450 font-semibold">Duplicate Rows</span>
                    <span className={`font-mono font-bold ${duplicate_count > 0 ? 'text-rose-455 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10' : 'text-emerald-450 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10'}`}>
                      {duplicate_count} rows
                    </span>
                  </div>

                  <div className="p-3 bg-slate-955 border border-slate-900 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="text-slate-455 font-semibold">Total Columns</span>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                      {initialCols}
                    </span>
                  </div>
                </div>
              </div>

              {/* Export Direct Options */}
              <div className="border-t border-slate-900 pt-5 mt-6">
                <h5 className="text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-3">Download Active Version</h5>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="flex-1 py-1.5 px-3 bg-slate-955 border border-slate-900 hover:bg-slate-900 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download size={11} />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="flex-1 py-1.5 px-3 bg-slate-955 border border-slate-900 hover:bg-slate-900 text-slate-350 text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet size={11} />
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
