import React from 'react';

interface ResourceIconProps {
  label: string;
  value: number;
  emoji: string;
  color: string;
}

export const ResourceIcon: React.FC<ResourceIconProps> = ({ label, value, emoji, color }) => {
  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: '0.5rem',
        borderRadius: '0.375rem',
        textAlign: 'center',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{emoji}</div>
      <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff' }}>
        {value}
      </div>
    </div>
  );
};
