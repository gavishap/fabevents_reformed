/**
 * Re-applies WordPress/Elementor "current page" markers to the neutral header
 * captured in src/data/layout/header.html, producing the exact classes
 * WordPress prints for the page being rendered.
 *
 *   <li class="menu-item ... menu-item-object-page current-menu-item page_item page-item-13 current_page_item menu-item-90">
 *     <a href="/" aria-current="page" class="elementor-item elementor-item-active">
 *
 * and, when the page sits inside a dropdown, its parent item gets
 *   current-menu-ancestor current-menu-parent current_page_parent current_page_ancestor
 */
import * as cheerio from 'cheerio';
import type { PageMeta } from './site';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function applyActiveState(header: string, page: PageMeta): string {
  if (page.type !== 'page' || page.wpId == null) return header;

  const href = page.path;
  const hrefRe = escapeRe(href);

  // Is there a menu item for this page at all?
  if (!new RegExp(`<a href="${hrefRe}" class="elementor-(?:sub-)?item"`).test(header)) return header;

  let out = header;

  // 1. the item's own <li>
  out = out.replace(
    new RegExp(`<li class="(menu-item [^"]*?)((?: menu-item-has-children)? menu-item-\\d+)"><a href="${hrefRe}"`, 'g'),
    `<li class="$1 current-menu-item page_item page-item-${page.wpId} current_page_item$2"><a href="${href}"`,
  );

  // 2. the anchor
  out = out.replace(
    new RegExp(`<a href="${hrefRe}" class="(elementor-item|elementor-sub-item)"`, 'g'),
    `<a href="${href}" aria-current="page" class="$1 elementor-item-active"`,
  );

  // 3. ancestor items (dropdown parents)
  const $ = cheerio.load(header);
  const parentIds = new Set<string>();
  $(`a[href="${href}"]`).each((_, a) => {
    // only items ABOVE the link's own <li>: a dropdown parent is not its own ancestor
    $(a)
      .parent('li')
      .parents('li.menu-item-has-children')
      .each((_, li) => {
        const m = ($(li).attr('class') || '').match(/\bmenu-item-(\d+)\b/);
        if (m) parentIds.add(m[1]);
      });
  });
  for (const id of parentIds) {
    out = out.replace(
      new RegExp(`(<li class="menu-item [^"]*?) menu-item-has-children menu-item-${id}"`, 'g'),
      `$1 current-menu-ancestor current-menu-parent current_page_parent current_page_ancestor menu-item-has-children menu-item-${id}"`,
    );
  }

  return out;
}
