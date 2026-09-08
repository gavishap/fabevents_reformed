#!/usr/bin/env node
/**
 * capture.mjs — snapshot the rendered WordPress/Elementor site into this Astro project.
 *
 *   node scripts/capture.mjs                         # from the live site (default)
 *   node scripts/capture.mjs http://localhost:8090   # from the local Docker WordPress
 *
 * For every public page it fetches the server-rendered HTML, splits it into
 * head / header / content / footer / tail (scripts), rewrites WordPress URLs to
 * static /assets/... paths, and copies every referenced file into public/assets.
 * Plugin, theme and core files are taken from the WordPress tree one level up
 * (same versions as production); anything missing there is downloaded.
 *
 * Output:
 *   src/data/layout/{before,header,footer}.html   shared chrome (header is neutralised: no active state)
 *   src/data/pages/<name>/{meta.json,head.html,content.html,tail.html}
 *   src/data/pages.json                           index used for routing + nav state
 *   public/assets/**                              css / js / fonts / images
 */
import * as cheerio from 'cheerio';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// WordPress tree for plugin/theme/core files: $WP_ROOT, the parent directory
// (monorepo layout) or a sibling checkout of gavishap/fabeventsisrael.
const WP_ROOT = [process.env.WP_ROOT, path.resolve(SITE_DIR, '..'), path.resolve(SITE_DIR, '..', 'fabeventsisrael')]
  .filter(Boolean)
  .find((p) => existsSync(path.join(p, 'wp-includes', 'version.php')));
const PUBLIC = path.join(SITE_DIR, 'public');
const DATA = path.join(SITE_DIR, 'src', 'data');

const BASE = (process.argv[2] || process.env.CAPTURE_BASE || 'https://fabeventsisrael.com').replace(/\/+$/, '');
const CANONICAL_HOST = 'fabeventsisrael.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// WordPress path prefix -> static path prefix. Order matters (longest first).
const PREFIX_MAP = [
  ['/wp-content/plugins/elementor-pro/modules/', '/assets/elementor-pro/modules/'],
  ['/wp-content/plugins/elementor-pro/assets/', '/assets/elementor-pro/'],
  ['/wp-content/plugins/elementor/assets/', '/assets/elementor/'],
  ['/wp-content/plugins/sassy-social-share/', '/assets/sassy/'],
  ['/wp-content/plugins/litespeed-cache/assets/', '/assets/litespeed/'],
  ['/wp-content/themes/hello-elementor/', '/assets/theme/'],
  ['/wp-content/uploads/', '/assets/uploads/'],
  ['/wp-includes/', '/assets/wp/'],
  ['/wp-admin/admin-ajax.php', '/api/contact'],
];

// Files Elementor loads lazily at runtime (webpack chunks, swiper, lightbox, icons...).
// They are not referenced by the HTML, so copy whole directories.
const BULK_COPIES = [
  ['wp-content/plugins/elementor/assets/lib', 'assets/elementor/lib', () => true],
  ['wp-content/plugins/elementor/assets/css', 'assets/elementor/css', () => true],
  ['wp-content/plugins/elementor/assets/js', 'assets/elementor/js', (f) => /\.bundle\.min\.js$/.test(f)],
  ['wp-content/plugins/elementor-pro/assets/lib', 'assets/elementor-pro/lib', () => true],
  ['wp-content/plugins/elementor-pro/assets/css', 'assets/elementor-pro/css', () => true],
  ['wp-content/plugins/elementor-pro/assets/js', 'assets/elementor-pro/js', (f) => /\.bundle\.min\.js$/.test(f)],
];

const ORIGIN = '{{ORIGIN}}';
const ORIGIN_JS = '{{ORIGIN_JS}}';
const ORIGIN_ENC = '{{ORIGIN_ENC}}';

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('  ! ' + a.join(' '));

// ---------------------------------------------------------------- helpers

function replaceAll(s, from, to) {
  return s.split(from).join(to);
}

/** Every spelling of the production origin (and the capture base) -> placeholder tokens. */
function normalizeOrigins(s) {
  const hosts = new Set([CANONICAL_HOST, 'www.' + CANONICAL_HOST, BASE.replace(/^https?:\/\//, '')]);
  for (const host of hosts) {
    for (const scheme of ['https', 'http']) {
      const plain = `${scheme}://${host}`;
      s = replaceAll(s, `${scheme}%3A%2F%2F${host}`, ORIGIN_ENC);
      s = replaceAll(s, `${scheme}:\\/\\/${host}`, ORIGIN_JS);
      s = replaceAll(s, plain, ORIGIN);
    }
  }
  return s;
}

/** Map {{ORIGIN}}/wp-content/... to /assets/..., then make remaining page links root-relative. */
function mapUrls(s) {
  for (const [from, to] of PREFIX_MAP) {
    s = replaceAll(s, ORIGIN + from, to);
    s = replaceAll(s, ORIGIN_JS + from.replace(/\//g, '\\/'), to.replace(/\//g, '\\/'));
    // root-relative references that never carried the origin
    s = replaceAll(s, `"${from}`, `"${to}`);
    s = replaceAll(s, `'${from}`, `'${to}`);
    s = replaceAll(s, `(${from}`, `(${to}`);
  }
  s = replaceAll(s, ORIGIN + '/', '/');
  s = replaceAll(s, ORIGIN_JS + '\\/', '\\/');
  s = replaceAll(s, ORIGIN, '');
  s = replaceAll(s, ORIGIN_JS, '');
  return s;
}

/** Reverse of PREFIX_MAP for locating the source file of a static asset path. */
function toWpPath(assetPath) {
  for (const [from, to] of PREFIX_MAP) {
    if (assetPath.startsWith(to)) return from + assetPath.slice(to.length);
  }
  return null;
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*;q=0.8', ...(opts.headers || {}) }, redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, text, finalUrl: res.url };
}

async function fetchBinary(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function copyDir(src, dst, filter) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  let n = 0;
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) n += await copyDir(s, d, filter);
    else if (filter(e.name)) {
      await ensureDir(path.dirname(d));
      await fs.copyFile(s, d);
      n++;
    }
  }
  return n;
}

// ---------------------------------------------------------------- page discovery

async function discoverPages() {
  const pages = [];
  for (const type of ['pages', 'posts']) {
    const { status, text } = await fetchText(`${BASE}/wp-json/wp/v2/${type}?per_page=100&_fields=id,slug,link,title,status`, { headers: { Accept: 'application/json' } });
    if (status !== 200) throw new Error(`REST ${type} -> HTTP ${status}`);
    for (const p of JSON.parse(text)) {
      const url = new URL(p.link);
      const pathName = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      pages.push({ name: pathName === '/' ? 'home' : p.slug, path: pathName, wpId: p.id, type: type === 'pages' ? 'page' : 'post', title: p.title?.rendered ?? p.slug });
    }
  }
  pages.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)));
  return pages;
}

// ---------------------------------------------------------------- html processing

const ACTIVE_LI_RE = / current-menu-item page_item page-item-\d+ current_page_item/g;
const ANCESTOR_LI_RE = / current-menu-ancestor current-menu-parent current_page_parent current_page_ancestor/g;
const ACTIVE_A_RE = /<a href="([^"]*)" aria-current="page" class="(elementor-item|elementor-sub-item) elementor-item-active"/g;

/** Remove every "current page" marker so the header is identical for all pages. */
function neutralizeHeader(html) {
  return html.replace(ACTIVE_LI_RE, '').replace(ANCESTOR_LI_RE, '').replace(ACTIVE_A_RE, '<a href="$1" class="$2"');
}

function outerHtml($, els) {
  return els.map((el) => $.html(el)).join('\n');
}

function processPage(rawHtml, page) {
  let html = rawHtml.replace(/<!-- Page (?:cached|supported|generated) by LiteSpeed Cache[^>]*-->\s*/g, '');
  html = normalizeOrigins(html);

  const $ = cheerio.load(html);

  // --- WordPress-only head/body cruft
  $('link[rel="alternate"], link[rel="EditURI"], link[rel="shortlink"], link[rel="https://api.w.org/"], meta[name="generator"]').remove();
  $('script#wp-emoji-settings, style#wp-emoji-styles-inline-css').remove();
  $('script:not([src])').each((_, el) => {
    const t = $(el).html() || '';
    if (/_wpemojiSettings|wp-emoji-release|twemoji/.test(t)) $(el).remove();
  });

  // --- canonical keeps the origin placeholder (filled in at build time from PUBLIC_SITE_URL)
  const canonical = $('link[rel="canonical"]');
  if (canonical.length) canonical.attr('href', ORIGIN + page.path);

  // --- rewrite URLs in attributes, except inside the social share bar which needs absolute links
  $('*').each((_, el) => {
    // element nodes are typed 'tag', 'script' or 'style' in the DOM handler
    if (!('attribs' in el) || !el.attribs) return;
    const $el = $(el);
    if ($el.is('link[rel="canonical"]') || $el.closest('.heateor_sss_sharing_container').length) return;
    for (const [name, value] of Object.entries(el.attribs || {})) {
      if (value.includes('{{ORIGIN') || value.includes('/wp-content/') || value.includes('/wp-includes/') || value.includes('/wp-admin/')) {
        $el.attr(name, mapUrls(value));
      }
    }
  });
  // inline scripts / styles (JSON configs, CSS url())
  $('script:not([src]), style').each((_, el) => {
    const t = $(el).html();
    if (t && (t.includes('{{ORIGIN') || t.includes('/wp-content/') || t.includes('/wp-includes/'))) $(el).html(mapUrls(t));
  });

  // --- partition body
  const children = $('body').children().toArray();
  const hIdx = children.findIndex((el) => $(el).is('.elementor-location-header'));
  const fIdx = children.findIndex((el) => $(el).is('.elementor-location-footer'));
  if (hIdx < 0 || fIdx < 0) throw new Error(`${page.name}: header/footer template not found in body`);

  // A final string-level pass catches anything the DOM walk could not see.
  // Content is excluded because the share bar must keep its {{ORIGIN}} placeholders.
  const sections = {
    head: $('head').html() || '',
    before: outerHtml($, children.slice(0, hIdx)),
    header: outerHtml($, [children[hIdx]]),
    footer: outerHtml($, [children[fIdx]]),
    tail: outerHtml($, children.slice(fIdx + 1)),
  };
  for (const k of Object.keys(sections)) sections[k] = mapUrls(sections[k]);
  const canonicalTag = $('link[rel="canonical"]').length ? `<link rel="canonical" href="${ORIGIN}${page.path}" />` : '';
  sections.head = sections.head.replace(/<link rel="canonical" href="[^"]*">/, canonicalTag);

  return {
    htmlLang: $('html').attr('lang') || 'en-US',
    bodyClass: $('body').attr('class') || '',
    title: $('title').first().text(),
    content: outerHtml($, children.slice(hIdx + 1, fIdx)),
    ...sections,
  };
}

// ---------------------------------------------------------------- assets

const ASSET_RE = /\/assets\/[A-Za-z0-9_\-./%@+]+/g;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+)\1\s*\)|@import\s+(?:url\()?['"]([^'"]+)['"]/g;

function findAssetRefs(text) {
  const refs = new Set();
  const unescaped = text.replace(/\\\//g, '/');
  for (const m of unescaped.matchAll(ASSET_RE)) {
    let p = m[0];
    p = p.split('?')[0].split('#')[0];
    if (p.endsWith('.') || p.endsWith('/')) p = p.replace(/[./]+$/, '');
    // directories such as "/assets/elementor/" (Elementor's runtime base URL) are not files
    if (!/\.[A-Za-z0-9]+$/.test(path.posix.basename(p))) continue;
    refs.add(decodeURIComponent(p));
  }
  return refs;
}

const collected = new Map(); // assetPath -> source description

async function collectAsset(assetPath) {
  if (collected.has(assetPath)) return;
  const wpPath = toWpPath(assetPath);
  if (!wpPath) {
    warn(`no source mapping for ${assetPath}`);
    return;
  }
  const dest = path.join(PUBLIC, assetPath);
  const isGeneratedCss = assetPath.startsWith('/assets/uploads/elementor/css/');
  const localFile = WP_ROOT ? path.join(WP_ROOT, wpPath) : null;

  let buf;
  let source;
  if (!isGeneratedCss && localFile && existsSync(localFile)) {
    buf = await fs.readFile(localFile);
    source = 'local';
  } else {
    try {
      buf = await fetchBinary(BASE + wpPath);
      source = 'download';
    } catch (e) {
      warn(`missing asset ${assetPath} (${e.message})`);
      collected.set(assetPath, 'MISSING');
      return;
    }
  }
  collected.set(assetPath, source);

  if (/\.css$/i.test(assetPath)) {
    let css = normalizeOrigins(buf.toString('utf8'));
    css = mapUrls(css);
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, css);
    // relative url() / @import references inside the stylesheet
    const dir = path.posix.dirname(assetPath);
    for (const m of css.matchAll(CSS_URL_RE)) {
      const ref = (m[2] || m[3] || '').trim();
      if (!ref || /^(data:|https?:|\/\/|#)/.test(ref)) continue;
      const clean = ref.split('?')[0].split('#')[0];
      const resolved = clean.startsWith('/') ? clean : path.posix.normalize(path.posix.join(dir, clean));
      if (resolved.startsWith('/assets/')) await collectAsset(resolved);
    }
  } else {
    await ensureDir(path.dirname(dest));
    await fs.writeFile(dest, buf);
  }
}

// ---------------------------------------------------------------- main

async function main() {
  log(`Capturing from ${BASE}`);
  if (WP_ROOT) log(`WordPress tree: ${WP_ROOT}`);
  else warn('no WordPress tree found (set WP_ROOT); keeping existing public/assets and downloading referenced files');

  const pages = await discoverPages();
  pages.push({ name: '404', path: '/404/', wpId: null, type: '404', title: 'Page not found' });
  log(`Pages: ${pages.map((p) => p.name).join(', ')}`);

  await fs.rm(path.join(DATA, 'pages'), { recursive: true, force: true });
  // Only rebuild public/assets from scratch when the runtime-loaded plugin files can be re-copied.
  if (WP_ROOT) await fs.rm(path.join(PUBLIC, 'assets'), { recursive: true, force: true });
  await ensureDir(path.join(DATA, 'layout'));

  let layout = null;
  const index = [];
  const allText = [];

  for (const page of pages) {
    const url = page.type === '404' ? `${BASE}/this-page-does-not-exist-static-probe/` : `${BASE}${page.path}`;
    const { status, text } = await fetchText(url);
    if (page.type === '404' ? status !== 404 : status !== 200) {
      warn(`${page.name}: HTTP ${status}, skipping`);
      continue;
    }
    const parts = processPage(text, page);
    const neutralHeader = neutralizeHeader(parts.header);

    if (!layout) {
      layout = { before: parts.before, header: neutralHeader, footer: parts.footer, from: page.name };
    } else {
      for (const key of ['before', 'footer']) {
        if (parts[key] !== layout[key]) warn(`${page.name}: ${key} differs from ${layout.from} (using ${layout.from}'s)`);
      }
      if (neutralHeader !== layout.header) {
        warn(`${page.name}: header differs from ${layout.from} even after neutralising active state`);
        await fs.writeFile(path.join(DATA, 'layout', `header.${page.name}.debug.html`), neutralHeader);
      }
    }

    const dir = path.join(DATA, 'pages', page.name);
    await ensureDir(dir);
    const meta = { name: page.name, path: page.path, wpId: page.wpId, type: page.type, title: parts.title, htmlLang: parts.htmlLang, bodyClass: parts.bodyClass, status: status };
    await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    await fs.writeFile(path.join(dir, 'head.html'), parts.head);
    await fs.writeFile(path.join(dir, 'content.html'), parts.content);
    await fs.writeFile(path.join(dir, 'tail.html'), parts.tail);
    index.push(meta);
    allText.push(parts.head, parts.content, parts.tail, parts.header, parts.footer, parts.before);
    log(`  ${page.name.padEnd(36)} HTTP ${status}  content ${(parts.content.length / 1024).toFixed(0)}kB`);
  }

  await fs.writeFile(path.join(DATA, 'layout', 'before.html'), layout.before);
  await fs.writeFile(path.join(DATA, 'layout', 'header.html'), layout.header);
  await fs.writeFile(path.join(DATA, 'layout', 'footer.html'), layout.footer);
  await fs.writeFile(path.join(DATA, 'pages.json'), JSON.stringify(index, null, 2) + '\n');

  // --- assets referenced by markup (recursively through CSS)
  const refs = new Set();
  for (const t of allText) for (const r of findAssetRefs(t)) refs.add(r);
  log(`Collecting ${refs.size} referenced assets...`);
  for (const r of refs) await collectAsset(r);

  // --- runtime-loaded plugin files
  if (WP_ROOT) {
    for (const [src, dst, filter] of BULK_COPIES) {
      const n = await copyDir(path.join(WP_ROOT, src), path.join(PUBLIC, dst), filter);
      log(`  bulk ${src} -> ${n} files`);
    }
  }

  const stats = { local: 0, download: 0, MISSING: 0 };
  for (const v of collected.values()) stats[v]++;
  log(`Assets: ${collected.size} referenced (${stats.local} from WordPress tree, ${stats.download} downloaded, ${stats.MISSING} missing)`);

  await fs.writeFile(path.join(DATA, 'capture.json'), JSON.stringify({ base: BASE, capturedAt: new Date().toISOString(), pages: index.length, assets: collected.size, missing: [...collected].filter(([, v]) => v === 'MISSING').map(([k]) => k) }, null, 2) + '\n');
  log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
