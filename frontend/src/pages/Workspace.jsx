import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Dashboard from './Dashboard';
import Visualizations from './Visualizations';
import AIReport from './AIReport';
import Sanitizer from './Sanitizer';
import HistoryPage from './History';
import { LayoutDashboard, BarChart3, Sparkles, Wand2, History } from 'lucide-react';

const Workspace = ({ activeTab }) => {
  const navigate = useNavigate();

  const tabs = [
    { id: 'overview', label: 'Dataset Overview', icon: LayoutDashboard, path: '/overview' },
    { id: 'visualizations', label: 'Visual Analytics', icon: BarChart3, path: '/visualizations' },
    { id: 'ai-report', label: 'AI Insights', icon: Sparkles, path: '/ai-report' },
    { id: 'sanitizer', label: 'Sanitization', icon: Wand2, path: '/sanitizer' },
    { id: 'history', label: 'Reports', icon: History, path: '/history' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Workspace Tab Bar */}
        <div className="flex border border-slate-800/80 p-1.5 bg-slate-950/60 rounded-2xl text-xs font-bold uppercase tracking-wider backdrop-blur-xl mb-6 max-w-4xl shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border border-indigo-500/30 text-indigo-400 font-extrabold shadow-md shadow-indigo-500/5'
                    : 'text-slate-500 hover:text-slate-350 hover:bg-slate-900/40 border border-transparent'
                }`}
              >
                <Icon size={15} className={isActive ? 'animate-pulse text-indigo-400' : 'text-slate-500'} />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Views (All kept mounted in the DOM to preserve state) */}
        <div className={activeTab === 'overview' ? 'animate-fade-in' : 'hidden'}>
          <Dashboard isTabbed={true} />
        </div>
        <div className={activeTab === 'visualizations' ? 'animate-fade-in' : 'hidden'}>
          <Visualizations isTabbed={true} />
        </div>
        <div className={activeTab === 'ai-report' ? 'animate-fade-in' : 'hidden'}>
          <AIReport isTabbed={true} />
        </div>
        <div className={activeTab === 'sanitizer' ? 'animate-fade-in' : 'hidden'}>
          <Sanitizer isTabbed={true} />
        </div>
        <div className={activeTab === 'history' ? 'animate-fade-in' : 'hidden'}>
          <HistoryPage isTabbed={true} />
        </div>
      </div>
    </Layout>
  );
};

export default Workspace;
