import { SIZE_LABELS, type PublicListing } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { fmtPriceMonth } from '@/lib/format';

type Props = {
  listing: PublicListing;
  onNavigate?: () => void;
  compact?: boolean;
};

export function ListingCard({ listing, onNavigate, compact }: Props) {
  const { t, lang } = useI18n();
  const { openContact } = useContactModal();

  const handleOpen = () => {
    onNavigate?.();
  };

  return (
    <div
      className={compact ? 'prev-card' : 'listing-card'}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className={compact ? 'prev-photo' : 'listing-photo'}>
        {listing.thumbnailUrl ? (
          listing.thumbnailType === 'video' ? (
            <span className="listing-photo-video">
              <span className="listing-photo-play" aria-hidden="true">
                ▶
              </span>
              <video src={listing.thumbnailUrl} preload="metadata" muted playsInline />
            </span>
          ) : (
            <img src={listing.thumbnailUrl} alt={listing.adresse} loading="lazy" />
          )
        ) : (
          <div className="photo-ph">
            <span className="photo-ph-icon">🏠</span>
            <span className="photo-ph-title">{t('photo.title')}</span>
            <span className="photo-ph-sub">{t('photo.sub')}</span>
          </div>
        )}
        <span className={compact ? 'prev-badge' : 'listing-badge badge-available'}>
          {t('badge.available')}
        </span>
        <span className={compact ? 'prev-source' : 'listing-source'}>
          {listing.source ?? 'LogiGo'}
        </span>
      </div>
      <div className={compact ? 'prev-body' : 'listing-body'}>
        <div className={compact ? 'prev-area' : 'listing-area'}>
          {listing.quartier ?? t('cityFallback')}
        </div>
        <div className={compact ? 'prev-addr' : 'listing-addr'}>{listing.adresse}</div>
        <div className={compact ? 'prev-meta' : 'listing-meta'}>
          {listing.taille && (
            <span className={compact ? 'prev-tag' : 'listing-tag'}>
              📐 {SIZE_LABELS[listing.taille] ?? listing.taille} {t('sizeSuffix')}
            </span>
          )}
          {listing.electromenagers && (
            <span className={compact ? 'prev-tag' : 'listing-tag'}>
              🍳 {listing.electromenagers}
            </span>
          )}
        </div>
        <div className={compact ? 'prev-price' : 'listing-price'}>
          {listing.prix != null ? (
            <>
              {fmtPriceMonth(listing.prix, lang, t).replace(t('listing.perMonth'), '')}
              <small>{t('listing.perMonth')}</small>
            </>
          ) : (
            t('listing.priceOnRequest')
          )}
        </div>
        {!compact && listing.notes && <div className="listing-notes">{listing.notes}</div>}
        <button
          type="button"
          className={compact ? 'btn-interested' : 'btn-contact-card'}
          onClick={(e) => {
            e.stopPropagation();
            openContact(listing);
          }}
        >
          {t('listing.btnInterested')}
        </button>
      </div>
    </div>
  );
}
