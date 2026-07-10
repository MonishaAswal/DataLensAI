import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  CheckCircle, 
  BookOpen, 
  ShieldAlert,
  Loader2
} from 'lucide-react';

const AIReport = ({ isTabbed = false }) => {
  const { activeDataset, setActiveDataset, user } = useAuth();
  const [report, setReport] = useState('');
  const [qualityScore, setQualityScore] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  
  const fetchInProgress = useRef(false);

  const wrapLayout = (el) => {
    if (isTabbed) return el;
    return <Layout>{el}</Layout>;
  };

  const fetchInsights = async (forceRegen = false) => {
    if (!activeDataset) return;
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
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
      fetchInProgress.current = false;
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

  const reportSections = useMemo(() => {
    if (!report) return [];
    
    const sections = [];
    const rawSections = report.split(/^(?:#|##|###)\s+/m);
    
    rawSections.forEach((sec) => {
      const trimmed = sec.trim();
      if (!trimmed) return;
      
      const lines = trimmed.split('\n');
      let title = lines[0].replace(/[:#*]/g, '').trim();
      title = title.replace(/^\d+[\.\-\s]*/, '').trim();
      const body = lines.slice(1).join('\n').trim();
      
      if (title && body) {
        sections.push({ title, body });
      }
    });

    if (sections.length === 0) {
      return [{ title: 'Analytical Audit Report', body: report }];
    }
    
    return sections;
  }, [report]);

  const sectionMeta = {
    'Executive Summary': { icon: BookOpen, color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' },
    'Data Quality Assessment': { icon: Activity, color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10' },
    'Key Findings': { icon: Sparkles, color: 'text-emerald-450 bg-emerald-500/5 border-emerald-500/10' },
    'Risks & Problems': { icon: ShieldAlert, color: 'text-rose-455 bg-rose-500/5 border-rose-500/10' },
    'Recommendations': { icon: HelpCircle, color: 'text-amber-455 bg-amber-500/5 border-amber-500/10' },
    'Action Items': { icon: CheckCircle, color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' }
  };

  const parseMarkdownToHtml = (text) => {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    html = html.replace(/&gt;\s*\[!WARNING\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3 border-l-2 border-amber-500 bg-amber-500/5 rounded-r-lg my-3 text-amber-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    html = html.replace(/&gt;\s*\[!IMPORTANT\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3 border-l-2 border-indigo-500 bg-indigo-500/5 rounded-r-lg my-3 text-indigo-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    html = html.replace(/&gt;\s*\[!NOTE\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3 border-l-2 border-cyan-500 bg-cyan-500/5 rounded-r-lg my-3 text-cyan-300 font-semibold text-xs leading-relaxed">${content}</div>`;
    });
    html = html.replace(/&gt;\s*\[!CAUTION\]\s*([\s\S]*?)(?=(?:&gt;\s*\[!|$))/gi, (match, p1) => {
      const content = p1.replace(/&gt;\s?/g, '').trim();
      return `<div class="p-3 border-l-2 border-rose-500 bg-rose-500/5 rounded-r-lg my-3 text-rose-350 font-semibold text-xs leading-relaxed">${content}</div>`;
    });

    html = html.replace(/^\s*#### (.*?)$/gm, '<h5 class="text-[10px] font-bold text-slate-400 mt-3 mb-1 uppercase tracking-wide">$1</h5>');
    html = html.replace(/^\s*##### (.*?)$/gm, '<h6 class="text-[9px] font-bold text-slate-500 mt-2 mb-0.5 uppercase">$1</h6>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-extrabold text-slate-205">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-slate-455">$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="font-mono bg-slate-950 text-indigo-300 px-1 py-0.5 rounded text-[10px] font-bold border border-slate-900">$1</code>');

    html = html.replace(/^\s*-\s*(.*?)$/gm, '<li class="ml-4 list-disc text-slate-350 py-1 text-xs font-semibold">$1</li>');

    html = html.replace(/\n\n/g, '<p class="my-3 text-xs text-slate-450 leading-relaxed font-semibold"></p>');

    return html;
  };

  if (!activeDataset) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center">
        <p className="text-slate-550 italic text-xs">No dataset active in current workspace.</p>
      </div>
    );
  }

  const datasetNameStr = activeDataset.datasetName || activeDataset.originalName || 'Active Dataset';

  return wrapLayout(
    <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight flex items-center gap-2.5">
              <Sparkles className="text-indigo-400" size={24} />
              <span>AI Insights</span>
            </h2>
            <p className="text-slate-455 text-xs mt-1">
              Natural-language dataset health review, key patterns audit, and recommended actions for <span className="text-indigo-400 font-bold">{datasetNameStr}</span>.
            </p>
          </div>

          {report && !loading && (
            <div className="flex gap-2 self-start sm:self-auto">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-slate-300 font-bold border border-slate-900 rounded-lg transition-colors"
              >
                {copied ? <Check size={11} className="text-emerald-450" /> : <Copy size={11} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider bg-slate-950 hover:bg-slate-900 text-slate-350 font-bold border border-slate-900 rounded-lg transition-colors"
              >
                <Printer size={11} />
                <span>Print</span>
              </button>
              <button
                onClick={() => fetchInsights(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-wider bg-indigo-650 hover:bg-indigo-600 text-white font-bold rounded-lg transition-colors"
              >
                <Sparkles size={11} />
                <span>Regenerate</span>
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="glass-card rounded-lg p-12 flex flex-col items-center justify-center text-center min-h-[350px]">
            <Loader2 size={24} className="text-indigo-500 animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-202">AI Insights Engine drafting report...</h3>
            <p className="text-[10px] text-slate-550 mt-1.5 max-w-sm">Generating executive summaries, computing data quality coefficients, and compiling actionable roadmaps via LLM analysis.</p>
          </div>
        ) : error ? (
          <div className="glass-card rounded-lg p-8 border border-rose-500/10 bg-rose-500/5 text-center">
            <h4 className="text-rose-455 font-bold text-xs mb-2">Failed to generate AI Insights</h4>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-4">{error}</p>
            <button
              onClick={() => fetchInsights(true)}
              className="px-4 py-2 bg-slate-905 border border-slate-900 text-slate-202 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-900 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Quality Score & Statistics Summary */}
            <div className="lg:col-span-1 space-y-6">
              {/* Radial Score Card */}
              <div className="glass-card rounded-lg p-5 flex flex-col items-center text-center">
                <h4 className="text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-4 self-start">Quality Index Score</h4>
                
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className="stroke-slate-950"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      className={`${
                        qualityScore > 80 ? 'stroke-emerald-450' : qualityScore > 55 ? 'stroke-amber-450' : 'stroke-rose-450'
                      } transition-all duration-700 ease-out`}
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={2 * Math.PI * 46 * (1 - (qualityScore || 0) / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-101 tracking-tighter">{qualityScore}%</span>
                    <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider mt-0.5">Health Ratio</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-450 font-semibold mt-4 leading-relaxed">
                  {qualityScore > 80 
                    ? 'Excellent data health. Ready for statistical modeling.' 
                    : qualityScore > 55 
                      ? 'Moderate data quality. Cleaning actions recommended.' 
                      : 'Critical data quality issues. Sanitizer mandatory.'}
                </p>
              </div>

              {/* Summary Stats List Card */}
              {summaryData && (
                <div className="glass-card rounded-lg p-5 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-900 pb-2">
                    <Activity size={13} className="text-slate-455" />
                    <span>Quality Breakdown</span>
                  </h4>
                  
                  <div className="space-y-3 font-semibold text-xs">
                    <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                      <span className="text-slate-550 text-[11px]">Total Records</span>
                      <span className="text-slate-300 font-mono">{summaryData.rowCount?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                      <span className="text-slate-555">Dimensions</span>
                      <span className="text-slate-300 font-mono">{summaryData.columnCount} cols</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-955 pb-2">
                      <span className="text-slate-555">Duplicate Rows</span>
                      <span className={`font-mono font-bold ${summaryData.duplicateCount > 0 ? 'text-rose-455' : 'text-emerald-450'}`}>
                        {summaryData.duplicateCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-555">Missing Cells</span>
                      <span className={`font-mono font-bold ${summaryData.missingCount > 0 ? 'text-amber-455' : 'text-emerald-450'}`}>
                        {summaryData.missingCount}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Premium Section Cards Display */}
            <div className="lg:col-span-2 space-y-5">
              {reportSections.map((section, index) => {
                const meta = sectionMeta[section.title] || { icon: FileText, color: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10' };
                const IconComponent = meta.icon;

                return (
                  <div 
                    key={index} 
                    className="glass-card rounded-lg p-5 space-y-4"
                  >
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <div className={`p-1.5 rounded border ${meta.color}`}>
                        <IconComponent size={13} />
                      </div>
                      <h3 className="text-[11px] font-bold text-slate-101 uppercase tracking-wider">
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
  );
};

export default AIReport;
