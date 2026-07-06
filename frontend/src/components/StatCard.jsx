import React from 'react';

const StatCard = ({ title, value, icon: Icon, subtext, trend, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10',
    emerald: 'text-emerald-450 bg-emerald-500/5 border-emerald-500/10',
    violet: 'text-indigo-400 bg-indigo-500/5 border-indigo-500/10',
    rose: 'text-rose-455 bg-rose-500/5 border-rose-500/10',
    amber: 'text-amber-455 bg-amber-500/5 border-amber-500/10',
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="glass-card rounded-lg p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded border ${scheme}`}>
          <Icon size={14} />
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-bold text-slate-101 tracking-tight">{value}</h3>
        {subtext && (
          <p className="text-[10px] text-slate-550 mt-1 font-semibold flex items-center gap-1.5">
            {trend && (
              <span className={trend.type === 'positive' ? 'text-emerald-450' : 'text-rose-450'}>
                {trend.value}
              </span>
            )}
            <span>{subtext}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
