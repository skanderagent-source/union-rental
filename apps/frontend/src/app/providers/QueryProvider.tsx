import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/** In-memory only — no persisted query cache, tokens, or lead form data. */
const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Public catalog only; never persist to localStorage/sessionStorage.
      gcTime: 5 * 60_000,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
