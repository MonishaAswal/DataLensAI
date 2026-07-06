import React, { useState } from 'react';

const CorrelationHeatmap = ({ correlationMatrix }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!correlationMatrix || Object.keys(correlationMatrix).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-950 border border-slate-900 rounded-lg min-h-[250px]">
        <p className="text-slate-550 italic text-xs">No numeric correlation data available.</p>
        <p className="text-slate-550 text-[10px] mt-1 font-mono">Requires at least 2 numerical columns in the dataset.</p>
      </div>
    );
  }

  const columns = Object.keys(correlationMatrix);

  const getCellColor = (val) => {
    if (val === undefined || val === null) return 'rgba(39, 39, 42, 0.4)'; // zinc-800
    
    // Positive correlation: indigo
    if (val > 0.05) {
      return `rgba(99, 102, 241, ${val * 0.9})`; 
    }
    // Negative correlation: rose
    if (val < -0.05) {
      return `rgba(244, 63, 94, ${Math.abs(val) * 0.9})`; 
    }
    
    return 'rgba(39, 39, 42, 0.6)';
  };

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* Heatmap Matrix grid */}
      <div className="w-full overflow-auto p-4 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="flex">
            {/* Top-left spacer */}
            <div className="w-20 h-14 flex-shrink-0"></div>
            
            {/* Horizontal Header (X-Axis) */}
            <div className="flex">
              {columns.map((col) => (
                <div 
                  key={col} 
                  className="w-12 h-14 flex items-end justify-center pb-2 flex-shrink-0"
                >
                  <span className="text-[9px] font-bold text-slate-455 rotate-45 origin-bottom-left whitespace-nowrap translate-x-2 max-w-[50px] truncate block" title={col}>
                    {col}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {columns.map((rowCol) => (
            <div key={rowCol} className="flex items-center">
              {/* Vertical Header (Y-Axis) */}
              <div className="w-20 pr-3 text-right flex-shrink-0">
                <span className="text-[9px] font-bold text-slate-455 truncate block w-full" title={rowCol}>
                  {rowCol}
                </span>
              </div>
              
              {/* Cells grid */}
              <div className="flex">
                {columns.map((col) => {
                  const val = correlationMatrix[rowCol]?.[col];
                  return (
                    <div
                      key={col}
                      className="w-12 h-12 border border-slate-950 flex items-center justify-center cursor-pointer transition-all duration-150 flex-shrink-0 relative group"
                      style={{ backgroundColor: getCellColor(val) }}
                      onMouseEnter={() => setHoveredCell({ row: rowCol, col, value: val })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className={`text-[9.5px] font-bold tracking-tight ${Math.abs(val) > 0.4 ? 'text-white' : 'text-slate-300'}`}>
                        {val !== undefined ? val.toFixed(2) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Info Tooltip */}
      <div className="h-10 mt-4 flex items-center justify-center">
        {hoveredCell ? (
          <div className="px-3 py-1 bg-slate-950 border border-slate-900 rounded-lg flex items-center gap-2 animate-fade-in text-[10px]">
            <span className="font-bold text-indigo-400">{hoveredCell.row}</span>
            <span className="text-slate-550">&lt;-&gt;</span>
            <span className="font-bold text-cyan-400">{hoveredCell.col}</span>
            <span className="text-slate-550">:</span>
            <span className={`font-mono font-bold ${hoveredCell.value > 0.5 ? 'text-indigo-300' : hoveredCell.value < -0.5 ? 'text-rose-455' : 'text-slate-350'}`}>
              {hoveredCell.value.toFixed(4)}
            </span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-550 italic">Hover over cells to see detailed correlation metadata.</p>
        )}
      </div>

      {/* Grid Legend */}
      <div className="mt-4 flex items-center gap-3 bg-slate-955 px-4 py-2 rounded-lg border border-slate-900 text-[9px] font-bold">
        <span className="text-rose-455 uppercase tracking-wide">Negative (-1.0)</span>
        <div className="w-32 h-1.5 rounded bg-gradient-to-r from-rose-500 via-slate-900 to-indigo-500"></div>
        <span className="text-indigo-400 uppercase tracking-wide">Positive (+1.0)</span>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
