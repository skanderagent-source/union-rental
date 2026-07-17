/** Create a revocable blob URL; call the returned revoke() when the URL is no longer needed. */
export function createManagedBlobUrl(blob: Blob): { url: string; revoke: () => void } {
  const url = URL.createObjectURL(blob);
  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

export function revokeBlobUrl(url: string | null | undefined): void {
  if (!url?.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}
