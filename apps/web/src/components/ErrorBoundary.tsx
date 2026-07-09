import React, { ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: '2rem',
              backgroundColor: '#1a1a1a',
              borderRadius: '8px',
              border: '1px solid #ef4444',
              color: '#fff',
            }}
          >
            <h2 style={{ marginTop: 0, color: '#ef4444' }}>Something went wrong</h2>
            <p style={{ color: '#d1d5db', marginBottom: '1rem' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <details style={{ color: '#9ca3af', fontSize: '12px' }}>
              <summary>Error details</summary>
              <pre style={{ marginTop: '0.5rem', overflowX: 'auto', backgroundColor: '#0a0a0a', padding: '0.5rem', borderRadius: '4px' }}>
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Functional component variant with suspense support
export function DataErrorFallback({ error }: { error?: Error }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #fbbf24',
        color: '#d1d5db',
        fontSize: '14px',
      }}
    >
      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: '#fbbf24' }}>Unable to load data</div>
      <div style={{ fontSize: '12px' }}>
        {error?.message || 'The data failed to load. Please try again.'}
      </div>
    </div>
  );
}

// Loading placeholder while data loads
export function DataLoadingFallback() {
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        border: '1px solid #333',
        color: '#6b7280',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: '2px solid #333',
            borderTopColor: '#3b82f6',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span>Loading...</span>
      </div>
    </div>
  );
}
