import React from 'react';

const StatCard = ({ title, value, icon: Icon, subtext, trend, color = 'indigo' }) => {
  const colorMap = {
    indigo: {
      text: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'hover:border-indigo-500/35',
      glow: 'shadow-indigo-500/10',
    },
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'hover:border-cyan-500/35',
      glow: 'shadow-cyan-500/10',
    },
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'hover:border-emerald-500/35',
      glow: 'shadow-emerald-500/10',
    },
    violet: {
      text: 'text-violet-400',
      bg: 'bg-violet-500/10',
      border: 'hover:border-violet-500/35',
      glow: 'shadow-violet-500/10',
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'hover:border-rose-500/35',
      glow: 'shadow-rose-500/10',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'hover:border-amber-500/35',
      glow: 'shadow-amber-500/10',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={`glass-card rounded-xl p-6 flex flex-col justify-between transition-all duration-300 shadow-md ${scheme.border} hover:shadow-lg ${scheme.glow} hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-lg ${scheme.bg} ${scheme.text}`}>
          <Icon size={20} />
        </div>
      </div>
      
      <div>
        <h3 className="text-2xl font-black text-slate-100 tracking-tight">{value}</h3>
        {subtext && (
          <p className="text-xs text-slate-500 mt-1.5 font-medium flex items-center gap-1.5">
            {trend && (
              <span className={`font-semibold ${trend.type === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
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
