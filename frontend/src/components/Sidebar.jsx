import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, 
  LayoutDashboard, 
  BarChart3, 
  Sparkles, 
  Wand2, 
  History, 
  LogOut, 
  Database,
  FileSpreadsheet,
  User
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, activeDataset } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/upload', label: 'Upload Dataset', icon: Upload },
    { path: '/overview', label: 'Dashboard', icon: LayoutDashboard, requiresDataset: true },
    { path: '/my-datasets', label: 'My Datasets', icon: Database },
    { path: '/visualizations', label: 'Visualizations', icon: BarChart3, requiresDataset: true },
    { path: '/ai-report', label: 'AI Insights', icon: Sparkles, requiresDataset: true },
    { path: '/sanitizer', label: 'Dataset Sanitizer', icon: Wand2, requiresDataset: true },
    { path: '/history', label: 'History', icon: History },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="w-72 bg-slate-950/60 border-r border-slate-800/80 h-screen flex flex-col fixed left-0 top-0 backdrop-blur-xl z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-900 flex items-center gap-3">
        <div className="bg-gradient-to-tr from-indigo-500 to-cyan-500 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20">
          <Database size={22} className="animate-pulse-slow" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-cyan-200 bg-clip-text text-transparent">
            DataLens AI
          </h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Cloud Analytics Suite</p>
        </div>
      </div>

      {/* Active Dataset Status Widget */}
      <div className="p-4 mx-4 my-4 bg-slate-900/40 border border-slate-800/60 rounded-xl">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Active Workspace</p>
        {activeDataset ? (
          <div className="flex items-center gap-2.5">
            <div className="text-indigo-400">
              <FileSpreadsheet size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-slate-200">{activeDataset.fileName || activeDataset.originalName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeDataset.status === 'cleaned' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></span>
                <span className="text-[10px] text-slate-400 capitalize font-medium">{activeDataset.status}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-405 italic font-semibold">No dataset active.</p>
            <button 
              onClick={() => navigate('/my-datasets')}
              className="mt-2 text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Open dataset →
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDisabled = item.requiresDataset && !activeDataset;
          
          if (isDisabled) {
            return (
              <div
                key={item.path}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-650 rounded-lg cursor-not-allowed select-none opacity-30 font-medium"
                title="Open a dataset workspace first"
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-l-2 border-indigo-500 text-indigo-400'
                    : 'text-slate-450 hover:bg-slate-900/60 hover:text-slate-200'
                }`
              }
            >
              <Icon size={16} className="group-hover:scale-105 transition-transform" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Section / Footer */}
      <div className="p-4 border-t border-slate-900 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-indigo-650 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-indigo-600/15">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold truncate text-slate-200">{user?.name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email || 'user@datalens.ai'}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 rounded-lg border border-slate-900 hover:border-rose-500/20 transition-all"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
