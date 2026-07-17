import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const HTTP_URL = /https?:\/\/[^\s"'`]+/g;
const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?/i;

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(tsx?|html)$/.test(entry.name)) files.push(full);
  }
  return files;
}

/** Fail production builds that embed non-local http:// asset or API URLs. */
export function mixedContentGuard(): Plugin {
  return {
    name: 'mixed-content-guard',
    apply: 'build',
    buildStart() {
      const srcDir = path.resolve(process.cwd(), 'src');
      const indexHtml = path.resolve(process.cwd(), 'index.html');
      const files = [...walk(srcDir), indexHtml];
      const violations: string[] = [];

      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        for (const match of text.matchAll(HTTP_URL)) {
          const url = match[0];
          if (url.startsWith('http://') && !LOCAL_HTTP.test(url)) {
            violations.push(`${path.relative(process.cwd(), file)}: ${url}`);
          }
        }
      }

      if (violations.length) {
        throw new Error(
          `Mixed-content guard: non-local http:// URLs found in production build sources:\n${violations.join('\n')}`,
        );
      }
    },
  };
}
