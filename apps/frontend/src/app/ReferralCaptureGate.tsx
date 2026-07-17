import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { captureReferralFromSearch } from '@/lib/referral';
import { buildListingPath, isSafeInternalPath, sanitizeRouteHash } from '@/lib/safeNavigation';
import { resolveCanonicalRedirect } from '@union-rental/shared';

export function ReferralCaptureGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('ref') && !params.has('listing')) return;

    let cancelled = false;
    void (async () => {
      const { listing } = await captureReferralFromSearch(params);
      if (cancelled) return;

      const cleanPath = isSafeInternalPath(location.pathname) ? location.pathname : '/';
      const listingPath = listing ? buildListingPath(listing) : null;
      if (listingPath) {
        navigate(`${listingPath}${sanitizeRouteHash(location.hash)}`, { replace: true });
        return;
      }

      const redirect = resolveCanonicalRedirect(cleanPath, '');
      const targetPath = redirect?.pathname ?? cleanPath;
      const targetSearch = redirect?.search ?? '';
      navigate(`${targetPath}${targetSearch}${sanitizeRouteHash(location.hash)}`, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.hash, navigate]);

  return children;
}
