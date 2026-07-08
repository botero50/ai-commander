import React, { useMemo } from 'react';
import { useDecisionTimeline } from '@/hooks/useDecisionTimeline';
import type { DecisionEvent } from '@/types';
import { DecisionEntry } from './DecisionEntry';
import { DecisionFilterPanel } from './DecisionFilter';

interface DecisionTimelineProps {
  decisions: readonly DecisionEvent[];
  highlightedTick?: number;
}

export const DecisionTimeline: React.FC<DecisionTimelineProps> = ({ decisions, highlightedTick }) => {
  const {
    filteredDecisions,
    stats,
    brains,
    filter,
    searchText,
    setSearchText,
    updateFilter,
    clearFilter,
  } = useDecisionTimeline(decisions);

  // Paginate decisions (20 per page)
  const [page, setPage] = React.useState(0);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredDecisions.length / itemsPerPage);
  const startIdx = page * itemsPerPage;
  const paginatedDecisions = filteredDecisions.slice(startIdx, startIdx + itemsPerPage);

  const isFiltered = filter.player || filter.brain || searchText;

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {/* Filter Panel */}
      <DecisionFilterPanel
        brains={brains}
        filter={filter}
        searchText={searchText}
        onFilterChange={updateFilter}
        onSearchChange={setSearchText}
        onClear={clearFilter}
      />

      {/* Statistics */}
      <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Decisions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>
            {filteredDecisions.length}
          </div>
          {isFiltered && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>of {stats.totalDecisions} total</div>}
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Avg Duration
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>
            {stats.averageDuration}ms
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Commands
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', marginTop: '0.25rem' }}>
            {stats.totalCommands}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {stats.averageCommandsPerDecision} per decision
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Player Decisions
          </div>
          <div style={{ marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
            <div>
              <span style={{ color: '#3b82f6', fontWeight: '700' }}>P1:</span> {stats.player1Decisions}
            </div>
            <div>
              <span style={{ color: '#ef4444', fontWeight: '700' }}>P2:</span> {stats.player2Decisions}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Entries */}
      {filteredDecisions.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          No decisions match your filters.
        </div>
      ) : (
        <>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {paginatedDecisions.map((decision) => (
              <DecisionEntry
                key={`${decision.tick}-${decision.player}`}
                decision={decision}
                isHighlighted={decision.tick === highlightedTick}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Page {page + 1} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: page === 0 ? '#f3f4f6' : '#3b82f6',
                    color: page === 0 ? '#9ca3af' : '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: page === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: page === totalPages - 1 ? '#f3f4f6' : '#3b82f6',
                    color: page === totalPages - 1 ? '#9ca3af' : '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
