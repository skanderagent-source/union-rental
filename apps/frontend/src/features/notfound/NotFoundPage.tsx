import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { Footer } from '@/components/layout/Footer';

export function NotFoundPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="app-page">
      <div className="notfound-page">
        <h1>{t('notfound.title')}</h1>
        <button type="button" onClick={() => navigate('/')}>
          {t('notfound.back')}
        </button>
      </div>
      <Footer />
    </div>
  );
}
