import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService, historyService } from '../services/api';
import Layout from '../components/Layout';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Printer, 
  FileText, 
  Activity, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  BookOpen, 
  Zap, 
  ShieldAlert 
} from 'lucide-react';

const AIReport = () => {
  const { activeDataset, setActiveDataset, user } = useAuth();
  const [report, setReport] = useState('');
  const [qualityScore, setQualityScore] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchInsights = async (forceRegen = false) => {
    if (!activeDataset) return;
    
    setLoading(true);
    setError('');
    try {
      if (activeDataset.aiReport && !forceRegen) {
        setReport(activeDataset.aiReport);
        setQualityScore(activeDataset.edaResults?.qualityScore || activeDataset.edaResults?.quality_score || 100);
        
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

      const filename = activeDataset.fileName || activeDataset.originalName || 'dataset.csv';
      const datasetId = activeDataset.id || activeDataset._id;
      const data = await datasetService.getInsights(filename, activeDataset.edaResults, datasetId);

      setReport(data.report);

      const eda = activeDataset.edaResults;
      const score = eda?.qualityScore || eda?.quality_score || 100;
      setQualityScore(score);

      const summary = {
        rowCount: activeDataset.rowCount || eda?.dimensions?.rows || 0,
        columnCount: activeDataset.columnCount || eda?.dimensions?.columns || 0,
        missingCount: eda?.missing_analysis ? Object.values(eda.missing_analysis).reduce((acc, curr) => acc + (curr.count || 0), 0) : 0,
        duplicateCount: eda?.duplicate_count || 0
      };
      setSummaryData(summary);

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

  // Structured Section Extractor
  const reportSections = useMemo(() => {
    if (!report) return [];
    
    const sections = [];
    // Split by headers e.g. "## Executive Summary" or "### Executive Summary"
    const rawSections = report.split(/^(?:#|##|###)\s+/m);
    
    rawSections.forEach((sec) => {
      const trimmed = sec.trim();
      if (!trimmed) return;
      
      const lines = trimmed.split('\n');
      const title = lines[0].replace(/[:#]/g, '').trim();
      const body = lines.slice(1).join('\n').trim();
      
      if (title && body) {
        sections.push({ title, body });
      }
    });

    // Fallback if formatting doesn't match headers exactly
    if (sections.length === 0) {
      return [{ title: 'Analytical Audit Report', body: report }];
    }
    
    return sections;
  }, [report]);

  // Section styling metadata map
  const sectionMeta = {
    'Executive Summary': { icon: BookOpen, color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' },
    'Data Quality Assessment': { icon: Activity, color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10' },
    'Key Findings': { icon: Sparkles, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
    'Risks & Problems': { icon: ShieldAlert, color: 'text-rose-400 bg-rose-500/5 border-rose-500/10' },
    'Recommendations': { icon: HelpCircle, color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
    'Action Items': { icon: CheckCircle2, color: 'text-violet-400 bg-violet-500/5 border-violet-500/10' }
  };

  const parseMarkdownToHtml = (text) => {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Parse Alerts
    html = html.replace(/&gt;\s*\[!WARNING\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3.5 border-l-4 border-amber-500 bg-amber-500/5 rounded-r-xl my-3 text-amber-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    html = html.replace(/&gt;\s*\[!IMPORTANT\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3.5 border-l-4 border-indigo-500 bg-indigo-500/5 rounded-r-xl my-3 text-indigo-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    html = html.replace(/&gt;\s*\[!NOTE\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3.5 border-l-4 border-cyan-500 bg-cyan-500/5 rounded-r-xl my-3 text-cyan-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    html = html.replace(/&gt;\s*\[!CAUTION\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3.5 border-l-4 border-rose-500 bg-rose-500/5 rounded-r-xl my-3 text-rose-350 font-semibold text-xs leading-relaxed">${content}</div>`;
    });

    // Subheadings
    html = html.replace(/^\s*#### (.*?)$/gm, '<h5 class="text-[10px] font-bold text-slate-400 mt-3 mb-1 uppercase tracking-wide">$1</h5>');
    html = html.replace(/^\s*##### (.*?)$/gm, '<h6 class="text-[9px] font-bold text-slate-500 mt-2 mb-0.5 uppercase">$1</h6>');

    // Formatting rules
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-205">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-400">$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="font-mono bg-slate-900/90 text-indigo-305 px-1.5 py-0.5 rounded text-[10px] font-bold">$1</code>');

    // List rendering
    html = html.replace(/^\s*-\s*(.*?)$/gm, '<li class="ml-4 list-disc text-slate-350 py-1 text-xs font-semibold">$1</li>');

    // Break lines
    html = html.replace(/\n\n/g, '<p class="my-3 text-xs text-slate-400 leading-relaxed font-semibold"></p>');

    return html;
  };

  if (!activeDataset) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-slate-405 italic">No dataset active in current workspace.</p>
        </div>
      </Layout>
    );
  }

  const datasetNameStr = activeDataset.datasetName || activeDataset.originalName || 'Active Dataset';

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
              Natural-language dataset health review, key patterns audit, and recommended roadmaps for <span className="text-indigo-400 font-bold">{datasetNameStr}</span>.
            </p>
          </div>

          {report && !loading && (
            <div className="flex gap-2.5 self-start sm:self-auto">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-850 rounded-xl transition-all"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-slate-305 font-bold border border-slate-850 rounded-xl transition-all"
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
            <p className="text-xs text-slate-500 mt-2 max-w-sm">Generating executive summaries, computing data quality coefficients, and compiling actionable roadmaps via LLM analysis.</p>
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
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className="stroke-slate-900"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      className={`${
                        qualityScore > 80 ? 'stroke-emerald-500' : qualityScore > 55 ? 'stroke-amber-500' : 'stroke-rose-500'
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
                    <span className="text-[9px] text-slate-550 font-bold uppercase tracking-widest mt-0.5">Health Ratio</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 font-semibold mt-4 leading-relaxed">
                  {qualityScore > 80 
                    ? 'Excellent data health. Ready for statistical modeling.' 
                    : qualityScore > 55 
                      ? 'Moderate data quality. Cleaning actions recommended.' 
                      : 'Critical data quality issues. Sanitizer mandatory.'}
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
                      <span className="text-slate-350 font-mono">{summaryData.rowCount?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Dimensions</span>
                      <span className="text-slate-350 font-mono">{summaryData.columnCount} columns</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                      <span className="text-slate-500">Duplicate Entries</span>
                      <span className={`font-mono ${summaryData.duplicateCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {summaryData.duplicateCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-550">Total Missing Cells</span>
                      <span className={`font-mono ${summaryData.missingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {summaryData.missingCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Premium Section Cards Display */}
            <div className="lg:col-span-2 space-y-6">
              {reportSections.map((section, index) => {
                const meta = sectionMeta[section.title] || { icon: FileText, color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' };
                const IconComponent = meta.icon;

                return (
                  <div 
                    key={index} 
                    className="glass-card rounded-2xl border border-slate-800/80 p-6 shadow-xl hover:border-slate-700/60 transition-all space-y-4"
                  >
                    <div className="flex items-center gap-2.5 border-b border-slate-900 pb-3">
                      <div className={`p-2 rounded-lg border ${meta.color}`}>
                        <IconComponent size={16} />
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                        {section.title}
                      </h3>
                    </div>
                    <div 
                      className="text-slate-350 prose prose-invert text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(section.body) }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AIReport;
