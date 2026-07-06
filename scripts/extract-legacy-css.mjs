import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.argv[2] ?? 'legacy/index.html';
const html = readFileSync(resolve(source), 'utf8');
const m = html.match(/<style>([\s\S]*?)<\/style>/);
if (!m) throw new Error(`No <style> block in ${source}`);
const css = m[1];
const rootMatch = css.match(/:root\{[^}]+\}/);
if (!rootMatch) throw new Error('No :root block found');

const stylesDir = resolve('apps/frontend/src/styles');
mkdirSync(stylesDir, { recursive: true });
writeFileSync(resolve(stylesDir, 'theme.css'), `${rootMatch[0]}\n`);
writeFileSync(
  resolve(stylesDir, 'legacy-styles.css'),
  `${css.replace(rootMatch[0], '').trim()}\n`,
);
console.log('Wrote theme.css (:root) and legacy-styles.css (everything else)');
