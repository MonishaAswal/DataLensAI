import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Activity, HelpCircle, CheckCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await login(email, password);
      if (response && response.activeDataset) {
        navigate('/overview');
      } else {
        navigate('/upload');
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Invalid credentials. Please check your email and password.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    setError('Password recovery is disabled in local database mode. Please ask your administrator to reset your password directly in MongoDB.');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-background relative">
      <div className="w-full max-w-md glass-card rounded-lg p-8 relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-white mb-3">
            <Activity size={24} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-101 tracking-tight">Sign in to DataLens</h2>
          <p className="text-[10px] text-slate-450 mt-1 font-bold uppercase tracking-widest">Enterprise Analytics Suite</p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-450 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-450 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-455" />
              <span>{success}</span>
            </div>
          )}

          <div>
            <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550 pointer-events-none">
                <Mail size={14} />
              </span>
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-900 text-xs text-slate-101 placeholder-slate-550 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotLoading}
                className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors focus:outline-none disabled:opacity-50"
              >
                {forgotLoading ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
            
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550 pointer-events-none">
                <Lock size={14} />
              </span>
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-900 text-xs text-slate-101 placeholder-slate-550 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            <LogIn size={14} />
            <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-450">
            New to DataLens?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
