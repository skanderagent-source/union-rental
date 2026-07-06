import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = process.argv[2] ?? 'legacy/index.html';
const html = readFileSync(resolve(source), 'utf8');
const outDir = resolve('apps/frontend/src/assets/legacy');
mkdirSync(outDir, { recursive: true });
let i = 0;
for (const m of html.matchAll(/src="data:image\/(png|jpeg);base64,([^"]+)"/g)) {
  const ext = m[1] === 'png' ? 'png' : 'jpg';
  writeFileSync(resolve(outDir, `img-${String(i).padStart(2, '0')}.${ext}`), Buffer.from(m[2], 'base64'));
  i++;
}
console.log(`Extracted ${i} images to ${outDir}`);
