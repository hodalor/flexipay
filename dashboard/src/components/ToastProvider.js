import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input) => {
    const config = typeof input === 'string' ? { message: input } : input;
    const id = String(Date.now()) + Math.random().toString(16).slice(2);
    const toast = {
      id,
      type: config.type || 'info',
      title: config.title || '',
      message: config.message || '',
      duration: typeof config.duration === 'number' ? config.duration : 3200
    };

    setToasts((current) => [...current, toast]);
    window.setTimeout(() => dismissToast(id), toast.duration);

    return id;
  }, [dismissToast]);

  const value = useMemo(() => ({
    showToast,
    dismissToast
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={styles.viewport}>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ ...styles.toast, ...(stylesByType[toast.type] || stylesByType.info) }}>
            <div style={styles.toastHeader}>
              <div>
                {toast.title ? <div style={styles.toastTitle}>{toast.title}</div> : null}
                <div style={styles.toastMessage}>{toast.message}</div>
              </div>
              <button type="button" style={styles.closeButton} onClick={() => dismissToast(toast.id)}>
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
}

const styles = {
  viewport: {
    position: 'fixed',
    top: '18px',
    right: '18px',
    zIndex: 1500,
    display: 'grid',
    gap: '12px',
    width: 'min(360px, calc(100vw - 36px))',
    pointerEvents: 'none'
  },
  toast: {
    pointerEvents: 'auto',
    borderRadius: '18px',
    border: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(15, 23, 42, 0.96)',
    boxShadow: '0 18px 50px rgba(2, 6, 23, 0.35)',
    padding: '14px 16px'
  },
  toastHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px'
  },
  toastTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    marginBottom: '4px'
  },
  toastMessage: {
    color: '#dbe4f0',
    lineHeight: 1.5
  },
  closeButton: {
    border: 0,
    background: 'transparent',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1
  }
};

const stylesByType = {
  success: {
    borderColor: 'rgba(45, 212, 191, 0.28)',
    boxShadow: '0 18px 50px rgba(15, 118, 110, 0.22)'
  },
  error: {
    borderColor: 'rgba(248, 113, 113, 0.28)',
    boxShadow: '0 18px 50px rgba(153, 27, 27, 0.22)'
  },
  warning: {
    borderColor: 'rgba(251, 191, 36, 0.28)',
    boxShadow: '0 18px 50px rgba(180, 83, 9, 0.22)'
  },
  info: {
    borderColor: 'rgba(96, 165, 250, 0.26)',
    boxShadow: '0 18px 50px rgba(30, 64, 175, 0.18)'
  }
};
