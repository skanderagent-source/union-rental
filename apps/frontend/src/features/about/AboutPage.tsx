import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useReveal } from '@/hooks/useReveal';
import { buildAboutSeo } from '@/lib/seoMeta';
import { PageSeo } from '@/components/seo/PageSeo';
import { routes, localizedRoute } from '@/lib/routes';
import { buildAboutJsonLd, ogImageUrlForTemplate } from '@/lib/structuredData';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { TableOfContents } from '@/components/seo/TableOfContents';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { STATIC_IMAGE_DIMENSIONS } from '@/lib/staticImageDimensions';
import { localizedCanonicalUrl } from '@/lib/siteUrl';
import { Footer } from '@/components/layout/Footer';
import heroAbout from '@/assets/hero-about.jpg';
import missionImg from '@/assets/mission.jpg';

export function AboutPage() {
  const { t, lang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { openContact } = useContactModal();
  const revealRef = useReveal([]);
  const seo = buildAboutSeo(t);
  const jsonLd = useMemo(
    () => buildAboutJsonLd(lang, { home: t('nav.accueil'), about: t('nav.about') }),
    [lang, t],
  );
  const breadcrumbItems = useMemo(
    () => [
      { name: t('nav.accueil'), url: localizedCanonicalUrl(lang, routes.home) },
      { name: t('nav.about'), url: localizedCanonicalUrl(lang, routes.about) },
    ],
    [lang, t],
  );
  const tocItems = useMemo(
    () => [
      { id: 'mission', label: t('about.missionTitle') },
      { id: 'how', label: t('how.title') },
      { id: 'contact', label: t('about.contactTitle') },
    ],
    [t],
  );

  return (
    <div className="app-page" ref={revealRef}>
      <PageSeo
        title={seo.title}
        description={seo.description}
        pathname={location.pathname}
        ogImage={ogImageUrlForTemplate('about')}
        jsonLd={jsonLd}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <TableOfContents items={tocItems} title={t('toc.title')} />
      <div className="about-hero">
        <OptimizedImage
          src={heroAbout}
          alt=""
          decorative
          width={STATIC_IMAGE_DIMENSIONS.heroAbout.width}
          height={STATIC_IMAGE_DIMENSIONS.heroAbout.height}
          priority
        />
        <div className="about-hero-overlay" />
        <div className="about-hero-content">
          <h1>{t('about.heroTitle')}</h1>
          <p>{t('about.heroSub')}</p>
        </div>
      </div>

      <div className="about-body">
        <div className="about-mission" id="mission">
          <div className="about-mission-img reveal">
            <OptimizedImage
              src={missionImg}
              alt={t('about.missionImgAlt')}
              width={STATIC_IMAGE_DIMENSIONS.mission.width}
              height={STATIC_IMAGE_DIMENSIONS.mission.height}
            />
          </div>
          <div className="about-mission-text">
            <div className="section-label reveal">{t('about.missionLabel')}</div>
            <h2 className="reveal">{t('about.missionTitle')}</h2>
            <p className="reveal">{t('about.missionP1')}</p>
            <p className="reveal">{t('about.missionP2')}</p>
            <p className="reveal">{t('about.missionP3')}</p>
          </div>
        </div>

        <div className="about-values">
          {[1, 2, 3].map((n) => (
            <div key={n} className="value-card reveal">
              <div className="value-icon">{['🤝', '⚡', '🏙️'][n - 1]}</div>
              <div className="value-title">{t(`value${n}.title`)}</div>
              <div className="value-text">{t(`value${n}.text`)}</div>
            </div>
          ))}
        </div>

        <div className="how-section" id="how">
          <div className="section-label reveal">{t('how.label')}</div>
          <h2 className="section-title reveal">{t('how.title')}</h2>
          <div className="how-steps">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="how-step reveal">
                <div className="how-step-num">{n}</div>
                <div className="how-step-title">{t(`step${n}.title`)}</div>
                <div className="how-step-text">{t(`step${n}.text`)}</div>
              </div>
            ))}
          </div>
        </div>

        <section className="about-contact reveal" id="contact">
          <h2>{t('about.contactTitle')}</h2>
          <p>{t('about.contactText')}</p>
          <p>{t('about.contactHours')}</p>
          <button type="button" className="btn-about-s" onClick={() => openContact(null)}>
            {t('nav.contact')}
          </button>
        </section>

        <div className="about-cta reveal">
          <h2>{t('aboutcta.title')}</h2>
          <p>{t('aboutcta.sub')}</p>
          <div className="about-cta-btns">
            <button type="button" className="btn-about-p" onClick={() => navigate(localizedRoute(lang, 'inventory'))}>
              {t('aboutcta.btnSee')}
            </button>
            <button type="button" className="btn-about-s" onClick={() => openContact(null)}>
              {t('nav.contact')}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
