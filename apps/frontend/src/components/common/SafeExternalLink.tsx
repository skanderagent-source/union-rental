import type { ReactNode } from 'react';
import { getSafeExternalHref } from '@/lib/safeUrl';

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
};

export function SafeExternalLink({ href, children, className }: Props) {
  const safeHref = getSafeExternalHref(href);
  if (!safeHref) return <span className={className}>{children}</span>;

  return (
    <a
      href={safeHref}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
