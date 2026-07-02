import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { 
  User, 
  Mail, 
  Database, 
  History, 
  Calendar,
  Key,
  ShieldCheck,
  Loader2
} from 'lucide-react';

import { datasetService, historyService } from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState({
    datasetsCount: 0,
    historyCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;
      try {
        setLoading(true);
        // 1. Fetch total datasets count from MongoDB
        const datasets = await datasetService.getDatasets();
        const datasetsCount = datasets.length;

        // 2. Fetch total analyses count from MongoDB
        const history = await historyService.getHistory();
        const historyCount = history.length;

        setMetrics({
          datasetsCount,
          historyCount
        });
      } catch (err) {
        console.error('Error fetching profile metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <Loader2 size={36} className="text-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm font-semibold">Retrieving cloud analytics account profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <User className="text-indigo-400" size={28} />
            <span>User Profile</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Manage your cloud configurations, monitor storage quotas, and audit analysis tallies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Profile Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/85 bg-gradient-to-b from-slate-950 to-slate-900/60 md:col-span-1 flex flex-col items-center text-center space-y-5 justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/10">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-slate-200">{user?.name}</h3>
              <p className="text-xs text-slate-500 truncate max-w-[190px] font-semibold">{user?.email}</p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-full text-[9px] font-black text-indigo-400 uppercase tracking-widest">
              <ShieldCheck size={11} />
              <span>Verified Account</span>
            </div>
          </div>

          {/* Cloud Usage Metrics Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800/85 md:col-span-2 space-y-6 flex flex-col justify-between">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Cloud Statistics</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center gap-4 transition-all">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <Database size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Datasets Uploaded</span>
                  <span className="text-lg font-black font-mono text-slate-200 block mt-0.5">{metrics.datasetsCount} files</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/20 border border-slate-900 hover:border-slate-850 rounded-xl flex items-center gap-4 transition-all">
                <div className="p-3 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Analyses Executed</span>
                  <span className="text-lg font-black font-mono text-slate-200 block mt-0.5">{metrics.historyCount} times</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-900/80 pt-5 space-y-3.5 text-xs text-slate-450 font-semibold">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-slate-500" />
                <span className="text-[10px] uppercase font-bold text-slate-550">Account ID:</span>
                <span className="font-mono text-[10px] truncate max-w-[200px] text-slate-400 font-bold">{user?.uid}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-500" />
                <span className="text-[10px] uppercase font-bold text-slate-550">Active Scope:</span>
                <span className="text-indigo-400">Firebase Cloud Space</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
