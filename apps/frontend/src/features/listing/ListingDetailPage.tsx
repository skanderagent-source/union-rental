import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { SIZE_LABELS, type PublicListingDetail } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { api } from '@/lib/apiClient';
import { fmtPriceMonth } from '@/lib/format';
import { Footer } from '@/components/layout/Footer';

export function ListingDetailPage() {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { openContact } = useContactModal();
  const [activeImage, setActiveImage] = useState(0);

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
        </div>
        <Footer />
      </div>
    );
  }

  const listing = query.data;
  const images = listing.media.filter((m) => m.type === 'image');
  const videos = listing.media.filter((m) => m.type === 'video');
  const mainImage = images[activeImage]?.viewUrl ?? images[0]?.viewUrl;

  const downloadMedia = async (mediaId: string) => {
    const { url } = await api.get<{ url: string }>(`/api/public/media/${mediaId}/download-url`);
    window.open(url, '_blank');
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
          {mainImage ? (
            <div className="media-tile">
              <img src={mainImage} alt={listing.adresse} className="detail-main-photo" />
            </div>
          ) : (
            <div className="photo-ph" style={{ minHeight: 240, borderRadius: 14 }}>
              <span className="photo-ph-icon">🏠</span>
              <span className="photo-ph-title">{t('photo.title')}</span>
              <span className="photo-ph-sub">{t('photo.sub')}</span>
            </div>
          )}
          {images.length > 1 && (
            <div className="detail-thumbs">
              {images.map((img, idx) => (
                <img
                  key={img.id}
                  src={img.viewUrl}
                  alt=""
                  className={idx === activeImage ? 'active' : ''}
                  onClick={() => setActiveImage(idx)}
                />
              ))}
            </div>
          )}
          {images.map((img) => (
            <div key={`dl-${img.id}`} className="media-tile" style={{ display: 'none' }}>
              <button
                type="button"
                className="media-download"
                aria-label={t('media.downloadAria')}
                onClick={() => downloadMedia(img.id)}
              >
                {t('media.download')}
              </button>
            </div>
          ))}
          {images.length > 0 && (
            <div className="media-tile">
              <img src={images[activeImage]?.viewUrl ?? images[0]!.viewUrl} alt="" style={{ display: 'none' }} />
              <button
                type="button"
                className="media-download"
                style={{ position: 'relative', marginTop: 8 }}
                onClick={() => downloadMedia(images[activeImage]?.id ?? images[0]!.id)}
              >
                {t('media.download')}
              </button>
            </div>
          )}
          {videos.length > 0 && (
            <>
              <h3>{t('detail.videos')}</h3>
              {videos.map((vid) => (
                <div key={vid.id} className="media-tile">
                  <video controls preload="metadata" src={vid.viewUrl} style={{ width: '100%', borderRadius: 14 }} />
                  <button
                    type="button"
                    className="media-download"
                    aria-label={t('media.downloadAria')}
                    onClick={() => downloadMedia(vid.id)}
                  >
                    {t('media.download')}
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-submit detail-cta"
          onClick={() => openContact(listing)}
        >
          {t('listing.btnInterested')}
        </button>
      </div>
      <Footer />
    </div>
  );
}
