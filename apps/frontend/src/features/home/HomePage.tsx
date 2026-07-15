import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useReveal } from '@/hooks/useReveal';
import { useCountUp } from '@/hooks/useCountUp';
import { api } from '@/lib/apiClient';
import { ListingCard } from '@/components/listings/ListingCard';
import { ErrorState } from '@/components/common/ErrorState';
import { Footer } from '@/components/layout/Footer';
import heroHome from '@/assets/hero-home.jpg';
import ctaBg from '@/assets/cta-bg.jpg';
import photoPlateau from '@/assets/photo-plateau.jpg';
import photoVieux from '@/assets/photo-vieux-montreal.jpg';
import photoCentre from '@/assets/photo-centre-ville.jpg';

export function HomePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { openContact } = useContactModal();
  const revealRef = useReveal([]);

  const statsQuery = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<{ totalListings: number; availableListings: number; quartierCount: number }>('/api/public/stats'),
  });

  const previewQuery = useQuery({
    queryKey: ['preview-listings'],
    queryFn: () =>
      api.get<{ items: import('@union-rental/shared').PublicListing[] }>(
        '/api/public/listings?pageSize=4',
      ),
  });

  const total = useCountUp(statsQuery.data?.totalListings ?? 0, lang);
  const dispo = useCountUp(statsQuery.data?.availableListings ?? 0, lang);
  const areas = useCountUp(statsQuery.data?.quartierCount ?? 0, lang);

  return (
    <div className="app-page" ref={revealRef}>
      <div className="hero">
        <img className="hero-img hero-img-animated" src={heroHome} alt={t('hero.imgAlt')} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge au d1">
            <div className="hero-badge-dot" />
            <span>{t('hero.badge')}</span>
          </div>
          <h1 className="au d2" dangerouslySetInnerHTML={{ __html: t('hero.title') }} />
          <p className="au d3">{t('hero.sub')}</p>
          <div className="hero-actions au d4">
            <button type="button" className="btn-hero-p" onClick={() => navigate('/inventaire')}>
              {t('hero.btnSee')}
            </button>
            <button type="button" className="btn-hero-s" onClick={() => openContact(null)}>
              {t('nav.contact')}
            </button>
          </div>
        </div>
        <div className="hero-scroll au d5">
          <span>{t('hero.scroll')}</span>
          <div className="hero-scroll-line" />
        </div>
      </div>

      <div className="stats-bar">
        <div className="stats-inner">
          <div className="stat-item">
            <span className="stat-num">{total}</span>
            <span className="stat-lbl">{t('stats.logements')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{dispo}</span>
            <span className="stat-lbl">{t('stats.dispo')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-num">{areas}</span>
            <span className="stat-lbl">{t('stats.quartiers')}</span>
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="section-label reveal">{t('features.label')}</div>
        <div className="section-title reveal" dangerouslySetInnerHTML={{ __html: t('features.title') }} />
        <div className="section-sub reveal">{t('features.sub')}</div>
        <div className="features-grid">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="feature-card reveal">
              <div className="feature-icon-wrap">{['🔍', '⚡', '🔒', '📍'][n - 1]}</div>
              <div className="feature-title">{t(`feat${n}.title`)}</div>
              <div className="feature-text">{t(`feat${n}.text`)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="preview-section">
        <div className="preview-inner">
          <div className="preview-header reveal">
            <div>
              <div className="section-label">{t('preview.label')}</div>
              <div className="section-title" style={{ fontSize: 'clamp(20px,2.5vw,28px)' }}>
                {t('preview.title')}
              </div>
            </div>
            <button type="button" className="btn-voir-tout" onClick={() => navigate('/inventaire')}>
              {t('preview.seeAll')}
            </button>
          </div>
          <div className="preview-grid">
            {previewQuery.isLoading && (
              <div className="loading-wrap" style={{ gridColumn: '1/-1' }}>
                <div className="spinner" />
              </div>
            )}
            {previewQuery.isError && (
              <div style={{ gridColumn: '1/-1' }}>
                <ErrorState onRetry={() => previewQuery.refetch()} />
              </div>
            )}
            {previewQuery.data?.items.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                compact
                onNavigate={() => navigate(`/logement/${listing.id}`)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="photo-grid-section">
        <div className="section-label reveal">{t('photogrid.label')}</div>
        <div className="section-title reveal">{t('photogrid.title')}</div>
        <div className="section-sub reveal">{t('photogrid.sub')}</div>
        <div className="photo-grid reveal">
          <div className="photo-grid-item">
            <img src={photoPlateau} alt={t('photo1.alt')} />
            <div className="photo-label">{t('photo1.label')}</div>
          </div>
          <div className="photo-grid-item">
            <img src={photoVieux} alt={t('photo2.alt')} />
            <div className="photo-label">{t('photo2.label')}</div>
          </div>
          <div className="photo-grid-item">
            <img src={photoCentre} alt={t('photo3.alt')} />
            <div className="photo-label">{t('photo3.label')}</div>
          </div>
        </div>
      </div>

      <div className="cta-section reveal">
        <div className="cta-bg">
          <img src={ctaBg} alt="" />
        </div>
        <div className="cta-content">
          <div className="cta-text">
            <h2>{t('cta.title')}</h2>
            <p>{t('cta.sub')}</p>
          </div>
          <div className="cta-actions">
            <button type="button" className="btn-cta-p" onClick={() => navigate('/inventaire')}>
              {t('cta.btnSee')}
            </button>
            <button type="button" className="btn-cta-s" onClick={() => openContact(null)}>
              {t('nav.contact')}
            </button>
          </div>
        </div>
      </div>

      <Footer variant="full" />
    </div>
  );
}
