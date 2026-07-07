import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from './Dashboard';
import Visualizations from './Visualizations';
import AIReport from './AIReport';
import Sanitizer from './Sanitizer';
import HistoryPage from './History';
import { LayoutDashboard, BarChart3, Sparkles, Wand2, History, AlertTriangle, RefreshCw } from 'lucide-react';

// ── Error Boundary ────────────────────────────────────────────────────────────
// Catches any unhandled JS crash inside a tab and shows a recovery card instead
// of letting the entire app go black.
class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[TabErrorBoundary] Uncaught error in tab:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[320px] p-8 text-center gap-4
                        glass-card rounded-xl border border-rose-500/10 bg-rose-500/5 animate-in">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20
                          flex items-center justify-center">
            <AlertTriangle size={18} className="text-rose-400" />
          </div>
          <div>
            <p className="text-rose-400 font-bold text-xs mb-1">Something went wrong in this view</p>
            <p className="text-slate-450 text-[11px] max-w-sm leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800
                       text-slate-350 text-[10px] font-bold rounded-lg hover:bg-slate-850 transition-colors"
          >
            <RefreshCw size={11} />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Workspace ─────────────────────────────────────────────────────────────────
const Workspace = ({ activeTab }) => {
  const navigate = useNavigate();

  // Track which tabs have EVER been visited so we only mount them lazily.
  // The active tab is always visited; others mount on first activation only.
  const [visited, setVisited] = useState(() => new Set([activeTab]));

  // When activeTab changes, register it as visited
  const handleTabClick = useCallback((path, tabId) => {
    setVisited(prev => {
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
    navigate(path);
  }, [navigate]);

  const tabs = [
    { id: 'overview',       label: 'Dataset Overview', icon: LayoutDashboard, path: '/overview' },
    { id: 'visualizations', label: 'Visual Analytics',  icon: BarChart3,       path: '/visualizations' },
    { id: 'ai-report',      label: 'AI Insights',       icon: Sparkles,        path: '/ai-report' },
    { id: 'sanitizer',      label: 'Sanitization',      icon: Wand2,           path: '/sanitizer' },
    { id: 'history',        label: 'Reports',           icon: History,         path: '/history' },
  ];

  // Mark any externally-active tab as visited (e.g. navigated via Sidebar)
  if (!visited.has(activeTab)) {
    setVisited(prev => new Set([...prev, activeTab]));
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Workspace Tab Bar */}
        <div className="flex border border-slate-900 p-0.5 bg-slate-955 rounded-lg text-[9px]
                        font-bold uppercase tracking-wider max-w-4xl select-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.path, tab.id)}
                className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2
                            transition-colors ${
                  isActive
                    ? 'bg-slate-900 border border-slate-850 text-indigo-400 font-bold'
                    : 'text-slate-550 hover:text-slate-400 border border-transparent'
                }`}
              >
                <Icon size={12} className={isActive ? 'text-indigo-400' : 'text-slate-550'} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Views — lazy mounted: only renders a tab after first visit.
            Uses visibility instead of display:none so layout is not disrupted,
            and the content is already rendered when switching back. */}
        {visited.has('overview') && (
          <div className={activeTab === 'overview' ? 'block' : 'hidden'}>
            <TabErrorBoundary key="overview">
              <Dashboard isTabbed={true} />
            </TabErrorBoundary>
          </div>
        )}

        {visited.has('visualizations') && (
          <div className={activeTab === 'visualizations' ? 'block' : 'hidden'}>
            <TabErrorBoundary key="visualizations">
              <Visualizations isTabbed={true} />
            </TabErrorBoundary>
          </div>
        )}

        {visited.has('ai-report') && (
          <div className={activeTab === 'ai-report' ? 'block' : 'hidden'}>
            <TabErrorBoundary key="ai-report">
              <AIReport isTabbed={true} />
            </TabErrorBoundary>
          </div>
        )}

        {visited.has('sanitizer') && (
          <div className={activeTab === 'sanitizer' ? 'block' : 'hidden'}>
            <TabErrorBoundary key="sanitizer">
              <Sanitizer isTabbed={true} />
            </TabErrorBoundary>
          </div>
        )}

        {visited.has('history') && (
          <div className={activeTab === 'history' ? 'block' : 'hidden'}>
            <TabErrorBoundary key="history">
              <HistoryPage isTabbed={true} />
            </TabErrorBoundary>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Workspace;
