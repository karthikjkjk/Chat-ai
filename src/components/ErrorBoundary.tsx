import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CHAT AI ErrorBoundary] Uncaught runtime error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1020] text-[#0F172A] dark:text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-rose-500/30 rounded-2xl p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] dark:bg-rose-500/10 border border-[#BFDBFE] dark:border-rose-500/20 text-[#2563EB] dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Something went wrong</h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                CHAT AI encountered an unexpected rendering error. Your data and history remain safely stored.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-black/40 border border-[#E2E8F0] dark:border-white/5 text-[11px] font-mono text-rose-600 dark:text-rose-300 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#1E3A8A] text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reload CHAT AI</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
