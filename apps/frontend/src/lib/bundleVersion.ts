const VERSION_STORAGE_KEY = 'ur_app_version';

/** Reload once when a new frontend bundle is deployed after a security-sensitive release. */
export function enforceCurrentBundleVersion(): void {
  const current = __APP_VERSION__;
  let stored: string | null = null;

  try {
    stored = sessionStorage.getItem(VERSION_STORAGE_KEY);
  } catch {
    return;
  }

  if (stored && stored !== current) {
    try {
      sessionStorage.setItem(VERSION_STORAGE_KEY, current);
    } catch {
      /* ignore */
    }
    window.location.reload();
    return;
  }

  try {
    sessionStorage.setItem(VERSION_STORAGE_KEY, current);
  } catch {
    /* private mode / quota */
  }
}
