import React from 'react';
import { useMatchViewState } from '@/hooks/useMatchViewState';
import { MatchHeader } from './MatchHeader';
import { MatchProgress } from './MatchProgress';
import { MatchStats } from './MatchStats';

interface MatchViewerProps {
  wsUrl?: string;
}

export const MatchViewer: React.FC<MatchViewerProps> = ({ wsUrl = 'ws://localhost:3000/ws' }) => {
  const { state, isConnected, error, connect, disconnect } = useMatchViewState();

  React.useEffect(() => {
    if (wsUrl && !isConnected) {
      connect(wsUrl);
    }
  }, [wsUrl, isConnected, connect]);

  if (error) {
    return (
      <div style={{ padding: '2rem', backgroundColor: '#fee2e2', borderRadius: '0.5rem', color: '#991b1b' }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Connection Error</h2>
        <p style={{ margin: 0 }}>{error}</p>
        <button
          onClick={() => connect(wsUrl)}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          Reconnect
        </button>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        <div style={{ fontSize: '1rem', marginBottom: '1rem' }}>
          {isConnected ? 'Waiting for match to start...' : 'Connecting...'}
        </div>
        {!isConnected && (
          <button
            onClick={() => connect(wsUrl)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Connect
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <MatchHeader state={state} />
      <MatchProgress state={state} />
      <MatchStats state={state} />

      <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', fontSize: '0.875rem', color: '#6b7280' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {isConnected && (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    marginRight: '0.5rem',
                  }}
                />
                Connected
              </span>
            )}
          </div>
          {state.status === 'running' && (
            <button
              onClick={disconnect}
              style={{
                padding: '0.25rem 0.75rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
