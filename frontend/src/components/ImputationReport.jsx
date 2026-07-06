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
  CheckCircle, 
  Database, 
  Hash, 
  AlertCircle, 
  TrendingUp 
} from 'lucide-react';
import StatCard from './StatCard';

const ImputationReport = ({ reportData }) => {
  if (!reportData) {
    return (
      <div className="glass-card rounded-lg p-6 border border-slate-900 text-center">
        <p className="text-slate-550 italic text-xs">No imputation metrics available.</p>
      </div>
    );
  }

  const { report = [], beforeMissingCount = 0, afterMissingCount = 0, columnsProcessed = [] } = reportData;

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

  const chartDataBefore = report.map(col => ({
    name: col.column,
    count: col.missingBefore
  }));

  const chartDataAfter = report.map(col => ({
    name: col.column,
    count: col.missingAfter
  }));

  return (
    <div className="space-y-6 animate-fade-in">
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
          icon={CheckCircle}
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

      {(!report || report.length === 0) && (
        <div className="glass-card rounded-lg p-6 border border-slate-900 text-center">
          <p className="text-emerald-450 font-bold text-xs">No missing values detected. Dataset was already complete.</p>
        </div>
      )}

      {report && report.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BarChart2 size={13} className="text-indigo-400" />
            <span>Missing Values Audit Visuals</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Chart Before */}
            <div className="glass-card rounded-lg p-5 border border-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  1. Null Values Before Imputation
                </h5>
                <span className="text-[9px] font-bold text-rose-455 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10 font-mono">
                  {beforeMissingCount} Nulls
                </span>
              </div>
              
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataBefore} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }}
                      itemStyle={{ color: '#f87171', fontWeight: 'bold', fontSize: '10px' }}
                    />
                    <Bar dataKey="count" fill="#f87171" radius={[2, 2, 0, 0]}>
                      {chartDataBefore.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#f87171" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart After */}
            <div className="glass-card rounded-lg p-5 border border-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  2. Null Values After Imputation
                </h5>
                <span className="text-[9px] font-bold text-emerald-450 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-mono">
                  {afterMissingCount} Nulls
                </span>
              </div>

              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataAfter} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }}
                      itemStyle={{ color: '#34d399', fontWeight: 'bold', fontSize: '10px' }}
                    />
                    <Bar dataKey="count" fill="#34d399" radius={[2, 2, 0, 0]}>
                      {chartDataAfter.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#34d399" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {report && report.length > 0 && (
        <div className="glass-card rounded-lg p-5 border border-slate-900 space-y-4">
          <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider flex items-center gap-1.5">
            <Database size={13} className="text-cyan-400" />
            <span>Imputation Output Audit Table</span>
          </h4>
          
          <div className="overflow-x-auto border border-slate-900 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 font-bold uppercase text-[9px] tracking-wider select-none">
                  <th className="p-2.5 pl-4">Column Name</th>
                  <th className="p-2.5 text-center">Missing Before</th>
                  <th className="p-2.5 text-center">Missing After</th>
                  <th className="p-2.5 pr-4 text-right">Imputation Model/Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300">
                {report.map((col, idx) => (
                  <tr key={idx} className="hover:bg-slate-955/20 transition-colors">
                    <td className="p-2.5 pl-4 font-bold text-slate-205">{col.column}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-rose-455">{col.missingBefore}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-emerald-450">{col.missingAfter}</td>
                    <td className="p-2.5 pr-4 text-right font-bold text-indigo-400 font-mono text-[10px]">{col.method}</td>
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
          <h4 className="text-[10px] font-bold text-slate-355 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} className="text-indigo-400" />
            <span>Target Column Diagnostic Cards</span>
          </h4>

          <div className="grid grid-cols-1 gap-4">
            {report.map((col, idx) => (
              <div 
                key={idx}
                className="glass-card rounded-lg p-5 border border-slate-900 flex flex-col md:flex-row justify-between gap-5"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-205 text-xs">{col.column}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 bg-slate-950 text-slate-550 border border-slate-900 uppercase tracking-widest font-mono rounded">
                      {col.type}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-slate-450 font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-550 text-[9px] uppercase font-bold tracking-wider">Method:</span>
                      <span className="text-indigo-450 font-bold">{col.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-550 text-[9px] uppercase font-bold tracking-wider">Imputed Cells:</span>
                      <span>{col.valuesPredicted} values ({col.missingBefore} ➔ {col.missingAfter})</span>
                    </div>
                  </div>
                </div>

                {col.samplePredictions && col.samplePredictions.length > 0 && (
                  <div className="w-full md:w-72 bg-slate-950 border border-slate-900 p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[8px] text-slate-550 font-bold uppercase tracking-wider mb-2 block">
                      Sample Predictions Preview:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {col.samplePredictions.slice(0, 5).map((pred, pIdx) => (
                        <span 
                          key={pIdx}
                          className="text-[9px] font-mono font-bold bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 px-1.5 py-0.5 rounded"
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
