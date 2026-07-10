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
  Activity,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, activeDataset, sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAuth();
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
    <aside className={`transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'} bg-cardBg border-r border-slate-900 h-screen flex flex-col fixed left-0 top-0 z-20`}>
      {/* Floating Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-7 bg-slate-900 hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-slate-400 hover:text-white w-6 h-6 rounded-full flex items-center justify-center transition-all z-50 cursor-pointer shadow-md"
        title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand Header */}
      <div className={`p-4 border-b border-slate-900 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-white">
          <Activity size={18} className="text-indigo-400" />
        </div>
        {!sidebarCollapsed && (
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-101">
              DataLens AI
            </h1>
            <p className="text-[9px] text-slate-450 font-bold uppercase tracking-widest">Enterprise Analytics</p>
          </div>
        )}
      </div>

      {/* Active Dataset Status Widget */}
      <div className={`p-3 mx-2 my-4 bg-slate-950 border border-slate-900 rounded-lg flex flex-col ${sidebarCollapsed ? 'items-center' : ''}`}>
        {!sidebarCollapsed && <p className="text-[9px] text-slate-550 font-bold uppercase tracking-wider mb-2">Active Workspace</p>}
        {activeDataset ? (
          <div className="flex items-center gap-2.5">
            <div className="text-indigo-400 bg-indigo-500/5 p-1.5 rounded-md border border-indigo-500/10" title={activeDataset.datasetName || activeDataset.fileName || activeDataset.originalName}>
              <FileSpreadsheet size={15} />
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold truncate text-slate-205">{activeDataset.datasetName || activeDataset.fileName || activeDataset.originalName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeDataset.status === 'cleaned' ? 'bg-emerald-450' : 'bg-indigo-500 animate-pulse'}`}></span>
                  <span className="text-[9px] text-slate-450 capitalize font-mono font-semibold">{activeDataset.status}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {!sidebarCollapsed ? (
              <>
                <p className="text-[11px] text-slate-550 italic font-medium">No active dataset.</p>
                <button
                  onClick={() => navigate('/my-datasets')}
                  className="mt-2 text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  Open workspace →
                </button>
              </>
            ) : (
              <span className="text-[10px] text-slate-550 italic" title="No active dataset">None</span>
            )}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 text-xs rounded-lg font-bold transition-all group ${sidebarCollapsed ? 'justify-center' : ''
                } ${isActive
                  ? 'bg-slate-900 border-l-2 border-indigo-500 text-slate-101'
                  : 'text-slate-455 hover:bg-slate-900/40 hover:text-slate-205'
                }`
              }
            >
              <Icon size={14} className="min-w-[14px] transition-transform" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section / Footer */}
      <div className="p-3 border-t border-slate-900 flex flex-col gap-2.5 items-center">
        <div className={`flex items-center gap-3 px-1 w-full ${sidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-205 font-black text-xs min-w-[32px]">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-205">{user?.name || 'User'}</p>
              <p className="text-[10px] text-slate-450 truncate">{user?.email || 'user@datalens.ai'}</p>
            </div>
          )}
        </div>

        {/* Global Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={sidebarCollapsed ? (theme === 'light' ? "Dark Mode" : "Light Theme") : undefined}
          className={`flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg border transition-all uppercase tracking-wider ${theme === 'light'
            ? 'bg-[#EFE9DB] hover:bg-[#E3DCB8] border-[#DFD5C1] text-slate-700'
            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-350 hover:text-slate-100'
            } ${sidebarCollapsed ? 'w-8 h-8 p-0' : 'w-full px-3'
            }`}
        >
          {theme === 'light' ? <Moon size={12} /> : <Sun size={12} />}
          {!sidebarCollapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Theme'}</span>}
        </button>

        <button
          onClick={handleLogout}
          title={sidebarCollapsed ? "Sign Out" : undefined}
          className={`flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-rose-450 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg border border-slate-900 hover:border-rose-500/10 transition-all uppercase tracking-wider ${sidebarCollapsed ? 'w-8 h-8 p-0' : 'w-full px-3'
            }`}
        >
          <LogOut size={12} />
          {!sidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
