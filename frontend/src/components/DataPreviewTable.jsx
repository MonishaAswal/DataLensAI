import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

const DataPreviewTable = ({ rows = [], columns = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Column names
  const colKeys = useMemo(() => columns.map(c => c.name), [columns]);

  // Reset page when search changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(0);
  };

  // Filtered rows based on search
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

  // Paginated rows
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Table Action Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-350">Dataset Preview</h4>
          <p className="text-xs text-slate-500 mt-0.5">Showing head records of the active dataset with real-time pagination.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Page Size Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-1 text-slate-300 focus:outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search preview rows..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table Responsive Wrapper */}
      <div className="overflow-x-auto border border-slate-800/80 rounded-xl bg-slate-950/20 max-h-[480px]">
        <table className="w-full border-collapse text-left text-xs text-slate-350">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-850 sticky top-0 backdrop-blur-md z-10">
              <th className="px-5 py-3 font-semibold text-slate-400 select-none w-14">#</th>
              {columns.map((col) => (
                <th 
                  key={col.name} 
                  className="px-5 py-3 font-semibold text-slate-400 select-none min-w-[120px] max-w-[200px] truncate"
                  title={`${col.name} (${col.type})`}
                >
                  <div className="flex flex-col">
                    <span className="truncate">{col.name}</span>
                    <span className="text-[9px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">{col.type}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-slate-850">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => {
                const absoluteIndex = currentPage * pageSize + idx + 1;
                return (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-5 py-2.5 text-slate-500 font-mono font-medium">{absoluteIndex}</td>
                    {colKeys.map((key) => {
                      const value = row[key];
                      const isNull = value === null || value === undefined;
                      
                      return (
                        <td 
                          key={key} 
                          className="px-5 py-2.5 truncate max-w-[220px]"
                          title={isNull ? 'Null value' : String(value)}
                        >
                          {isNull ? (
                            <span className="px-2 py-0.5 text-[9px] rounded bg-slate-900/60 text-slate-500 italic font-medium">
                              null
                            </span>
                          ) : typeof value === 'boolean' ? (
                            <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${value ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {String(value)}
                            </span>
                          ) : typeof value === 'number' ? (
                            <span className="font-mono font-medium text-indigo-300">
                              {Number.isInteger(value) ? value : value.toFixed(4)}
                            </span>
                          ) : (
                            <span className="font-medium text-slate-350">{String(value)}</span>
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
                  className="px-5 py-10 text-center text-slate-500 italic"
                >
                  No rows match the search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-2 py-1">
        <div>
          Showing <span className="font-bold text-slate-200">{Math.min(filteredRows.length, currentPage * pageSize + 1)}</span> to{' '}
          <span className="font-bold text-slate-200">{Math.min(filteredRows.length, (currentPage + 1) * pageSize)}</span> of{' '}
          <span className="font-bold text-slate-200">{filteredRows.length}</span> records
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-850"
          >
            Prev
          </button>
          
          <span className="font-medium">
            Page <span className="text-slate-200">{currentPage + 1}</span> of{' '}
            <span className="text-slate-200">{totalPages}</span>
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-850"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataPreviewTable;
