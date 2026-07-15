import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isValidReferralUsername, normalizeReferralUsername } from '@union-rental/shared';

/** Legacy /r/:slug URLs → /inventaire/:username */
export function ReferralSlugPage() {
  const { slug, listingId } = useParams<{ slug: string; listingId?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const normalized = normalizeReferralUsername(slug ?? '');
    if (!isValidReferralUsername(normalized)) {
      navigate('/inventaire', { replace: true });
      return;
    }
    const listingQuery = listingId ? `?listing=${listingId}` : '';
    navigate(`/inventaire/${normalized}${listingQuery}`, { replace: true });
  }, [slug, listingId, navigate]);

  return <div className="empty">Chargement…</div>;
}
