import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { hasAction, hasMenu } from '@/constants/access';
import { useAuth } from '@hooks/useAuth';

const sections = [
  {
    key: 'overview',
    label: 'Overview',
    collapsible: false,
    children: [
      { to: '/', label: 'Overview' }
    ]
  },
  {
    key: 'customers',
    label: 'Customers',
    collapsible: false,
    children: [
      { to: '/customers', label: 'Customers' }
    ]
  },
  {
    key: 'devices',
    label: 'Devices',
    collapsible: false,
    children: [
      { to: '/devices', label: 'Devices' }
    ]
  },
  {
    key: 'loans',
    label: 'Loans',
    collapsible: false,
    children: [
      { to: '/loans', label: 'Loans' }
    ]
  },
  {
    key: 'repayments',
    label: 'Repayments',
    collapsible: true,
    children: [
      { to: '/repayments/recording', label: 'Recording' },
      {
        to: '/repayments/approvals',
        label: 'Approvals',
        visible: (user) => hasAction(user, 'repayments.approve_director') || hasAction(user, 'repayments.approve_manager')
      }
    ]
  },
  {
    key: 'admin',
    label: 'Admin',
    collapsible: true,
    children: [
      {
        to: '/admin/users',
        label: 'Users',
        visible: (user) => hasAction(user, 'admin_users.view') || hasAction(user, 'admin_users.create') || hasAction(user, 'admin_users.update')
      }
    ]
  },
  {
    key: 'settings',
    label: 'Settings',
    collapsible: false,
    children: [
      { to: '/settings', label: 'Settings' }
    ]
  }
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const visibleSections = useMemo(() => {
    return sections
      .filter((section) => hasMenu(user, section.key))
      .map((section) => ({
        ...section,
        children: section.children.filter((child) => !child.visible || child.visible(user))
      }))
      .filter((section) => section.children.length);
  }, [user]);
  const [expanded, setExpanded] = useState(() => {
    return visibleSections.reduce((state, section) => {
      const isActive = section.children.some((child) => matchesPath(location.pathname, child.to));
      state[section.key] = isActive;
      return state;
    }, {});
  });

  useEffect(() => {
    setExpanded((current) => {
      const next = { ...current };

      visibleSections.forEach((section) => {
        if (section.collapsible && section.children.some((child) => matchesPath(location.pathname, child.to))) {
          next[section.key] = true;
        } else if (section.collapsible && typeof next[section.key] !== 'boolean') {
          next[section.key] = false;
        }
      });

      return next;
    });
  }, [location.pathname, visibleSections]);

  function toggleSection(key) {
    setExpanded((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brandBlock}>
        <div style={styles.brand}>FlexiPay</div>
        <div style={styles.brandCaption}>AI-powered finance operations</div>
      </div>
      <style>{`
        .flexipay-sidebar-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .flexipay-sidebar-scroll::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
      `}</style>
      <div style={styles.menuScroll} className="flexipay-sidebar-scroll">
        {visibleSections.map(function renderSection(section) {
          const open = expanded[section.key];
          const active = section.children.some((child) => matchesPath(location.pathname, child.to));

          if (!section.collapsible) {
            const child = section.children[0];
            return (
              <NavLink
                key={section.key}
                to={child.to}
                style={({ isActive }) => ({
                  ...styles.flatLink,
                  background: isActive ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.22) 0%, rgba(15, 118, 110, 0.18) 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  borderColor: isActive ? 'rgba(94, 234, 212, 0.28)' : 'transparent'
                })}
              >
                {section.label}
              </NavLink>
            );
          }

          return (
            <div key={section.key} style={styles.group}>
              <button
                type="button"
                style={{
                  ...styles.groupButton,
                  ...(active ? styles.groupButtonActive : null)
                }}
                onClick={() => toggleSection(section.key)}
              >
                <span>{section.label}</span>
                <span style={styles.groupIcon}>{open ? '-' : '+'}</span>
              </button>

              {open ? (
                <div style={styles.children}>
                  {section.children.map(function renderLink(child) {
                    return (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        style={({ isActive }) => ({
                          ...styles.link,
                          background: isActive ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.22) 0%, rgba(15, 118, 110, 0.18) 100%)' : 'transparent',
                          color: isActive ? '#ffffff' : '#cbd5e1',
                          borderColor: isActive ? 'rgba(94, 234, 212, 0.28)' : 'transparent'
                        })}
                      >
                        {child.label}
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function matchesPath(pathname, target) {
  if (target === '/') {
    return pathname === '/';
  }

  return pathname === target || pathname.startsWith(target + '/');
}

const styles = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '208px',
    padding: '22px 14px 18px',
    background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
    borderRight: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    zIndex: 100
  },
  brandBlock: {
    padding: '8px 10px 4px'
  },
  brand: {
    color: '#99f6e4',
    fontWeight: '700',
    fontSize: '24px',
    letterSpacing: '-0.03em'
  },
  brandCaption: {
    marginTop: '6px',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.5
  },
  menuScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingRight: '2px'
  },
  flatLink: {
    padding: '12px 14px',
    borderRadius: '14px',
    textDecoration: 'none',
    border: '1px solid transparent',
    fontWeight: '700',
    fontSize: '14px',
    transition: 'all 160ms ease'
  },
  group: {
    display: 'grid',
    gap: '8px'
  },
  groupButton: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '14px',
    border: '1px solid transparent',
    background: 'transparent',
    color: '#cbd5e1',
    fontWeight: '700',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  groupButtonActive: {
    background: 'rgba(20, 184, 166, 0.08)',
    borderColor: 'rgba(94, 234, 212, 0.14)',
    color: '#f8fafc'
  },
  groupIcon: {
    fontSize: '18px',
    lineHeight: 1
  },
  children: {
    display: 'grid',
    gap: '8px'
  },
  link: {
    marginLeft: '10px',
    padding: '10px 14px',
    borderRadius: '14px',
    textDecoration: 'none',
    border: '1px solid transparent',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 160ms ease'
  }
};
