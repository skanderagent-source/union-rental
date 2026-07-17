import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './app/App';
import { AppErrorBoundary } from '@/components/common/AppErrorBoundary';
import { initClientErrorMonitoring } from '@/lib/clientMonitoring';
import { initWebVitalsMonitoring } from '@/lib/webVitals';

initClientErrorMonitoring();
initWebVitalsMonitoring();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
