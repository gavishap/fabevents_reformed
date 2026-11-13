import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

export const bundledStylePages = ['home', 'customized-weddings'];

// These pages have a contiguous run of local stylesheets before their inline
// styles and web fonts. Keep the original cascade order in one request.
const localStyles = /(?:<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css(?:\?[^"]*)?"[^>]*>\s*)+/g;
const href = /href="([^"]+)"/g;
const cssUrl = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;

export function bundleCapturedStyles(page: string, head: string) {
  if (!bundledStylePages.includes(page)) return { head, bundles: [], includesOverrides: false };

  const bundles: { filename: string; css: string }[] = [];
  const isWeddings = page === 'customized-weddings';
  const fontFaces = page === 'customized-weddings'
    ? readFileSync('src/data/pages/customized-weddings/font-faces.css', 'utf8')
    : '';
  const bundledHead = head.replace(localStyles, (links) => {
    const sheets = [...links.matchAll(href)].map(([, url]) => {
      const path = url.split('?')[0];
      const css = readFileSync('public' + path, 'utf8');
      return css.replace(cssUrl, (original, doubleQuoted, singleQuoted, bare) => {
        const value = doubleQuoted ?? singleQuoted ?? bare;
        if (/^(?:\/|#|[a-z][a-z0-9+.-]*:)/i.test(value)) return original;
        const resolved = new URL(value, 'https://assets.invalid' + path);
        return 'url("' + resolved.pathname + resolved.search + resolved.hash + '")';
      });
    });
    const css = fontFaces ? sheets.join('\n') + '\n' + fontFaces : sheets.join('\n');
    // An import or namespace must stay in its own stylesheet to keep its scope.
    if (/@(?:import|namespace)\b/i.test(css)) return links;
    const hash = createHash('sha256').update(css).digest('hex').slice(0, 12);
    const filename = page + '-' + hash;
    bundles.push({ filename, css });
    return '<link rel="stylesheet" href="/styles/' + filename + '.css">\n';
  });
  if (isWeddings && bundles.length === 1) {
    const original = bundles[0];
    const link = (name: string) => '<link rel="stylesheet" href="/styles/' + name + '.css">';
    const marker = link(original.filename);
    const index = bundledHead.indexOf(marker);
    const before = bundledHead.slice(0, index);
    const after = bundledHead.slice(index + marker.length);
    const inlineStyles = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/g;
    const laterStyles = [...after.matchAll(inlineStyles)].map(([, css]) => css);
    const combined = [original.css, ...laterStyles, readFileSync('public/custom.css', 'utf8')].join('\n');
    const { code: css } = transformSync(combined, { loader: 'css', minify: true, target: 'safari15' });
    const filename = page + '-' + createHash('sha256').update(css).digest('hex').slice(0, 12);
    return {
      head: before + link(filename) + after.replace(inlineStyles, ''),
      bundles: [{ filename, css }],
      includesOverrides: true,
    };
  }
  return { head: bundledHead, bundles, includesOverrides: false };
}
