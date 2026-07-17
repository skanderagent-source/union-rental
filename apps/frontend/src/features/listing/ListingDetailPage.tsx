import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SIZE_LABELS, isValidListingId, type PublicListingDetail, type PublicMediaItem } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useToast } from '@/app/providers/ToastProvider';
import { publicApi } from '@/lib/publicApi';
import { fmtPriceMonth } from '@/lib/format';
import { Footer } from '@/components/layout/Footer';
import { ErrorState } from '@/components/common/ErrorState';
import { SafeImage, SafeVideo } from '@/components/common/SafeMedia';
import { copyCurrentPageUrl } from '@/lib/safeClipboard';
import { sanitizeFilename } from '@/lib/sanitizeFilename';
import { buildListingSeo, buildUnavailableListingSeo } from '@/lib/seoMeta';
import { PageSeo } from '@/components/seo/PageSeo';
import { buildListingPath } from '@/lib/safeNavigation';
import { routes, localizedRoute } from '@/lib/routes';
import {
  buildListingJsonLd,
  buildListingOgImageAlt,
  defaultOgImageUrl,
  listingOgImageUrl,
} from '@/lib/structuredData';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { RelatedListings } from '@/components/listings/RelatedListings';
import { localizedCanonicalUrl } from '@/lib/siteUrl';

function MediaViewer({
  item,
  alt,
  className,
  videoClassName,
  controls,
  priority = false,
}: {
  item: PublicMediaItem;
  alt: string;
  className?: string;
  videoClassName?: string;
  controls?: boolean;
  priority?: boolean;
}) {
  if (item.type === 'video') {
    return (
      <SafeVideo
        key={item.id}
        className={videoClassName}
        src={item.viewUrl}
        controls={controls}
        preload="metadata"
        playsInline
      />
    );
  }
  return (
    <SafeImage
      src={item.viewUrl}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      width={960}
      height={720}
    />
  );
}

export function ListingDetailPage() {
  const { id } = useParams();
  const location = useLocation();
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

  const listingId = id && isValidListingId(id) ? id : null;
  const listingPath = listingId ? (buildListingPath(listingId, lang) ?? '/logement') : '/logement';

  const query = useQuery({
    queryKey: ['listing', listingId],
    queryFn: ({ signal }) => {
      if (!listingId) throw new Error('Missing listing id');
      return publicApi.getListing(listingId, { signal });
    },
    enabled: !!listingId,
    retry: false,
  });

  const listing = query.data;
  const successSeo = listing ? buildListingSeo(listing, lang, t) : null;
  const successJsonLd = useMemo(() => {
    if (!listing || !successSeo) return undefined;
    return buildListingJsonLd(
      listing,
      lang,
      { home: t('nav.accueil'), inventory: t('nav.inventaire') },
      successSeo.description,
    );
  }, [listing, lang, t, successSeo]);
  const ogImageAlt = listing ? buildListingOgImageAlt(listing, lang) : undefined;
  const ogImage = listing
    ? (listingOgImageUrl(listing.media) ?? defaultOgImageUrl())
    : undefined;
  const breadcrumbItems = useMemo(() => {
    if (!listing) return [];
    return [
      { name: t('nav.accueil'), url: localizedCanonicalUrl(lang, routes.home) },
      { name: t('nav.inventaire'), url: localizedCanonicalUrl(lang, routes.inventory) },
      { name: listing.adresse, url: localizedCanonicalUrl(lang, listingPath) },
    ];
  }, [listing, lang, t, listingPath]);

  if (!listingId) {
    const seo = buildUnavailableListingSeo(t);
    return (
      <div className="app-page">
        <PageSeo
          title={seo.title}
          description={seo.description}
          pathname={location.pathname}
          index={false}
        />
        <div className="detail-page notfound-page">
          <h1>{t('deeplink.gone')}</h1>
          <button type="button" className="btn-hero-p" onClick={() => openContact(null)}>
            {t('nav.contact')}
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  if (query.isLoading) {
    const loadingSeo = buildUnavailableListingSeo(t);
    return (
      <div className="app-page">
        <PageSeo
          title={loadingSeo.title}
          description={loadingSeo.description}
          pathname={location.pathname}
          index={false}
        />
        <div className="loading-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    const seo = buildUnavailableListingSeo(t);
    return (
      <div className="app-page">
        <PageSeo
          title={seo.title}
          description={seo.description}
          pathname={location.pathname}
          index={false}
        />
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

  const activeListing = listing!;
  const listingMedia = activeListing.media;
  const current = listingMedia[activeMedia];
  const hasMultiple = listingMedia.length > 1;
  const seo = successSeo!;

  const shareListing = async () => {
    const copied = await copyCurrentPageUrl();
    showToast(copied ? t('detail.linkCopied') : t('toast.error'));
  };

  const goToMedia = (direction: -1 | 1) => {
    if (!hasMultiple) return;
    setActiveMedia((idx) => (idx + direction + listingMedia.length) % listingMedia.length);
  };

  const openLightbox = () => {
    if (current?.type === 'image') setLightboxOpen(true);
  };

  return (
    <div className="app-page">
      <PageSeo
        title={seo.title}
        description={seo.description}
        pathname={location.pathname}
        ogType="article"
        ogImage={ogImage ?? defaultOgImageUrl()}
        ogImageAlt={ogImageAlt}
        jsonLd={successJsonLd}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <div className="detail-page">
        <button type="button" className="detail-back" onClick={() => navigate(localizedRoute(lang, 'inventory'))}>
          {t('detail.back')}
        </button>

        <div className="detail-layout">
          <aside className="detail-info">
            <div className="detail-info-card">
              <div className="detail-info-top">
                <div className="listing-area">{activeListing.quartier ?? t('cityFallback')}</div>
                <h1>{activeListing.adresse}</h1>
                <span className="detail-status-badge badge-available">{t('badge.available')}</span>
              </div>

              <div className="detail-price-block">
                <span className="detail-price-label">{t('detail.price')}</span>
                <div className="listing-price">
                  {activeListing.prix != null
                    ? fmtPriceMonth(activeListing.prix, lang, t)
                    : t('listing.priceOnRequest')}
                </div>
              </div>

              <dl className="detail-specs">
                {activeListing.taille && (
                  <div className="detail-spec">
                    <dt>{t('detail.size')}</dt>
                    <dd>
                      {SIZE_LABELS[activeListing.taille] ?? activeListing.taille} {t('sizeSuffix')}
                    </dd>
                  </div>
                )}
                {activeListing.electromenagers && (
                  <div className="detail-spec">
                    <dt>{t('detail.appliances')}</dt>
                    <dd>{activeListing.electromenagers}</dd>
                  </div>
                )}
              </dl>

              {activeListing.notes && (
                <div className="detail-notes">
                  <h2 className="detail-notes-title">{t('detail.notes')}</h2>
                  <p>{activeListing.notes}</p>
                </div>
              )}

              <div className="detail-actions">
                <button
                  type="button"
                  className="btn-submit detail-cta"
                  onClick={() => openContact(activeListing)}
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
          </aside>

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
                  <MediaViewer
                    item={current}
                    alt={activeListing.adresse}
                    className="detail-main-photo"
                    priority={activeMedia === 0}
                  />
                </button>
              ) : (
                <div className="detail-main-media-slot">
                  <MediaViewer
                    item={current}
                    alt={activeListing.adresse}
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
              {listingMedia.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={`detail-thumb${idx === activeMedia ? ' active' : ''}`}
                  aria-label={sanitizeFilename(item.originalFilename)}
                  onClick={() => {
                    setActiveMedia(idx);
                    if (item.type === 'image') setLightboxOpen(true);
                  }}
                >
                  {item.type === 'image' ? (
                    <SafeImage src={item.viewUrl} alt="" decorative width={120} height={90} />
                  ) : (
                    <span className="detail-thumb-video">
                      <span className="detail-thumb-play" aria-hidden="true">
                        ▶
                      </span>
                      <SafeVideo src={item.viewUrl} preload="metadata" muted playsInline />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          </div>
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
              <SafeImage src={current.viewUrl} alt={activeListing.adresse} className="lightbox-image" />
            ) : (
              <MediaViewer
                item={current}
                alt={activeListing.adresse}
                videoClassName="lightbox-video"
                controls
              />
            )}
          </div>
        </div>
      )}

      <RelatedListings listingId={activeListing.id} quartier={activeListing.quartier} />

      <Footer />
    </div>
  );
}
