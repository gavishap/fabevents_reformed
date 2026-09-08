// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Public origin of the deployed site. Set PUBLIC_SITE_URL in Vercel once the
// custom domain is attached; it drives canonical URLs, share links and the sitemap.
const site = process.env.PUBLIC_SITE_URL || 'https://fabeventsisrael.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  // The page markup is Elementor's rendered output; keep whitespace exactly as captured.
  compressHTML: false,
  build: { format: 'directory', inlineStylesheets: 'never' },
  integrations: [sitemap()],
});
