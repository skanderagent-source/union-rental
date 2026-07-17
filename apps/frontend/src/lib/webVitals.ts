import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { reportClientTelemetry } from '@/lib/clientMonitoring';

function sendWebVital(metric: Metric): void {
  reportClientTelemetry({
    kind: 'web-vital',
    name: metric.name,
    pathname: window.location.pathname,
    value: metric.value,
    rating: metric.rating,
  });
}

/** Core Web Vitals — LCP, INP, CLS (production reporting via telemetry endpoint). */
export function initWebVitalsMonitoring(): void {
  if (!import.meta.env.PROD) return;

  onLCP(sendWebVital);
  onINP(sendWebVital);
  onCLS(sendWebVital);
}
