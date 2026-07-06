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
  Download, 
  Loader2,
  ListMinus,
  TrendingDown,
  Sparkles,
  Brain
} from 'lucide-react';

const Visualizations = ({ isTabbed = false }) => {
  const { activeDataset, user } = useAuth();
  const [activeTab, setActiveTab] = useState('distribution'); // 'distribution', 'correlation', 'missing', 'outliers'
  const [selectedCol, setSelectedCol] = useState('');
  const [selectedChartType, setSelectedChartType] = useState(() => {
    return sessionStorage.getItem('lastSelectedChartType') || 'bar';
  });
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

  // Derived column class from the Python backend classification
  const colClass = useMemo(() => {
    // Prefer distribution type as it is set by classify_column_type
    if (distInfo?.type) return distInfo.type;
    if (colSummary?.column_class) return colSummary.column_class;
    return isNumericCol ? 'numeric' : 'categorical';
  }, [distInfo, colSummary, isNumericCol]);

  const isLongTextCol = useMemo(() => colClass === 'long_text', [colClass]);
  const isDateCol     = useMemo(() => colClass === 'date',      [colClass]);

  // Dynamic Chart Recommendation Engine
  const recommendation = useMemo(() => {
    if (!colSummary || !distInfo) return { type: 'bar', text: 'Bar Chart', reason: '' };
    const unique = colSummary.unique_count;

    if (isLongTextCol) {
      return {
        type: 'bar',
        text: 'Word Frequency',
        reason: 'Long-text column detected. Showing top word frequencies extracted from the text values.'
      };
    }
    if (isDateCol) {
      return {
        type: 'column',
        text: 'Column Chart',
        reason: 'Date/time column. A column chart shows temporal value frequencies.'
      };
    }
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
  }, [colSummary, distInfo, isNumericCol, isLongTextCol, isDateCol]);

  // Save chart selection to sessionStorage for navigation persistence
  const handleChartTypeChange = (type) => {
    setSelectedChartType(type);
    sessionStorage.setItem('lastSelectedChartType', type);
  };

  // Fundamentally incompatible checks — only fire when column changes (not on every chart pick)
  useEffect(() => {
    if (!selectedCol) return;
    // Boxplot requires numeric column. If chosen on categorical/long_text/date, fall back to bar
    if (selectedChartType === 'boxplot' && !isNumericCol) {
      setSelectedChartType('bar');
      sessionStorage.setItem('lastSelectedChartType', 'bar');
    }
    // Pie/line/area/scatter on long_text make no semantic sense — fall back to bar
    if (isLongTextCol && ['pie', 'scatter', 'boxplot'].includes(selectedChartType)) {
      setSelectedChartType('bar');
      sessionStorage.setItem('lastSelectedChartType', 'bar');
    }
  }, [selectedCol, isNumericCol, isLongTextCol]); // intentionally exclude selectedChartType

  // Dynamic Text Insights Generator
  const columnInsights = useMemo(() => {
    if (!colSummary || !activeDataset) return '';
    const insights = [];
    const missingPct = ((colSummary.missing_count / (activeDataset.rowCount || 1)) * 100).toFixed(1);
    
    if (parseFloat(missingPct) > 10) {
      insights.push(`🚨 Highly Incomplete: This column is missing ${missingPct}% of its values. Imputation is recommended before downstream model training.`);
    } else if (parseFloat(missingPct) > 0) {
      insights.push(`ℹ️ Slight Sparsity: A minor ${missingPct}% of records are null. Can be resolved in standard sanitization.`);
    }

    if (isNumericCol) {
      const meanVal = colSummary.mean || 0;
      const medianVal = colSummary.median || 0;
      const stdVal = colSummary.std || 0;
      const diffPct = Math.abs((meanVal - medianVal) / (meanVal || 1)) * 100;
      
      if (diffPct > 15) {
        insights.push(`📈 Distribution Skewness: The mean (${meanVal.toFixed(2)}) is significantly different from the median (${medianVal.toFixed(2)}), suggesting a skewed distribution.`);
      }
      if (stdVal > meanVal) {
        insights.push(`⚠️ High Variance: Standard deviation (${stdVal.toFixed(2)}) exceeds the mean (${meanVal.toFixed(2)}), showing dispersion of numeric data.`);
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
        context.fillStyle = '#060608'; // Premium background color
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#f4f4f5';
        context.font = 'bold 13px "Inter", sans-serif';
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
    // --- Long-text column: show word-frequency bar chart + stats banner ---
    if (isLongTextCol) {
      if (!distInfo || !distInfo.data || distInfo.data.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-amber-500/5 border border-amber-500/10 rounded-lg min-h-[200px] text-center gap-3">
            <span className="text-2xl">📄</span>
            <p className="text-amber-400 text-xs font-bold">Long-Text Column Detected</p>
            <p className="text-slate-550 text-[11px] max-w-xs">
              This column contains free-form prose (e.g. job descriptions, reviews, comments). Standard value-based charts are not applicable. No word data could be extracted.
            </p>
          </div>
        );
      }

      const wordData = distInfo.data.map((item) => ({
        name: item.category,
        value: item.count
      }));

      // Only render bar/column/area/line for word-freq; block pie/scatter/boxplot
      const allowedForLongText = ['bar', 'column', 'area', 'line'];
      const chartTypeToRender = allowedForLongText.includes(selectedChartType) ? selectedChartType : 'bar';

      const LongTextChart = () => {
        if (chartTypeToRender === 'column' || chartTypeToRender === 'histogram') {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wordData} margin={{ top: 10, right: 10, left: -25, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={7} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Frequency">
                  {wordData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        }
        if (chartTypeToRender === 'area') {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wordData} margin={{ top: 10, right: 10, left: -25, bottom: 40 }}>
                <defs>
                  <linearGradient id="ltAreaColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={7} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#ltAreaColor)" name="Frequency" />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        if (chartTypeToRender === 'line') {
          return (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={wordData} margin={{ top: 10, right: 10, left: -25, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={7} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fill="none" name="Frequency" />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        // default: horizontal bar (word frequency)
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wordData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
              <XAxis type="number" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} width={55} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 2, 2, 0]} name="Frequency">
                {wordData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      };

      return (
        <div className="flex flex-col gap-4 w-full h-full">
          {/* Long-text notice banner */}
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/[0.04] border border-amber-500/15 rounded-lg text-[10px]">
            <span className="text-amber-400 text-sm mt-0.5">📄</span>
            <div>
              <span className="font-bold text-amber-400 uppercase tracking-wide text-[8px] bg-amber-500/10 px-1.5 py-0.5 rounded mr-1.5">Long Text</span>
              <span className="text-slate-350 font-semibold">Free-form text column detected.</span>
              <span className="text-slate-550 ml-1">
                Showing top-15 keyword frequencies (stop-words removed).
                {distInfo.avg_length !== undefined && ` Avg length: ${distInfo.avg_length} chars, ${distInfo.avg_words} words/entry.`}
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <LongTextChart />
          </div>
        </div>
      );
    }

    if (!distInfo || !distInfo.data || distInfo.data.length === 0) {
      return (
        <div className="flex items-center justify-center p-8 bg-slate-950 border border-slate-900 rounded-lg min-h-[200px]">
          <p className="text-slate-550 italic text-xs">No distribution metrics computed for column: {selectedCol}</p>
        </div>
      );
    }

    const chartData = distInfo.data.map((item, idx) => ({
      ...item,
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
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }}
                itemStyle={{ color: '#f4f4f5' }}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '9px', paddingTop: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
              <defs>
                <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#lineColor)" name="Count" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
              <defs>
                <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
              <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={1.5} fillOpacity={1} fill="url(#areaColor)" name="Count" />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis type="category" dataKey="name" name="Value" stroke="#52525b" fontSize={8} />
              <YAxis type="number" dataKey="value" name="Count" stroke="#52525b" fontSize={8} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
              <Scatter name="Distribution" data={chartData} fill="#8b5cf6">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
              <XAxis type="number" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} width={80} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 2, 2, 0]} name="Count">
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
            <div className="flex items-center justify-center p-8 bg-slate-950 border border-slate-900 rounded-lg min-h-[200px]">
              <p className="text-slate-550 italic text-xs">Box Plot is only available for numerical columns.</p>
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
          <div className="flex flex-col items-center justify-center p-6 w-full h-full min-h-[220px] text-slate-200">
            <div className="relative w-full max-w-sm h-14 flex items-center px-4 bg-slate-950 rounded-lg border border-slate-900">
              <div className="absolute left-[10%] right-[10%] h-0.5 bg-slate-800"></div>
              <div className="absolute left-[10%] h-4 w-0.5 bg-slate-500"></div>
              <div className="absolute right-[10%] h-4 w-0.5 bg-slate-500"></div>
              <div 
                className="absolute h-8 bg-indigo-500/10 border border-indigo-500/20 rounded flex items-center"
                style={{
                  left: `${10 + getPctVal(q25Val) * 0.8}%`,
                  width: `${Math.max(1, getPctVal(q75Val - q25Val) * 0.8)}%`
                }}
              >
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                  style={{ left: `${((medVal - q25Val) / (q75Val - q25Val || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-2 w-full max-w-sm mt-4 text-center text-[9px] font-mono font-bold text-slate-500">
              <div>
                <span className="block text-[8px] mb-0.5">Min</span>
                <span className="text-slate-350">{minVal.toFixed(1)}</span>
              </div>
              <div>
                <span className="block text-indigo-400 text-[8px] mb-0.5">Q1</span>
                <span className="text-slate-350">{q25Val.toFixed(1)}</span>
              </div>
              <div>
                <span className="block text-cyan-400 text-[8px] mb-0.5">Med</span>
                <span className="text-slate-350">{medVal.toFixed(1)}</span>
              </div>
              <div>
                <span className="block text-indigo-400 text-[8px] mb-0.5">Q3</span>
                <span className="text-slate-350">{q75Val.toFixed(1)}</span>
              </div>
              <div>
                <span className="block text-[8px] mb-0.5">Max</span>
                <span className="text-slate-350">{maxVal.toFixed(1)}</span>
              </div>
            </div>
          </div>
        );
      case 'column':
      case 'histogram':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={8} tickLine={false} />
              <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }} />
              <Bar dataKey="value" fill="#6366f1" radius={[2, 2, 0, 0]} name="Count">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  if (loading) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center space-y-4">
        <Loader2 size={24} className="text-indigo-500 animate-spin" />
        <p className="text-slate-455 text-xs font-semibold">Generating visual analytics charts...</p>
      </div>
    );
  }

  if (error) {
    return wrapLayout(
      <div className="glass-card rounded-lg p-8 border border-rose-500/10 bg-rose-500/5 text-center my-6">
        <h4 className="text-rose-455 font-bold text-xs mb-2">Error Loading Visualizations</h4>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto mb-4">{error}</p>
      </div>
    );
  }

  if (!activeDataset || !visualizationData) {
    return wrapLayout(
      <div className="flex flex-col items-center justify-center min-h-[350px] text-center">
        <p className="text-slate-550 italic text-xs">No dataset active in current workspace.</p>
      </div>
    );
  }

  const { correlationMatrix, missingAnalysis, outliersAnalysis } = visualizationData;
  const datasetDisplayName = activeDataset.datasetName || activeDataset.originalName || 'Active Dataset';

  return wrapLayout(
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
        {/* Header Title */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-101 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="text-indigo-400" size={24} />
              <span>Visual Analytics</span>
            </h2>
            <p className="text-slate-455 text-xs mt-1">
              Explore value distribution densities, outlier properties, and correlation coefficients matrix in <span className="text-indigo-405 font-bold">{datasetDisplayName}</span>.
            </p>
          </div>
          
          {/* Tab Selector */}
          <div className="flex border border-slate-900 p-0.5 bg-slate-955 rounded-lg text-[9px] font-bold uppercase tracking-wider overflow-x-auto self-start xl:self-auto select-none">
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'distribution' 
                  ? 'bg-slate-900 border border-slate-850 text-indigo-400' 
                  : 'text-slate-550 hover:text-slate-400'
              }`}
            >
              <BarChart3 size={11} />
              <span>Features Density</span>
            </button>
            
            <button
              onClick={() => setActiveTab('correlation')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'correlation' 
                  ? 'bg-slate-900 border border-slate-850 text-indigo-400' 
                  : 'text-slate-555 hover:text-slate-400'
              }`}
            >
              <ScatterIcon size={11} />
              <span>Correlations</span>
            </button>
            
            <button
              onClick={() => setActiveTab('missing')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'missing' 
                  ? 'bg-slate-900 border border-slate-850 text-indigo-400' 
                  : 'text-slate-555 hover:text-slate-400'
              }`}
            >
              <ListMinus size={11} />
              <span>Missingness</span>
            </button>
            
            <button
              onClick={() => setActiveTab('outliers')}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'outliers' 
                  ? 'bg-slate-900 border border-slate-850 text-indigo-400' 
                  : 'text-slate-555 hover:text-slate-400'
              }`}
            >
              <TrendingDown size={11} />
              <span>Outliers</span>
            </button>
          </div>
        </div>

        {/* Tab contents */}
        {activeTab === 'distribution' && (
          <div className="glass-card rounded-lg p-5 grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Columns list */}
            <div className="lg:col-span-1 border-r border-slate-900/60 pr-0 lg:pr-5">
              <h4 className="text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Compass size={12} className="text-slate-455" />
                <span>Select Feature</span>
              </h4>
              
              <div className="space-y-0.5 overflow-y-auto max-h-[350px] pr-1">
                {columns.map((col) => {
                  // Resolve the column class for badge colouring
                  const colDist = visualizationData?.distributions?.[col.name];
                  const colSum  = activeDataset?.edaResults?.column_summaries?.[col.name];
                  const cls = colDist?.type || colSum?.column_class || (
                    col.type?.includes('int') || col.type?.includes('float') ? 'numeric' : 'categorical'
                  );
                  const badgeStyle = {
                    numeric:     'text-indigo-400 bg-indigo-500/10 border-indigo-500/15',
                    categorical: 'text-purple-400 bg-purple-500/10 border-purple-500/15',
                    long_text:   'text-amber-400  bg-amber-500/10  border-amber-500/15',
                    date:        'text-emerald-400 bg-emerald-500/10 border-emerald-500/15',
                  }[cls] || 'text-slate-500 bg-slate-950 border-slate-900';
                  const badgeLabel = {
                    numeric: 'num', categorical: 'cat', long_text: 'text', date: 'date'
                  }[cls] || cls;

                  return (
                    <button
                      key={col.name}
                      onClick={() => setSelectedCol(col.name)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-between border transition-all ${
                        selectedCol === col.name
                          ? 'bg-slate-900 border-l-2 border-indigo-500 text-indigo-400'
                          : 'bg-transparent border-transparent text-slate-450 hover:bg-slate-950 hover:text-slate-300'
                      }`}
                    >
                      <span className="truncate max-w-[110px]">{col.name}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest font-mono ${badgeStyle}`}>
                        {badgeLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visuals display */}
            <div className="lg:col-span-3 flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-202">
                      Feature: <span className="text-indigo-400 font-bold">{selectedCol}</span>
                    </h3>
                  </div>
                  
                  {/* Chart Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">Chart:</span>
                    <select
                      value={selectedChartType}
                      onChange={e => handleChartTypeChange(e.target.value)}
                      className="bg-slate-950 border border-slate-900 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-350 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="bar">Bar (Horizontal){isLongTextCol ? ' — Word Freq' : ''}</option>
                      <option value="column">Column (Vertical){isLongTextCol ? ' — Word Freq' : ''}</option>
                      <option value="pie"    disabled={isLongTextCol}>Pie Chart{isLongTextCol ? ' (N/A for text)' : ''}</option>
                      <option value="line">Line Chart</option>
                      <option value="area">Area Chart</option>
                      <option value="scatter" disabled={isLongTextCol || !isNumericCol}>Scatter Plot{(!isNumericCol || isLongTextCol) ? ' (numeric only)' : ''}</option>
                      <option value="boxplot" disabled={!isNumericCol}>Box Plot{!isNumericCol ? ' (numeric only)' : ''}</option>
                    </select>

                    <button
                      onClick={() => handleDownloadPNG('distribution-chart-container', `${selectedCol} Distribution`)}
                      className="p-1.5 bg-slate-950 border border-slate-900 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                      title="Download PNG"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>

                {/* Recommendation Alert Box */}
                {recommendation && (
                  <div className="p-2.5 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-lg flex items-start gap-2 text-[10px] text-indigo-300">
                    <Brain size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold uppercase text-[8px] tracking-wide bg-indigo-500/10 px-1.5 py-0.5 rounded text-indigo-400 mr-1.5">AI Suggestion</span>
                      <span className="font-bold text-slate-202 mr-1">{recommendation.text}:</span>
                      <span>{recommendation.reason}</span>
                    </div>
                  </div>
                )}

                {/* Summary boxes */}
                {colSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 p-3 bg-slate-955 border border-slate-900 rounded-lg text-[10px] font-semibold text-slate-450">
                    <div>
                      <span className="text-slate-550 block uppercase tracking-wider">Missing Values</span>
                      <span className="text-slate-300 font-mono font-bold mt-0.5 block">
                        {colSummary.missing_count} ({((colSummary.missing_count / (activeDataset.rowCount || 1)) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-550 block uppercase tracking-wider">Unique Cards</span>
                      <span className="text-slate-300 font-mono font-bold mt-0.5 block">{colSummary.unique_count.toLocaleString()}</span>
                    </div>
                    {isNumericCol ? (
                      <>
                        <div>
                          <span className="text-slate-550 block uppercase tracking-wider">Mean Average</span>
                          <span className="text-indigo-300 font-mono font-bold mt-0.5 block">{colSummary.mean?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-555 block uppercase tracking-wider">Std Deviation</span>
                          <span className="text-cyan-300 font-mono font-bold mt-0.5 block">{colSummary.std?.toFixed(2)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <span className="text-slate-550 block uppercase tracking-wider">Top Occurrence</span>
                        <span className="text-indigo-305 font-bold truncate mt-0.5 block max-w-[200px]" title={colSummary.top}>
                          {colSummary.top || 'N/A'} ({colSummary.freq} occurrences)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Chart Box */}
                <div id="distribution-chart-container" className="h-[240px] w-full bg-slate-955/20 p-2 rounded-lg border border-slate-900">
                  {renderActiveChart()}
                </div>
              </div>

              {/* Dynamic Insights Section */}
              <div className="space-y-1.5 border-t border-slate-900 pt-3">
                <h4 className="text-[9px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-indigo-400" />
                  <span>Column Distribution Insights</span>
                </h4>
                <div className="space-y-1">
                  {columnInsights.map((insight, idx) => (
                    <p key={idx} className="text-[10.5px] text-slate-350 leading-relaxed font-semibold">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'correlation' && (
          <div className="glass-card rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-202">Pearson Correlation Matrix</h3>
                <p className="text-[10.5px] text-slate-550 mt-0.5">Strength of linear relationships between numerical dimensions.</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('correlation-heatmap-container', 'Pearson Correlations')}
                className="flex items-center gap-1.5 text-[9px] bg-slate-950 border border-slate-900 text-slate-450 font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-800 transition-colors self-start"
              >
                <Download size={11} />
                <span>Download PNG</span>
              </button>
            </div>
            
            <div id="correlation-heatmap-container" className="pt-2">
              <CorrelationHeatmap correlationMatrix={correlationMatrix} />
            </div>
          </div>
        )}

        {activeTab === 'missing' && (
          <div className="glass-card rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-202">Missing Values Analysis</h3>
                <p className="text-[10.5px] text-slate-550 mt-0.5">Missing record counts and relative density ratios per column.</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('missing-values-chart-wrapper', 'Missing Values Audit')}
                className="flex items-center gap-1.5 text-[9px] bg-slate-950 border border-slate-900 text-slate-450 font-bold uppercase tracking-wider px-2 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-800 transition-colors self-start"
              >
                <Download size={11} />
                <span>Download PNG</span>
              </button>
            </div>

            {missingAnalysis && Object.keys(missingAnalysis).length > 0 ? (
              <div id="missing-values-chart-wrapper" className="h-[280px] w-full bg-slate-955/20 p-2 rounded-lg border border-slate-900">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={Object.entries(missingAnalysis).map(([col, info]) => ({
                      column: col,
                      missingCount: info.count,
                      percentage: info.percentage
                    }))} 
                    margin={{ top: 20, right: 10, left: -25, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="column" stroke="#52525b" fontSize={8} angle={-25} textAnchor="end" tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px' }}
                      itemStyle={{ color: '#f87171', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="missingCount" fill="#f87171" name="Null Count" radius={[2, 2, 0, 0]}>
                      {Object.entries(missingAnalysis).map(([col, info], index) => (
                        <Cell key={`cell-${index}`} fill={info.count > 0 ? '#f87171' : '#34d399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8 bg-slate-955 border border-slate-900 rounded-lg min-h-[200px]">
                <p className="text-slate-555 italic text-xs">No missing value summaries available.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'outliers' && (
          <div className="glass-card rounded-lg p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-202">Outliers Box Plot Distribution</h3>
                <p className="text-[10.5px] text-slate-550 mt-0.5">Box plots illustrating dataset values distribution ranges (Min, Q25, Median, Q75, Max).</p>
              </div>
              <button
                onClick={() => handleDownloadPNG('outliers-chart-wrapper', 'Outliers Box Ranges')}
                className="flex items-center gap-1.5 text-[9px] bg-slate-950 border border-slate-900 text-slate-450 font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg hover:text-slate-200 hover:border-slate-800 transition-colors self-start"
              >
                <Download size={11} />
                <span>Download PNG</span>
              </button>
            </div>

            {outliersAnalysis && Object.keys(outliersAnalysis).length > 0 && Object.values(outliersAnalysis).some(o => o.count > 0) ? (
              <div id="outliers-chart-wrapper" className="h-[300px] w-full bg-slate-955/20 p-2 rounded-lg border border-slate-900">
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
                    margin={{ top: 20, right: 10, left: -25, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="column" stroke="#52525b" fontSize={8} angle={-20} textAnchor="end" tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={8} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: '#18181b', borderRadius: '6px', color: '#f4f4f5' }}
                      formatter={(value, name, props) => {
                        if (name === "Box Range") return [`${props.payload.q25.toFixed(2)} - ${props.payload.q75.toFixed(2)}`, "Q25-Q75 Box"];
                        return [value.toFixed(2), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px' }} />
                    <Bar 
                      dataKey="q75" 
                      fill="rgba(99, 102, 241, 0.15)" 
                      stroke="#6366f1"
                      strokeWidth={1}
                      name="Box Range"
                      radius={1}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="median" 
                      stroke="#06b6d4" 
                      strokeWidth={1.5}
                      dot={{ r: 3, stroke: '#06b6d4', strokeWidth: 1, fill: '#060608' }}
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
              <div className="flex items-center justify-center p-8 bg-slate-955 border border-slate-900 rounded-lg min-h-[200px]">
                <p className="text-slate-555 italic text-xs">No numerical column outlier distributions computed for this dataset.</p>
              </div>
            )}
          </div>
        )}
      </div>
  );
};

export default Visualizations;
