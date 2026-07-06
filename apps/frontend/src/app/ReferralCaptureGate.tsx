import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { captureReferralFromSearch } from '@/lib/referral';

export function ReferralCaptureGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.has('ref') && !params.has('listing')) return;

    const { listing } = captureReferralFromSearch(params);
    const cleanPath = location.pathname;
    if (listing) {
      navigate(`/logement/${listing}${location.hash}`, { replace: true });
    } else {
      navigate(cleanPath, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return children;
}
