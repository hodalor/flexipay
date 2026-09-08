import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@api';

export default function Login() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      const session = await login({ identifier, password });

      if (session.userType !== 'admin') {
        setError('Dashboard access is for admin users only.');
        return;
      }

      window.localStorage.setItem('flexipay.dashboard.token', session.accessToken);
      window.localStorage.setItem('flexipay.dashboard.user', JSON.stringify(session.user));
      window.localStorage.setItem('flexipay.dashboard.userType', session.userType);
      navigate('/');
      window.location.reload();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in.');
    }
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.title}>FlexiPay Dashboard</div>
        <div style={styles.subtitle}>Admin, director, manager, and officer accounts sign in here.</div>
        <input style={styles.input} placeholder="Email or phone" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
        <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error ? <div style={styles.error}>{error}</div> : null}
        <button style={styles.button} type="submit">Sign In</button>
        <div style={styles.hint}>Super admin runs in god mode with all present and future features.</div>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a'
  },
  card: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '28px',
    width: '100%',
    maxWidth: '420px'
  },
  title: {
    fontSize: '26px',
    fontWeight: '700',
    marginBottom: '16px'
  },
  subtitle: {
    color: '#475569',
    marginBottom: '16px',
    lineHeight: 1.6
  },
  input: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    marginBottom: '12px'
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 0,
    background: '#0f766e',
    color: '#fff',
    cursor: 'pointer'
  },
  error: {
    color: '#dc2626',
    marginBottom: '12px'
  },
  hint: {
    color: '#64748b',
    marginTop: '14px',
    fontSize: '13px',
    lineHeight: 1.6
  }
};
