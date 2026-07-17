import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Inline a tiny critical CSS shell so first paint is styled before the main stylesheet loads. */
export function inlineCriticalShell(): Plugin {
  const criticalPath = path.resolve(__dirname, '../src/styles/critical-shell.css');

  return {
    name: 'inline-critical-shell',
    transformIndexHtml(html) {
      const css = fs.readFileSync(criticalPath, 'utf8').replace(/\s+/g, ' ').trim();
      const tag = `<style id="critical-shell">${css}</style>`;
      return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${tag}`);
    },
  };
}
