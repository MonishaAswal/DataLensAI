import React from 'react';

// Simple error boundary that catches rendering errors in any child component
// and displays a friendly card instead of a blank black screen.
// Uses Tailwind classes consistent with the app's design system.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You could log errorInfo to an external service here.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-lg border border-rose-500/20 bg-rose-500/5 p-6 mx-4 my-8 text-center animate-fade-in">
          <h4 className="text-rose-455 font-bold text-sm mb-2">Something went wrong</h4>
          <p className="text-[11px] text-slate-500 mb-4">{this.state.error?.toString?.() || 'Unexpected error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-350 text-xs font-bold rounded hover:bg-slate-850 transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
