import { useQuery } from '@tanstack/react-query';
import { getDevices } from '@api';

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: getDevices,
    staleTime: 4000
  });
}
