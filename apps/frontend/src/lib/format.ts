import type { Lang } from '@/i18n';

function finiteCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

export function fmtPriceMonth(value: number | null | undefined, lang: Lang, t: (k: string) => string) {
  if (value == null || !Number.isFinite(value) || value < 0) return t('listing.priceOnRequest');
  const n = value.toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', { maximumFractionDigits: 0 });
  const amount = lang === 'fr' ? `${n} $` : `$${n}`;
  return amount + t('listing.perMonth');
}

export function fmtResultsCount(n: number, lang: Lang) {
  const count = finiteCount(n);
  if (lang === 'fr') {
    return `<strong>${count}</strong> logement${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`;
  }
  return `<strong>${count}</strong> listing${count !== 1 ? 's' : ''} found`;
}
