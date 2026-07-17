import { sanitizeHtml } from '@/lib/sanitizeHtml';

type Props = {
  html: string;
  className?: string;
  as?: 'div' | 'span' | 'h1' | 'h2' | 'p';
};

/** Render i18n HTML through DOMPurify — the only approved path for inner HTML. */
export function SafeHtml({ html, className, as: Tag = 'div' }: Props) {
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
