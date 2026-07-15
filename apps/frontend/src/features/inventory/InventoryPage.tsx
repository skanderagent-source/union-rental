import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/providers/I18nProvider';
import { api } from '@/lib/apiClient';
import { fmtResultsCount } from '@/lib/format';
import { persistReferralAgentId } from '@/lib/referral';
import { ListingCard } from '@/components/listings/ListingCard';
import { ErrorState } from '@/components/common/ErrorState';
import { InventoryMap } from '@/components/map/InventoryMap';
import { Footer } from '@/components/layout/Footer';
import heroInventaire from '@/assets/hero-inventaire.jpg';
import type { PublicListing, MapListing, QuartierCount } from '@union-rental/shared';

export function InventoryPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { referralUsername } = useParams<{ referralUsername?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!referralUsername) return;
    let cancelled = false;
    void (async () => {
      try {
        const { agentId } = await api.get<{ agentId: string }>(
          `/api/public/referral/${encodeURIComponent(referralUsername)}`,
        );
        if (cancelled) return;
        persistReferralAgentId(agentId);
        const listingId = searchParams.get('listing');
        if (listingId) {
          navigate(`/logement/${listingId}`, { replace: true });
        }
      } catch {
        /* unknown username — show inventory without referral */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [referralUsername, searchParams, navigate]);

  const q = searchParams.get('q') ?? '';
  const quartier = searchParams.get('quartier') ?? '';
  const taille = searchParams.get('taille') ?? '';
  const prixMax = searchParams.get('prixMax') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const vue = searchParams.get('vue') ?? 'grille';

  const [localQ, setLocalQ] = useState(q);

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
    queryFn: () =>
      api.get<{ items: PublicListing[]; total: number; page: number; pageSize: number }>(
        `/api/public/listings?${queryString}`,
      ),
  });

  const mapQuery = useQuery({
    queryKey: ['map', mapQueryString],
    queryFn: () => api.get<MapListing[]>(`/api/public/listings/map?${mapQueryString}`),
    enabled: vue === 'carte',
  });

  const quartiersQuery = useQuery({
    queryKey: ['quartiers'],
    queryFn: () => api.get<QuartierCount[]>('/api/public/quartiers'),
  });

  const totalPages = listingsQuery.data
    ? Math.max(1, Math.ceil(listingsQuery.data.total / listingsQuery.data.pageSize))
    : 1;

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    setSearchParams(next);
  };

  const topQuartiers = quartiersQuery.data?.slice(0, 10) ?? [];

  return (
    <div className="app-page">
      <div className="inv-hero">
        <img src={heroInventaire} alt="" />
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
                placeholder={t('search.placeholder')}
                onChange={(e) => setLocalQ(e.target.value)}
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
          <span dangerouslySetInnerHTML={{ __html: t('disclaimer.html') }} />
        </div>

        <div className="results-header">
          <div
            className="results-count"
            dangerouslySetInnerHTML={{
              __html: listingsQuery.data
                ? fmtResultsCount(listingsQuery.data.total, lang)
                : t('results.loading'),
            }}
          />
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
            <InventoryMap listings={mapQuery.data ?? []} />
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
                <div
                  className="empty-state"
                  dangerouslySetInnerHTML={{ __html: t('empty.noResultsHtml') }}
                />
              )}
              {listingsQuery.data && listingsQuery.data.items.length > 0 && (
                <div className="listings-grid">
                  {listingsQuery.data.items.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onNavigate={() => navigate(`/logement/${listing.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="pagination">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}
              >
                {t('pag.prev')}
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParam('page', String(page + 1))}
              >
                {t('pag.next')}
              </button>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
