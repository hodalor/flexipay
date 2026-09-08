import { useMemo, useState } from 'react';

export function useAuth() {
  const [token, setToken] = useState(() => window.localStorage.getItem('flexipay.dashboard.token'));
  const [user, setUser] = useState(() => {
    const saved = window.localStorage.getItem('flexipay.dashboard.user');
    return saved ? JSON.parse(saved) : null;
  });
  const [userType, setUserType] = useState(() => window.localStorage.getItem('flexipay.dashboard.userType'));

  return useMemo(() => ({
    token,
    user,
    userType,
    saveSession(session) {
      window.localStorage.setItem('flexipay.dashboard.token', session.accessToken);
      window.localStorage.setItem('flexipay.dashboard.user', JSON.stringify(session.user || null));
      window.localStorage.setItem('flexipay.dashboard.userType', session.userType || 'admin');
      setToken(session.accessToken);
      setUser(session.user || null);
      setUserType(session.userType || 'admin');
    },
    clearSession() {
      window.localStorage.removeItem('flexipay.dashboard.token');
      window.localStorage.removeItem('flexipay.dashboard.user');
      window.localStorage.removeItem('flexipay.dashboard.userType');
      setToken(null);
      setUser(null);
      setUserType(null);
    }
  }), [token, user, userType]);
}
