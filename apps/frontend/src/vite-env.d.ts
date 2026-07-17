/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_SITE_URL: string;
  readonly VITE_SEO_ALLOW_INDEXING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
