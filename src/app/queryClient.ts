import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The library default is 0, which refetches on every remount and window
      // focus. Match and team lists don't change by the second, so 30s cuts
      // redundant requests without meaningfully hurting freshness.
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
