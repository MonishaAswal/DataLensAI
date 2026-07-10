import React from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { sidebarCollapsed } = useAuth();

  return (
    <div className="min-h-screen flex bg-background text-slate-101">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-72'} min-h-screen flex flex-col relative`}>
        {/* Scrollable Container */}
        <div className="flex-1 p-8 overflow-y-auto relative z-10 w-full max-w-6xl mx-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
