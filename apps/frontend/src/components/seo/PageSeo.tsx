import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { JsonLd } from '@union-rental/shared';
import { buildHreflangAlternates } from '@union-rental/shared';
import { canonicalUrlForPath } from '@/lib/siteUrl';
import { isClientSeoIndexingAllowed } from '@/lib/seoIndexing';
import { defaultOgImageUrl, siteBrand } from '@/lib/structuredData';
import { siteOrigin } from '@/lib/siteUrl';

export type PageResourceHint = {
  rel: 'preconnect' | 'dns-prefetch' | 'prefetch';
  href: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  as?: string;
};

type PageSeoProps = {
  title: string;
  description: string;
  pathname: string;
  index?: boolean;
  /** Explicit canonical path; omit on error pages unless pointing to a valid indexable route. */
  canonicalPath?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: JsonLd | JsonLd[];
  /** Per-page connection hints (e.g. map tile CDN on inventory). */
  resourceHints?: readonly PageResourceHint[];
};

const MANAGED_SELECTOR = '[data-managed-seo="true"]';
const PERF_SELECTOR = '[data-managed-perf="true"]';

function upsertMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"][data-managed-seo="true"]`,
  );
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('name', name);
    element.setAttribute('data-managed-seo', 'true');
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertMetaProperty(property: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"][data-managed-seo="true"]`,
  );
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute('property', property);
    element.setAttribute('data-managed-seo', 'true');
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    `link[rel="${rel}"][data-managed-seo="true"]`,
  );
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    element.setAttribute('data-managed-seo', 'true');
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function removeManagedTag(selector: string) {
  document.head.querySelectorAll(selector).forEach((node) => node.remove());
}

function removeManagedSeoTags() {
  document.head.querySelectorAll(MANAGED_SELECTOR).forEach((node) => node.remove());
}

function removeManagedPerfTags() {
  document.head.querySelectorAll(PERF_SELECTOR).forEach((node) => node.remove());
}

function upsertResourceHint(hint: PageResourceHint) {
  const selector = `link[rel="${hint.rel}"][href="${hint.href}"][data-managed-perf="true"]`;
  let element = document.head.querySelector<HTMLLinkElement>(selector);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('data-managed-perf', 'true');
    document.head.appendChild(element);
  }
  element.rel = hint.rel;
  element.href = hint.href;
  if (hint.crossOrigin !== undefined) {
    element.crossOrigin = hint.crossOrigin;
  } else {
    element.removeAttribute('crossorigin');
  }
  if (hint.as) {
    element.as = hint.as;
  } else {
    element.removeAttribute('as');
  }
}

function upsertHreflang(alternates: readonly { hreflang: string; href: string }[]) {
  removeManagedTag('link[rel="alternate"][data-managed-seo="true"]');
  for (const alt of alternates) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = alt.hreflang;
    link.href = alt.href;
    link.setAttribute('data-managed-seo', 'true');
    document.head.appendChild(link);
  }
}

function upsertJsonLd(data: JsonLd | JsonLd[]) {
  removeManagedTag('script[type="application/ld+json"][data-managed-seo="true"]');
  const blocks = Array.isArray(data) ? data : [data];
  for (const block of blocks) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-managed-seo', 'true');
    script.textContent = JSON.stringify(block);
    document.head.appendChild(script);
  }
}

export function PageSeo({
  title,
  description,
  pathname,
  index = true,
  canonicalPath,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  twitterCard = 'summary_large_image',
  jsonLd,
  resourceHints,
}: PageSeoProps) {
  const location = useLocation();

  useEffect(() => {
    document.title = title;
    upsertMeta('description', description);

    const allowIndex = isClientSeoIndexingAllowed() && index;
    upsertMeta('robots', allowIndex ? 'index,follow' : 'noindex,follow');

    const effectivePath = pathname || location.pathname;
    const canonicalTarget = canonicalPath ?? (allowIndex ? effectivePath : undefined);
    removeManagedTag('link[rel="canonical"][data-managed-seo="true"]');
    removeManagedTag('meta[property^="og:"][data-managed-seo="true"]');
    removeManagedTag('meta[name^="twitter:"][data-managed-seo="true"]');

    const imageUrl = ogImage ?? defaultOgImageUrl();
    const imageAlt = ogImageAlt ?? `${siteBrand} — ${title}`;

    if (canonicalTarget) {
      const canonical = canonicalUrlForPath(canonicalTarget);
      upsertLink('canonical', canonical);
      upsertMetaProperty('og:url', canonical);
    }

    upsertHreflang(buildHreflangAlternates(siteOrigin, effectivePath, location.search));

    upsertMetaProperty('og:type', ogType);
    upsertMetaProperty('og:site_name', siteBrand);
    upsertMetaProperty('og:title', title);
    upsertMetaProperty('og:description', description);
    upsertMetaProperty('og:image', imageUrl);
    upsertMetaProperty('og:image:alt', imageAlt);

    upsertMeta('twitter:card', twitterCard);
    upsertMeta('twitter:title', title);
    upsertMeta('twitter:description', description);
    upsertMeta('twitter:image', imageUrl);
    upsertMeta('twitter:image:alt', imageAlt);

    if (jsonLd) {
      upsertJsonLd(jsonLd);
    } else {
      removeManagedTag('script[type="application/ld+json"][data-managed-seo="true"]');
    }

    removeManagedPerfTags();
    for (const hint of resourceHints ?? []) {
      upsertResourceHint(hint);
    }

    return () => {
      removeManagedSeoTags();
      removeManagedPerfTags();
    };
  }, [
    title,
    description,
    pathname,
    index,
    canonicalPath,
    ogType,
    ogImage,
    ogImageAlt,
    twitterCard,
    jsonLd,
    resourceHints,
    location.pathname,
    location.search,
  ]);

  return null;
}
