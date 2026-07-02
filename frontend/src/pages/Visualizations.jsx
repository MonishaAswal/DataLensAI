import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService } from '../services/api';
import Layout from '../components/Layout';

import CorrelationHeatmap from '../components/CorrelationHeatmap';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  ScatterChart, 
  Compass, 
  Info, 
  Download, 
  AlertTriangle,
  Loader2,
  ListMinus,
  TrendingDown
} from 'lucide-react';

const Visualizations = () => {
  const { activeDataset, user } = useAuth();
  const [activeTab, setActiveTab] = useState('distribution'); // 'distribution', 'correlation', 'missing', 'outliers'
  const [selectedCol, setSelectedCol] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);

  const chartRef = useRef(null);

  // Fetch visualizations statistics on mount
  useEffect(() => {
    const loadVisualizations = async () => {
      if (!activeDataset) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const eda = activeDataset.edaResults;
        if (!eda) {
          throw new Error('No analysis data cached in active workspace.');
        }

        const data = {
          correlationMatrix: eda.correlation_matrix,
          missingAnalysis: eda.missing_analysis,
          outliersAnalysis: eda.outliers_analysis,
          distributions: eda.distributions,
          columns: activeDataset.columns || []
        };
        setVisualizationData(data);

        // Save a record into Firestore analysisHistory
        if (user) {
          try {
            await addDoc(collection(db, 'analysisHistory'), {
              userId: user.uid,
              datasetId: activeDataset.id || activeDataset._id,
              datasetName: activeDataset.fileName || activeDataset.originalName || 'dataset.csv',
              operationType: 'Visualization Generation',
              createdAt: new Date().toISOString(),
              report: 'Generated and viewed category distributions and Pearson correlation matrix.'
            });
          } catch (dbErr) {
            console.warn('Logging visualization operation to history failed:', dbErr);
          }
        }

      } catch (err) {
        console.error('Error loading visualizations:', err);
        setError(err.message || 'Failed to load dataset visualization data.');
      } finally {
        setLoading(false);
      }
    };

    loadVisualizations();
  }, [activeDataset, user]);


  // Set default selected column
  const columns = activeDataset?.columns || [];
  useEffect(() => {
    if (columns.length > 0 && !selectedCol) {
      setSelectedCol(columns[0].name);
    }
  }, [columns, selectedCol]);

  const selectedColType = useMemo(() => {
    const col = columns.find(c => c.name === selectedCol);
    return col ? col.type : '';
  }, [columns, selectedCol]);

  // Download chart as PNG
  const handleDownloadPNG = (containerId, title) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) return;

      const svg = container.querySelector('svg');
      if (!svg) {
        alert('Chart SVG element not found.');
        return;
      }

      // Extract SVG string
      const svgSerializer = new XMLSerializer();
      const svgString = svgSerializer.serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.clientWidth || 800;
        canvas.height = svg.clientHeight || 450;
        
        const context = canvas.getContext('2d');
        // Render theme background matching #0b0f19
        context.fillStyle = '#0b0f19';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add chart title header onto canvas
        context.fillStyle = '#f8fafc';
        context.font = 'bold 14px "Outfit", "Inter", sans-serif';
        context.fillText(title, 20, 30);
        
        // Draw the serialized SVG image
        context.drawImage(image, 0, 40, canvas.width, canvas.height - 50);
        
        // Trigger file download
        const pngURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngURL;
        downloadLink.download = `${title.toLowerCase().replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error('Failed to download chart:', err);
      alert('Failed to export chart as PNG.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Generating visual analytics charts...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="glass-card rounded-2xl p-8 border border-rose-500/20 bg-rose-500/5 text-center my-6">
          <h4 className="text-rose-455 font-extrabold text-sm mb-2">Error Loading Visualizations</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{error}</p>
        </div>
      </Layout>
    );
  }

  if (!activeDataset || !visualizationData) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <p className="text-slate-400 italic">No dataset active in current workspace.</p>
        </div>
      </Layout>
    );
  }

  const { distributions, correlationMatrix, missingValues, outliers } = visualizationData;

  const distInfo = distributions[selectedCol];
  const colSummary = activeDataset.edaResults?.column_summaries?.[selectedCol];

  // Recharts color palette
  const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  const renderDistributionChart = () => {
    if (!distInfo || !distInfo.data || distInfo.data.length === 0) {
      return (
        <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-850 rounded-xl min-h-[250px]">
          <p className="text-slate-500 italic text-sm">No distribution metrics computed for column: {selectedCol}</p>
        </div>
      );
    }

    const isNumeric = distInfo.type === 'numeric';

    return (
      <div className="space-y-6">
        {/* Statistics highlights box */}
        {colSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900/35 border border-slate-850 rounded-xl text-xs font-semibold">
            <div>
              <span className="text-slate-550 block uppercase tracking-wide mb-0.5">Missing Rows</span>
              <span className="text-slate-350 text-sm font-bold font-mono">
                {colSummary.missing_count} ({((colSummary.missing_count / (activeDataset.rowCount || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
            <div>
              <span className="text-slate-550 block uppercase tracking-wide mb-0.5">Unique Values</span>
              <span className="text-slate-350 text-sm font-bold font-mono">{colSummary.unique_count.toLocaleString()}</span>
            </div>
            {isNumeric ? (
              <>
                <div>
                  <span className="text-slate-550 block uppercase tracking-wide mb-0.5">Average Mean</span>
                  <span className="text-indigo-300 text-sm font-black font-mono">{colSummary.mean?.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-slate-550 block uppercase tracking-wide mb-0.5">Median (Q50)</span>
                  <span className="text-cyan-300 text-sm font-black font-mono">{colSummary.median?.toFixed(4)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="col-span-2">
                  <span className="text-slate-550 block uppercase tracking-wide mb-0.5">Mode (Top Category)</span>
                  <span className="text-indigo-300 text-sm font-black truncate block max-w-xs" title={colSummary.top}>
                    {colSummary.top || 'None'} ({colSummary.freq} counts)
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Chart View */}
        <div id="distribution-chart-wrapper" className="h-[320px] w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900">
          <ResponsiveContainer width="100%" height="100%">
            {isNumeric ? (
              <BarChart
                data={distInfo.data}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <XAxis 
                  dataKey="bin_range" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8' }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]}
                  name="Frequency"
                >
                  {distInfo.data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index % 2 === 0 ? 'url(#indigoGradient)' : 'url(#cyanGradient)'} 
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.45}/>
                  </linearGradient>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.85}/>
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.45}/>
                  </linearGradient>
                </defs>
              </BarChart>
            ) : (
              <BarChart
                data={distInfo.data}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <XAxis 
                  dataKey="category" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }}
                  labelStyle={{ color: '#94a3b8' }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[4, 4, 0, 0]}
                  name="Value Count"
                >
                  {distInfo.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Visual Analytics</h2>
            <p className="text-slate-400 text-sm mt-1">
              Explore tabular data using dynamic histograms, category frequencies, null audits, and Pearson correlation matrices for <span className="text-indigo-400 font-bold">{activeDataset.originalName}</span>.
            </p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex border border-slate-800 p-1 bg-slate-900/60 rounded-xl text-xs font-bold uppercase tracking-wider overflow-x-auto">
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'distribution' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={14} />
              <span>Features Density</span>
            </button>
            
            <button
              onClick={() => setActiveTab('correlation')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'correlation' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ScatterChart size={14} />
              <span>Correlations Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('missing')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'missing' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListMinus size={14} />
              <span>Missing Values</span>
            </button>

            <button
              onClick={() => setActiveTab('outliers')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'outliers' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown size={14} />
              <span>Outliers Box Plots</span>
            </button>
          </div>
        </div>

        {/* Tab contents */}
        {activeTab === 'distribution' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border-r border-slate-900 pr-0 lg:pr-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                <Compass size={14} />
                <span>Select Feature</span>
              </h4>
              
              <div className="space-y-1 overflow-y-auto max-h-[360px] pr-2">
                {columns.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => setSelectedCol(col.name)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                      selectedCol === col.name
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold'
                        : 'bg-transparent border-transparent text-slate-450 hover:bg-slate-900/40 hover:text-slate-250'
                    }`}
                  >
                    <span className="truncate max-w-[130px]">{col.name}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 uppercase tracking-widest font-mono">
                      {col.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-200">
                      Distribution of: <span className="text-indigo-400">{selectedCol}</span>
                    </h3>
                    <span className="text-[10px] font-bold text-slate-550 uppercase font-mono bg-slate-900 px-2 py-0.5 rounded">
                      {selectedColType}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadPNG('distribution-chart-wrapper', `${selectedCol} Distribution`)}
                    className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all self-start"
                  >
                    <Download size={12} />
                    <span>Download PNG</span>
                  </button>
                </div>
                {renderDistributionChart()}
              </div>
              
              <div className="mt-6 flex items-start gap-3 bg-indigo-500/5 border border-indigo-500/10 p-3.5 rounded-xl text-[11px] text-indigo-300 leading-relaxed font-semibold">
                <Info size={16} className="mt-0.5 flex-shrink-0 text-indigo-400" />
                <span>
                  Numeric elements group datasets into 10 mathematical bins. Categorical variables are structured into the top 10 categories, wrapping smaller entries into the other index category.
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'correlation' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-200">Pearson Correlation Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">Strength of linear relationships between numerical dimensions.</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('correlation-heatmap-container', 'Pearson Correlations')}
                className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all"
              >
                <Download size={12} />
                <span>Download PNG</span>
              </button>
            </div>
            
            <div id="correlation-heatmap-container">
              <CorrelationHeatmap correlationMatrix={correlationMatrix} />
            </div>
          </div>
        )}

        {activeTab === 'missing' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-200">Missing Values Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">Missing records counts and relative density ratios per column.</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('missing-values-chart-wrapper', 'Missing Values Audit')}
                className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all"
              >
                <Download size={12} />
                <span>Download PNG</span>
              </button>
            </div>

            {missingValues && missingValues.length > 0 ? (
              <div id="missing-values-chart-wrapper" className="h-[340px] w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingValues} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="column" stroke="#64748b" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px' }}
                      itemStyle={{ color: '#ef4444', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="missingCount" fill="#ef4444" name="Null Count" radius={[4, 4, 0, 0]}>
                      {missingValues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.missingCount > 0 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-850 rounded-xl min-h-[250px]">
                <p className="text-slate-500 italic text-sm">No missing value summaries available.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'outliers' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-200">Outlier Box Plot Ranges</h3>
                <p className="text-xs text-slate-500 mt-0.5">Box plots illustrating dataset values distribution ranges (Min, Q25, Median, Q75, Max).</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('outliers-chart-wrapper', 'Outliers Box Ranges')}
                className="flex items-center gap-1 text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all"
              >
                <Download size={12} />
                <span>Download PNG</span>
              </button>
            </div>

            {outliers && outliers.length > 0 ? (
              <div id="outliers-chart-wrapper" className="h-[360px] w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={outliers} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="column" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '8px', color: '#f8fafc' }}
                      formatter={(value, name, props) => {
                        if (name === "Box Range") return [`${props.payload.q25.toFixed(2)} - ${props.payload.q75.toFixed(2)}`, "Q25-Q75 Box"];
                        return [value.toFixed(2), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    {/* Floating Bar for Q25 to Q75 */}
                    <Bar 
                      dataKey="q75" 
                      fill="rgba(99, 102, 241, 0.4)" 
                      stroke="#6366f1"
                      strokeWidth={1}
                      name="Box Range"
                      radius={2}
                    >
                      {outliers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" />
                      ))}
                    </Bar>
                    {/* Median Line representation */}
                    <Line 
                      type="monotone" 
                      dataKey="median" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      dot={{ r: 4, stroke: '#06b6d4', strokeWidth: 1, fill: '#0b0f19' }}
                      name="Median" 
                    />
                    {/* Outer Limits points */}
                    <Line 
                      type="monotone" 
                      dataKey="max" 
                      stroke="#8b5cf6" 
                      strokeWidth={1} 
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: '#8b5cf6' }} 
                      name="Max Peak"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="min" 
                      stroke="#ec4899" 
                      strokeWidth={1} 
                      strokeDasharray="4 4"
                      dot={{ r: 2, fill: '#ec4899' }} 
                      name="Min Floor"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-850 rounded-xl min-h-[250px]">
                <p className="text-slate-500 italic text-sm">No numeric features detected to calculate outliers.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Visualizations;
