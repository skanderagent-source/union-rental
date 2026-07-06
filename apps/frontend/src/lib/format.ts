import type { Lang } from '@/i18n';

export function fmtPriceMonth(value: number | null | undefined, lang: Lang, t: (k: string) => string) {
  if (value == null) return t('listing.priceOnRequest');
  const n = parseFloat(String(value)).toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA');
  const amount = lang === 'fr' ? `${n} $` : `$${n}`;
  return amount + t('listing.perMonth');
}

export function fmtResultsCount(n: number, lang: Lang) {
  if (lang === 'fr') {
    return `<strong>${n}</strong> logement${n > 1 ? 's' : ''} trouvé${n > 1 ? 's' : ''}`;
  }
  return `<strong>${n}</strong> listing${n !== 1 ? 's' : ''} found`;
}
