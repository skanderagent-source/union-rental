import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  imageMeetsOgMinimum,
  imageMeetsTwitterLargeMinimum,
  OG_IMAGE_MIN_HEIGHT,
  OG_IMAGE_MIN_WIDTH,
} from '@union-rental/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type OgImageSpec = {
  source: string;
  targetBase: string;
  label: string;
};

const OG_SPECS: readonly OgImageSpec[] = [
  {
    source: 'hero-home.jpg',
    targetBase: 'og-default',
    label: 'home',
  },
  {
    source: 'hero-inventaire.jpg',
    targetBase: 'og-inventory',
    label: 'inventory',
  },
  {
    source: 'hero-about.jpg',
    targetBase: 'og-about',
    label: 'about',
  },
];

async function assertOgDimensions(source: string, label: string): Promise<void> {
  const sharp = await import('sharp');
  const metadata = await sharp.default(source).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!imageMeetsOgMinimum(width, height)) {
    throw new Error(
      `${label} OG source below minimum (${OG_IMAGE_MIN_WIDTH}×${OG_IMAGE_MIN_HEIGHT}); got ${width}×${height}`,
    );
  }
  if (!imageMeetsTwitterLargeMinimum(width, height)) {
    throw new Error(`${label} OG source below Twitter large card minimum; got ${width}×${height}`);
  }
}

/** Copy stable social images per page template into /public (38). */
export function copyOgDefaultImage() {
  return {
    name: 'copy-og-default-image',
    async buildStart() {
      const assetsDir = path.resolve(__dirname, '../src/assets');
      const publicDir = path.resolve(__dirname, '../public');

      for (const spec of OG_SPECS) {
        const source = path.join(assetsDir, spec.source);
        const jpgTarget = path.join(publicDir, `${spec.targetBase}.jpg`);
        const webpTarget = path.join(publicDir, `${spec.targetBase}.webp`);

        if (!fs.existsSync(source)) {
          throw new Error(`Missing ${spec.source} for ${spec.label} OG image generation`);
        }

        fs.copyFileSync(source, jpgTarget);

        try {
          await assertOgDimensions(source, spec.label);
          const sharp = await import('sharp');
          await sharp.default(source).webp({ quality: 85 }).toFile(webpTarget);
        } catch (error) {
          if (error instanceof Error && error.message.includes('OG source')) {
            throw error;
          }
          // WebP is optional when sharp is unavailable; JPEG fallback remains.
        }
      }
    },
  };
}
