import React from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  CheckCircle, 
  HelpCircle, 
  TrendingUp, 
  ShieldAlert 
} from 'lucide-react';

const Analytics = () => {
  const { activeDataset } = useAuth();

  if (!activeDataset) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[350px] text-center">
          <p className="text-slate-550 italic text-xs">No dataset active in current workspace.</p>
        </div>
      </Layout>
    );
  }

  const { data_quality_issues, outliers_analysis, unique_counts } = activeDataset.edaResults || {};

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'bg-rose-500/10 text-rose-455 border border-rose-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-455 border border-amber-500/20';
      case 'low':
      default:
        return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight">Data Quality Audit</h2>
          <p className="text-slate-455 text-xs mt-1">
            Automated quality checks, anomaly detection, and distribution range reviews for <span className="text-indigo-405 font-bold">{activeDataset.originalName}</span>.
          </p>
        </div>

        {/* Quality Flags Table */}
        <div className="glass-card rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
            <ShieldAlert size={16} className="text-indigo-405" />
            <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider">Automated Quality Checks</h4>
          </div>

          {data_quality_issues && data_quality_issues.length > 0 ? (
            <div className="overflow-x-auto border border-slate-900 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-2.5 pl-4">Column/Dimension</th>
                    <th className="p-2.5">Issue Detected</th>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5 pr-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {data_quality_issues.map((issue, idx) => (
                    <tr key={idx} className="hover:bg-slate-955/40">
                      <td className="p-2.5 pl-4 font-mono font-bold text-slate-205">{issue.column}</td>
                      <td className="p-2.5 font-bold text-indigo-400">{issue.issue}</td>
                      <td className="p-2.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getSeverityStyle(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="p-2.5 pr-4 text-slate-455 text-[10.5px] leading-relaxed max-w-[280px]">
                        {issue.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-955 border border-slate-900 rounded-lg text-center">
              <CheckCircle size={22} className="text-emerald-450 mb-2.5" />
              <h5 className="text-xs font-bold text-slate-202">No quality issues flagged</h5>
              <p className="text-[10px] text-slate-550 mt-1 max-w-xs">The active dataset conforms completely to expected structural constraints.</p>
            </div>
          )}
        </div>

        {/* Statistical Outliers Audit Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Unique Counts / Cardinality Card */}
          <div className="glass-card rounded-lg p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
              <HelpCircle size={16} className="text-indigo-405" />
              <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider font-sans">Feature Distinct Counts</h4>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-900 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-2.5 pl-4">Column Name</th>
                    <th className="p-2.5 pr-4 text-right">Unique Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
                  {unique_counts && Object.entries(unique_counts).map(([colName, count]) => (
                    <tr key={colName} className="hover:bg-slate-955/40">
                      <td className="p-2.5 pl-4 font-bold truncate max-w-[120px]" title={colName}>{colName}</td>
                      <td className="p-2.5 pr-4 font-mono font-bold text-indigo-400 text-right">{count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outliers Box-Plot Details Panel */}
          <div className="glass-card rounded-lg p-5 lg:col-span-2 flex flex-col">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-900 pb-2.5">
              <TrendingUp size={16} className="text-indigo-405" />
              <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider font-sans">IQR Outliers Ranges</h4>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-900 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                    <th className="p-2.5 pl-4">Numerical Column</th>
                    <th className="p-2.5">IQR Boundary</th>
                    <th className="p-2.5 text-center">Anomalies count</th>
                    <th className="p-2.5 pr-4 text-right">Outliers Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-350">
                  {outliers_analysis && Object.keys(outliers_analysis).length > 0 ? (
                    Object.entries(outliers_analysis).map(([colName, oInfo]) => (
                      <tr key={colName} className="hover:bg-slate-955/40">
                        <td className="p-2.5 pl-4 font-bold text-slate-205 truncate max-w-[110px]" title={colName}>
                          {colName}
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-450">
                          {oInfo.lower_bound !== null ? (
                            <span>[{oInfo.lower_bound.toFixed(2)}, {oInfo.upper_bound.toFixed(2)}]</span>
                          ) : (
                            <span className="italic text-slate-550">N/A</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          {oInfo.count > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 text-[9.5px] font-bold text-rose-455 bg-rose-500/5 border border-rose-500/10 rounded">
                              {oInfo.count} ({oInfo.percentage}%)
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-450 bg-emerald-500/5 border border-emerald-500/10 rounded">
                              0% (None)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 pr-4 text-right truncate max-w-[160px]">
                          {oInfo.outlier_samples && oInfo.outlier_samples.length > 0 ? (
                            <span className="font-mono text-[10px] text-slate-550">
                              {oInfo.outlier_samples.slice(0, 4).map(val => val.toFixed(1)).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[10px] italic text-slate-650">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-slate-550 italic">
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
