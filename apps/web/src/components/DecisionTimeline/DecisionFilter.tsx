import React from 'react';
import type { DecisionFilter } from '@/hooks/useDecisionTimeline';

interface DecisionFilterProps {
  brains: string[];
  filter: DecisionFilter;
  searchText: string;
  onFilterChange: (filter: Partial<DecisionFilter>) => void;
  onSearchChange: (text: string) => void;
  onClear: () => void;
}

export const DecisionFilterPanel: React.FC<DecisionFilterProps> = ({
  brains,
  filter,
  searchText,
  onFilterChange,
  onSearchChange,
  onClear,
}) => {
  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '1rem', alignItems: 'center' }}>
        {/* Player Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
            Player
          </label>
          <select
            value={filter.player || ''}
            onChange={(e) => onFilterChange({ player: e.target.value ? (e.target.value as any) : undefined })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Players</option>
            <option value="player1">Player 1</option>
            <option value="player2">Player 2</option>
          </select>
        </div>

        {/* Brain Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
            Brain
          </label>
          <select
            value={filter.brain || ''}
            onChange={(e) => onFilterChange({ brain: e.target.value || undefined })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: '#fff',
            }}
          >
            <option value="">All Brains</option>
            {brains.map((brain) => (
              <option key={brain} value={brain}>
                {brain}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: '#6b7280' }}>
            Search Reasoning
          </label>
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          />
        </div>

        {/* Clear Button */}
        <button
          onClick={onClear}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};
