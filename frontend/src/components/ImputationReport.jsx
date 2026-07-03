import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { 
  Sparkles, 
  BarChart2, 
  CheckCircle2, 
  Database, 
  Hash, 
  AlertCircle, 
  TrendingUp 
} from 'lucide-react';
import StatCard from './StatCard';

const ImputationReport = ({ reportData }) => {
  // If reportData is completely missing, return default indicator
  if (!reportData) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center">
        <p className="text-slate-500 italic text-xs">No imputation metrics available.</p>
      </div>
    );
  }

  const { report = [], beforeMissingCount = 0, afterMissingCount = 0, columnsProcessed = [] } = reportData;

  // Extract or compute metrics with fallbacks
  const metrics = reportData.metrics || {
    totalRows: reportData.rowCount || 0,
    totalColumns: reportData.columnCount || 0,
    columnsWithMissingBefore: columnsProcessed.length,
    totalMissingBefore: beforeMissingCount,
    totalMissingAfter: afterMissingCount,
    totalImputed: Math.max(0, beforeMissingCount - afterMissingCount),
    dataCompleteness: reportData.rowCount && reportData.columnCount
      ? parseFloat(((1.0 - (afterMissingCount / (reportData.rowCount * reportData.columnCount))) * 100).toFixed(2))
      : 100.0,
    imputationPercentage: reportData.rowCount && reportData.columnCount
      ? parseFloat((((beforeMissingCount - afterMissingCount) / (reportData.rowCount * reportData.columnCount)) * 100).toFixed(2))
      : 0.0
  };

  const totalCells = metrics.totalRows * metrics.totalColumns;
  const initialCompleteness = totalCells > 0 
    ? ((1.0 - (metrics.totalMissingBefore / totalCells)) * 100.0).toFixed(2)
    : '100.00';

  // Prepare chart data for side-by-side comparison
  const chartDataBefore = report.map(col => ({
    name: col.column,
    count: col.missingBefore
  }));

  const chartDataAfter = report.map(col => ({
    name: col.column,
    count: col.missingAfter
  }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 6 attractive statistic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          title="Total Rows Processed"
          value={metrics.totalRows.toLocaleString()}
          icon={Database}
          color="indigo"
          subtext="All rows parsed for cleaning"
        />
        <StatCard 
          title="Total Columns Processed"
          value={metrics.totalColumns.toLocaleString()}
          icon={Hash}
          color="cyan"
          subtext={`With ${metrics.columnsWithMissingBefore} column(s) affected`}
        />
        <StatCard 
          title="Total Missing Values Found"
          value={metrics.totalMissingBefore.toLocaleString()}
          icon={AlertCircle}
          color="rose"
          subtext="Before imputation process"
        />
        <StatCard 
          title="Values Imputed"
          value={metrics.totalImputed.toLocaleString()}
          icon={Sparkles}
          color="violet"
          subtext={`${metrics.imputationPercentage}% of dataset cells`}
        />
        <StatCard 
          title="Remaining Missing Values"
          value={metrics.totalMissingAfter.toLocaleString()}
          icon={CheckCircle2}
          color={metrics.totalMissingAfter === 0 ? "emerald" : "amber"}
          subtext={metrics.totalMissingAfter === 0 ? "All missing values fixed" : "Imputation fallback applied"}
        />
        <StatCard 
          title="Data Completeness"
          value={`${metrics.dataCompleteness}%`}
          icon={TrendingUp}
          color="emerald"
          subtext={`Initially ${initialCompleteness}%`}
        />
      </div>

      {/* No missing values message */}
      {(!report || report.length === 0) && (
        <div className="glass-card rounded-2xl p-8 border border-slate-850/80 bg-slate-900/10 text-center animate-fade-in">
          <p className="text-emerald-400 font-extrabold text-sm">No missing values detected. Dataset was already complete.</p>
        </div>
      )}

      {/* Side-by-Side Visualization Charts (render only if we have missing values) */}
      {report && report.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-4 flex items-center gap-2">
            <BarChart2 size={15} className="text-indigo-400" />
            <span>Visual Missing Values Comparison</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart Before */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 bg-slate-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  1. Missing Values Before Imputation
                </h5>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/5 px-2.5 py-0.5 rounded border border-rose-500/10">
                  {beforeMissingCount} Nulls
                </span>
              </div>
              
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataBefore} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#ef4444', fontWeight: 'bold', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]}>
                      {chartDataBefore.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#ef4444" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart After */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 bg-slate-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  2. Missing Values After Imputation
                </h5>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2.5 py-0.5 rounded border border-emerald-500/10">
                  {afterMissingCount} Nulls
                </span>
              </div>

              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataAfter} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0b0f19', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 'bold', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {chartDataAfter.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#10b981" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Imputation Table (render only if we have missing values) */}
      {report && report.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 bg-slate-950/20 space-y-4">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Database size={15} className="text-cyan-400" />
            <span>Imputation Summary Table</span>
          </h4>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-450 uppercase font-black tracking-wider">
                  <th className="py-3 px-4">Column</th>
                  <th className="py-3 px-4 text-center">Missing Before</th>
                  <th className="py-3 px-4 text-center">Missing After</th>
                  <th className="py-3 px-4 text-right">Method Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
                {report.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-200">{col.column}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-400">{col.missingBefore}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-450">{col.missingAfter}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-indigo-300">{col.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Column-Wise Imputation Reports */}
      {report && report.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={15} className="text-violet-400" />
            <span>Column-Wise Detail Cards</span>
          </h4>

          <div className="grid grid-cols-1 gap-4">
            {report.map((col, idx) => (
              <div 
                key={idx}
                className="glass-card rounded-xl p-5 border border-slate-850 hover:border-slate-800 transition-all flex flex-col md:flex-row justify-between gap-5 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-150 text-sm tracking-tight">{col.column}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-900 text-slate-500 uppercase tracking-widest font-mono rounded">
                      {col.type}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-slate-400 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Method:</span>
                      <span className="text-indigo-300 font-black">{col.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-550 text-[10px] uppercase font-bold tracking-wider">Imputed Cells:</span>
                      <span>{col.valuesPredicted} cell(s) ({col.missingBefore} ➔ {col.missingAfter})</span>
                    </div>
                  </div>
                </div>

                {col.samplePredictions && col.samplePredictions.length > 0 && (
                  <div className="w-full md:w-72 bg-slate-950/40 border border-slate-900 p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">
                      Sample ML Predictions Preview:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {col.samplePredictions.map((pred, pIdx) => (
                        <span 
                          key={pIdx}
                          className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded"
                        >
                          {pred}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImputationReport;
