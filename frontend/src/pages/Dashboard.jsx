import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService } from '../services/api';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import DataPreviewTable from '../components/DataPreviewTable';
import { 
  Database, 
  Grid, 
  Cpu, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

const Dashboard = () => {
  const { activeDataset } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overviewData, setOverviewData] = useState(null);

  useEffect(() => {
    const fetchOverview = async () => {
      if (!activeDataset?._id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const data = await datasetService.getOverview(activeDataset._id);
        setOverviewData(data);
      } catch (err) {
        console.error('Error fetching overview:', err);
        setError(err.response?.data?.message || 'Failed to load dataset overview statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [activeDataset?._id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Loading dataset overview details...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="glass-card rounded-2xl p-8 border border-rose-500/20 bg-rose-500/5 text-center my-6">
          <h4 className="text-rose-500 font-extrabold text-sm mb-2">Error Loading Overview</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{error}</p>
        </div>
      </Layout>
    );
  }

  if (!activeDataset || !overviewData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-slate-400 italic">No dataset active in current workspace.</p>
        </div>
      </Layout>
    );
  }

  const {
    originalName,
    datasetName,
    rowCount,
    columnCount,
    size,
    duplicateCount,
    missingValueCount,
    qualityScore,
    qualityScoreBreakdown,
    columns,
    previewRows,
    cleaningActions,
    createdAt
  } = overviewData;

  const displayName = datasetName || originalName;

  // Format uploaded time
  const uploadDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Dataset Overview</h2>
            <p className="text-slate-400 text-sm mt-1">
              General characteristics, column definitions, and raw previews of <span className="text-indigo-400 font-bold">{displayName}</span>.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-900/60 px-4 py-2 border border-slate-800 rounded-xl">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status:</span>
            {overviewData.status === 'cleaned' ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
                <CheckCircle2 size={14} />
                <span>Sanitized</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <span>Analyzed</span>
              </span>
            )}
          </div>
        </div>

        {/* Quality Score Breakdown Detail */}
        {qualityScoreBreakdown && Object.keys(qualityScoreBreakdown).length > 0 && (
          <div className="glass-card rounded-2xl p-5 border border-slate-850 bg-slate-950/20 space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350">Data Quality Score Breakdown</h3>
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Final score: {qualityScore}/100</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Base</span>
                <span className="font-mono text-xs font-bold text-slate-300">100.0</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Nulls</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.missing_values_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Dups</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.duplicates_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider mb-1">Outliers</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.outliers_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Constants</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.constant_columns_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Cardinality</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.cardinality_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Correlations</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.correlation_penalty || 0}</span>
              </div>
              <div className="p-3 bg-slate-900/40 border border-slate-850/60 rounded-xl text-center">
                <span className="text-[9px] text-slate-550 block uppercase tracking-wider mb-1">Imbalance</span>
                <span className="font-mono text-xs font-bold text-rose-400">-{qualityScoreBreakdown.imbalance_penalty || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Overview StatCards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard 
            title="Rows Count" 
            value={rowCount.toLocaleString()} 
            icon={Database} 
            subtext="Total records in dataset"
            color="indigo"
          />
          <StatCard 
            title="Columns Count" 
            value={columnCount.toLocaleString()} 
            icon={Grid} 
            subtext="Available dimensions/features"
            color="cyan"
          />
          <StatCard 
            title="Data Quality Score" 
            value={`${qualityScore}/100`} 
            icon={Cpu} 
            subtext="Calculated database health"
            color={qualityScore > 80 ? 'emerald' : qualityScore > 50 ? 'amber' : 'rose'}
          />
          <StatCard 
            title="Quality Issues" 
            value={duplicateCount + missingValueCount > 0 ? "Issues Found" : "Perfect Health"} 
            icon={AlertTriangle} 
            subtext={`${duplicateCount} dups | ${missingValueCount} nulls`}
            color={duplicateCount + missingValueCount > 0 ? 'rose' : 'emerald'}
          />
        </div>

        {/* Dataset Details & Column Metadata Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Metadata Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-1 space-y-6">
            <h4 className="text-sm font-bold text-slate-300">File Metadata</h4>
            
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Filename</p>
                <p className="text-xs font-semibold text-slate-300 truncate mt-1" title={originalName}>
                  {originalName}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Analysis Timestamp</p>
                <p className="text-xs font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-500" />
                  <span>{uploadDate}</span>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">File Size</p>
                <p className="text-xs font-semibold text-slate-300 font-mono mt-1">
                  {(size / 1024).toFixed(2)} KB
                </p>
              </div>

              {cleaningActions?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sanitizer Actions History</p>
                  <ul className="space-y-1.5">
                    {cleaningActions.map((action, i) => (
                      <li key={i} className="text-[10px] bg-emerald-500/5 text-emerald-400 font-semibold border border-emerald-500/10 px-2 py-1 rounded">
                        ✓ {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Columns Definitions Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 lg:col-span-2 flex flex-col">
            <h4 className="text-sm font-bold text-slate-300 mb-4">Features list & Datatypes</h4>
            
            <div className="flex-1 overflow-y-auto max-h-[300px] border border-slate-900 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/40 text-slate-400 border-b border-slate-950 font-semibold">
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Feature Name</th>
                    <th className="px-4 py-2.5">Detected Type</th>
                    <th className="px-4 py-2.5">Null Values Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 font-medium text-slate-300">
                  {columns.map((col, idx) => {
                    const missingInfo = activeDataset.edaResults?.missing_analysis?.[col.name];
                    const hasMissing = missingInfo && missingInfo.count > 0;
                    
                    return (
                      <tr key={col.name} className="hover:bg-slate-900/10">
                        <td className="px-4 py-2 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-4 py-2 font-bold text-slate-200">{col.name}</td>
                        <td className="px-4 py-2 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                          {col.type}
                        </td>
                        <td className="px-4 py-2">
                          {hasMissing ? (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${missingInfo.percentage > 15 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {missingInfo.count} null ({missingInfo.percentage}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded">
                              0% (None)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Data Sample Preview Box */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800/80">
          <DataPreviewTable 
            rows={previewRows || []} 
            columns={columns || []} 
          />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
