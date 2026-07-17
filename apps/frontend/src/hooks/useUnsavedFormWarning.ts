import { useEffect } from 'react';

/** Warn before closing the tab when a lead form still holds unsaved PII. */
export function useUnsavedFormWarning(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active]);
}
