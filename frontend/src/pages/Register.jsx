import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, UserPlus, Activity } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    console.log('[Register] Attempting registration for:', email);
    try {
      const result = await register(name, email, password);
      console.log('[Register] Registration successful, user object:', result);
      navigate('/upload');
    } catch (err) {
      console.error('[Register] Registration failed with error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 bg-background relative">
      <div className="w-full max-w-md glass-card rounded-lg p-8 relative overflow-hidden">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-white mb-3">
            <Activity size={24} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-101 tracking-tight">Create your account</h2>
          <p className="text-[10px] text-slate-450 mt-1 font-bold uppercase tracking-widest">Get started with DataLens AI</p>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-455 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Full Name</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550 pointer-events-none">
                <User size={14} />
              </span>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-900 text-xs text-slate-101 placeholder-slate-550 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-450 uppercase tracking-wider mb-1.5">Email Address</label>
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
            <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550 pointer-events-none">
                <Lock size={14} />
              </span>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-900 text-xs text-slate-101 placeholder-slate-550 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-455 uppercase tracking-wider mb-1.5">Confirm Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-550 pointer-events-none">
                <Lock size={14} />
              </span>
              <input
                type="password"
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-900 text-xs text-slate-101 placeholder-slate-550 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:pointer-events-none mt-4"
          >
            <UserPlus size={14} />
            <span>{isSubmitting ? 'Registering...' : 'Register'}</span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-450">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
