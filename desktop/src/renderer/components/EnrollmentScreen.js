import React, { useMemo, useState } from 'react';

export default function EnrollmentScreen({ enrollment, onComplete }) {
  const [form, setForm] = useState({
    identifier: '',
    password: '',
    backendUrl: enrollment?.backendUrl || 'http://localhost:4000/api',
    brand: enrollment?.platformType === 'mac' ? 'Apple' : 'Windows PC',
    model: enrollment?.deviceName || ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const helper = useMemo(() => {
    return {
      installationId: enrollment?.installationId || 'pending-device-id',
      platformType: enrollment?.platformType || 'windows'
    };
  }, [enrollment]);

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.identifier || !form.password || !form.backendUrl) {
      setError('Identifier, password, and backend URL are required.');
      return;
    }

    setLoading(true);

    try {
      const result = await window.flexipay.enrollDevice(form);
      onComplete(result);
    } catch (requestError) {
      setError(requestError.message || 'Unable to enroll this desktop device.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.hero}>
          <div style={styles.badge}>FlexiPay Desktop Enrollment</div>
          <h1 style={styles.title}>Claim this financed desktop automatically</h1>
          <p style={styles.copy}>Sign in once with the customer account and the agent will register this machine, store its device credentials locally, and keep the lock state synced from the backend afterward.</p>
          <div style={styles.helperGrid}>
            <div style={styles.helperCard}>
              <div style={styles.helperLabel}>Platform</div>
              <div style={styles.helperValue}>{helper.platformType}</div>
            </div>
            <div style={styles.helperCard}>
              <div style={styles.helperLabel}>Local installation ID</div>
              <div style={styles.helperValueSmall}>{helper.installationId}</div>
            </div>
          </div>
        </div>

        <form style={styles.formCard} onSubmit={handleSubmit}>
          <div style={styles.formTitle}>Device onboarding</div>
          <div style={styles.formCopy}>Use the financed customer account. After success, the dashboard will see this device automatically.</div>

          <label style={styles.label}>Email or phone</label>
          <input style={styles.input} value={form.identifier} onChange={(event) => updateField('identifier', event.target.value)} />

          <label style={styles.label}>Password</label>
          <input style={styles.input} type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} />

          <label style={styles.label}>Backend URL</label>
          <input style={styles.input} value={form.backendUrl} onChange={(event) => updateField('backendUrl', event.target.value)} />

          <div style={styles.inlineGrid}>
            <div>
              <label style={styles.label}>Brand</label>
              <input style={styles.input} value={form.brand} onChange={(event) => updateField('brand', event.target.value)} />
            </div>
            <div>
              <label style={styles.label}>Device name</label>
              <input style={styles.input} value={form.model} onChange={(event) => updateField('model', event.target.value)} />
            </div>
          </div>

          {error ? <div style={styles.error}>{error}</div> : null}

          <button type="submit" style={{ ...styles.button, ...(loading ? styles.buttonBusy : null) }} disabled={loading}>
            {loading ? 'Enrolling device...' : 'Enroll this desktop'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top left, #1e293b 0%, #0f172a 55%, #020617 100%)',
    color: '#f8fafc',
    padding: '32px'
  },
  shell: {
    minHeight: 'calc(100vh - 64px)',
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.9fr',
    gap: '24px'
  },
  hero: {
    borderRadius: '28px',
    padding: '36px',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.72) 100%)',
    border: '1px solid rgba(148, 163, 184, 0.12)',
    boxShadow: '0 30px 80px rgba(2, 6, 23, 0.3)'
  },
  badge: {
    display: 'inline-flex',
    borderRadius: '999px',
    padding: '8px 12px',
    background: 'rgba(20, 184, 166, 0.12)',
    color: '#99f6e4',
    border: '1px solid rgba(94, 234, 212, 0.2)',
    fontSize: '12px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  title: {
    margin: '22px 0 14px',
    fontSize: '42px',
    lineHeight: 1.08
  },
  copy: {
    margin: 0,
    color: '#cbd5e1',
    fontSize: '16px',
    lineHeight: 1.7,
    maxWidth: '700px'
  },
  helperGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '16px',
    marginTop: '28px'
  },
  helperCard: {
    borderRadius: '20px',
    padding: '18px',
    background: 'rgba(15, 23, 42, 0.55)',
    border: '1px solid rgba(148, 163, 184, 0.1)'
  },
  helperLabel: {
    color: '#94a3b8',
    marginBottom: '8px',
    fontSize: '13px'
  },
  helperValue: {
    fontSize: '22px',
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  helperValueSmall: {
    fontSize: '14px',
    fontWeight: '700',
    wordBreak: 'break-word'
  },
  formCard: {
    alignSelf: 'center',
    borderRadius: '28px',
    padding: '28px',
    background: 'rgba(255, 255, 255, 0.98)',
    color: '#0f172a',
    boxShadow: '0 30px 80px rgba(2, 6, 23, 0.25)'
  },
  formTitle: {
    fontSize: '28px',
    fontWeight: '700'
  },
  formCopy: {
    margin: '10px 0 18px',
    color: '#475569',
    lineHeight: 1.6
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    marginTop: '14px',
    fontWeight: '600',
    color: '#334155'
  },
  input: {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid #cbd5e1',
    padding: '13px 14px',
    outline: 'none'
  },
  inlineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px'
  },
  error: {
    marginTop: '16px',
    borderRadius: '14px',
    padding: '12px 14px',
    background: '#fee2e2',
    color: '#991b1b'
  },
  button: {
    marginTop: '22px',
    width: '100%',
    border: 0,
    borderRadius: '16px',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    color: '#f8fafc',
    fontWeight: '700',
    cursor: 'pointer'
  },
  buttonBusy: {
    opacity: 0.7,
    cursor: 'progress'
  }
};
