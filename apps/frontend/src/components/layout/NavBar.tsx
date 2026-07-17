import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { useContactModal } from '@/app/providers/ContactModalProvider';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLocaleNavigation } from '@/hooks/useLocaleNavigation';
import { routes } from '@/lib/routes';
import { withLocalePath } from '@union-rental/shared';
import logoMenu from '@/assets/logo-menu.png';
import { LangFlag } from './LangFlag';

type LangToggleProps = {
  flagLang: 'fr' | 'en';
  label: string;
  ariaLabel: string;
  onToggle: () => void;
};

function LangToggle({ flagLang, label, ariaLabel, onToggle }: LangToggleProps) {
  return (
    <button type="button" className="lang-toggle" onClick={onToggle} aria-label={ariaLabel}>
      <LangFlag lang={flagLang} className="lang-toggle-flag" />
      <span>{label}</span>
    </button>
  );
}

export function NavBar() {
  const { t, lang } = useI18n();
  const { openContact } = useContactModal();
  const navigateLocale = useLocaleNavigation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(mobileOpen);
  useFocusTrap(mobileMenuRef, mobileOpen);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const onToggleLang = () => {
    navigateLocale();
  };

  const closeMobileMenu = () => setMobileOpen(false);

  const onOpenContact = () => {
    openContact(null);
    closeMobileMenu();
  };

  const linkClass = (isActive: boolean, extra = '') =>
    `nav-link${extra ? ` ${extra}` : ''}${isActive ? ' active' : ''}`;

  const navLinks = (onNavigate?: () => void) => (
    <>
      <NavLink
        to={withLocalePath(lang, routes.home)}
        className={({ isActive }) => linkClass(isActive)}
        end
        onClick={onNavigate}
      >
        {t('nav.accueil')}
      </NavLink>
      <NavLink
        to={withLocalePath(lang, routes.inventory)}
        className={({ isActive }) => linkClass(isActive, 'nav-link-inv')}
        onClick={onNavigate}
      >
        {t('nav.inventaire')}
      </NavLink>
      <NavLink
        to={withLocalePath(lang, routes.about)}
        className={({ isActive }) => linkClass(isActive, 'nav-link-about')}
        onClick={onNavigate}
      >
        {t('nav.about')}
      </NavLink>
    </>
  );

  const targetLang = lang === 'fr' ? 'en' : 'fr';

  const langToggleProps = {
    flagLang: targetLang,
    label: t('langBtn'),
    ariaLabel: t('nav.langToggle'),
    onToggle: onToggleLang,
  };

  const mobileOverlay =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className={`nav-mobile-backdrop${mobileOpen ? ' is-open' : ''}`}
              aria-hidden={!mobileOpen}
              tabIndex={mobileOpen ? 0 : -1}
              onClick={closeMobileMenu}
            />
            <div
              id="nav-mobile-menu"
              ref={mobileMenuRef}
              className={`nav-mobile-menu${mobileOpen ? ' is-open' : ''}`}
              role="dialog"
              aria-modal="true"
              aria-label={t('nav.mobileMenuLabel')}
              aria-hidden={!mobileOpen}
            >
              <div className="nav-mobile-links">
                {navLinks(closeMobileMenu)}
                <button type="button" className="nav-cta nav-mobile-cta" onClick={onOpenContact}>
                  {t('nav.contact')}
                </button>
              </div>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <nav id="main-nav" aria-label={t('nav.ariaLabel')}>
      <Link to={withLocalePath(lang, routes.home)} className="nav-logo" onClick={closeMobileMenu}>
        <img src={logoMenu} alt="LogiGo" className="nav-logo-img" width={139} height={48} />
      </Link>

      <div className="nav-links nav-desktop-links">
        {navLinks()}
        <button type="button" className="nav-cta" onClick={() => openContact(null)}>
          {t('nav.contact')}
        </button>
        <LangToggle {...langToggleProps} />
      </div>

      <div className="nav-bar-actions">
        <LangToggle {...langToggleProps} />
        <button
          type="button"
          className="nav-mobile-btn"
          aria-expanded={mobileOpen}
          aria-controls="nav-mobile-menu"
          aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="nav-mobile-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      {mobileOverlay}
    </nav>
  );
}
