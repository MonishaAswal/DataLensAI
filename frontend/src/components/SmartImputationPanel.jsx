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
    <div className="glass-card rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-md text-indigo-400">
            <Brain size={18} className="animate-pulse-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-101 flex items-center gap-2">
              Smart AI Imputation
              <span className="badge-indigo inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px]">
                <Sparkles size={8} />
                <span>ML Model</span>
              </span>
            </h3>
            <p className="text-[10px] text-slate-455 mt-0.5">
              Predict missing values dynamically using trained decision trees and Random Forests.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0 text-rose-455" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <button
          onClick={handleSmartImpute}
          disabled={loading}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group border border-indigo-500/20"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>Fitting Random Forest Models...</span>
            </>
          ) : (
            <>
              <Brain size={14} className="group-hover:rotate-12 transition-transform duration-300" />
              <span>Run Smart AI Imputation</span>
            </>
          )}
        </button>

        {/* Tooltip Description */}
        {showTooltip && (
          <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-64 p-3 bg-slate-950 border border-slate-900 rounded-lg shadow-2xl text-[10px] text-slate-350 leading-relaxed font-semibold text-center pointer-events-none animate-fade-in">
            <p className="text-indigo-400 font-bold uppercase tracking-wider text-[8px] mb-1">Advanced Machine Learning</p>
            Trains Random Forest models dynamically to calculate high-probability missing inputs.
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-slate-950"></div>
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-550 font-semibold text-center border-t border-slate-900 pt-4 leading-relaxed">
        Trains <span className="text-indigo-400">RandomForestRegressor</span> for numerical dimensions and <span className="text-indigo-400">RandomForestClassifier</span> for text categories.
      </div>
    </div>
  );
};

export default SmartImputationPanel;
