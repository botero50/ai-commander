import React from 'react';

interface DecisionFilterProps {
  filter: { player?: 'player1' | 'player2' };
  counts: {
    all: number;
    player1: number;
    player2: number;
  };
  onPlayerFilter: (player?: 'player1' | 'player2') => void;
}

export const DecisionFilterPanel: React.FC<DecisionFilterProps> = ({ filter, counts, onPlayerFilter }) => {
  const tabs = [
    { label: 'All', value: undefined, count: counts.all },
    { label: 'Player 1', value: 'player1' as const, count: counts.player1 },
    { label: 'Player 2', value: 'player2' as const, count: counts.player2 },
  ];

  return (
    <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem' }}>
      {tabs.map((tab) => {
        const isActive = filter.player === tab.value;
        return (
          <button
            key={tab.label}
            onClick={() => onPlayerFilter(tab.value)}
            style={{
              padding: '0.5rem 1rem',
              border: `2px solid ${isActive ? '#3b82f6' : '#d1d5db'}`,
              borderRadius: '0.375rem',
              backgroundColor: isActive ? '#eff6ff' : '#fff',
              color: isActive ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: isActive ? '600' : '500',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>({tab.count})</span>
          </button>
        );
      })}
    </div>
  );
};
