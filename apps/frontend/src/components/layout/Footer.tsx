import { Link } from 'react-router-dom';
import { withLocalePath } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { routes } from '@/lib/routes';
import logoFooter from '@/assets/logo-footer.png';

type FooterProps = { variant?: 'full' | 'short' };

export function Footer({ variant = 'short' }: FooterProps) {
  const { t, lang } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer aria-label={t('footer.ariaLabel')}>
      <div className="footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src={logoFooter} alt="LogiGo" className="footer-logo-img" width={160} height={48} />
            </div>
            <p>{t(variant === 'full' ? 'footer.taglineLong' : 'footer.taglineShort')}</p>
          </div>
          <div className="footer-col">
            <h4>{t('footer.navTitle')}</h4>
            <Link to={withLocalePath(lang, routes.home)}>{t('nav.accueil')}</Link>
            <Link to={withLocalePath(lang, routes.inventory)}>{t('nav.inventaire')}</Link>
            <Link to={withLocalePath(lang, routes.about)}>{t('nav.about')}</Link>
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
