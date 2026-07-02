import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex bg-background text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 ml-72 min-h-screen flex flex-col relative">
        {/* Glow Accent Background Blur Circles */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-500/3 rounded-full blur-[120px] pointer-events-none z-0"></div>

        {/* Scrollable Container */}
        <div className="flex-1 p-8 overflow-y-auto relative z-10 w-full max-w-7xl mx-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
