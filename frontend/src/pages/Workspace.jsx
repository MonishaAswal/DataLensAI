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
        <div className="flex border border-slate-900 p-0.5 bg-slate-955 rounded-lg text-[9px] font-bold uppercase tracking-wider max-w-4xl select-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-2 transition-colors ${
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
