import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { splitLocalePath } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { writeAllowedStorageKey } from '@/lib/safeStorage';
import { LANG_STORAGE_KEY } from '@union-rental/shared';

/** Keep UI language in sync with `/en/*` URL prefix (hreflang URL pairs). */
export function LocaleRouteSync({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { setLang } = useI18n();

  useEffect(() => {
    const { locale } = splitLocalePath(location.pathname);
    setLang(locale);
    writeAllowedStorageKey(LANG_STORAGE_KEY, locale);
  }, [location.pathname, setLang]);

  return children;
}
