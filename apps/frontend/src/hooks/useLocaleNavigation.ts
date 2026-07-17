import { useLocation, useNavigate } from 'react-router-dom';
import {
  alternateLocale,
  localizedInternalPath,
  splitLocalePath,
} from '@union-rental/shared';
import { sanitizeRouteHash } from '@/lib/safeNavigation';

/** Navigate to the alternate locale URL while preserving path, query, and hash. */
export function useLocaleNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (targetLocale?: 'fr' | 'en') => {
    const { locale, pathname } = splitLocalePath(location.pathname);
    const nextLocale = targetLocale ?? alternateLocale(locale);
    const targetPath = localizedInternalPath(nextLocale, pathname, location.search);
    const hash = sanitizeRouteHash(location.hash);
    navigate(`${targetPath}${hash}`);
  };
}
