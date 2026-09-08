import React, { useEffect, useState } from 'react';
import EnrollmentScreen from '@renderer/components/EnrollmentScreen';
import StatusDashboard from '@renderer/components/StatusDashboard';
import LockScreen from '@renderer/components/LockScreen';

export default function App() {
  const [state, setState] = useState({
    isLocked: window.location.hash === '#locked',
    loading: true,
    enrollment: null
  });

  useEffect(() => {
    Promise.all([
      window.flexipay.getStatus(),
      window.flexipay.getEnrollmentState()
    ]).then(function hydrateState(values) {
      const deviceState = values[0] || { isLocked: false };
      const enrollmentState = values[1] || null;
      setState({
        ...deviceState,
        isLocked: Boolean(deviceState.isLocked),
        loading: false,
        enrollment: enrollmentState
      });
    });

    window.flexipay.onLocked(function onLocked(event, payload) {
      setState(function mergeState(current) {
        return {
          ...current,
          ...(payload || {}),
          isLocked: true
        };
      });
    });

    window.flexipay.onUnlocked(function onUnlocked(event, payload) {
      setState(function mergeState(current) {
        return {
          ...current,
          ...(payload || {}),
          isLocked: false
        };
      });
    });
  }, []);

  if (state.loading) {
    return null;
  }

  if (!state.isLocked && (!state.enrollment || !state.enrollment.isEnrolled || !state.deviceId)) {
    return (
      <EnrollmentScreen
        enrollment={state.enrollment}
        onComplete={(result) => {
          window.flexipay.getStatus().then(function refreshStatus(value) {
            setState({
              ...(value || { isLocked: false }),
              isLocked: Boolean(value && value.isLocked),
              loading: false,
              enrollment: result
            });
          });
        }}
      />
    );
  }

  return state.isLocked ? <LockScreen state={state} /> : <StatusDashboard state={state} />;
}
