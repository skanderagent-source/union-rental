import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { mixedContentGuard } from './plugins/mixedContentGuard';
import { copyOgDefaultImage } from './plugins/copyOgDefaultImage';
import { injectResourceHints } from './plugins/injectResourceHints';
import { inlineCriticalShell } from './plugins/inlineCriticalShell';
import { minifyHtml } from './plugins/minifyHtml';

const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'),
) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    plugins: [
      copyOgDefaultImage(),
      inlineCriticalShell(),
      react(),
      mixedContentGuard(),
      injectResourceHints(env.VITE_API_BASE_URL),
      minifyHtml(),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
      port: 5174,
      strictPort: true,
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    build: {
      sourcemap: false,
      reportCompressedSize: false,
      cssCodeSplit: true,
      modulePreload: { polyfill: true },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'leaflet';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/')
            ) {
              return 'react-vendor';
            }
            return 'vendor';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
