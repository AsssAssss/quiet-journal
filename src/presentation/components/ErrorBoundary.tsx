import { Component, type ReactNode } from 'react';
import { logger } from '@/shared/logger';

interface ErrorBoundaryState {
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    logger.error({
      feature: 'ui',
      action: 'render_error',
      error,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="h-full flex items-center justify-center px-6"
          data-testid="error-boundary"
        >
          <div className="max-w-sm text-center">
            <div className="font-serif text-2xl mb-3">页面出了点问题</div>
            <div className="text-sm text-muted mb-6 leading-6">
              {this.state.error.message}
            </div>
            <button
              type="button"
              className="quiet-btn"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              重新载入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
