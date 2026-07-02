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
import { Sparkles, BarChart2, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

const ImputationReport = ({ reportData }) => {
  if (!reportData || !reportData.report || reportData.report.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-slate-800 text-center">
        <p className="text-slate-500 italic text-xs">No imputation metrics available.</p>
      </div>
    );
  }

  const { report, beforeMissingCount, afterMissingCount, columnsProcessed } = reportData;

  // 1. Prepare chart data for side-by-side comparison
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
      {/* Overview Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-850/80 bg-slate-900/10 flex flex-col justify-center text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Columns Processed</span>
          <span className="text-sm font-black font-mono text-indigo-400">
            {columnsProcessed.length}
          </span>
        </div>
        <div className="glass-card rounded-xl p-4 border border-slate-850/80 bg-slate-900/10 flex flex-col justify-center text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Missing Before</span>
          <span className="text-sm font-black font-mono text-rose-400">
            {beforeMissingCount} values
          </span>
        </div>
        <div className="glass-card rounded-xl p-4 border border-slate-850/80 bg-slate-900/10 flex flex-col justify-center text-center">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Missing After</span>
          <span className={`text-sm font-black font-mono ${afterMissingCount === 0 ? 'text-emerald-450' : 'text-amber-400'}`}>
            {afterMissingCount} values
          </span>
        </div>
      </div>

      {/* Side-by-Side Visualization Charts */}
      <div>
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

      {/* Column Imputation Cards */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={15} className="text-violet-400" />
          <span>Column-Wise Imputation Reports</span>
        </h4>

        <div className="grid grid-cols-1 gap-4">
          {report.map((col, idx) => (
            <div 
              key={idx}
              className="glass-card rounded-xl p-5 border border-slate-850 hover:border-slate-800 transition-all flex flex-col md:flex-row justify-between gap-5 bg-gradient-to-r from-slate-950 via-slate-900/60 to-slate-950"
            >
              {/* Left detail side */}
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

              {/* Right sample predictions list */}
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
    </div>
  );
};

export default ImputationReport;
