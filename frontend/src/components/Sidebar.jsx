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
  User,
  Activity
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
    { path: '/overview', label: 'Dataset Overview', icon: LayoutDashboard, requiresDataset: true },
    { path: '/my-datasets', label: 'My Datasets', icon: Database },
    { path: '/visualizations', label: 'Visual Analytics', icon: BarChart3, requiresDataset: true },
    { path: '/ai-report', label: 'AI Insights', icon: Sparkles, requiresDataset: true },
    { path: '/sanitizer', label: 'Sanitization', icon: Wand2, requiresDataset: true },
    { path: '/history', label: 'Reports', icon: History },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <aside className="w-72 bg-cardBg border-r border-slate-900 h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-900 flex items-center gap-3">
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white">
          <Activity size={18} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-101">
            DataLens AI
          </h1>
          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-widest">Enterprise Analytics</p>
        </div>
      </div>

      {/* Active Dataset Status Widget */}
      <div className="p-4 mx-4 my-4 bg-slate-950 border border-slate-900 rounded-lg">
        <p className="text-[9px] text-slate-550 font-bold uppercase tracking-wider mb-2">Active Workspace</p>
        {activeDataset ? (
          <div className="flex items-center gap-2.5">
            <div className="text-indigo-400 bg-indigo-500/5 p-1.5 rounded-md border border-indigo-500/10">
              <FileSpreadsheet size={15} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-205">{activeDataset.datasetName || activeDataset.fileName || activeDataset.originalName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeDataset.status === 'cleaned' ? 'bg-emerald-450' : 'bg-indigo-500 animate-pulse'}`}></span>
                <span className="text-[9px] text-slate-450 capitalize font-mono font-semibold">{activeDataset.status}</span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-slate-550 italic font-medium">No active dataset.</p>
            <button 
              onClick={() => navigate('/my-datasets')}
              className="mt-2 text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Open workspace →
            </button>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-xs rounded-lg font-bold transition-all group ${
                  isActive
                    ? 'bg-slate-900 border-l-2 border-indigo-500 text-slate-101'
                    : 'text-slate-455 hover:bg-slate-900/40 hover:text-slate-205'
                }`
              }
            >
              <Icon size={14} className="transition-transform" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Section / Footer */}
      <div className="p-4 border-t border-slate-900 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-205 font-black text-xs">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate text-slate-205">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-450 truncate">{user?.email || 'user@datalens.ai'}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-[10px] font-bold text-rose-450 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-slate-900 hover:border-rose-500/10 transition-all uppercase tracking-wider"
        >
          <LogOut size={12} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
