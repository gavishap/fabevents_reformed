const fs = require('fs');
const { load } = require('cheerio');
const file = slug => `src/data/pages/${slug}/content.html`;
const edit = (slug, fn) => { const p=file(slug); const $=load(fs.readFileSync(p,'utf8'),{},false); fn($); fs.writeFileSync(p,$.html()); };
const services = [
 ['IDF Base Celebrations','idf-base-celebrations','/assets/uploads/2026/09/idf-event-768x768.png','An exclusive celebration on a real IDF base.'],
 ['Customized Weddings','customized-weddings','/assets/uploads/2025/12/f-scaled.jpg','Full-service · Day-of-the-Event Coordinator · Booking agent'],
 ['Bar/Bat Mitzvot','customized-bar-bat-mitzvot','/assets/uploads/elementor/thumbs/bar-mitzva-rebcka1bj4jwl1ebfeedv51sd2gll3y83jfazu8j0k.jpg','Meaningful milestones, uniquely theirs.'],
 ['Smart Value: Associate Coordinator','contact-us','/assets/uploads/2025/11/Risa-Working-768x768.jpg','Full expertise, oversight, and quality control at a reduced rate—with Risa’s supervision.'],
 ['Baby Celebrations','baby-celebrations','/assets/uploads/2025/11/LRB_0135-1024x683.jpg','Welcome your newest blessing.'],
 ['Community & Corporate Events','community-corporate-events','/assets/uploads/2025/11/Screenshot_20230820_224539_Facebook.jpg','Experiences that bring people together.'],
 ['Private Parties & Israeli Experiences','private-parties-israeli-experiences','/assets/uploads/2025/11/pic_9.jpg','Extraordinary gatherings and Israeli adventures.']
];
const news = `<section class="fab-news" aria-label="Exclusive opportunities"><div class="fab-section-shell fab-news-grid"><article class="fab-news-item"><p class="fab-news-label">NEWSFLASH · SMART VALUE</p><h2>Associate Coordinator</h2><p>With my supervision: full expertise, oversight, and quality control at a reduced rate.</p><a href="/contact-us/#contact-opportunities">Let’s talk about your event ↗</a></article><article class="fab-news-item fab-news-idf"><p class="fab-news-label">NEWSFLASH · EXCLUSIVE OPPORTUNITY</p><h2>Your celebration on an IDF base</h2><p>A meaningful Israeli experience, exclusively with FAB Events by Risa.</p><a href="/idf-base-celebrations/">Discover IDF Base Celebrations ↗</a></article></div></section>`;
// A dependable shared navigation replaces the broken Elementor menu and giant pink toggle.
const navItems=services.map((s,i)=>`<a href="/${i===3?'our-services/#smart-value-associate':s[1]+'/'}">${i===1?'Weddings':s[0]}</a>`).join('');
fs.writeFileSync('src/data/layout/header.html',`<header class="fab-site-header"><div class="fab-nav-shell"><a class="fab-site-logo" href="/" aria-label="FAB Events by Risa — Home"><img src="/assets/uploads/2025/10/new-2-e1761740183464.png" width="800" height="419" alt="FAB Events by Risa"></a><nav class="fab-site-nav" aria-label="Main navigation"><a href="/">Home</a><a href="/about-us/">About Us</a><details class="fab-services-dropdown"><summary>Our Services</summary><div class="fab-dropdown-links"><a href="/our-services/">All services</a>${navItems}</div></details><a href="/testimonials/">Testimonials</a><a href="/contact-us/">Contact Us</a></nav></div></header>`);
edit('testimonials',$=>{
 $('.fab-review-grid figure').each((i,el)=>{ const q=$(el).find('blockquote').prop('outerHTML'), c=$(el).find('figcaption').prop('outerHTML'); $(el).html(`<div class="fab-event-photo" role="img" aria-label="Space reserved for event photo"><span>Event photo</span></div><div class="fab-speech">${q}${c}</div>`); });
 $('.fab-review-grid').append(`<figure><div class="fab-event-photo" role="img" aria-label="Space reserved for film premiere photo"><span>Premiere photo</span></div><div class="fab-speech"><blockquote>“I had a fantastic experience working with Risa Shapiro and Fab Events to create a week of premieres around Israel for our film. Guns &amp; Moses is a high impact thriller about Jewish security that comes at a dramatic moment in our shared history, and Risa was the perfect partner to help us build an emotional bridge between the American and Israeli Jewish communities.”</blockquote><figcaption>— Salvador Litvak, Director of Hollywood movie <cite>Guns &amp; Moses</cite></figcaption></div></figure>`);
});
edit('baby-celebrations',$=>{
 const box=$('.fab-detail-grid article').filter((i,e)=>$(e).find('h3').text()==='Full Coordination').remove();
 $('.fab-service-story h2').first().replaceWith(`<div class="fab-baby-heading"><h2>What I coordinate for your baby’s milestone</h2><aside class="fab-baby-coordination">${box.html()}</aside></div>`);
});
edit('private-parties-israeli-experiences',$=>{
 $('.fab-service-hero-copy .fab-kicker').first().remove();
 $('.fab-service-hero h1').html('Private Parties &amp;<br>Israeli Experiences');
 $('.fab-service-hero h1').after('<p class="fab-private-tagline">Extraordinary celebrations. Uniquely yours.</p>');
});
edit('idf-base-celebrations',$=>{
 let seen=false; $('p').each((i,e)=>{ if($(e).text().startsWith('Imagine your child celebrating')){ if(seen)$(e).remove();seen=true; }});
});
edit('day-of-the-event-coordinator',$=>{
 $('h1').first().html('Relax. Celebrate.<br><span>We’ll handle the rest.</span>');
 const hero=$('h1').first().closest('section');hero.addClass('fab-day-hero');
 const items=$('.elementor-element-4f59b28 .elementor-icon-box-wrapper').toArray().map(e=>`<article><h3>${$(e).find('h3').text().trim()}</h3><p>${$(e).find('.elementor-icon-box-description').text().trim()}</p></article>`).join('');
 $('.elementor-element-4f59b28').replaceWith(`<div class="fab-coordination-list">${items}<article class="fab-coordination-offer"><p class="fab-news-label">SMART VALUE</p><h3>Associate Coordinator</h3><p>With my supervision. Full expertise, oversight, and quality control at a reduced rate.</p><a href="/contact-us/">Ask about this option ↗</a></article></div>`);
});
edit('customized-bar-bat-mitzvot',$=>{
 $('h1').first().html('Put the <em>Mitzvah</em> back into the Bar/Bat Mitzvah!').addClass('fab-mitzvah-headline');
 const grid=$('.elementor-element-6223b6b');
 const titles=grid.find('.elementor-icon-box-title').toArray().map(e=>$(e).text().trim());
 if(titles.length!==7)throw Error('Expected seven Mitzvah experiences, got '+titles.length);
 grid.replaceWith(`<section class="fab-mitzvah-experiences" aria-label="Celebration experiences"><ul>${titles.map(t=>`<li>${t}</li>`).join('')}</ul></section>`);
});
edit('our-services',$=>{
 $('.elementor-element-5af0462').replaceWith(`<section class="fab-service-directory"><div class="fab-section-shell"><div class="fab-directory-grid">${services.map((s,i)=>`<article ${i===3?'id="smart-value-associate"':''}><a href="/${s[1]}/"><img src="${s[2]}" alt="${s[0]}" loading="lazy"><h2>${s[0]}</h2></a>${i===1?'<ul class="fab-wedding-options"><li>Full-service</li><li>Day-of-the-Event Coordinator</li><li>Booking agent</li></ul>':`<p>${s[3]}</p>`}</article>`).join('')}</div></div></section>`);
});
edit('contact-us',$=>{ $('section').first().after(news.replace('class="fab-news"','id="contact-opportunities" class="fab-news"')); });
edit('home',$=>{
 $('.fab-services-circles').after(`<a class="fab-smart-home" href="/contact-us/"><strong>Smart Value: Associate Coordinator</strong><span>With my supervision. Full expertise, oversight, and quality control at a reduced rate.</span><b>Find out more ↗</b></a>`);
 $('.fab-home-services').after(news);
 $('.elementor-element-66ecb51 .elementor-button-text').text('Let’s Connect');
 $('.elementor-button-text').filter((i,e)=>$(e).text().trim()==='Meet Risa').text('Let’s Connect').closest('a').attr('href','/contact-us/');
 $('.fab-why-copy .fab-kicker').replaceWith('<h2 id="fab-why-heading">Why I Do What I Do</h2>');
 $('.fab-why-copy h2').filter((i,e)=>$(e).text().startsWith('Life gives')).replaceWith('<p class="fab-why-statement">Life gives us only a handful of truly unforgettable celebrations.</p>');
 $('.fab-places-section').html(`<div class="fab-section-shell fab-travel-layout"><div><p class="fab-kicker">Israel &amp; around the world</p><h2>Meaningful celebrations.<br><em>Without borders.</em></h2><p>From Jerusalem to your hometown, thoughtful planning and warm care travel with you.</p><a class="fab-travel-callout" href="/customized-weddings/"><strong>Destination Weddings</strong><span>A celebration worth the journey ↗</span></a><a class="fab-travel-callout" href="/contact-us/"><strong>We bring a taste of Israel to your hometown</strong><span>Let’s create your celebration ↗</span></a></div><div class="fab-route-diagram"><p>Connected by celebration</p><svg viewBox="0 0 620 430" role="img" aria-label="Celebration routes connecting America, London in England, Rome, Tel Aviv, Netanya and Jerusalem"><g fill="none" stroke="#d7b65d" stroke-width="2"><ellipse cx="310" cy="215" rx="275" ry="175"/><ellipse cx="310" cy="215" rx="150" ry="175"/><path d="M35 215h550M65 135h490M65 295h490" opacity=".25"/><path d="M100 200Q230 20 435 295M100 200Q280 90 380 110Q475 145 435 295M315 175Q435 160 435 295M465 240L435 295M500 185L435 295" stroke-dasharray="5 5"/></g><g fill="#ffe39a" stroke="#fff" stroke-width="3"><circle cx="100" cy="200" r="7"/><circle cx="380" cy="110" r="7"/><circle cx="315" cy="175" r="7"/><circle cx="465" cy="240" r="7"/><circle cx="500" cy="185" r="7"/><circle cx="435" cy="295" r="10"/></g><g fill="#fff9e7" font-family="Poppins, sans-serif" font-size="19"><text x="45" y="235">America</text><text x="50" y="261" font-size="13">New York · L.A.</text><text x="295" y=" eighty" opacity="0"> </text><text x="315" y="78">London, England</text><text x="265" y="154">Rome</text><text x="467" y="225">Tel Aviv</text><text x="466" y="165">Netanya</text><text x="360" y="335" font-size="26">Jerusalem</text></g></svg><p class="fab-route-note">A world of possibilities, with Israel at heart.</p></div></div>`);
 $('.fab-places-section').attr('aria-label','Destination celebrations').removeAttr('aria-labelledby');
});
