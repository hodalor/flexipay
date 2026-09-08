import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@api';

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    staleTime: 4000
  });
}
