import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Visualizations from './pages/Visualizations';
import AIReport from './pages/AIReport';
import Sanitizer from './pages/Sanitizer';
import HistoryPage from './pages/History';
import MyDatasets from './pages/MyDatasets';
import Profile from './pages/Profile';
import Workspace from './pages/Workspace';

// Route Guard: Protected Routes for logged in users only
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-500 font-semibold font-mono text-xs gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
        <span>Syncing DataLens Session...</span>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Route Guard: Guest Routes for non-logged in users (e.g. login, register)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading, activeDataset } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-500 font-semibold font-mono text-xs gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
        <span>Syncing DataLens Session...</span>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to={activeDataset ? "/overview" : "/upload"} replace />;
};

// Root Redirect component to dynamically route logged in users
const RootRedirect = () => {
  const { isAuthenticated, loading, activeDataset } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-slate-500 font-semibold font-mono text-xs gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
        <span>Syncing DataLens Session...</span>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={activeDataset ? "/overview" : "/upload"} replace />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Guest Auth Gates */}
          <Route 
            path="/login" 
            element={
              <GuestRoute>
                <Login />
              </GuestRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <GuestRoute>
                <Register />
              </GuestRoute>
            } 
          />

          {/* Protected Application Gates */}
          <Route 
            path="/upload" 
            element={
              <ProtectedRoute>
                <Upload />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/overview" 
            element={
              <ProtectedRoute>
                <Workspace activeTab="overview" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/visualizations" 
            element={
              <ProtectedRoute>
                <Workspace activeTab="visualizations" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-report" 
            element={
              <ProtectedRoute>
                <Workspace activeTab="ai-report" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/sanitizer" 
            element={
              <ProtectedRoute>
                <Workspace activeTab="sanitizer" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/history" 
            element={
              <ProtectedRoute>
                <Workspace activeTab="history" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-datasets" 
            element={
              <ProtectedRoute>
                <MyDatasets />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* Fallback redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
