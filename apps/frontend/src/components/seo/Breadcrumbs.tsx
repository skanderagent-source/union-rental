import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from '@/lib/structuredData';

type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length <= 1) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          let pathname = '/';
          try {
            pathname = new URL(item.url).pathname;
          } catch {
            pathname = item.url;
          }

          return (
            <li key={item.url}>
              {isLast ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link to={pathname}>{item.name}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
