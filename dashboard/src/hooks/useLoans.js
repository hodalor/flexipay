import { useQuery } from '@tanstack/react-query';
import { getLoans } from '@api';

export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: getLoans,
    staleTime: 4000
  });
}
