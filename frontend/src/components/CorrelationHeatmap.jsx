import React, { useState } from 'react';

const CorrelationHeatmap = ({ correlationMatrix }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!correlationMatrix || Object.keys(correlationMatrix).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900/30 border border-slate-800 rounded-xl min-h-[300px]">
        <p className="text-slate-500 italic text-sm">No numeric correlation data available.</p>
        <p className="text-slate-600 text-xs mt-1">Requires at least 2 numerical columns in the dataset.</p>
      </div>
    );
  }

  const columns = Object.keys(correlationMatrix);

  // Helper to color mapping based on coefficient [-1.0, 1.0]
  const getCellColor = (val) => {
    if (val === undefined || val === null) return 'rgba(30, 41, 59, 0.4)'; // Slate-800
    
    // Positive correlation: indigo/violet gradient
    if (val > 0.05) {
      return `rgba(99, 102, 241, ${val})`; // indigo-500 with opacity
    }
    // Negative correlation: rose gradient
    if (val < -0.05) {
      return `rgba(244, 63, 94, ${Math.abs(val)})`; // rose-500 with opacity
    }
    
    return 'rgba(30, 41, 59, 0.6)'; // neutral slate-800
  };

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* Heatmap Matrix grid */}
      <div className="w-full overflow-auto p-4 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="flex">
            {/* Top-left spacer */}
            <div className="w-24 h-16 flex-shrink-0"></div>
            
            {/* Horizontal Header (X-Axis) */}
            <div className="flex">
              {columns.map((col) => (
                <div 
                  key={col} 
                  className="w-14 h-16 flex items-end justify-center pb-2 flex-shrink-0"
                >
                  <span className="text-[10px] font-bold text-slate-400 rotate-45 origin-bottom-left whitespace-nowrap translate-x-2.5 max-w-[55px] truncate block" title={col}>
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
              <div className="w-24 pr-3 text-right flex-shrink-0">
                <span className="text-[10px] font-bold text-slate-400 truncate block w-full" title={rowCol}>
                  {rowCol}
                </span>
              </div>
              
              {/* Cells grid */}
              <div className="flex">
                {columns.map((col) => {
                  const val = correlationMatrix[rowCol]?.[col];
                  const isHovered = hoveredCell && hoveredCell.row === rowCol && hoveredCell.col === col;

                  return (
                    <div
                      key={col}
                      className="w-14 h-14 border border-slate-900/60 flex items-center justify-center cursor-pointer transition-all duration-150 flex-shrink-0 relative group"
                      style={{ backgroundColor: getCellColor(val) }}
                      onMouseEnter={() => setHoveredCell({ row: rowCol, col, value: val })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className={`text-[10px] font-black tracking-tight ${Math.abs(val) > 0.4 ? 'text-white' : 'text-slate-300'}`}>
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
      <div className="h-10 mt-6 flex items-center justify-center">
        {hoveredCell ? (
          <div className="px-4 py-1.5 text-xs rounded-lg glass-card border border-indigo-500/25 flex items-center gap-2 animate-fade-in shadow shadow-indigo-500/5">
            <span className="font-bold text-indigo-400">{hoveredCell.row}</span>
            <span className="text-slate-500">&lt;-&gt;</span>
            <span className="font-bold text-cyan-400">{hoveredCell.col}</span>
            <span className="text-slate-500">:</span>
            <span className={`font-mono font-black ${hoveredCell.value > 0.5 ? 'text-indigo-300' : hoveredCell.value < -0.5 ? 'text-rose-400' : 'text-slate-350'}`}>
              {hoveredCell.value.toFixed(4)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Hover over cells to see detailed correlation metadata.</p>
        )}
      </div>

      {/* Grid Legend */}
      <div className="mt-4 flex items-center gap-3 bg-slate-900/20 px-5 py-2.5 rounded-xl border border-slate-900">
        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">Negative (-1.0)</span>
        <div className="w-36 h-2 rounded bg-gradient-to-r from-rose-500 via-slate-800 to-indigo-500"></div>
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Positive (+1.0)</span>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
