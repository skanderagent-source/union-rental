import type { Plugin } from 'vite';

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function publicAssetHref(fileName: string): string {
  return fileName.startsWith('/') ? fileName : `/${fileName}`;
}

/** Inject critical font preload and API preconnect after the production bundle is known. */
export function injectResourceHints(apiBaseUrl?: string): Plugin {
  return {
    name: 'inject-resource-hints',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;

        const hints: string[] = [];

        for (const [fileName, output] of Object.entries(ctx.bundle)) {
          if (output.type === 'asset' && fileName.includes('inter-latin-wght-normal')) {
            hints.push(
              `<link rel="preload" href="${escapeAttr(publicAssetHref(fileName))}" as="font" type="font/woff2" crossorigin />`,
            );
            break;
          }
        }

        const trimmedApi = apiBaseUrl?.trim().replace(/\/$/, '');
        if (trimmedApi?.startsWith('https://')) {
          try {
            const origin = new URL(trimmedApi).origin;
            hints.push(`<link rel="dns-prefetch" href="${escapeAttr(origin)}" />`);
            hints.push(`<link rel="preconnect" href="${escapeAttr(origin)}" crossorigin />`);
          } catch {
            /* invalid build-time API URL — skip hints */
          }
        }

        if (!hints.length) return html;
        return html.replace('</head>', `    ${hints.join('\n    ')}\n  </head>`);
      },
    },
  };
}
