import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { buildNotFoundSeo } from '@/lib/seoMeta';
import { PageSeo } from '@/components/seo/PageSeo';
import { routes } from '@/lib/routes';
import { Footer } from '@/components/layout/Footer';

export function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { openContact } = useContactModal();
  const seo = buildNotFoundSeo(t);

  return (
    <div className="app-page">
      <PageSeo
        title={seo.title}
        description={seo.description}
        pathname="/404"
        index={false}
      />
      <div className="notfound-page">
        <h1>{t('notfound.title')}</h1>
        <p>{t('notfound.message')}</p>
        <div className="notfound-actions">
          <button type="button" className="btn-hero-p" onClick={() => navigate(routes.home)}>
            {t('notfound.back')}
          </button>
          <button type="button" className="btn-hero-s" onClick={() => navigate(routes.inventory)}>
            {t('notfound.browse')}
          </button>
          <button type="button" className="btn-hero-s" onClick={() => navigate(routes.about)}>
            {t('notfound.about')}
          </button>
          <button type="button" className="btn-hero-s" onClick={() => openContact(null)}>
            {t('nav.contact')}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
}
