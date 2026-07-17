import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Trap keyboard focus inside modal overlays that collect PII. */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const getFocusables = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    const focusFirst = () => {
      const [first] = getFocusables();
      first?.focus();
    };

    focusFirst();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    root.addEventListener('keydown', onKeyDown);
    return () => {
      root.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [active, containerRef]);
}
