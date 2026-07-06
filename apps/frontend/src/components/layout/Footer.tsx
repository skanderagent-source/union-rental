import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import logoFooter from '@/assets/logo-footer.png';

type FooterProps = { variant?: 'full' | 'short' };

export function Footer({ variant = 'short' }: FooterProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer style={{ marginTop: variant === 'full' ? undefined : '48px' }}>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={logoFooter} alt="LogiGo" className="footer-logo-img" />
            </div>
            <p>{t(variant === 'full' ? 'footer.taglineLong' : 'footer.taglineShort')}</p>
          </div>
          <div className="footer-col">
            <h4>{t('footer.navTitle')}</h4>
            <a onClick={() => navigate('/')}>{t('nav.accueil')}</a>
            <a onClick={() => navigate('/inventaire')}>{t('nav.inventaire')}</a>
            <a onClick={() => navigate('/a-propos')}>{t('nav.about')}</a>
          </div>
          <div className="footer-col">
            <h4>{t('footer.processTitle')}</h4>
            <a>{t('footer.revenu')}</a>
            <a>{t('footer.singlekey')}</a>
            {variant === 'full' && <a>{t('footer.dossiers')}</a>}
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">
            © {year} LogiGo{variant === 'full' ? ` — ${t('footer.rights')}` : ''}
          </div>
          {variant === 'full' && (
            <div className="footer-tags">
              <span className="footer-tag">Montréal</span>
              <span className="footer-tag">Laval</span>
              <span className="footer-tag">Longueuil</span>
              <span className="footer-tag">Gatineau</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
