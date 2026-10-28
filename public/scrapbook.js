/* Smooth, visibility-aware carousels with adjacent-photo preloading. */
document.querySelectorAll('.fab-wedding-album, .fab-event-hero-carousel').forEach(album => {
  const hero = album.classList.contains('fab-event-hero-carousel');
  const track = album.querySelector(hero ? '.fab-hero-track' : '.fab-album-track');
  if (!track || track.children.length < 2) return;
  const cards = [...track.children];
  const indexes = new Map(cards.map((card, index) => [card, index]));
  const play = album.querySelector(hero ? '[data-hero-play]' : '[data-album-play]');
  const prev = album.querySelector('[data-album-prev]');
  const next = album.querySelector('[data-album-next]');
  const position = album.querySelector('.fab-album-position');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 650px)');
  let playing = !reduced.matches, visible = false, focused = false, frame = 0;
  let last = 0, offset = 0, firstWidth = 0, overflowing = false;
  const preload = () => [...track.children].slice(0, 4).forEach(card => {
    card.querySelectorAll('img').forEach(img => {
      img.loading = 'eager';
      if (img.complete && img.naturalWidth) img.decode?.().catch(() => {});
    });
  });
  const update = () => {
    if (play) {
      play.textContent = playing ? 'Pause' : 'Play';
      play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} photo carousel`);
    }
    if (position) position.textContent = `${indexes.get(track.firstElementChild) + 1} / ${cards.length}`;
  };
  const measure = () => {
    const first = track.firstElementChild;
    const style = getComputedStyle(first);
    firstWidth = first.getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0) + (parseFloat(style.marginRight) || 0);
    overflowing = track.scrollWidth > track.clientWidth + 1;
  };
  const running = () => playing && visible && !document.hidden && !focused && overflowing && firstWidth > 0;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; };
  const start = () => { if (!frame && running()) frame = requestAnimationFrame(tick); };
  function tick(now) {
    frame = 0;
    if (!running()) { last = 0; return; }
    const delta = last ? Math.min(now - last, 64) : 0;
    last = now;
    offset += delta * (phone.matches ? .045 : .06);
    if (offset >= firstWidth) {
      offset -= firstWidth;
      track.append(track.firstElementChild);
      measure(); preload(); update();
    }
    track.scrollLeft = offset;
    frame = requestAnimationFrame(tick);
  }
  const step = direction => {
    playing = false; stop(); offset = 0;
    if (direction > 0) track.append(track.firstElementChild);
    else track.prepend(track.lastElementChild);
    track.scrollLeft = 0; measure(); preload(); update();
  };
  play?.addEventListener('click', () => { playing = !playing; offset = track.scrollLeft; update(); if (playing) { preload(); start(); } else stop(); });
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  track.addEventListener('pointerdown', () => { playing = false; stop(); update(); }, {passive:true});
  track.addEventListener('scroll', () => { if (!frame) offset = track.scrollLeft; }, {passive:true});
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); step(event.key === 'ArrowRight' ? 1 : -1); }
  });
  track.addEventListener('focusin', () => { focused = true; stop(); });
  track.addEventListener('focusout', () => { focused = false; start(); });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) { measure(); preload(); start(); } else stop();
  }, {rootMargin:'100px 0px',threshold:0}).observe(album);
  new ResizeObserver(() => { measure(); offset = Math.min(offset, firstWidth); if (running()) start(); else stop(); }).observe(track);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  reduced.addEventListener('change', () => { playing = !reduced.matches; update(); if (playing) start(); else stop(); });
  measure(); update();
});
