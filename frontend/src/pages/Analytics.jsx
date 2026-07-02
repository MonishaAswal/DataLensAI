import React from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  TrendingUp, 
  ShieldAlert 
} from 'lucide-react';

const Analytics = () => {
  const { activeDataset } = useAuth();

  if (!activeDataset) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-slate-400 italic">No dataset active in current workspace.</p>
        </div>
      </Layout>
    );
  }

  const { data_quality_issues, outliers_analysis, unique_counts } = activeDataset.edaResults || {};

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/10 text-rose-450 border border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-450 border border-amber-500/20';
      case 'low':
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Data Quality Audit</h2>
          <p className="text-slate-400 text-sm mt-1">
            Automated quality checks, anomalies detection, and distribution range reviews for <span className="text-indigo-400 font-bold">{activeDataset.originalName}</span>.
          </p>
        </div>

        {/* Quality Flags Table */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <div className="flex items-center gap-2.5 mb-4">
            <ShieldAlert size={20} className="text-indigo-400" />
            <h4 className="text-sm font-bold text-slate-300">Automated Quality Checks</h4>
          </div>

          {data_quality_issues && data_quality_issues.length > 0 ? (
            <div className="overflow-x-auto border border-slate-900 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-950 font-semibold">
                    <th className="px-4 py-3">Column</th>
                    <th className="px-4 py-3">Issue Detected</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-medium text-slate-350">
                  {data_quality_issues.map((issue, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/10">
                      <td className="px-4 py-3 font-bold text-slate-200">{issue.column}</td>
                      <td className="px-4 py-3 text-indigo-300">{issue.issue}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityStyle(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px] leading-relaxed">
                        {issue.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 bg-slate-900/10 border border-slate-850 rounded-xl text-center">
              <CheckCircle2 size={36} className="text-emerald-500 mb-3" />
              <h5 className="text-sm font-bold text-slate-250">No quality issues flagged!</h5>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">The dataset passed all structural constraints, duplicates tests, and cardinality checks.</p>
            </div>
          )}
        </div>

        {/* Statistical Outliers Audit Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unique Counts / Cardinality Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-1 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle size={18} className="text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-300">Feature Uniqueness</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[350px] border border-slate-900 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-950 font-semibold">
                    <th className="px-4 py-2">Column</th>
                    <th className="px-4 py-2">Distinct Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300 font-medium">
                  {unique_counts && Object.entries(unique_counts).map(([colName, count]) => (
                    <tr key={colName} className="hover:bg-slate-900/10">
                      <td className="px-4 py-2.5 font-bold truncate max-w-[120px]" title={colName}>{colName}</td>
                      <td className="px-4 py-2.5 font-mono text-indigo-350">{count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outliers Box-Plot Details Panel */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-2 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-300">IQR Outlier Ranges</h4>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[350px] border border-slate-900 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-950 font-semibold">
                    <th className="px-4 py-2.5">Numeric Feature</th>
                    <th className="px-4 py-2.5">IQR Boundaries</th>
                    <th className="px-4 py-2.5">Anomalies Count</th>
                    <th className="px-4 py-2.5">Anomalous Samples</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-350 font-medium">
                  {outliers_analysis && Object.keys(outliers_analysis).length > 0 ? (
                    Object.entries(outliers_analysis).map(([colName, oInfo]) => (
                      <tr key={colName} className="hover:bg-slate-900/10">
                        <td className="px-4 py-3 font-bold text-slate-200 truncate max-w-[110px]" title={colName}>
                          {colName}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                          {oInfo.lower_bound !== null ? (
                            <span>[{oInfo.lower_bound.toFixed(2)}, {oInfo.upper_bound.toFixed(2)}]</span>
                          ) : (
                            <span className="italic text-slate-650">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {oInfo.count > 0 ? (
                            <span className="text-xs font-bold text-rose-400 bg-rose-500/5 px-2 py-0.5 rounded">
                              {oInfo.count} ({oInfo.percentage}%)
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[180px] truncate">
                          {oInfo.outlier_samples && oInfo.outlier_samples.length > 0 ? (
                            <span className="font-mono text-[10px] text-slate-500">
                              {oInfo.outlier_samples.map(val => val.toFixed(1)).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[10px] italic text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-10 text-center text-slate-500 italic">
                        No numerical column outlier statistics computed.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
