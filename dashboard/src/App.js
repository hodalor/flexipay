import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from '@components/Layout/Sidebar';
import Topbar from '@components/Layout/Topbar';
import Login from '@pages/Login';
import Overview from '@pages/Overview';
import Customers from '@pages/Customers';
import CustomerDetail from '@pages/CustomerDetail';
import Devices from '@pages/Devices';
import Loans from '@pages/Loans';
import Payments from '@pages/Payments';
import AdminUsers from '@pages/AdminUsers';
import RepaymentApprovals from '@pages/RepaymentApprovals';
import Settings from '@pages/Settings';
import { useAuth } from '@hooks/useAuth';
import { useRealtimeEvents } from '@hooks/useRealtimeEvents';
import { hasMenu } from '@/constants/access';
import { DASHBOARD_LAYOUT } from '@/styles/layout';

function firstAccessibleRoute(user) {
  if (hasMenu(user, 'overview')) {
    return '/';
  }
  if (hasMenu(user, 'customers')) {
    return '/customers';
  }
  if (hasMenu(user, 'devices')) {
    return '/devices';
  }
  if (hasMenu(user, 'loans')) {
    return '/loans';
  }
  if (hasMenu(user, 'repayments')) {
    return '/repayments/recording';
  }
  if (hasMenu(user, 'admin')) {
    return '/admin/users';
  }
  if (hasMenu(user, 'settings')) {
    return '/settings';
  }

  return '/login';
}

function MenuRoute({ user, menuKey, element }) {
  if (!hasMenu(user, menuKey)) {
    return <Navigate to={firstAccessibleRoute(user)} replace />;
  }

  return element;
}

function Shell({ user }) {
  const token = window.localStorage.getItem('flexipay.dashboard.token');
  useRealtimeEvents(token);

  return (
    <div style={styles.shell}>
      <Sidebar />
      <div style={styles.main}>
        <Topbar />
        <div style={styles.content}>
          <div style={styles.contentInner}>
            <Routes>
              <Route path="/" element={<MenuRoute user={user} menuKey="overview" element={<Overview />} />} />
              <Route path="/customers" element={<MenuRoute user={user} menuKey="customers" element={<Customers />} />} />
              <Route path="/customers/:id" element={<MenuRoute user={user} menuKey="customers" element={<CustomerDetail />} />} />
              <Route path="/devices" element={<MenuRoute user={user} menuKey="devices" element={<Devices />} />} />
              <Route path="/loans" element={<MenuRoute user={user} menuKey="loans" element={<Loans />} />} />
              <Route path="/payments" element={<Navigate to="/repayments/recording" replace />} />
              <Route path="/repayments" element={<Navigate to="/repayments/recording" replace />} />
              <Route path="/repayments/recording" element={<MenuRoute user={user} menuKey="repayments" element={<Payments />} />} />
              <Route path="/repayments/approvals" element={<MenuRoute user={user} menuKey="repayments" element={<RepaymentApprovals />} />} />
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users" element={<MenuRoute user={user} menuKey="admin" element={<AdminUsers />} />} />
              <Route path="/settings" element={<MenuRoute user={user} menuKey="settings" element={<Settings />} />} />
              <Route path="*" element={<Navigate to={firstAccessibleRoute(user)} replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={auth.token ? <Shell user={auth.user} /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

const styles = {
  shell: {
    height: '100vh',
    overflow: 'hidden',
    background: 'radial-gradient(circle at top, #1e293b 0%, #0f172a 55%, #020617 100%)',
    color: '#e2e8f0'
  },
  main: {
    marginLeft: DASHBOARD_LAYOUT.sidebarWidth,
    width: `calc(100vw - ${DASHBOARD_LAYOUT.sidebarWidth})`,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  content: {
    flex: 1,
    width: '100%',
    boxSizing: 'border-box',
    minWidth: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '14px 18px 18px'
  },
  contentInner: {
    width: '100%',
    maxWidth: DASHBOARD_LAYOUT.contentMaxWidth,
    minWidth: 0
  }
};
