import { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { withLocalePath } from '@union-rental/shared';
import { useI18n } from '@/app/providers/I18nProvider';
import { fmtResultsCount } from '@/lib/format';
import { parseInventoryFilters } from '@/lib/inventoryFilters';
import { publicApi } from '@/lib/publicApi';
import { isValidReferralUsername } from '@union-rental/shared';
import { persistReferralAgentId } from '@/lib/referral';
import { buildListingPath } from '@/lib/safeNavigation';
import { inventoryPath, routes } from '@/lib/routes';
import { buildInventorySeo, buildReferralInventorySeo } from '@/lib/seoMeta';
import { PageSeo } from '@/components/seo/PageSeo';
import { buildInventoryJsonLd, ogImageUrlForTemplate } from '@/lib/structuredData';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { STATIC_IMAGE_DIMENSIONS } from '@/lib/staticImageDimensions';
import { SafeHtml } from '@/components/common/SafeHtml';
import { ListingCard } from '@/components/listings/ListingCard';
import { ErrorState } from '@/components/common/ErrorState';
import { Footer } from '@/components/layout/Footer';
import heroInventaire from '@/assets/hero-inventaire.jpg';

const InventoryMap = lazy(() =>
  import('@/components/map/InventoryMap').then((m) => ({ default: m.InventoryMap })),
);

const MAP_TILE_ORIGIN = 'https://tile.openstreetmap.org';

export function InventoryPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { referralUsername } = useParams<{ referralUsername?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!referralUsername || !isValidReferralUsername(referralUsername)) return;
    let cancelled = false;
    void (async () => {
      try {
        const { agentId } = await publicApi.getReferral(referralUsername);
        if (cancelled) return;
        persistReferralAgentId(agentId);
        const listingId = searchParams.get('listing');
        const listingPath = listingId ? buildListingPath(listingId, lang) : null;
        if (listingPath) {
          navigate(listingPath, { replace: true });
        } else {
          navigate(inventoryPath(searchParams.toString(), lang), { replace: true });
        }
      } catch {
        navigate(inventoryPath(searchParams.toString()), { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [referralUsername, searchParams, navigate, lang]);

  const filters = useMemo(() => parseInventoryFilters(searchParams), [searchParams]);
  const { q, quartier, taille, prixMax, page, vue } = filters;

  const [localQ, setLocalQ] = useState(q);

  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQ !== q) {
        const next = new URLSearchParams(searchParams);
        if (localQ) next.set('q', localQ);
        else next.delete('q');
        next.set('page', '1');
        setSearchParams(next);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [localQ, q, searchParams, setSearchParams]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (quartier) p.set('quartier', quartier);
    if (taille) p.set('taille', taille);
    if (prixMax) p.set('prixMax', prixMax);
    p.set('page', String(page));
    p.set('pageSize', '24');
    return p.toString();
  }, [q, quartier, taille, prixMax, page]);

  const mapQueryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (quartier) p.set('quartier', quartier);
    if (taille) p.set('taille', taille);
    if (prixMax) p.set('prixMax', prixMax);
    return p.toString();
  }, [q, quartier, taille, prixMax]);

  const listingsQuery = useQuery({
    queryKey: ['listings', queryString],
    queryFn: ({ signal }) => publicApi.getListings(queryString, { signal }),
  });

  const mapQuery = useQuery({
    queryKey: ['map', mapQueryString],
    queryFn: ({ signal }) => publicApi.getMapListings(mapQueryString, { signal }),
    enabled: vue === 'carte',
  });

  const quartiersQuery = useQuery({
    queryKey: ['quartiers'],
    queryFn: ({ signal }) => publicApi.getQuartiers({ signal }),
  });

  const totalPages = listingsQuery.data
    ? Math.max(1, Math.ceil(listingsQuery.data.total / listingsQuery.data.pageSize))
    : 1;

  useEffect(() => {
    if (listingsQuery.isLoading || listingsQuery.isError || !listingsQuery.data) return;
    if (page <= totalPages) return;

    const next = new URLSearchParams(searchParams);
    if (totalPages <= 1) next.delete('page');
    else next.set('page', String(totalPages));
    setSearchParams(next, { replace: true });
  }, [
    page,
    totalPages,
    listingsQuery.isLoading,
    listingsQuery.isError,
    listingsQuery.data,
    searchParams,
    setSearchParams,
  ]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const topQuartiers = quartiersQuery.data?.slice(0, 10) ?? [];

  const location = useLocation();

  const seo = useMemo(() => {
    const hasReferralSlug = Boolean(
      referralUsername && isValidReferralUsername(referralUsername),
    );
    if (hasReferralSlug) {
      return buildReferralInventorySeo(t);
    }
    return buildInventorySeo(lang, t, {
      q,
      quartier,
      taille,
      prixMax,
      page,
      vue,
      hasReferralSlug: false,
    });
  }, [referralUsername, lang, t, q, quartier, taille, prixMax, page, vue]);

  const jsonLd = useMemo(
    () =>
      buildInventoryJsonLd(lang, {
        home: t('nav.accueil'),
        inventory: t('nav.inventaire'),
      }),
    [lang, t],
  );
  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(targetPage));
    return `${withLocalePath(lang, routes.inventory)}?${next.toString()}`;
  };
  const resourceHints = useMemo(
    () => [
      { rel: 'dns-prefetch' as const, href: MAP_TILE_ORIGIN },
      { rel: 'preconnect' as const, href: MAP_TILE_ORIGIN, crossOrigin: 'anonymous' as const },
    ],
    [],
  );

  return (
    <div className="app-page">
      <PageSeo
        title={seo.title}
        description={seo.description}
        pathname={location.pathname}
        index={seo.index ?? true}
        canonicalPath={seo.canonicalPath}
        ogImage={ogImageUrlForTemplate('inventory')}
        jsonLd={jsonLd}
        resourceHints={resourceHints}
      />
      <div className="inv-hero">
        <OptimizedImage
          src={heroInventaire}
          alt=""
          decorative
          width={STATIC_IMAGE_DIMENSIONS.heroInventaire.width}
          height={STATIC_IMAGE_DIMENSIONS.heroInventaire.height}
          priority
        />
        <div className="inv-hero-overlay" />
        <div className="inv-hero-content">
          <h1>{t('inv.title')}</h1>
          <p>
            {listingsQuery.data
              ? lang === 'fr'
                ? `${listingsQuery.data.total} logements disponibles dans ${quartiersQuery.data?.length ?? 0} quartiers`
                : `${listingsQuery.data.total} listings available in ${quartiersQuery.data?.length ?? 0} neighborhoods`
              : t('inv.subtitleLoading')}
          </p>
        </div>
      </div>

      <div className="inv-body">
        <div className="search-card">
          <div className="search-grid">
            <div className="s-field search-full">
              <label>{t('search.label')}</label>
              <input
                value={localQ}
                maxLength={120}
                placeholder={t('search.placeholder')}
                onChange={(e) => setLocalQ(e.target.value.slice(0, 120))}
              />
            </div>
            <div className="s-field">
              <label>{t('search.quartierLabel')}</label>
              <select value={quartier} onChange={(e) => updateParam('quartier', e.target.value)}>
                <option value="">{t('search.quartierAll')}</option>
                {(quartiersQuery.data ?? []).map((item) => (
                  <option key={item.quartier} value={item.quartier}>
                    {item.quartier}
                  </option>
                ))}
              </select>
            </div>
            <div className="s-field">
              <label>{t('search.tailleLabel')}</label>
              <select value={taille} onChange={(e) => updateParam('taille', e.target.value)}>
                <option value="">{t('search.tailleAll')}</option>
                {['2.5', '3.5', '4.5', '5.5', '6.5'].map((v) => (
                  <option key={v} value={v}>
                    {t(`size.${v.replace('.', '')}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="s-field">
              <label>{t('search.prixLabel')}</label>
              <select value={prixMax} onChange={(e) => updateParam('prixMax', e.target.value)}>
                <option value="">{t('search.prixAll')}</option>
                {['1000', '1200', '1500', '2000', '2500'].map((v) => (
                  <option key={v} value={v}>
                    {t(`price.${v}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="s-field">
              <label>&nbsp;</label>
              <button type="button" className="btn-search">
                {t('search.btn')}
              </button>
            </div>
          </div>
        </div>

        <div className="quartiers-bar">
          <button
            type="button"
            className={`q-chip${!quartier ? ' active' : ''}`}
            onClick={() => updateParam('quartier', '')}
          >
            {t('search.quartierAll')} ({listingsQuery.data?.total ?? '…'})
          </button>
          {topQuartiers.map((item) => (
            <button
              key={item.quartier}
              type="button"
              className={`q-chip${quartier === item.quartier ? ' active' : ''}`}
              onClick={() => updateParam('quartier', item.quartier)}
            >
              {item.quartier} ({item.count})
            </button>
          ))}
        </div>

        <div className="disclaimer-bar">
          <span>📋</span>
          <SafeHtml as="span" html={t('disclaimer.html')} />
        </div>

        <div className="results-header">
          {vue !== 'carte' && (
            <SafeHtml
              className="results-count"
              html={
                listingsQuery.data
                  ? fmtResultsCount(listingsQuery.data.total, lang)
                  : t('results.loading')
              }
            />
          )}
          <div className="view-toggle">
            <button
              type="button"
              className={`view-btn${vue !== 'carte' ? ' active' : ''}`}
              onClick={() => updateParam('vue', 'grille')}
            >
              ⊞ {t('view.grid')}
            </button>
            <button
              type="button"
              className={`view-btn${vue === 'carte' ? ' active' : ''}`}
              onClick={() => updateParam('vue', 'carte')}
            >
              🗺 {t('view.map')}
            </button>
          </div>
        </div>

        {vue === 'carte' ? (
          mapQuery.isLoading ? (
            <div className="loading-wrap">
              <div className="spinner" />
            </div>
          ) : mapQuery.isError ? (
            <ErrorState message={t('error.loadFailed')} onRetry={() => mapQuery.refetch()} />
          ) : (
            <Suspense
              fallback={
                <div className="loading-wrap">
                  <div className="spinner" />
                </div>
              }
            >
              <InventoryMap listings={mapQuery.data ?? []} />
            </Suspense>
          )
        ) : (
          <>
            <div id="grid-view">
              {listingsQuery.isLoading && (
                <div className="loading-wrap">
                  <div className="spinner" />
                </div>
              )}
              {listingsQuery.isError && (
                <ErrorState
                  message={t('error.loadFailedGrid')}
                  onRetry={() => listingsQuery.refetch()}
                />
              )}
              {!listingsQuery.isLoading && listingsQuery.data?.items.length === 0 && (
                <SafeHtml className="empty-state" html={t('empty.noResultsHtml')} />
              )}
              {listingsQuery.data && listingsQuery.data.items.length > 0 && (
                <div className="listings-grid">
                  {listingsQuery.data.items.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onNavigate={() => {
                        const path = buildListingPath(listing.id, lang);
                        if (path) navigate(path);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <nav className="pagination" aria-label={t('pag.ariaLabel')}>
              {page > 1 ? (
                <Link to={pageHref(page - 1)}>{t('pag.prev')}</Link>
              ) : (
                <span className="pagination-disabled">{t('pag.prev')}</span>
              )}
              <span>
                {page > 1 ? (
                  <Link to={pageHref(1)} aria-label={t('pag.first')}>
                    {page}
                  </Link>
                ) : (
                  page
                )}{' '}
                / {totalPages}
              </span>
              {page < totalPages ? (
                <Link to={pageHref(page + 1)}>{t('pag.next')}</Link>
              ) : (
                <span className="pagination-disabled">{t('pag.next')}</span>
              )}
            </nav>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
