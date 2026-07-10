import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const CorrelationHeatmap = ({ correlationMatrix }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const { theme } = useAuth();
  const isLightMode = theme === 'light';

  if (!correlationMatrix || Object.keys(correlationMatrix).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-955 border border-slate-900 rounded-lg min-h-[250px]">
        <p className="text-slate-550 italic text-xs">No numeric correlation data available.</p>
        <p className="text-slate-550 text-[10px] mt-1 font-mono">Requires at least 2 numerical columns in the dataset.</p>
      </div>
    );
  }

  const columns = Object.keys(correlationMatrix);

  const getCellColor = (val) => {
    if (val === undefined || val === null) {
      return isLightMode ? 'rgba(230, 224, 212, 0.4)' : 'rgba(39, 39, 42, 0.4)'; // zinc-800 equivalent
    }
    
    // Positive correlation: indigo
    if (val > 0.05) {
      return isLightMode 
        ? `rgba(79, 70, 229, ${val * 0.95})` 
        : `rgba(99, 102, 241, ${val * 0.9})`; 
    }
    // Negative correlation: rose
    if (val < -0.05) {
      return isLightMode 
        ? `rgba(225, 29, 72, ${Math.abs(val) * 0.95})` 
        : `rgba(244, 63, 94, ${Math.abs(val) * 0.95})`; 
    }
    
    return isLightMode ? 'rgba(235, 230, 219, 0.6)' : 'rgba(39, 39, 42, 0.6)';
  };

  return (
    <div className={`flex flex-col items-center select-none w-full p-6 rounded-xl border transition-all duration-300 ${
      isLightMode 
        ? 'bg-[#ffffff] border-[#e2e8f0] text-slate-800' 
        : 'bg-transparent border-transparent text-slate-101'
    }`}>
      {/* Heatmap Matrix grid */}
      <div className="w-full overflow-auto p-4 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="flex">
            {/* Top-left spacer */}
            <div className="w-20 h-24 flex-shrink-0"></div>
            
            {/* Horizontal Header (X-Axis) */}
            <div className="flex">
              {columns.map((col) => (
                <div 
                  key={col} 
                  className="w-12 h-24 flex items-end justify-center pb-2 flex-shrink-0 relative"
                >
                  <span className={`text-[9px] font-bold -rotate-90 origin-bottom-left whitespace-nowrap translate-x-[18px] -translate-y-1.5 max-w-[80px] truncate block absolute bottom-0 left-0 ${
                    isLightMode ? 'text-slate-650' : 'text-slate-455'
                  }`} title={col}>
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
                <span className={`text-[9px] font-bold truncate block w-full ${
                  isLightMode ? 'text-slate-650' : 'text-slate-455'
                }`} title={rowCol}>
                  {rowCol}
                </span>
              </div>
              
              {/* Cells grid */}
              <div className="flex">
                {columns.map((col) => {
                  const val = correlationMatrix[rowCol]?.[col];
                  const absVal = Math.abs(val);
                  return (
                    <div
                      key={col}
                      className={`w-12 h-12 border flex items-center justify-center cursor-pointer transition-all duration-150 flex-shrink-0 relative group ${
                        isLightMode ? 'border-[#EAE2D2]' : 'border-slate-950'
                      }`}
                      style={{ backgroundColor: getCellColor(val) }}
                      onMouseEnter={() => setHoveredCell({ row: rowCol, col, value: val })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className={`text-[9.5px] font-bold tracking-tight ${
                        absVal > 0.4 
                          ? 'text-white' 
                          : isLightMode 
                            ? 'text-slate-700' 
                            : 'text-slate-350'
                      }`}>
                        {typeof val === 'number' ? val.toFixed(2) : '-'}
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
          <div className={`px-3 py-1.5 border rounded-lg flex items-center gap-2 animate-fade-in text-[10px] ${
            isLightMode 
              ? 'bg-[#f1f5f9] border-[#cbd5e1] text-slate-800' 
              : 'bg-slate-955 border-slate-900 text-slate-350'
          }`}>
            <span className={`font-bold ${isLightMode ? 'text-indigo-700' : 'text-indigo-400'}`}>{hoveredCell.row}</span>
            <span className="text-slate-550">&lt;-&gt;</span>
            <span className={`font-bold ${isLightMode ? 'text-cyan-700' : 'text-cyan-400'}`}>{hoveredCell.col}</span>
            <span className="text-slate-550">:</span>
            <span className={`font-mono font-bold ${
              hoveredCell.value > 0.5 
                ? isLightMode ? 'text-indigo-800' : 'text-indigo-300' 
                : hoveredCell.value < -0.5 
                  ? 'text-rose-600' 
                  : isLightMode ? 'text-slate-700' : 'text-slate-350'
            }`}>
              {typeof hoveredCell.value === 'number' ? hoveredCell.value.toFixed(4) : '-'}
            </span>
          </div>
        ) : (
          <p className={`text-[10px] italic ${isLightMode ? 'text-slate-455' : 'text-slate-550'}`}>
            Hover over cells to see detailed correlation metadata.
          </p>
        )}
      </div>

      {/* Grid Legend */}
      <div className={`mt-4 flex items-center gap-3 px-4 py-2 rounded-lg border text-[9px] font-bold ${
        isLightMode 
          ? 'bg-[#f1f5f9] border-[#cbd5e1] text-slate-700' 
          : 'bg-slate-955 border-slate-900 text-slate-350'
      }`}>
        <span className="text-rose-500 uppercase tracking-wide">Negative (-1.0)</span>
        <div className={`w-32 h-1.5 rounded bg-gradient-to-r ${
          isLightMode 
            ? 'from-rose-500 via-[#ffffff] to-indigo-650' 
            : 'from-rose-500 via-slate-900 to-indigo-500'
        }`}></div>
        <span className="text-indigo-500 uppercase tracking-wide">Positive (+1.0)</span>
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
