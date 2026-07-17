import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { PublicListing } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { publicApi } from '@/lib/publicApi';
import { buildListingPath } from '@/lib/safeNavigation';
import { ListingCard } from '@/components/listings/ListingCard';

type Props = {
  listingId: string;
  quartier: string | null;
};

export function RelatedListings({ listingId, quartier }: Props) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: ['related-listings', listingId, quartier],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({ pageSize: '4' });
      if (quartier) params.set('quartier', quartier);
      return publicApi.getListings(params.toString(), { signal });
    },
    enabled: Boolean(quartier),
  });

  const items = (query.data?.items ?? []).filter((item) => item.id !== listingId).slice(0, 3);
  if (!quartier || query.isLoading || items.length === 0) return null;

  return (
    <section className="related-listings" aria-labelledby="related-listings-title">
      <h2 id="related-listings-title">{t('related.title')}</h2>
      <div className="listings-grid related-listings-grid">
        {items.map((listing: PublicListing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            compact
            onNavigate={() => {
              const path = buildListingPath(listing.id, lang);
              if (path) navigate(path);
            }}
          />
        ))}
      </div>
    </section>
  );
}
