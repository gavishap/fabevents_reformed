/* Continuously move photographs left; recycle existing cards without cloning. */
document.querySelectorAll('.fab-wedding-album, .fab-event-hero-carousel').forEach(album => {
 const hero=album.classList.contains('fab-event-hero-carousel');
 const track=album.querySelector(hero?'.fab-hero-track':'.fab-album-track');
 if(!track || !track.children.length)return;
 const cards=[...track.children];
 const play=album.querySelector(hero?'[data-hero-play]':'[data-album-play]');
 const prev=album.querySelector('[data-album-prev]'),next=album.querySelector('[data-album-next]');
 const position=album.querySelector('.fab-album-position');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let playing=!reduced.matches,inView=false,last=0,progress=0;
 const update=()=>{play.textContent=playing?'Pause':'Play';play.setAttribute('aria-label',`${playing?'Pause':'Play'} photo carousel`);if(position)position.textContent=`${cards.indexOf(track.firstElementChild)+1} / ${cards.length}`;};
 play.addEventListener('click',()=>{playing=!playing;update();});
 const step=dir=>{playing=false;progress=0;track.scrollLeft=0;if(dir>0)track.append(track.firstElementChild);else track.prepend(track.lastElementChild);update();};
 prev?.addEventListener('click',()=>step(-1));next?.addEventListener('click',()=>step(1));
 track.addEventListener('pointerdown',()=>{playing=false;update();});
 track.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();step(e.key==='ArrowRight'?1:-1);}});
 new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;},{threshold:0}).observe(album);
 reduced.addEventListener('change',()=>{playing=!reduced.matches;update();});
 function tick(now){const dt=Math.min(now-last,50);last=now;if(playing&&inView&&!document.hidden&&!track.contains(document.activeElement)&&track.scrollWidth>track.clientWidth){const first=track.firstElementChild;const gap=parseFloat(getComputedStyle(track).gap)||0;const width=first.getBoundingClientRect().width+gap;progress+=dt*.12;if(progress>=width){track.append(first);progress-=width;update();}track.scrollLeft=progress;}else progress=track.scrollLeft;requestAnimationFrame(tick);}
 update();requestAnimationFrame(tick);
});
