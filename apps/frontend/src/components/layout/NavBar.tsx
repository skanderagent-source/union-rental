import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import logoNav from '@/assets/logo-nav.png';

export function NavBar() {
  const { t, toggleLang } = useI18n();
  const { openContact } = useContactModal();
  const navigate = useNavigate();

  return (
    <nav id="main-nav">
      <div className="nav-logo" onClick={() => navigate('/')} role="button" tabIndex={0}>
        <img src={logoNav} alt="LogiGo" className="nav-logo-img" />
      </div>
      <div className="nav-links">
        <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>
          {t('nav.accueil')}
        </NavLink>
        <NavLink
          to="/inventaire"
          className={({ isActive }) => `nav-link nav-link-inv${isActive ? ' active' : ''}`}
        >
          {t('nav.inventaire')}
        </NavLink>
        <NavLink
          to="/a-propos"
          className={({ isActive }) => `nav-link nav-link-about${isActive ? ' active' : ''}`}
        >
          {t('nav.about')}
        </NavLink>
        <button type="button" className="nav-cta" onClick={() => openContact(null)}>
          {t('nav.contact')}
        </button>
        <button type="button" className="lang-toggle" onClick={toggleLang}>
          <span className="lang-toggle-globe">🌐</span>
          <span>{t('langBtn')}</span>
        </button>
      </div>
    </nav>
  );
}
