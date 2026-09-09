import React from 'react';

export default function PageHeader({ eyebrow, title, subtitle, actionLabel, onAction, actionDisabled, secondaryAction, toolbarContent }) {
  return (
    <div style={styles.header}>
      <div style={styles.copy}>
        {eyebrow ? <div style={styles.eyebrow}>{eyebrow}</div> : null}
        <h1 style={styles.title}>{title}</h1>
      </div>
      <div style={styles.actions}>
        {toolbarContent ? <div style={styles.toolbar}>{toolbarContent}</div> : null}
        {secondaryAction || null}
        {actionLabel ? (
          <button type="button" style={{ ...styles.button, ...(actionDisabled ? styles.buttonDisabled : null) }} onClick={onAction} disabled={actionDisabled}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '10px',
    flexWrap: 'wrap'
  },
  copy: {
    maxWidth: '720px'
  },
  eyebrow: {
    color: '#14b8a6',
    textTransform: 'uppercase',
    letterSpacing: '0.16em',
    fontSize: '10px',
    fontWeight: '700',
    marginBottom: '4px'
  },
  title: {
    margin: 0,
    fontSize: '22px',
    lineHeight: 1.1,
    color: '#e2e8f0'
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  button: {
    border: 0,
    borderRadius: '12px',
    padding: '11px 16px',
    background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
    color: '#f8fafc',
    fontWeight: '700',
    boxShadow: '0 12px 22px rgba(20, 184, 166, 0.2)',
    cursor: 'pointer'
  },
  buttonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
    boxShadow: 'none'
  }
};
