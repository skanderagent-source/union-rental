import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANG_STORAGE_KEY } from '@union-rental/shared';
import { dictionaries, type Lang } from '@/i18n';

type I18nContextValue = {
  lang: Lang;
  t: (key: string) => string;
  toggleLang: () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return stored === 'en' ? 'en' : 'fr';
  });

  const t = useCallback(
    (key: string) => dictionaries[lang][key] ?? key,
    [lang],
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next = prev === 'fr' ? 'en' : 'fr';
      localStorage.setItem(LANG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t('meta.title');
  }, [lang, t]);

  const value = useMemo(() => ({ lang, t, toggleLang }), [lang, t, toggleLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
