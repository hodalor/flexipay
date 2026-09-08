import React from 'react';
import KPICard from '@components/KPICard';
import PageHeader from '@components/PageHeader';

export default function Settings() {
  return (
    <div style={styles.page}>
      <PageHeader
        eyebrow="Platform Setup"
        title="Settings and environment"
        subtitle="Operational settings are deployment-driven for safety. This page gives your team a clear live reference for what the dashboard expects from the backend, mobile, and desktop applications."
      />

      <div style={styles.metrics}>
        <KPICard label="API Mode" value="Connected" accent="#16a34a" />
        <KPICard label="Sync Model" value="Live polling" accent="#0ea5e9" />
        <KPICard label="Ops Console" value="Ready" accent="#14b8a6" />
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.title}>Environment wiring</h3>
          <p style={styles.text}>Set `API_BASE_URL` in the dashboard package to point at the backend API. The dashboard already sends the stored auth token with every request.</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}>Mobile communication</h3>
          <p style={styles.text}>After customer sign-in, the mobile app auto-enrolls itself and begins syncing lock state through the backend device endpoints.</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}>Desktop communication</h3>
          <p style={styles.text}>Desktop heartbeat uses device credentials to poll device status and apply restrictions. Registering a device from the dashboard prepares that flow.</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}>Collections and notifications</h3>
          <p style={styles.text}>Payment initiation, device commands, and notification delivery all route through the backend services, which lets the dashboard stay as the clean orchestration layer.</p>
        </div>
        <div style={styles.card}>
          <h3 style={styles.title}>Persistence limits</h3>
          <p style={styles.text}>Desktop can persist at OS startup and service level, but true survival across factory reset, OS reinstall, or disk formatting requires OEM imaging or enterprise MDM provisioning. Mobile follows the same rule.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'grid',
    gap: '18px'
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(180px, 240px))',
    gap: '12px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px'
  },
  card: {
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.82) 0%, rgba(15, 23, 42, 0.68) 100%)',
    borderRadius: '22px',
    padding: '22px',
    border: '1px solid rgba(148, 163, 184, 0.12)'
  },
  title: {
    margin: '0 0 10px',
    color: '#f8fafc'
  },
  text: {
    margin: 0,
    color: '#94a3b8',
    lineHeight: 1.7
  }
};
