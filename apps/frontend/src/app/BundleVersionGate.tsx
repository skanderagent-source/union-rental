import { useEffect } from 'react';
import { enforceCurrentBundleVersion } from '@/lib/bundleVersion';

export function BundleVersionGate({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    enforceCurrentBundleVersion();
  }, []);

  return children;
}
