import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const bundledStylePages = ['home', 'customized-weddings'];

// These pages have a contiguous run of local stylesheets before their inline
// styles and web fonts. Keep the original cascade order in one request.
const localStyles = /(?:<link rel="stylesheet"[^>]*href="\/assets\/[^"]+\.css(?:\?[^"]*)?"[^>]*>\s*)+/g;
const href = /href="([^"]+)"/g;
const cssUrl = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi;

export function bundleCapturedStyles(page: string, head: string) {
  if (!bundledStylePages.includes(page)) return { head, bundles: [] };

  const bundles: { filename: string; css: string }[] = [];
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
    const css = sheets.join('\n');
    // An import or namespace must stay in its own stylesheet to keep its scope.
    if (/@(?:import|namespace)\b/i.test(css)) return links;
    const hash = createHash('sha256').update(css).digest('hex').slice(0, 12);
    const filename = page + '-' + hash;
    bundles.push({ filename, css });
    return '<link rel="stylesheet" href="/styles/' + filename + '.css">\n';
  });
  return { head: bundledHead, bundles };
}
