import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService } from '../services/api';
import Layout from '../components/Layout';
import { Sparkles, Copy, Check, Printer, FileText, Activity, AlertCircle } from 'lucide-react';

import { historyService } from '../services/api';

const AIReport = () => {
  const { activeDataset, setActiveDataset, user } = useAuth();
  const [report, setReport] = useState('');
  const [qualityScore, setQualityScore] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async () => {
    if (!activeDataset) return;
    
    setLoading(true);
    setError('');
    try {
      // 1. If document already has cached aiReport, load it directly!
      if (activeDataset.aiReport) {
        setReport(activeDataset.aiReport);
        setQualityScore(activeDataset.edaResults?.qualityScore || 100);
        
        const eda = activeDataset.edaResults;
        setSummaryData({
          rowCount: activeDataset.rowCount || eda?.dimensions?.rows || 0,
          columnCount: activeDataset.columnCount || eda?.dimensions?.columns || 0,
          missingCount: eda?.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0,
          duplicateCount: eda?.duplicate_count || 0
        });
        setLoading(false);
        return;
      }

      // 2. Otherwise, fetch from backend LLM service
      const filename = activeDataset.fileName || activeDataset.originalName || 'dataset.csv';
      const datasetId = activeDataset.id || activeDataset._id;
      const data = await datasetService.getInsights(filename, activeDataset.edaResults, datasetId);

      setReport(data.report);

      const eda = activeDataset.edaResults;
      const score = eda?.qualityScore || 100;
      setQualityScore(score);

      const summary = {
        rowCount: activeDataset.rowCount || eda?.dimensions?.rows || 0,
        columnCount: activeDataset.columnCount || eda?.dimensions?.columns || 0,
        missingCount: eda?.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0,
        duplicateCount: eda?.duplicate_count || 0
      };
      setSummaryData(summary);

      // 3. Log AI Insights Operation in analysisHistory MongoDB collection
      if (user) {
        try {
          await historyService.createHistory({
            datasetId: datasetId,
            datasetName: filename,
            operationType: 'AI Insights Generation',
            report: data.report
          });
        } catch (logErr) {
          console.warn('Failed to save AI report audit log to backend:', logErr.message);
        }
      }

      // 4. Update active dataset in Auth Context so the cache is preserved
      setActiveDataset({
        ...activeDataset,
        aiReport: data.report
      });

    } catch (err) {
      console.error('[AI Generated Insights] Failed to fetch dataset insights:', err);
      const detailedError = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to communicate with AI Insights Engine.';
      setError(detailedError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [activeDataset?.id, activeDataset?._id]);


  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Regex-based GFM Markdown parser
  const parsedHtml = useMemo(() => {
    if (!report) return '';
    
    let html = report;
    
    // Escape HTML tags to prevent injections
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Parse Alert Panels
    html = html.replace(/&gt;\s*\[!WARNING\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-4 border-l-4 border-amber-500 bg-amber-500/5 rounded-r-xl my-4 text-amber-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    
    html = html.replace(/&gt;\s*\[!IMPORTANT\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-4 border-l-4 border-indigo-500 bg-indigo-500/5 rounded-r-xl my-4 text-indigo-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    
    html = html.replace(/&gt;\s*\[!NOTE\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-4 border-l-4 border-cyan-500 bg-cyan-500/5 rounded-r-xl my-4 text-cyan-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });

    html = html.replace(/&gt;\s*\[!CAUTION\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-4 border-l-4 border-rose-500 bg-rose-500/5 rounded-r-xl my-4 text-rose-350 font-semibold text-xs leading-relaxed">${content}</div>`;
    });

    // Parse Headers
    html = html.replace(/^### (.*?)$/gm, '<h4 class="text-xs font-bold text-slate-350 mt-4 mb-2 uppercase tracking-wide font-sans">$1</h4>');
    html = html.replace(/^## (.*?)$/gm, '<h3 class="text-sm font-black text-indigo-400 mt-6 mb-3 border-b border-slate-900 pb-2 tracking-tight">$1</h3>');
    html = html.replace(/^# (.*?)$/gm, '<h2 class="text-base font-black bg-gradient-to-r from-white via-indigo-150 to-cyan-150 bg-clip-text text-transparent mt-8 mb-4 tracking-tight">$1</h2>');

    // Parse Lists
    html = html.replace(/^\s*-\s*(.*?)$/gm, '<li class="ml-5 list-disc text-slate-300 py-1 font-semibold text-xs leading-relaxed">$1</li>');

    // Parse Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-100">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-300">$1</em>');

    // Parse Inline Code blocks
    html = html.replace(/`(.*?)`/g, '<code class="font-mono bg-slate-900/80 text-indigo-300 px-1.5 py-0.5 rounded text-[10px] font-bold">$1</code>');

    // Parse dividers
    html = html.replace(/^---$/gm, '<hr class="border-slate-900 my-6" />');

    // Paragraph structures
    html = html.replace(/\n\n/g, '<p class="my-3.5 text-xs text-slate-350 leading-relaxed font-semibold"></p>');
    
    return html;
  }, [report]);

  if (!activeDataset) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-slate-400 italic">No dataset active in current workspace.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
              <Sparkles className="text-indigo-400 animate-pulse-slow" size={28} />
              <span>AI Generated Insights</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Natural-language dataset health review, key patterns audit, and recommeded roadmaps for <span className="text-indigo-400 font-bold">{activeDataset.originalName}</span>.
            </p>
          </div>

          {report && !loading && (
            <div className="flex gap-2.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-800 rounded-xl transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-800 rounded-xl transition-all"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>
              <button
                onClick={() => fetchInsights(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10"
              >
                <Sparkles size={14} />
                <span>Regenerate</span>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center border border-indigo-500/20 text-center min-h-[380px] shadow-lg shadow-indigo-500/5">
            <div className="relative mb-6">
              <div className="w-14 h-14 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-indigo-400 animate-pulse">
                <Sparkles size={20} />
              </div>
            </div>
            <h3 className="text-base font-extrabold text-slate-200">AI Engine drafting report...</h3>
            <p className="text-xs text-slate-500 mt-2 max-w-sm">Generating executive summaries, computing data quality coefficients, and compiling actionable roadmaps via Groq API.</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-2xl p-8 border border-rose-500/20 bg-rose-500/5 text-center">
            <h4 className="text-rose-500 font-extrabold text-sm mb-2">Failed to generate AI Insights</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={() => fetchInsights(true)}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Quality Score & Statistics Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Radial Score Card */}
              <div className="glass-card rounded-2xl p-6 border border-slate-800/80 flex flex-col items-center text-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 self-start">Quality Index Score</h4>
                
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Gauge SVG Circle Ring */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-800"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className={`${
                        qualityScore > 80 ? 'stroke-emerald-500' : qualityScore > 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                      } transition-all duration-1000 ease-out`}
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 60}
                      strokeDashoffset={2 * Math.PI * 60 * (1 - (qualityScore || 0) / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-100 tracking-tighter">{qualityScore}%</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Health Ratio</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-semibold mt-4 leading-relaxed">
                  {qualityScore > 80 
                    ? 'Excellent data health. Ready for statistical modeling.' 
                    : qualityScore > 50 
                      ? 'Moderate data quality. Cleaning actions recommended.' 
                      : 'Critical quality issues detected. Sanitizer mandatory.'}
                </p>
              </div>

              {/* Summary Stats List Card */}
              {summaryData && (
                <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={14} />
                    <span>Quality Breakdown</span>
                  </h4>
                  
                  <div className="space-y-3 font-semibold text-xs">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Total Records</span>
                      <span className="text-slate-300 font-mono">{summaryData.rowCount?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Dimensions</span>
                      <span className="text-slate-300 font-mono">{summaryData.columnCount} columns</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Duplicate Entries</span>
                      <span className={`font-mono ${summaryData.duplicateCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {summaryData.duplicateCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Anomalous Outliers</span>
                      <span className={`font-mono ${summaryData.outlierCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {summaryData.outlierCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Markdown Report Display */}
            <div className="lg:col-span-2 glass-card rounded-2xl border border-slate-800/80 p-8 shadow-xl shadow-slate-950/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              {/* Header watermarks */}
              <div className="flex items-center gap-2 text-slate-500 border-b border-slate-900 pb-4 mb-6">
                <FileText size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest font-mono">DataLens AI Generated Audit</span>
              </div>

              {/* Rendered HTML */}
              <div 
                className="prose prose-invert max-w-none ai-report-content text-slate-350"
                dangerouslySetInnerHTML={{ __html: parsedHtml }}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AIReport;
