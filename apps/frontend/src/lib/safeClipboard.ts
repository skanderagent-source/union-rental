async function canWriteClipboard(): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;

  try {
    const permissions = navigator.permissions;
    if (permissions?.query) {
      const status = await permissions.query({ name: 'clipboard-write' as PermissionName });
      return status.state !== 'denied';
    }
  } catch {
    /* clipboard-write permission query unsupported — attempt write below */
  }

  return true;
}

/** Copy only the current same-origin page URL — never arbitrary or sensitive strings. */
export function getSafePageUrlForShare(): string | null {
  try {
    const url = new URL(window.location.href);
    if (url.origin !== window.location.origin) return null;
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (/[\u0000-\u001f\u007f]/.test(url.href)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Write text to clipboard after permission check; returns false when blocked or unsupported. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text || !navigator.clipboard?.writeText) return false;
  if (!(await canWriteClipboard())) return false;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Share the current listing page URL without leaking other clipboard contents. */
export async function copyCurrentPageUrl(): Promise<boolean> {
  const url = getSafePageUrlForShare();
  if (!url) return false;
  return copyTextToClipboard(url);
}
