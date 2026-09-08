import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeUrl } from '@api/client';

const queryKeysByScope = {
  customers: [['customers'], ['customer']],
  devices: [['devices']],
  loans: [['loans'], ['payments-loans'], ['payments']],
  payments: [['loans'], ['payments-loans'], ['payments']],
  admin: [['admin-users']]
};

export function useRealtimeEvents(token) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const eventSource = new EventSource(getRealtimeUrl(token));

    function handleUpdate(event) {
      try {
        const message = JSON.parse(event.data || '{}');
        const scopes = Array.isArray(message.scopes) ? message.scopes : [];
        const invalidations = new Set();

        scopes.forEach(function invalidateScope(scope) {
          (queryKeysByScope[scope] || []).forEach(function pushQueryKey(queryKey) {
            invalidations.add(JSON.stringify(queryKey));
          });
        });

        invalidations.forEach(function runInvalidation(serializedQueryKey) {
          queryClient.invalidateQueries({
            queryKey: JSON.parse(serializedQueryKey)
          });
        });
      } catch (error) {
        return null;
      }

      return null;
    }

    eventSource.addEventListener('update', handleUpdate);

    return function cleanupRealtime() {
      eventSource.removeEventListener('update', handleUpdate);
      eventSource.close();
    };
  }, [queryClient, token]);
}
