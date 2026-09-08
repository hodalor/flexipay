import React from 'react';

export default function KPICard({ label, value, accent }) {
  return (
    <div style={{ ...styles.card, borderColor: accent || '#14b8a6' }}>
      <div style={styles.label}>{label}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles = {
  card: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.72) 100%)',
    borderRadius: '16px',
    padding: '12px 14px',
    minHeight: '84px',
    boxShadow: '0 12px 24px rgba(2, 6, 23, 0.18)',
    border: '1px solid rgba(148, 163, 184, 0.14)'
  },
  label: {
    color: '#94a3b8',
    marginBottom: '8px',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  value: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#f8fafc'
  }
};
