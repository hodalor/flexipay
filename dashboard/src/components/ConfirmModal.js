import React from 'react';

export default function ConfirmModal(props) {
  const {
    isOpen,
    open,
    title,
    message,
    confirmLabel,
    onConfirm,
    onCancel,
    danger,
    loading,
    toast
  } = props;
  const visible = typeof isOpen === 'boolean' ? isOpen : open;

  if (!visible) {
    return null;
  }

  return (
    <div style={styles.overlay} onClick={danger ? undefined : onCancel}>
      <div style={styles.card}>
        <h3>{title}</h3>
        <p style={styles.message}>{message}</p>
        {toast ? <div style={{ ...styles.toast, ...(toast.type === 'error' ? styles.toastError : styles.toastSuccess) }}>{toast.message}</div> : null}
        <div style={styles.actions}>
          <button style={styles.secondary} onClick={onCancel} disabled={loading}>Cancel</button>
          <button style={danger ? styles.danger : styles.primary} onClick={onConfirm} disabled={loading}>
            {loading ? 'Working...' : (confirmLabel || 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: '#ffffff',
    borderRadius: '18px',
    padding: '24px'
  },
  message: {
    color: '#475569'
  },
  toast: {
    borderRadius: '12px',
    padding: '12px 14px',
    marginTop: '12px'
  },
  toastSuccess: {
    background: '#dcfce7',
    color: '#166534'
  },
  toastError: {
    background: '#fee2e2',
    color: '#991b1b'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px'
  },
  primary: {
    background: '#0f766e',
    color: '#fff',
    border: 0,
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer'
  },
  danger: {
    background: '#dc2626',
    color: '#fff',
    border: 0,
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer'
  },
  secondary: {
    background: '#e2e8f0',
    color: '#0f172a',
    border: 0,
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer'
  }
};
