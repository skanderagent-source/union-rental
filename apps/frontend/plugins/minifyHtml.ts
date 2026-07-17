import type { Plugin } from 'vite';

/** Production HTML whitespace/comment reduction (preserves inline critical CSS). */
export function minifyHtml(): Plugin {
  return {
    name: 'minify-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        return html
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/>\s+</g, '><')
          .replace(/\n+/g, '')
          .trim();
      },
    },
  };
}
