import React, { useEffect, useMemo, useState } from 'react';

function formatCurrency(value) {
  const numericValue = Number(value || 0) / 100;
  return 'ZMW ' + numericValue.toFixed(2);
}

function getGraceCountdown(gracePeriodRemainingDays) {
  if (!gracePeriodRemainingDays || gracePeriodRemainingDays <= 0) {
    return 'Grace period expired';
  }

  return gracePeriodRemainingDays + ' day(s) remaining in grace period';
}

export default function LockScreen({ state }) {
  const [deviceStatus, setDeviceStatus] = useState(state);
  const [unlocking, setUnlocking] = useState(false);
  const paymentUrl = useMemo(() => deviceStatus.paymentUrl || 'https://pay.flexipay.local', [deviceStatus.paymentUrl]);

  useEffect(function pollStatus() {
    let cancelled = false;

    async function refreshStatus() {
      const nextStatus = await window.flexipay.getStatus();

      if (cancelled) {
        return;
      }

      setDeviceStatus(nextStatus || {});

      if (nextStatus && nextStatus.isLocked === false) {
        setUnlocking(true);
        setTimeout(function reloadApp() {
          window.location.hash = '';
          window.location.reload();
        }, 1500);
      }
    }

    refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 60000);

    return function cleanup() {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <div style={styles.logo}>FP</div>
          <div>
            <div style={styles.brand}>FlexiPay</div>
            <div style={styles.badge}>ACCOUNT ACTION REQUIRED</div>
          </div>
        </div>
        <h1 style={styles.title}>{unlocking ? 'Payment received! Unlocking...' : 'This device is temporarily restricted'}</h1>
        <p style={styles.text}>
          {unlocking
            ? 'Your account is being refreshed. This screen will close automatically.'
            : 'Bring the FlexiPay account current to restore full device access.'}
        </p>
        <div style={styles.panel}>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Device Owner</div>
            <div style={styles.metricValue}>{deviceStatus.customerName || 'FlexiPay Customer'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Amount Overdue</div>
            <div style={styles.metricValue}>{formatCurrency(deviceStatus.amountOverdue)}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Reason</div>
            <div style={styles.metricValue}>{deviceStatus.lockReason || 'Loan overdue past grace period'}</div>
          </div>
          <div style={styles.metric}>
            <div style={styles.metricLabel}>Grace Period</div>
            <div style={styles.metricValue}>{getGraceCountdown(deviceStatus.gracePeriodRemainingDays)}</div>
          </div>
        </div>
        <div style={styles.actionRow}>
          <button style={styles.primaryButton} onClick={() => window.flexipay.openPayment(paymentUrl)} disabled={unlocking}>
            Make Payment
          </button>
          <a href={'https://wa.me/' + String((deviceStatus.supportPhone || '+260000000000')).replace(/[^\d]/g, '')} style={styles.secondaryButton}>
            WhatsApp Support
          </a>
        </div>
        <div style={styles.support}>Support: {deviceStatus.supportPhone || '+260000000000'}</div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #111827 100%)',
    color: '#fff',
    padding: '24px'
  },
  card: {
    width: '100%',
    maxWidth: '820px',
    background: '#111827',
    borderRadius: '24px',
    padding: '40px',
    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.45)'
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  logo: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: '#0f766e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '20px'
  },
  brand: {
    fontSize: '20px',
    fontWeight: '700'
  },
  badge: {
    color: '#fca5a5',
    fontWeight: '700',
    letterSpacing: '0.18em',
    fontSize: '12px'
  },
  title: {
    fontSize: '42px',
    marginBottom: '12px'
  },
  text: {
    color: '#cbd5e1',
    fontSize: '18px'
  },
  panel: {
    marginTop: '24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px'
  },
  metric: {
    background: '#1f2937',
    padding: '18px',
    borderRadius: '14px'
  },
  metricLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  metricValue: {
    fontSize: '18px',
    fontWeight: '600'
  },
  actionRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px'
  },
  primaryButton: {
    background: '#0f766e',
    color: '#fff',
    border: 0,
    borderRadius: '12px',
    padding: '14px 20px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    background: '#e2e8f0',
    color: '#0f172a',
    borderRadius: '12px',
    padding: '14px 20px',
    fontWeight: '700'
  },
  support: {
    marginTop: '18px',
    color: '#94a3b8'
  }
};
