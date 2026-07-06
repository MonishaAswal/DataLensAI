import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

const DataPreviewTable = ({ rows = [], columns = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const colKeys = useMemo(() => columns.map(c => c.name), [columns]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0);
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    
    return rows.filter(row => {
      return colKeys.some(key => {
        const val = row[key];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [rows, colKeys, searchTerm]);

  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Table Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-355 uppercase tracking-wider">Spreadsheet Data Preview</h4>
          <p className="text-[10px] text-slate-550 mt-0.5">Showing head records of the active dataset with real-time pagination.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-550">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="bg-slate-950 border border-slate-900 rounded px-1.5 py-1 text-slate-300 focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-550 pointer-events-none">
              <Search size={12} />
            </span>
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-7 pr-3 py-1 bg-slate-950 border border-slate-900 rounded-lg text-[11px] text-slate-205 placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table Responsive Wrapper */}
      <div className="overflow-x-auto border border-slate-900 rounded-lg bg-slate-955/20 max-h-[400px]">
        <table className="w-full border-collapse text-left text-xs text-slate-350">
          <thead>
            <tr className="bg-slate-955 text-slate-455 border-b border-slate-900 sticky top-0 z-10 select-none">
              <th className="px-4 py-2 font-bold text-slate-455 select-none w-12">#</th>
              {columns.map((col) => (
                <th 
                  key={col.name} 
                  className="px-4 py-2 font-bold text-slate-455 select-none min-w-[100px] max-w-[180px] truncate"
                  title={`${col.name} (${col.type})`}
                >
                  <div className="flex flex-col">
                    <span className="truncate text-slate-350">{col.name}</span>
                    <span className="text-[8px] text-slate-550 font-bold font-mono tracking-wider uppercase mt-0.5">{col.type}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-900">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => {
                const absoluteIndex = currentPage * pageSize + idx + 1;
                return (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate-950/20 transition-colors"
                  >
                    <td className="px-4 py-2 text-slate-550 font-mono">{absoluteIndex}</td>
                    {colKeys.map((key) => {
                      const value = row[key];
                      const isNull = value === null || value === undefined;
                      
                      return (
                        <td 
                          key={key} 
                          className="px-4 py-2 truncate max-w-[200px] font-medium"
                          title={isNull ? 'Null value' : String(value)}
                        >
                          {isNull ? (
                            <span className="px-1.5 py-0.5 text-[9px] rounded bg-slate-900 text-slate-550 italic font-bold">
                              null
                            </span>
                          ) : typeof value === 'boolean' ? (
                            <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase ${value ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-450 border border-rose-500/10'}`}>
                              {String(value)}
                            </span>
                          ) : typeof value === 'number' ? (
                            <span className="font-mono text-indigo-300">
                              {Number.isInteger(value) ? value : value.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-slate-300">{String(value)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td 
                  colSpan={colKeys.length + 1} 
                  className="px-4 py-8 text-center text-slate-550 italic"
                >
                  No rows match the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-[10px] text-slate-450 px-1">
        <div>
          Showing <span className="font-bold text-slate-350">{Math.min(filteredRows.length, currentPage * pageSize + 1)}</span> to{' '}
          <span className="font-bold text-slate-350">{Math.min(filteredRows.length, (currentPage + 1) * pageSize)}</span> of{' '}
          <span className="font-bold text-slate-350">{filteredRows.length}</span> records
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-2 py-1 bg-slate-950 border border-slate-900 rounded-lg text-slate-300 disabled:opacity-20 hover:bg-slate-900 transition-colors"
          >
            Prev
          </button>
          
          <span className="font-semibold text-slate-550">
            Page <span className="text-slate-350">{currentPage + 1}</span> of{' '}
            <span className="text-slate-350">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-2 py-1 bg-slate-950 border border-slate-900 rounded-lg text-slate-300 disabled:opacity-20 hover:bg-slate-900 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataPreviewTable;
