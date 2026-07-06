import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { datasetService, historyService } from '../services/api';
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
  Legend,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter
} from 'recharts';
import { 
  BarChart3, 
  ScatterChart as ScatterIcon, 
  Compass, 
  Info, 
  Download, 
  AlertTriangle,
  Loader2,
  ListMinus,
  TrendingDown,
  LineChart,
  PieChart as PieIcon,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Brain
} from 'lucide-react';

const Visualizations = ({ isTabbed = false }) => {
  const { activeDataset, user } = useAuth();
  const [activeTab, setActiveTab] = useState('distribution'); // 'distribution', 'correlation', 'missing', 'outliers'
  const [selectedCol, setSelectedCol] = useState('');
  const [selectedChartType, setSelectedChartType] = useState('bar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visualizationData, setVisualizationData] = useState(null);

  const wrapLayout = (el) => {
    if (isTabbed) return el;
    return <Layout>{el}</Layout>;
  };

  const prevDatasetIdRef = useRef(activeDataset?.id || activeDataset?._id);
  useEffect(() => {
    const currentId = activeDataset?.id || activeDataset?._id;
    if (currentId !== prevDatasetIdRef.current) {
      setSelectedCol('');
      prevDatasetIdRef.current = currentId;
    }
  }, [activeDataset]);

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

        // Save history log
        if (user) {
          try {
            await historyService.createHistory({
              datasetId: activeDataset.id || activeDataset._id,
              datasetName: activeDataset.datasetName || activeDataset.originalName || 'dataset.csv',
              operationType: 'Visualization Generation',
              report: 'Generated and viewed category distributions and Pearson correlation matrix.'
            });
          } catch (dbErr) {
            console.warn('Logging visualization operation to history failed:', dbErr.message);
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

  const distInfo = useMemo(() => {
    if (!visualizationData || !selectedCol) return null;
    return visualizationData.distributions?.[selectedCol];
  }, [visualizationData, selectedCol]);

  const colSummary = useMemo(() => {
    if (!activeDataset || !selectedCol) return null;
    return activeDataset.edaResults?.column_summaries?.[selectedCol];
  }, [activeDataset, selectedCol]);

  const isNumericCol = useMemo(() => {
    return distInfo?.type === 'numeric';
  }, [distInfo]);

  // Dynamic Chart Recommendation Engine
  const recommendation = useMemo(() => {
    if (!colSummary || !distInfo) return { type: 'bar', text: 'Bar Chart' };
    const unique = colSummary.unique_count;
    
    if (isNumericCol) {
      if (unique > 15) {
        return { 
          type: 'histogram', 
          text: 'Histogram', 
          reason: 'Continuous numeric column with high cardinality. Histogram best details frequencies across value ranges.' 
        };
      }
      return { 
        type: 'column', 
        text: 'Column Chart', 
        reason: 'Discrete numerical column with few values. Column chart compares values side by side.' 
      };
    } else {
      if (unique > 0 && unique <= 6) {
        return { 
          type: 'pie', 
          text: 'Pie Chart', 
          reason: 'Categorical column with low cardinality. Pie chart effectively shows relative proportions.' 
        };
      }
      return { 
        type: 'bar', 
        text: 'Bar Chart', 
        reason: 'Categorical text column. Horizontal bar chart allows clean rendering of category labels.' 
      };
    }
  }, [colSummary, distInfo, isNumericCol]);

  // Set chart type automatically when column changes
  useEffect(() => {
    if (recommendation) {
      setSelectedChartType(recommendation.type);
    }
  }, [selectedCol, recommendation]);

  // Dynamic Text Insights Generator
  const columnInsights = useMemo(() => {
    if (!colSummary || !activeDataset) return '';
    const insights = [];
    const missingPct = ((colSummary.missing_count / (activeDataset.rowCount || 1)) * 100).toFixed(1);
    
    if (parseFloat(missingPct) > 10) {
      insights.push(`🚨 Highly Incomplete: This column is missing ${missingPct}% of its values. Imputation is strongly recommended before downstream ML training.`);
    } else if (parseFloat(missingPct) > 0) {
      insights.push(`ℹ️ Slight Sparsity: A minor ${missingPct}% of records are null. Can be easily resolved in standard sanitization.`);
    }

    if (isNumericCol) {
      const meanVal = colSummary.mean || 0;
      const medianVal = colSummary.median || 0;
      const stdVal = colSummary.std || 0;
      const diffPct = Math.abs((meanVal - medianVal) / (meanVal || 1)) * 100;
      
      if (diffPct > 15) {
        insights.push(`📈 Distribution Skewness: The mean (${meanVal.toFixed(2)}) is significantly different from the median (${medianVal.toFixed(2)}), suggesting a highly skewed distribution.`);
      }
      if (stdVal > meanVal) {
        insights.push(`⚠️ High Variance: Standard deviation (${stdVal.toFixed(2)}) exceeds the mean (${meanVal.toFixed(2)}), showing large dispersion of numeric data.`);
      }
    } else {
      if (colSummary.top && colSummary.freq) {
        const topPct = ((colSummary.freq / (activeDataset.rowCount || 1)) * 100).toFixed(1);
        if (parseFloat(topPct) > 60) {
          insights.push(`🎯 Dominant Class: The category '${colSummary.top}' dominates the column, accounting for ${topPct}% of all records.`);
        }
      }
    }

    return insights.length > 0 ? insights : ['✨ Healthy distribution with no major cardinality or missingness flags detected. Ready for analysis.'];
  }, [colSummary, activeDataset, isNumericCol]);

  const COLORS = ['#6366f1', '#06b6d4', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  // Export svg to png
  const handleDownloadPNG = (containerId, title) => {
    try {
      const container = document.getElementById(containerId);
      if (!container) return;

      const svg = container.querySelector('svg');
      if (!svg) {
        alert('Chart element not fully loaded yet.');
        return;
      }

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
        context.fillStyle = '#0f172a'; // SaaS Slate-900 background
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#f8fafc';
        context.font = 'bold 15px "Inter", sans-serif';
        context.fillText(title, 20, 30);
        
        context.drawImage(image, 0, 45, canvas.width, canvas.height - 55);
        
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
      console.error('Failed to export chart:', err);
      alert('Failed to export chart as PNG.');
    }
  };

  const renderActiveChart = () => {
    if (!distInfo || !distInfo.data || distInfo.data.length === 0) {
      return (
        <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-850 rounded-xl min-h-[250px]">
          <p className="text-slate-500 italic text-sm">No distribution metrics computed for column: {selectedCol}</p>
        </div>
      );
    }

    const chartData = distInfo.data.map((item, idx) => ({
      ...item,
      // Adapt keys dynamically for different Recharts chart structures
      name: isNumericCol ? item.bin_range : item.category,
      value: item.count,
      index: idx
    }));

    switch (selectedChartType) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#lineColor)" name="Count" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#areaColor)" name="Count" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis type="category" dataKey="name" name="Value" stroke="#64748b" fontSize={9} />
              <YAxis type="number" dataKey="value" name="Count" stroke="#64748b" fontSize={10} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px' }} />
              <Scatter name="Distribution" data={chartData} fill="#8b5cf6">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'bar':
        // Horizontal Bar
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} width={80} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Count">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      case 'boxplot':
        if (!colSummary || colSummary.min === undefined || colSummary.min === null) {
          return (
            <div className="flex items-center justify-center p-8 bg-slate-900/10 border border-slate-850 rounded-xl min-h-[250px]">
              <p className="text-slate-500 italic text-sm">Box Plot is only available for numerical columns.</p>
            </div>
          );
        }
        const minVal = colSummary.min;
        const q25Val = colSummary.q25 ?? colSummary.min;
        const medVal = colSummary.median ?? colSummary.mean;
        const q75Val = colSummary.q75 ?? colSummary.max;
        const maxVal = colSummary.max;
        const rangeVal = maxVal - minVal || 1;
        const getPctVal = (val) => ((val - minVal) / rangeVal) * 100;
        
        return (
          <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[260px] text-slate-200">
            <div className="relative w-full max-w-md h-20 flex items-center px-4 bg-slate-900/50 rounded-xl border border-slate-800">
              {/* Whiskers line */}
              <div className="absolute left-[10%] right-[10%] h-0.5 bg-slate-700"></div>
              
              {/* Left whisker cap */}
              <div className="absolute left-[10%] h-6 w-0.5 bg-slate-500"></div>
              
              {/* Right whisker cap */}
              <div className="absolute right-[10%] h-6 w-0.5 bg-slate-500"></div>
              
              {/* Box (IQR) */}
              <div 
                className="absolute h-10 bg-indigo-500/20 border border-indigo-500 rounded flex items-center"
                style={{
                  left: `${10 + getPctVal(q25Val) * 0.8}%`,
                  width: `${Math.max(1, getPctVal(q75Val - q25Val) * 0.8)}%`
                }}
              >
                {/* Median line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                  style={{ left: `${((medVal - q25Val) / (q75Val - q25Val || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2 w-full max-w-md mt-6 text-center text-[10px] font-mono font-bold text-slate-400">
              <div>
                <span className="block text-slate-500 text-[8px] uppercase mb-1">Min</span>
                <span>{minVal.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-indigo-400 text-[8px] uppercase mb-1">Q1 (25%)</span>
                <span>{q25Val.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-cyan-400 text-[8px] uppercase mb-1">Median</span>
                <span>{medVal.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-indigo-400 text-[8px] uppercase mb-1">Q3 (75%)</span>
                <span>{q75Val.toFixed(2)}</span>
              </div>
              <div>
                <span className="block text-slate-500 text-[8px] uppercase mb-1">Max</span>
                <span>{maxVal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      case 'column':
      case 'histogram':
      default:
        // Vertical Column
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Count">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'url(#indigoGrad)' : 'url(#cyanGrad)'} />
                ))}
              </Bar>
              <defs>
                <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.85}/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.45}/>
                </linearGradient>
                <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.85}/>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.45}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <Loader2 size={36} className="text-indigo-500 animate-spin" />
        <p className="text-slate-400 text-sm font-semibold">Generating visual analytics charts...</p>
      </div>
    );
  }

  if (error) {
    return wrapLayout(
      <div className="glass-card rounded-2xl p-8 border border-rose-500/20 bg-rose-500/5 text-center my-6">
        <h4 className="text-rose-400 font-extrabold text-sm mb-2">Error Loading Visualizations</h4>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{error}</p>
      </div>
    );
  }

  if (!activeDataset || !visualizationData) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-slate-400 italic">No dataset active in current workspace.</p>
      </div>
    );
  }

  const { correlationMatrix, missingAnalysis, outliersAnalysis } = visualizationData;
  const datasetDisplayName = activeDataset.datasetName || activeDataset.originalName || 'Active Dataset';

  return wrapLayout(
    <div className="space-y-8">
        {/* Header Title */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="text-indigo-400" size={28} />
              <span>Visual Analytics</span>
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Explore dynamic charts, recommend visual representation models, and audit Pearson correlation spaces in <span className="text-indigo-400 font-bold">{datasetDisplayName}</span>.
            </p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex border border-slate-900 p-1 bg-slate-950/40 rounded-xl text-xs font-bold uppercase tracking-wider overflow-x-auto self-start xl:self-auto">
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'distribution' 
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <BarChart3 size={14} />
              <span>Features Density</span>
            </button>
            
            <button
              onClick={() => setActiveTab('correlation')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'correlation' 
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <ScatterIcon size={14} />
              <span>Correlations Matrix</span>
            </button>
            
            <button
              onClick={() => setActiveTab('missing')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'missing' 
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <ListMinus size={14} />
              <span>Missing Values</span>
            </button>

            <button
              onClick={() => setActiveTab('outliers')}
              className={`px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'outliers' 
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-bold' 
                  : 'text-slate-500 hover:text-slate-350'
              }`}
            >
              <TrendingDown size={14} />
              <span>Outliers Audit</span>
            </button>
          </div>
        </div>

        {/* Tab contents */}
        {activeTab === 'distribution' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Columns list */}
            <div className="lg:col-span-1 border-r border-slate-900/60 pr-0 lg:pr-6">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3.5 flex items-center gap-1.5">
                <Compass size={14} />
                <span>Select Feature</span>
              </h4>
              
              <div className="space-y-1 overflow-y-auto max-h-[380px] pr-2">
                {columns.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => setSelectedCol(col.name)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between border transition-all ${
                      selectedCol === col.name
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold'
                        : 'bg-transparent border-transparent text-slate-450 hover:bg-slate-900/40 hover:text-slate-300'
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{col.name}</span>
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-500 uppercase tracking-widest font-mono">
                      {col.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visuals display */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-200">
                      Feature: <span className="text-indigo-400">{selectedCol}</span>
                    </h3>
                  </div>
                  
                  {/* Chart Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Chart:</span>
                    <select
                      value={selectedChartType}
                      onChange={e => setSelectedChartType(e.target.value)}
                      className="bg-slate-950 border border-slate-850 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-350 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="bar">Bar (Horizontal)</option>
                      <option value="column">Column (Vertical)</option>
                      <option value="pie">Pie Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="area">Area Chart</option>
                      <option value="scatter">Scatter Plot</option>
                      <option value="boxplot">Box Plot</option>
                    </select>

                    <button
                      onClick={() => handleDownloadPNG('distribution-chart-container', `${selectedCol} Distribution`)}
                      className="p-1.5 bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                      title="Download PNG"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                </div>

                {/* Recommendation Alert Box */}
                {recommendation && (
                  <div className="p-3 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl flex items-start gap-2 text-[10px] text-indigo-300">
                    <Brain size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-extrabold uppercase text-[8px] tracking-wide bg-indigo-500/15 px-1.5 py-0.5 rounded text-indigo-400 mr-1.5">AI Recommended Chart</span>
                      <span className="font-bold text-slate-200 mr-1">{recommendation.text}:</span>
                      <span>{recommendation.reason}</span>
                    </div>
                  </div>
                )}

                {/* Summary boxes */}
                {colSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-slate-900/25 border border-slate-900 rounded-xl text-[10px] font-semibold text-slate-450">
                    <div>
                      <span className="text-slate-550 block uppercase tracking-wide">Missing Values</span>
                      <span className="text-slate-300 font-mono font-bold mt-0.5 block">
                        {colSummary.missing_count} ({((colSummary.missing_count / (activeDataset.rowCount || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-550 block uppercase tracking-wide">Unique Cards</span>
                      <span className="text-slate-300 font-mono font-bold mt-0.5 block">{colSummary.unique_count.toLocaleString()}</span>
                    </div>
                    {isNumericCol ? (
                      <>
                        <div>
                          <span className="text-slate-550 block uppercase tracking-wide">Average Mean</span>
                          <span className="text-indigo-300 font-mono font-bold mt-0.5 block">{colSummary.mean?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-550 block uppercase tracking-wide">Standard Dev</span>
                          <span className="text-cyan-300 font-mono font-bold mt-0.5 block">{colSummary.std?.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <span className="text-slate-550 block uppercase tracking-wide">Top Category</span>
                        <span className="text-indigo-300 font-bold truncate mt-0.5 block max-w-[200px]" title={colSummary.top}>
                          {colSummary.top || 'N/A'} ({colSummary.freq} counts)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chart Box */}
                <div id="distribution-chart-container" className="h-[280px] w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900">
                  {renderActiveChart()}
                </div>
              </div>

              {/* Dynamic Insights Section */}
              <div className="space-y-2 border-t border-slate-900/60 pt-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-400" />
                  <span>Column Distribution Insights</span>
                </h4>
                <div className="space-y-1.5">
                  {columnInsights.map((insight, idx) => (
                    <p key={idx} className="text-[11px] text-slate-350 leading-relaxed font-medium">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'correlation' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-200">Pearson Correlation Matrix</h3>
                <p className="text-xs text-slate-500 mt-0.5">Strength of linear relationships between numerical dimensions.</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('correlation-heatmap-container', 'Pearson Correlations')}
                className="flex items-center gap-1.5 text-[10px] bg-slate-900 border border-slate-850 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all self-start"
              >
                <Download size={12} />
                <span>Download PNG</span>
              </button>
            </div>
            
            <div id="correlation-heatmap-container" className="pt-2">
              <CorrelationHeatmap correlationMatrix={correlationMatrix} />
            </div>
          </div>
        )}

        {activeTab === 'missing' && (
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-200">Missing Values Summary</h3>
                <p className="text-xs text-slate-500 mt-0.5">Missing records counts and relative density ratios per column.</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('missing-values-chart-wrapper', 'Missing Values Audit')}
                className="flex items-center gap-1.5 text-[10px] bg-slate-900 border border-slate-850 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all self-start"
              >
                <Download size={12} />
                <span>Download PNG</span>
              </button>
            </div>

            {missingAnalysis && Object.keys(missingAnalysis).length > 0 ? (
              <div id="missing-values-chart-wrapper" className="h-[340px] w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={Object.entries(missingAnalysis).map(([col, info]) => ({
                      column: col,
                      missingCount: info.count,
                      percentage: info.percentage
                    }))} 
                    margin={{ top: 20, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="column" stroke="#64748b" fontSize={9} angle={-25} textAnchor="end" tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#ef4444', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="missingCount" fill="#ef4444" name="Null Count" radius={[4, 4, 0, 0]}>
                      {Object.entries(missingAnalysis).map(([col, info], index) => (
                        <Cell key={`cell-${index}`} fill={info.count > 0 ? '#ef4444' : '#10b981'} />
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
          <div className="glass-card rounded-2xl p-6 border border-slate-800/80 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base font-black text-slate-200">Outlier Box Plot Ranges</h3>
                <p className="text-xs text-slate-500 mt-0.5">Box plots illustrating dataset values distribution ranges (Min, Q25, Median, Q75, Max).</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('outliers-chart-wrapper', 'Outliers Box Ranges')}
                className="flex items-center gap-1.5 text-[10px] bg-slate-900 border border-slate-850 text-slate-400 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-700 transition-all self-start"
              >
                <Download size={12} />
                <span>Download PNG</span>
              </button>
            </div>

            {outliersAnalysis && Object.keys(outliersAnalysis).length > 0 && Object.values(outliersAnalysis).some(o => o.count > 0) ? (
              <div id="outliers-chart-wrapper" className="h-[360px] w-full bg-slate-950/20 p-2 rounded-xl border border-slate-900">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={Object.entries(outliersAnalysis)
                      .filter(([col, o]) => activeDataset.edaResults?.column_summaries?.[col]?.type === 'numeric')
                      .map(([col, o]) => {
                        const sum = activeDataset.edaResults?.column_summaries?.[col] || {};
                        return {
                          column: col,
                          min: sum.min || 0,
                          q25: sum.q25 || 0,
                          median: sum.median || 0,
                          q75: sum.q75 || 0,
                          max: sum.max || 0,
                          outliersCount: o.count
                        };
                      })
                    } 
                    margin={{ top: 20, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="column" stroke="#64748b" fontSize={9} angle={-20} textAnchor="end" tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      formatter={(value, name, props) => {
                        if (name === "Box Range") return [`${props.payload.q25.toFixed(2)} - ${props.payload.q75.toFixed(2)}`, "Q25-Q75 Box"];
                        return [value.toFixed(2), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar 
                      dataKey="q75" 
                      fill="rgba(99, 102, 241, 0.25)" 
                      stroke="#6366f1"
                      strokeWidth={1}
                      name="Box Range"
                      radius={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="median" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      dot={{ r: 4, stroke: '#06b6d4', strokeWidth: 1, fill: '#0b0f19' }}
                      name="Median" 
                    />
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
                <p className="text-slate-500 italic text-sm">No numeric outlier distributions computed for this dataset.</p>
              </div>
            )}
          </div>
        )}
      </div>
  );
};

export default Visualizations;
