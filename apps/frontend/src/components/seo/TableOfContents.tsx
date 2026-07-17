type TocItem = {
  id: string;
  label: string;
};

type TableOfContentsProps = {
  items: readonly TocItem[];
  title: string;
};

export function TableOfContents({ items, title }: TableOfContentsProps) {
  if (items.length < 2) return null;

  return (
    <nav className="page-toc" aria-label={title}>
      <h2 className="page-toc-title">{title}</h2>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`}>{item.label}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
