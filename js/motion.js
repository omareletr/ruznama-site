/* Motion, with GSAP and ScrollTrigger, and Lenis as the one smooth scroll. Transform and opacity
   only; the moves are the app's own where it has one (the lantern running Fajr to now, lapis
   spreading from a seal's centre, words inking in, the Bismillah inking from the right). With
   Reduce Motion none of it runs and every part stands in its final state. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;

  // The line that inks in: split into words, the whole sentence kept as the heading's name.
  $$('[data-words]').forEach(function (h) {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    var out = [];
    h.childNodes.forEach(function (n) {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { out.push(doc.createTextNode(' ')); return; }
        var s = doc.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); s.textContent = w; out.push(s);
      });
      else out.push(n.cloneNode(true));
    });
    h.replaceChildren.apply(h, out);
  });

  // Anchor links scroll the page; with Lenis, smoothly, clear of the bar.
  var lenis = null;
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href'), target = id === '#top' ? doc.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -64, duration: 1.2 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    if (id !== '#top' && target.focus) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
  });

  // The bar takes the page's paper once the hero is behind it, and marks where you are.
  var nav = $('#nav'), hero = $('.hero');
  var links = $$('.nav-links a');
  function onScroll() {
    var y = window.scrollY;
    if (nav && hero) nav.classList.toggle('is-past', y > hero.offsetHeight - 80);
    var here = null;
    links.forEach(function (l) { var t = $(l.getAttribute('href')); if (t && t.getBoundingClientRect().top < 160) here = l; });
    links.forEach(function (l) { l.classList.toggle('is-here', l === here); if (l === here) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (reduce || !gsap || !ST) return;
  gsap.registerPlugin(ST);
  var ease = 'expo.out';

  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.12, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) lenis.stop(); else lenis.start(); });
  }

  var wide = window.matchMedia('(min-width: 1101px)');

  // The opening: the page rises, its rows land one by one, the lantern runs Fajr to now.
  var today = $('[data-page="today"]');
  var intro = gsap.timeline({ defaults: { ease: ease } });
  intro.from('.hero-a', { x: -28, opacity: 0, duration: 0.9 }, 0)
       .from('.hero-b', { x: 28, opacity: 0, duration: 0.9 }, 0.06)
       .from('.reel', { y: 40, opacity: 0, duration: 1.1 }, 0.1);
  if (today) {
    intro.from($$('.pg-top, .pg-head, .pl, .hs, .pg-sec', today), { y: 14, opacity: 0, duration: 0.7, stagger: 0.07 }, 0.3);
    var lantern = $('[data-lantern]', today), fill = $('.pl-fill', today);
    if (lantern && fill) {
      intro.from(fill, { scaleX: 0, duration: 1.3, ease: 'power3.inOut' }, 0.55)
           .from(lantern, { x: function () { return -lantern.offsetLeft; }, duration: 1.3, ease: 'power3.inOut' }, 0.55);
    }
  }
  intro.from('.hero-foot > *, .hero-note', { y: 16, opacity: 0, duration: 0.8, stagger: 0.08 }, 0.5);

  // The reel: the days pass through the sentence as the page scrolls, holding on each.
  function stepSize() {
    var f = $('.reel .frame'); if (!f) return 0;
    return f.getBoundingClientRect().height + parseFloat(getComputedStyle($('.reel')).getPropertyValue('--gap'));
  }
  var reelTl = null;
  function buildReel() {
    if (reelTl) { reelTl.scrollTrigger && reelTl.scrollTrigger.kill(); reelTl.kill(); reelTl = null; gsap.set('.reel-strip', { clearProps: 'transform' }); }
    if (!wide.matches) return;
    reelTl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true } });
    reelTl.to({}, { duration: 0.35 })
      .to('.reel-strip', { y: function () { return -stepSize(); }, duration: 1, ease: 'power2.inOut' })
      .to({}, { duration: 0.35 })
      .to('.reel-strip', { y: function () { return -2 * stepSize(); }, duration: 1, ease: 'power2.inOut' })
      .to({}, { duration: 0.35 });
  }
  buildReel();
  wide.addEventListener('change', function () { buildReel(); ST.refresh(); });

  // Each section's parts come in once: the heading, then the words, then the picture.
  function entrance(section, parts, opts) {
    var els = $$(parts, section);
    if (!els.length) return;
    gsap.from(els, Object.assign({ y: 26, opacity: 0, duration: 0.9, ease: ease, stagger: 0.08,
      scrollTrigger: { trigger: section, start: 'top 78%', once: true } }, opts || {}));
  }
  entrance($('.fields'), '.field-h, .mini, .clause', { stagger: 0.06 });
  entrance($('.plate'), '.plate-h, .plate-panel, .note');
  entrance($('.capture'), '.capture-lead > *');
  $$('.mod').forEach(function (m) { entrance(m, '.mod-panel, .mod-text'); });
  entrance($('.prayer'), '.prayer-lead > *, .demo, .demo-hint');
  entrance($('.moment'), '.moment-pic, .moment-text > *');
  entrance($('.both'), '.both-lead > *');
  entrance($('.both-lists'), '.both-lists > div');
  entrance($('.private'), '.private h2, .private-text > *');
  entrance($('.reveal'), '.reveal-sub');

  // How a task lives, told left to right: the tally ticks, turns red, then the box fills.
  var f4 = $('.f4 [data-autocheck]');
  ST.create({ trigger: '.fields', start: 'top 60%', once: true, onEnter: function () {
    $$('.fields .tick').forEach(function (t, i) { gsap.from(t, { scale: 1.6, opacity: 0, duration: 0.5, delay: 0.5 + i * 0.35, ease: 'back.out(2)' }); });
    gsap.from('.stale-note', { y: 6, opacity: 0, duration: 0.5, delay: 1.0, ease: ease });
    if (f4) { f4.classList.remove('is-done'); setTimeout(function () { f4.classList.add('is-done'); }, 1500); }
  } });

  // The words ink from faint to full as they cross the middle of the screen.
  $$('[data-words]').forEach(function (h) {
    var words = $$('.w', h);
    gsap.set(words, { opacity: 0.28 });
    gsap.to(words, { opacity: 1, ease: 'none', stagger: 0.12,
      scrollTrigger: { trigger: h, start: 'top 82%', end: 'bottom 45%', scrub: 0.4 } });
  });

  // The habits panel: its kept seals light one after another, the star filling with them.
  var plate = $('[data-plate]');
  if (plate) {
    var kept = $$('.hb.is-kept', plate);
    kept.forEach(function (hb) { hb.classList.remove('is-kept'); hb.classList.add('was-kept'); });
    var star = $('[data-star] svg', plate), rects = star ? $$('rect', star) : [];
    rects.forEach(function (r) { r.classList.remove('on'); });
    ST.create({ trigger: plate, start: 'top 65%', once: true, onEnter: function () {
      kept.forEach(function (hb, i) {
        setTimeout(function () {
          hb.classList.add('is-kept');
          var share = (i + 1) / 5, lit = Math.round(share * rects.length);
          rects.forEach(function (r) { var n = +r.getAttribute('data-i'); r.style.transition = 'fill 0s linear ' + Math.round(n / rects.length * 240) + 'ms'; r.classList.toggle('on', n < lit); });
        }, 500 + i * 260);
      });
    } });
  }

  // Two tasks in one breath: the line inks in as it's said, then is cut in two and filed.
  var split = $('[data-split]');
  if (split) {
    var said = $('[data-said]', split), out = $('.split-out', split);
    var words = said.textContent.trim().split(' ');
    said.replaceChildren.apply(said, words.map(function (w, i) {
      var s = doc.createElement('span'); s.className = 'tk'; s.textContent = w + (i < words.length - 1 ? ' ' : ''); return s;
    }));
    var tks = $$('.tk', said);
    gsap.set(tks, { opacity: 0 }); gsap.set(out, { opacity: 0 });
    var outLines = $$('.pg-sh, .ln', out);
    ST.create({ trigger: split, start: 'top 75%', once: true, onEnter: function () {
      gsap.timeline()
        .to(tks, { opacity: 1, duration: 0.25, stagger: 0.16, ease: 'none' })
        .to(said, { opacity: 0.38, duration: 0.4, ease: ease }, '+=0.7')
        .set(out, { opacity: 1 })
        .from(outLines, { y: 10, opacity: 0, duration: 0.6, stagger: 0.09, ease: ease }, '<');
    } });
  }

  // The prayer demo opens at Fajr and runs to now, as a new day does.
  var RZ = window.RZ;
  if (RZ && RZ.demo) {
    var target = RZ.demo.minutes(), fajr = RZ.todayTimes.fajr, from = fajr.getHours() * 60 + fajr.getMinutes();
    if (target > from) {
      RZ.demo.set(from);
      var run = { m: from };
      ST.create({ trigger: '.demo', start: 'top 70%', once: true, onEnter: function () {
        gsap.to(run, { m: target, duration: 1.6, ease: 'power3.inOut', onUpdate: function () { RZ.demo.set(Math.round(run.m)); } });
      } });
    }
  }

  // The one moving picture: the Mac settles as it scrolls in, the iPhone rising over it.
  gsap.fromTo('.both-mac', { scale: 1.06, transformOrigin: '50% 100%' }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.both-pics', start: 'top bottom', end: 'center 55%', scrub: 0.5 } });
  gsap.fromTo('.both-phone', { y: 90 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '.both-pics', start: 'top bottom', end: 'bottom 70%', scrub: 0.5 } });

  // The first page: the Bismillah inks in from the right in 1s.
  var basmala = $('[data-basmala]');
  if (basmala) {
    gsap.set(basmala, { clipPath: 'inset(0 0 0 100%)' });
    ST.create({ trigger: '.start-page', start: 'top 70%', once: true, onEnter: function () {
      gsap.to(basmala, { clipPath: 'inset(0 0 0 0%)', duration: 1, ease: 'power2.inOut', delay: 0.4 });
    } });
  }

  // Measurements change as fonts and pictures arrive.
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ST.refresh(); if (RZ && RZ.place) $$('[data-pl]').forEach(RZ.place); });
  window.addEventListener('load', function () { ST.refresh(); });
})();
