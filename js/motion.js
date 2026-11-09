/* Motion, with GSAP and ScrollTrigger, and Lenis as the one smooth scroll. Transform and opacity
   only; the moves are the app's own where it has one (the lantern running Fajr to now, lapis
   spreading from a seal's centre, words inking in, the Bismillah inking from the right). With
   Reduce Motion none of it runs and every part stands in its final state. */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=0/.test(location.search);
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

  // The bar takes the page's paper once the hero is behind it, and marks where you are. Over a section
  // that flips day and night (cream after Maghrib, black by day) it takes that section's paper too, or
  // its glass stands there as a grey slab.
  var nav = $('#nav'), hero = $('.hero');
  var links = $$('.nav-links a'), flips = $$('section.tone-flip');
  function onScroll() {
    var y = window.scrollY;
    if (nav && hero) nav.classList.toggle('is-past', y > hero.offsetHeight - 80);
    if (nav) {
      var r = nav.getBoundingClientRect(), mid = r.top + r.height / 2;
      nav.classList.toggle('tone-flip', flips.some(function (s) { var b = s.getBoundingClientRect(); return b.top <= mid && b.bottom > mid; }));
    }
    var here = null;
    links.forEach(function (l) { var t = $(l.getAttribute('href')); if (t && t.getBoundingClientRect().top < 160) here = l; });
    links.forEach(function (l) { l.classList.toggle('is-here', l === here); if (l === here) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // The bar's one button goes straight to the beta for this device; anywhere else, to the buttons at the foot.
  var get = $('[data-get]'), ua = navigator.userAgent;
  if (get) {
    var to = /iPhone|iPod/.test(ua) ? $('.store-phone') : (/Macintosh/.test(ua) && navigator.maxTouchPoints < 2) ? $('.store-mac') : null;
    if (to) { get.href = to.href; if (to.classList.contains('store-mac')) get.textContent = 'Download for Mac'; }
  }

  // Homebrew's line copies itself, and says so for a moment.
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(b.getAttribute('data-copy')).then(function () {
        b.textContent = 'Copied'; clearTimeout(b._t); b._t = setTimeout(function () { b.textContent = 'Copy'; }, 1600);
      });
    });
  });

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

  // No section fades up on its way in: text and pictures stand from the start, and motion is kept
  // for what the app itself does (pages turning, a task carried, seals lighting, words inking).

  // How a task lives: the days stand in a row, the page in front square to you and the others
  // turned away on either side, as when you swipe between pages in the app. At 4am the row moves on
  // one and the task is already on the page that comes round. Drawn from the scroll alone (t runs
  // 0 to 10 beats), so scrolling back plays it backwards.
  (function () {
    var scene = $('[data-how]'); if (!scene) return;
    var section = scene.closest('.how'), pages = $$('.leaf', scene), steps = $$('[data-steps] li', section);
    var task = $('[data-task]', scene), mg = $('[data-task-mg]', task), doneAt = mg.textContent;
    // When the row moves on, in beats: the first day slowly, six quick ones, then into today.
    var SEG = [[1.3, 2.5]];
    for (var n = 1; n <= 7; n++) SEG[n] = [3.1 + (n - 1) * 0.36, 3.1 + (n - 1) * 0.36 + 0.7];
    SEG[8] = [6.9, 8.0];
    var TICK = 8.5, STEP_AT = [0, 1.4, 2.9, 5.75, 7.2], STEP = 250;
    function measure() { STEP = parseFloat(getComputedStyle(scene).getPropertyValue('--step')) || 250; }
    measure();
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function inout(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
    function pos(t) { var p = 0; for (var i = 0; i < SEG.length; i++) p += inout(clamp((t - SEG[i][0]) / (SEG[i][1] - SEG[i][0]))); return p; }
    var was = { step: -1, done: null };
    function render(t) {
      var p = pos(t);
      for (var i = 0; i < pages.length; i++) {
        var o = i - p, a = Math.abs(o), side = o < 0 ? -1 : 1, c = Math.min(a, 1), pg = pages[i];
        var x = a <= 1 ? o * STEP : side * (STEP + (a - 1) * STEP * 0.24);
        pg.style.transform = 'translateX(' + x.toFixed(1) + 'px) translateZ(' + (-c * 180 - Math.max(0, a - 1) * 34).toFixed(1) + 'px) rotateY(' + (-side * c * 52).toFixed(2) + 'deg)';
        pg.style.visibility = a > 3.4 ? 'hidden' : 'visible';
        pg.style.opacity = a > 2.4 ? Math.max(0, 3.4 - a).toFixed(3) : 1;
        pg.style.setProperty('--s', (c * 0.07).toFixed(3));
      }
      var done = t >= TICK;
      if (done !== was.done) {
        was.done = done;
        task.classList.toggle('is-done', done);
        task.classList.toggle('is-stale', !done);
        mg.textContent = done ? doneAt : '+9';
      }
      var step = 0; STEP_AT.forEach(function (at, k) { if (t >= at) step = k; });
      if (step !== was.step) { steps.forEach(function (li, k) { li.classList.toggle('is-on', k === step); }); was.step = step; }
    }
    section.classList.add('is-live');
    var state = { t: 0 };
    render(0);
    gsap.to(state, { t: 10, ease: 'none', onUpdate: function () { render(state.t); },
      scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5, invalidateOnRefresh: true, onRefresh: function () { measure(); render(state.t); } } });
  })();

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
    var outLines = $$('.pg-sh, .ln', out);
    ST.create({ trigger: split, start: 'top 92%', once: true, onEnter: function () {
      gsap.timeline()
        .set(tks, { opacity: 0.2 }).set(out, { opacity: 0 })
        .to(tks, { opacity: 1, duration: 0.25, stagger: 0.16, ease: 'none' }, 0.3)
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

  // The devices: the Mac's lid opens as it scrolls in, and the iPhone turns to face you beside it.
  // Played, not scrubbed, 75px of scroll before the whole Mac is on screen, so it opens as the base comes in; back out above it.
  var devices = gsap.timeline({ paused: true })
    .fromTo('.mac-lid', { rotateX: -84 }, { rotateX: 0, duration: 1.4, ease: 'power3.inOut' }, 0)
    .fromTo('.iphone', { y: 110, rotateY: -28, rotateX: 8, opacity: 0 }, { y: 0, rotateY: 0, rotateX: 0, opacity: 1, duration: 1.1, ease: 'power3.out' }, 0.45);
  ST.create({ trigger: '.both-pics', start: 'bottom 94%+=75', onEnter: function () { devices.play(); }, onLeaveBack: function () { devices.reverse(); } });

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
