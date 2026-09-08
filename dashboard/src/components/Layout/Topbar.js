import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const user = window.localStorage.getItem('flexipay.dashboard.user');
  const parsedUser = user ? JSON.parse(user) : null;
  const name = parsedUser ? parsedUser.fullName : 'Operator';
  const role = parsedUser?.role ? String(parsedUser.role).replace(/_/g, ' ') : '';
  const section = sectionTitle(location.pathname);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const initials = useMemo(() => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'OP';
  }, [name]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return function cleanup() {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  function handleSignOut() {
    window.localStorage.removeItem('flexipay.dashboard.token');
    window.localStorage.removeItem('flexipay.dashboard.user');
    window.localStorage.removeItem('flexipay.dashboard.userType');
    navigate('/login');
    window.location.reload();
  }

  return (
    <header style={styles.header}>
      <div>
        <div style={styles.kicker}>Operations Center</div>
        <div style={styles.title}>{section}</div>
      </div>
      <div style={styles.rightRail}>
        <div style={styles.syncBadge}>Live sync active</div>
        <div
          ref={profileRef}
          style={styles.profileWrap}
          onMouseEnter={() => setIsProfileOpen(true)}
          onMouseLeave={() => setIsProfileOpen(false)}
        >
          <button
            type="button"
            style={{ ...styles.profileButton, ...(isProfileOpen ? styles.profileButtonOpen : null) }}
            onClick={() => setIsProfileOpen((current) => !current)}
          >
            <span style={styles.profileIcon}>{initials}</span>
          </button>

          {isProfileOpen ? (
            <div style={styles.profileDropdown}>
              <div style={styles.profileName}>{name}</div>
              {role ? <div style={styles.profileRole}>{role}</div> : null}
              <button
                type="button"
                style={styles.signOut}
                onClick={handleSignOut}
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function sectionTitle(pathname) {
  if (pathname.startsWith('/customers')) {
    return 'Customers';
  }
  if (pathname.startsWith('/devices')) {
    return 'Devices';
  }
  if (pathname.startsWith('/loans')) {
    return 'Loans';
  }
  if (pathname.startsWith('/repayments/recording')) {
    return 'Repayment Recording';
  }
  if (pathname.startsWith('/repayments/approvals')) {
    return 'Repayment Approvals';
  }
  if (pathname.startsWith('/payments')) {
    return 'Repayments';
  }
  if (pathname.startsWith('/admin/users')) {
    return 'Admin Users';
  }
  if (pathname.startsWith('/settings')) {
    return 'Settings';
  }

  return 'Portfolio Control';
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 90,
    padding: '12px 18px 10px',
    boxSizing: 'border-box',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(2, 6, 23, 0.76)',
    backdropFilter: 'blur(18px)'
  },
  kicker: {
    color: '#14b8a6',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    fontWeight: '700'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#f8fafc'
  },
  rightRail: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    justifyContent: 'flex-end'
  },
  syncBadge: {
    borderRadius: '999px',
    padding: '8px 12px',
    background: 'rgba(20, 184, 166, 0.12)',
    color: '#99f6e4',
    fontSize: '12px',
    border: '1px solid rgba(94, 234, 212, 0.18)'
  },
  profileWrap: {
    position: 'relative'
  },
  profileButton: {
    width: '42px',
    height: '42px',
    borderRadius: '999px',
    border: '1px solid rgba(148, 163, 184, 0.22)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  profileButtonOpen: {
    borderColor: 'rgba(94, 234, 212, 0.28)',
    background: 'rgba(20, 184, 166, 0.12)'
  },
  profileIcon: {
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.04em'
  },
  profileDropdown: {
    position: 'absolute',
    top: '50px',
    right: 0,
    minWidth: '220px',
    borderRadius: '16px',
    border: '1px solid rgba(148, 163, 184, 0.16)',
    background: 'rgba(15, 23, 42, 0.98)',
    boxShadow: '0 24px 40px rgba(2, 6, 23, 0.3)',
    padding: '14px',
    display: 'grid',
    gap: '10px'
  },
  profileName: {
    color: '#f8fafc',
    fontWeight: '700'
  },
  profileRole: {
    color: '#94a3b8',
    textTransform: 'capitalize',
    fontSize: '13px'
  },
  signOut: {
    width: '100%',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    background: 'transparent',
    color: '#e2e8f0',
    borderRadius: '12px',
    padding: '10px 12px',
    cursor: 'pointer'
  }
};
