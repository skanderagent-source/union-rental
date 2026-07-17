import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resolveCanonicalRedirect } from '@union-rental/shared';
import { sanitizeRouteHash } from '@/lib/safeNavigation';

/** Client-side single-hop canonicalization for local dev and post-hydration cleanup. */
export function CanonicalUrlGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const redirect = resolveCanonicalRedirect(location.pathname, location.search);
    if (!redirect) return;

    const hash = sanitizeRouteHash(location.hash);
    navigate(`${redirect.pathname}${redirect.search}${hash}`, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  return children;
}
