import React from 'react';

export default function StatusDashboard({ state }) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.label}>Device Agent</div>
        <h1 style={styles.title}>FlexiPay Desktop Protection Active</h1>
        <p style={styles.text}>Heartbeat polling runs every 15 minutes and applies offline grace for up to 48 hours.</p>
        <div style={styles.grid}>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Lock State</div>
            <div style={styles.metricValue}>{state.isLocked ? 'Locked' : 'Active'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Reason</div>
            <div style={styles.metricValue}>{state.lockReason || 'Account current'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Customer</div>
            <div style={styles.metricValue}>{state.customerName || state.enrollment?.customer?.fullName || 'Not assigned'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Device ID</div>
            <div style={styles.metricValueSmall}>{state.deviceId || 'Pending enrollment'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Backend</div>
            <div style={styles.metricValueSmall}>{state.enrollment?.backendUrl || 'http://localhost:4000/api'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Last Online</div>
            <div style={styles.metricValue}>{state.lastSeen ? new Date(state.lastSeen).toLocaleString() : 'Waiting for heartbeat'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#fff',
    padding: '40px'
  },
  card: {
    background: '#111827',
    borderRadius: '24px',
    padding: '32px',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.35)'
  },
  label: {
    color: '#5eead4',
    textTransform: 'uppercase',
    letterSpacing: '0.12em'
  },
  title: {
    marginTop: '14px',
    marginBottom: '10px'
  },
  text: {
    color: '#cbd5e1'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '16px',
    marginTop: '24px'
  },
  metric: {
    background: '#1e293b',
    borderRadius: '18px',
    padding: '20px'
  },
  metricLabel: {
    color: '#94a3b8',
    marginBottom: '8px'
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: '700'
  },
  metricValueSmall: {
    fontSize: '14px',
    fontWeight: '700',
    wordBreak: 'break-word'
  }
};
