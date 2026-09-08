/**
 * Loads the captured page data (see scripts/capture.mjs) at build time.
 * Files are pulled in through Vite's glob import so the loader works the same
 * in `astro dev`, `astro build` and on Vercel regardless of the working directory.
 */

export interface PageMeta {
  name: string;
  path: string;
  wpId: number | null;
  type: 'page' | 'post' | '404';
  title: string;
  htmlLang: string;
  bodyClass: string;
  status: number;
}

export interface PageData {
  meta: PageMeta;
  head: string;
  content: string;
  tail: string;
}

export interface LayoutData {
  before: string;
  header: string;
  footer: string;
}

const files = import.meta.glob('../data/**/*.{html,json}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function read(...parts: string[]): string {
  const key = '../data/' + parts.join('/');
  const value = files[key];
  if (value === undefined) throw new Error(`Captured data file missing: ${key} (run "npm run capture")`);
  return value;
}

export function loadPages(): PageMeta[] {
  return JSON.parse(read('pages.json')) as PageMeta[];
}

export function loadPage(name: string): PageData {
  return {
    meta: JSON.parse(read('pages', name, 'meta.json')) as PageMeta,
    head: read('pages', name, 'head.html'),
    content: read('pages', name, 'content.html'),
    tail: read('pages', name, 'tail.html'),
  };
}

export function loadLayout(): LayoutData {
  return {
    before: read('layout', 'before.html'),
    header: read('layout', 'header.html'),
    footer: read('layout', 'footer.html'),
  };
}

/**
 * The capture keeps the site origin as placeholders wherever an absolute URL is
 * required (canonical link, social share links). Fill them from the configured site URL.
 */
export function fillOrigin(html: string, origin: string): string {
  const o = origin.replace(/\/+$/, '');
  return html
    .split('{{ORIGIN_ENC}}').join(encodeURIComponent(o))
    .split('{{ORIGIN_JS}}').join(o.replace(/\//g, '\\/'))
    .split('{{ORIGIN}}').join(o);
}
