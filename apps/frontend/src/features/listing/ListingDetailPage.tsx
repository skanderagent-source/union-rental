import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { SIZE_LABELS, type PublicListingDetail, type PublicMediaItem } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { api } from '@/lib/apiClient';
import { fmtPriceMonth } from '@/lib/format';
import { Footer } from '@/components/layout/Footer';
import { ErrorState } from '@/components/common/ErrorState';

function MediaViewer({
  item,
  alt,
  className,
  videoClassName,
  controls,
}: {
  item: PublicMediaItem;
  alt: string;
  className?: string;
  videoClassName?: string;
  controls?: boolean;
}) {
  if (item.type === 'video') {
    return (
      <video
        key={item.id}
        className={videoClassName}
        src={item.viewUrl}
        controls={controls}
        preload="metadata"
        playsInline
      />
    );
  }
  return <img src={item.viewUrl} alt={alt} className={className} />;
}

export function ListingDetailPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { openContact } = useContactModal();
  const { showToast } = useToast();
  const [activeMedia, setActiveMedia] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  const query = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.get<PublicListingDetail>(`/api/public/listings/${id}`),
    enabled: !!id,
    retry: false,
  });

  if (query.isLoading) {
    return (
      <div className="app-page">
        <div className="loading-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="app-page">
        <div className="detail-page notfound-page">
          <h1>{t('deeplink.gone')}</h1>
          <button type="button" className="btn-hero-p" onClick={() => openContact(null)}>
            {t('nav.contact')}
          </button>
          {query.isError && (
            <div style={{ marginTop: 16 }}>
              <ErrorState onRetry={() => query.refetch()} />
            </div>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  const listing = query.data;
  const media = listing.media;
  const current = media[activeMedia];
  const hasMultiple = media.length > 1;

  const shareListing = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast(t('detail.linkCopied'));
    } catch {
      showToast(t('toast.error'));
    }
  };

  const goToMedia = (direction: -1 | 1) => {
    if (!hasMultiple) return;
    setActiveMedia((idx) => (idx + direction + media.length) % media.length);
  };

  const openLightbox = () => {
    if (current?.type === 'image') setLightboxOpen(true);
  };

  return (
    <div className="app-page">
      <div className="detail-page">
        <button type="button" className="detail-back" onClick={() => navigate('/inventaire')}>
          {t('detail.back')}
        </button>
        <div className="detail-header">
          <div className="listing-area">{listing.quartier ?? t('cityFallback')}</div>
          <h1>{listing.adresse}</h1>
          <span className="listing-badge badge-available">{t('badge.available')}</span>
          <div className="listing-price" style={{ marginTop: 12 }}>
            {listing.prix != null
              ? fmtPriceMonth(listing.prix, lang, t)
              : t('listing.priceOnRequest')}
          </div>
          <div className="listing-meta" style={{ marginTop: 12 }}>
            {listing.taille && (
              <span className="listing-tag">
                📐 {SIZE_LABELS[listing.taille] ?? listing.taille} {t('sizeSuffix')}
              </span>
            )}
            {listing.electromenagers && (
              <span className="listing-tag">🍳 {listing.electromenagers}</span>
            )}
          </div>
          {listing.notes && <p style={{ marginTop: 12, color: 'var(--text2)' }}>{listing.notes}</p>}
        </div>

        <div className="detail-gallery">
          {current ? (
            <div className="detail-main-photo-wrap">
              {hasMultiple && (
                <>
                  <button
                    type="button"
                    className="gallery-nav detail-gallery-nav detail-gallery-nav-prev"
                    aria-label={t('detail.prevMedia')}
                    onClick={() => goToMedia(-1)}
                  >
                    &lt;
                  </button>
                  <button
                    type="button"
                    className="gallery-nav detail-gallery-nav detail-gallery-nav-next"
                    aria-label={t('detail.nextMedia')}
                    onClick={() => goToMedia(1)}
                  >
                    &gt;
                  </button>
                </>
              )}
              {current.type === 'image' ? (
                <button
                  type="button"
                  className="detail-main-photo-trigger"
                  onClick={openLightbox}
                  aria-label={t('detail.expandPhoto')}
                >
                  <MediaViewer item={current} alt={listing.adresse} className="detail-main-photo" />
                </button>
              ) : (
                <div className="detail-main-media-slot">
                  <MediaViewer
                    item={current}
                    alt={listing.adresse}
                    videoClassName="detail-main-video"
                    controls
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="photo-ph" style={{ minHeight: 240, borderRadius: 14 }}>
              <span className="photo-ph-icon">🏠</span>
              <span className="photo-ph-title">{t('photo.title')}</span>
              <span className="photo-ph-sub">{t('photo.sub')}</span>
            </div>
          )}
          {hasMultiple && (
            <div className="detail-thumbs">
              {media.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`detail-thumb${idx === activeMedia ? ' active' : ''}`}
                  aria-label={item.originalFilename}
                  onClick={() => {
                    setActiveMedia(idx);
                    if (item.type === 'image') setLightboxOpen(true);
                  }}
                >
                  {item.type === 'image' ? (
                    <img src={item.viewUrl} alt="" />
                  ) : (
                    <span className="detail-thumb-video">
                      <span className="detail-thumb-play" aria-hidden="true">
                        ▶
                      </span>
                      <video src={item.viewUrl} preload="metadata" muted playsInline />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="detail-actions">
          <button
            type="button"
            className="btn-submit detail-cta"
            onClick={() => openContact(listing)}
          >
            {t('listing.btnInterested')}
          </button>
          <button
            type="button"
            className="btn-share"
            aria-label={t('detail.shareAria')}
            onClick={() => void shareListing()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {lightboxOpen && current && (
        <div
          className="lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('detail.expandPhoto')}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label={t('detail.closeLightbox')}
            onClick={() => setLightboxOpen(false)}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
            {hasMultiple && (
              <>
                <button
                  type="button"
                  className="gallery-nav lightbox-nav lightbox-nav-prev"
                  aria-label={t('detail.prevMedia')}
                  onClick={() => goToMedia(-1)}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="gallery-nav lightbox-nav lightbox-nav-next"
                  aria-label={t('detail.nextMedia')}
                  onClick={() => goToMedia(1)}
                >
                  &gt;
                </button>
              </>
            )}
            {current.type === 'image' ? (
              <img src={current.viewUrl} alt={listing.adresse} className="lightbox-image" />
            ) : (
              <MediaViewer
                item={current}
                alt={listing.adresse}
                videoClassName="lightbox-video"
                controls
              />
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
