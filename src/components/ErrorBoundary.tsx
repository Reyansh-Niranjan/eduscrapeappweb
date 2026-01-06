import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  didAutoReload?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // A very common production-only failure mode is a transient dynamic-import/chunk load error
    // after a deployment or during flaky network conditions. Auto-reload once per tab session.
    const message = String((error as any)?.message ?? '');
    const looksLikeChunkLoadFailure =
      /ChunkLoadError|Loading chunk\s+\d+\s+failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
        message
      );

    if (looksLikeChunkLoadFailure) {
      try {
        const key = 'eduscrape:autoReloadedAfterChunkError';
        const alreadyReloaded = sessionStorage.getItem(key) === '1';
        if (!alreadyReloaded) {
          sessionStorage.setItem(key, '1');
          this.setState({ didAutoReload: true });
          window.setTimeout(() => window.location.reload(), 250);
        }
      } catch {
        // If sessionStorage is blocked, don't risk a reload loop.
      }
    }
  }

  render() {
    if (this.state.hasError) {
      const showDebugDetails = (() => {
        try {
          return new URLSearchParams(window.location.search).get('debug') === '1';
        } catch {
          return false;
        }
      })();

      return this.props.fallback || (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-teal-900 flex items-center justify-center p-6">
          <div className="bg-gradient-to-br from-purple-800/20 to-teal-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-8 max-w-md text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
            <p className="text-gray-300 mb-6">
              {this.state.didAutoReload
                ? "We hit a loading error. Reloading…"
                : "We encountered an unexpected error. Please refresh the page or try again later."}
            </p>

            {showDebugDetails && this.state.error?.message ? (
              <div className="mb-6 rounded-lg border border-purple-500/30 bg-black/30 p-3 text-left">
                <div className="text-xs font-semibold text-gray-200 mb-1">Debug</div>
                <div className="text-xs text-gray-300 break-words">{this.state.error.message}</div>
              </div>
            ) : null}

            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-teal-500 to-purple-600 text-white py-2 px-6 rounded-lg font-semibold hover:from-teal-600 hover:to-purple-700 transition-all duration-300"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
