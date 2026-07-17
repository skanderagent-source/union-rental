import { Link, NavLink } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useLocaleNavigation } from '@/hooks/useLocaleNavigation';
import { routes } from '@/lib/routes';
import { withLocalePath } from '@union-rental/shared';
import logoNav from '@/assets/logo-nav.png';

export function NavBar() {
  const { t, lang } = useI18n();
  const { openContact } = useContactModal();
  const navigateLocale = useLocaleNavigation();

  const onToggleLang = () => {
    navigateLocale();
  };

  return (
    <nav id="main-nav" aria-label={t('nav.ariaLabel')}>
      <Link to={withLocalePath(lang, routes.home)} className="nav-logo">
        <img src={logoNav} alt="LogiGo" className="nav-logo-img" width={140} height={40} />
      </Link>
      <div className="nav-links">
        <NavLink to={withLocalePath(lang, routes.home)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
          {t('nav.accueil')}
        </NavLink>
        <NavLink
          to={withLocalePath(lang, routes.inventory)}
          className={({ isActive }) => `nav-link nav-link-inv${isActive ? ' active' : ''}`}
        >
          {t('nav.inventaire')}
        </NavLink>
        <NavLink
          to={withLocalePath(lang, routes.about)}
          className={({ isActive }) => `nav-link nav-link-about${isActive ? ' active' : ''}`}
        >
          {t('nav.about')}
        </NavLink>
        <button type="button" className="nav-cta" onClick={() => openContact(null)}>
          {t('nav.contact')}
        </button>
        <button type="button" className="lang-toggle" onClick={onToggleLang}>
          <span className="lang-toggle-globe">🌐</span>
          <span>{t('langBtn')}</span>
        </button>
      </div>
    </nav>
  );
}
