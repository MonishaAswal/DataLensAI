import React, { useState } from 'react';
import { Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { datasetService } from '../services/api';

const SmartImputationPanel = ({ storageUrl, onImputationSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const handleSmartImpute = async () => {
    if (!storageUrl) {
      setError('Active dataset cloud file path is missing.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log(`[SmartImputationPanel] Triggering AI imputation for storageUrl: ${storageUrl}`);
      const data = await datasetService.smartImpute(storageUrl);
      console.log('[SmartImputationPanel] AI imputation complete:', data);
      
      if (onImputationSuccess) {
        await onImputationSuccess(data);
      }
    } catch (err) {
      console.error('[SmartImputationPanel] Error during AI imputation:', err);
      setError(err.response?.data?.message || err.message || 'AI Imputation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 shadow-xl shadow-indigo-950/20 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Brain size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              Smart AI Imputation
              <span className="flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                <Sparkles size={8} />
                <span>ML Powered</span>
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Predict missing values dynamically using advanced correlations and decision trees.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-xl text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle size={15} className="flex-shrink-0 text-rose-450" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <button
          onClick={handleSmartImpute}
          disabled={loading}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed group border border-indigo-400/25 relative overflow-hidden"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin text-white" />
              <span>Fitting Random Forest Models...</span>
            </>
          ) : (
            <>
              <Brain size={16} className="group-hover:rotate-12 transition-transform duration-300" />
              <span>Run Smart AI Imputation</span>
            </>
          )}
          
          {/* Subtle light pulse effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" style={{ animationDuration: '1.8s' }} />
        </button>

        {/* Tooltip Description */}
        {showTooltip && (
          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-72 p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-[10px] text-slate-350 leading-relaxed font-semibold text-center pointer-events-none animate-fade-in">
            <p className="text-indigo-400 font-extrabold uppercase tracking-wide text-[8px] mb-1">Advanced Machine Learning</p>
            Predicts missing values using Machine Learning instead of simple statistical replacement.
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 font-bold text-center border-t border-slate-900/60 pt-4 leading-relaxed">
        Analyzes independent columns to train <span className="text-indigo-400">RandomForestRegressor</span> models for numeric fields, and <span className="text-violet-400">RandomForestClassifier</span> for text categories.
      </div>
    </div>
  );
};

export default SmartImputationPanel;
