import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANG_STORAGE_KEY } from '@union-rental/shared';
import { dictionaries, type Lang } from '@/i18n';
import { readStoredLang } from '@/lib/safeStorage';

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  toggleLang: () => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => readStoredLang());

  const t = useCallback(
    (key: string) => dictionaries[lang][key] ?? key,
    [lang],
  );

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'fr' ? 'en' : 'fr'));
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, toggleLang }),
    [lang, t, toggleLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
