import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ReferralCaptureGate } from './ReferralCaptureGate';
import { I18nProvider } from './providers/I18nProvider';
import { QueryProvider } from './providers/QueryProvider';
import { ContactModalProvider } from './providers/ContactModalProvider';
import { ToastProvider } from './providers/ToastProvider';
import { NavBar } from '@/components/layout/NavBar';
import { ContactModal } from '@/components/leads/ContactModal';
import { HomePage } from '@/features/home/HomePage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { AboutPage } from '@/features/about/AboutPage';
import { ListingDetailPage } from '@/features/listing/ListingDetailPage';
import { NotFoundPage } from '@/features/notfound/NotFoundPage';

export function App() {
  return (
    <QueryProvider>
      <I18nProvider>
        <ToastProvider>
          <ContactModalProvider>
            <BrowserRouter>
              <ReferralCaptureGate>
                <NavBar />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/inventaire" element={<InventoryPage />} />
                  <Route path="/a-propos" element={<AboutPage />} />
                  <Route path="/logement/:id" element={<ListingDetailPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                <ContactModal />
              </ReferralCaptureGate>
            </BrowserRouter>
          </ContactModalProvider>
        </ToastProvider>
      </I18nProvider>
    </QueryProvider>
  );
}
