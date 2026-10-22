import { load } from 'cheerio';
import { loadPage } from './site';

// Reuse the real page content so the scrolling homepage stays in sync.
export function continuousHome() {
  const names = ['customized-weddings',
    'fab-signature-celebration-packages', 'day-of-the-event-coordinator',
    'personal-booking-agent', 'customized-bar-bat-mitzvot', 'idf-base-celebrations',
    'baby-celebrations', 'private-parties-israeli-experiences',
    'community-corporate-events', 'testimonials', 'contact-us'];
  const styles = new Set<string>();
  const sections = names.map(name => {
    const page = loadPage(name);
    const head = load(page.head);
    head('link[rel="stylesheet"]').each((_, el) => {
      const href = head(el).attr('href');
      if (href) styles.add(href);
    });
    const $ = load(page.content, {}, false);
    // The homepage has one complete recommendations section.
    $('.elementor-widget-testimonial-carousel').each((_, el) => {
      const section = $(el).closest('section.elementor-section');
      if (section.length) section.remove(); else $(el).remove();
    });
    // Keep every anchor unique when multiple pages share one document.
    $('[id]').each((_, el) => {
      $(el).attr('id', `scroll-${name}-${$(el).attr('id')}`);
    });
    $('[aria-labelledby], [aria-describedby], label[for]').each((_, el) => {
      for (const attr of ['aria-labelledby', 'aria-describedby', 'for']) {
        const value = $(el).attr(attr);
        if (value) $(el).attr(attr, value.split(' ').map(id => `scroll-${name}-${id}`).join(' '));
      }
    });
    $('a[href^="#"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && href.length > 1) $(el).attr('href', `#scroll-${name}-${href.slice(1)}`);
    });
    $('img').attr('loading', 'lazy');
    return `<section id="explore-${name}" class="fab-continuous-page ${page.meta.bodyClass}" data-source-page="${name}"><div class="fab-page-divider"><a href="/${name}/">Open this page ↗</a><a href="#home-services">Back to services ↑</a></div>${$.html()}</section>`;
  });
  return { content: sections.join('\n'), styles: [...styles].map(href => `<link rel="stylesheet" href="${href}">`).join('\n') };
}
