import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BundleVersionGate } from './BundleVersionGate';
import { CanonicalUrlGate } from './CanonicalUrlGate';
import { LocaleRouteSync } from './LocaleRouteSync';
import { I18nProvider } from './providers/I18nProvider';
import { QueryProvider } from './providers/QueryProvider';
import { ContactModalProvider } from './providers/ContactModalProvider';
import { ToastProvider } from './providers/ToastProvider';
import { NavBar } from '@/components/layout/NavBar';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContactModal } from '@/components/leads/ContactModal';
import { RouteFallback } from '@/components/common/RouteFallback';
import { ReferralCaptureGate } from './ReferralCaptureGate';
import { HomePage } from '@/features/home/HomePage';

const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const AboutPage = lazy(() =>
  import('@/features/about/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const ListingDetailPage = lazy(() =>
  import('@/features/listing/ListingDetailPage').then((m) => ({ default: m.ListingDetailPage })),
);

const NotFoundPage = lazy(() =>
  import('@/features/notfound/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const ReferralSlugPage = lazy(() =>
  import('./ReferralSlugPage').then((m) => ({ default: m.ReferralSlugPage })),
);

export function App() {
  return (
    <QueryProvider>
      <I18nProvider>
        <ToastProvider>
          <ContactModalProvider>
            <BrowserRouter>
              <BundleVersionGate>
              <CanonicalUrlGate>
              <LocaleRouteSync>
              <ReferralCaptureGate>
                <NavBar />
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route element={<MainLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/en" element={<HomePage />} />
                    <Route path="/inventaire/:referralUsername" element={<InventoryPage />} />
                    <Route path="/inventaire" element={<InventoryPage />} />
                    <Route path="/en/inventaire/:referralUsername" element={<InventoryPage />} />
                    <Route path="/en/inventaire" element={<InventoryPage />} />
                    <Route path="/a-propos" element={<AboutPage />} />
                    <Route path="/en/a-propos" element={<AboutPage />} />
                    <Route path="/logement/:id" element={<ListingDetailPage />} />
                    <Route path="/en/logement/:id" element={<ListingDetailPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                    <Route path="/r/:slug" element={<ReferralSlugPage />} />
                    <Route path="/r/:slug/logement/:listingId" element={<ReferralSlugPage />} />
                  </Routes>
                </Suspense>
                <ContactModal />
              </ReferralCaptureGate>
              </LocaleRouteSync>
              </CanonicalUrlGate>
              </BundleVersionGate>
            </BrowserRouter>
          </ContactModalProvider>
        </ToastProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
