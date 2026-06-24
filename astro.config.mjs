import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://marelunebali.com',
  output: 'static',
  publicDir: 'public',
  dist: 'dist',
  integrations: [sitemap()]
});
