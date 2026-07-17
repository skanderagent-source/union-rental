import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildInventoryReferralPath } from '@/lib/safeNavigation';

/** Legacy /r/:slug URLs → /inventaire/:username */
export function ReferralSlugPage() {
  const { slug, listingId } = useParams<{ slug: string; listingId?: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const path = buildInventoryReferralPath(slug ?? '', listingId);
    navigate(path ?? '/inventaire', { replace: true });
  }, [slug, listingId, navigate]);

  return <div className="empty">Chargement…</div>;
}
