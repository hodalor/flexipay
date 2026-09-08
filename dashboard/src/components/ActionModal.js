import React from 'react';

export default function ActionModal({
  isOpen,
  title,
  subtitle,
  children,
  onClose,
  onSubmit,
  submitLabel,
  loading,
  error,
  success
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <h3 style={styles.title}>{title}</h3>
            {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose}>Close</button>
        </div>

        {success ? <div style={styles.success}>{success}</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.body}>
          {children}
        </div>

        <div style={styles.footer}>
          <button type="button" style={styles.secondaryButton} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...styles.primaryButton, ...(loading ? styles.primaryButtonDisabled : null) }} onClick={onSubmit} disabled={loading}>
            {loading ? 'Working...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export const modalFormStyles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '14px'
  },
  field: {
    display: 'grid',
    gap: '8px'
  },
  fieldFull: {
    gridColumn: '1 / -1'
  },
  label: {
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: '600'
  },
  input: {
    width: '100%',
    borderRadius: '14px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(15, 23, 42, 0.5)',
    color: '#f8fafc',
    padding: '13px 14px',
    outline: 'none'
  },
  hint: {
    color: '#64748b',
    fontSize: '12px'
  }
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 6, 23, 0.78)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    zIndex: 1200
  },
  modal: {
    width: '100%',
    maxWidth: '760px',
    maxHeight: '85vh',
    overflowY: 'auto',
    borderRadius: '24px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)',
    boxShadow: '0 30px 80px rgba(2, 6, 23, 0.45)',
    padding: '24px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    color: '#f8fafc',
    fontSize: '24px'
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#94a3b8',
    lineHeight: 1.5
  },
  closeButton: {
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'transparent',
    color: '#e2e8f0',
    borderRadius: '12px',
    padding: '10px 14px',
    cursor: 'pointer'
  },
  body: {
    display: 'grid',
    gap: '16px'
  },
  footer: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  secondaryButton: {
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'transparent',
    color: '#e2e8f0',
    borderRadius: '14px',
    padding: '12px 16px',
    cursor: 'pointer'
  },
  primaryButton: {
    border: 0,
    background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    color: '#f8fafc',
    borderRadius: '14px',
    padding: '12px 18px',
    cursor: 'pointer',
    fontWeight: '700'
  },
  primaryButtonDisabled: {
    opacity: 0.6,
    cursor: 'progress'
  },
  error: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(127, 29, 29, 0.45)',
    color: '#fecaca'
  },
  success: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '14px',
    background: 'rgba(6, 95, 70, 0.45)',
    color: '#ccfbf1'
  }
};
