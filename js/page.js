/* Rūznāma's page: the visitor's dates, prayer line and the app's fragments that work.
   Every rule here is the app's own (CLAUDE.md): 4am days, Hijri at Maghrib, +N from two days,
   red past a week, صح when Today is all ticked, the star filling as habits are kept. */
(function () {
  'use strict';
  var RZ = window.RZ;
  if (!RZ) return;
  var doc = document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=0/.test(location.search);

  // Clock: follow the visitor's system, as the app's Follow System does; 12-hour has no AM or PM.
  var twelve = false;
  try { twelve = /h12|h11/.test(new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle || ''); } catch (e) {}
  function clock(date, h12) {
    var h = date.getHours(), m = date.getMinutes();
    if (h12) { h = h % 12 || 12; return h + ':' + (m < 10 ? '0' : '') + m; }
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  var dayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
  var monthName = new Intl.DateTimeFormat('en-GB', { month: 'long' });
  function pageDate(date) { return dayName.format(date) + ', ' + date.getDate() + ' ' + monthName.format(date); }
  var hijriFmt = null;
  try { hijriFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) {}
  function hijri(date) {
    if (!hijriFmt) return '';
    var parts = hijriFmt.formatToParts(date), d = '', m = '', y = '';
    parts.forEach(function (p) { if (p.type === 'day') d = p.value; if (p.type === 'month') m = p.value; if (p.type === 'year') y = p.value; });
    return d + ' ' + m + ' ' + y;
  }

  // Done times written in the page follow the visitor's clock too.
  $$('.mg').forEach(function (el) {
    var m = /^(\d{2}):(\d{2})$/.exec(el.textContent.trim());
    if (m) el.textContent = clock(new Date(2000, 0, 1, +m[1], +m[2]), twelve);
  });
  var held = /[?&]at=/.test(location.search);
  var nowish = function () { return held ? RZ.now : new Date(); };

  var today = RZ.logicalDay;
  var add = RZ.addDays;
  var afterMaghrib = RZ.now >= RZ.todayTimes.maghrib;

  // Dates on every page, counted from the visitor's Today.
  $$('[data-date]').forEach(function (el) { el.textContent = pageDate(add(today, +el.getAttribute('data-date'))); });
  $$('[data-weekday]').forEach(function (el) { el.textContent = dayName.format(add(today, +el.getAttribute('data-weekday'))); });
  $$('[data-hijri]').forEach(function (el) {
    var n = +el.getAttribute('data-hijri');
    // Today's Hijri date steps on at Maghrib; past pages and Tomorrow keep their own.
    el.textContent = hijri(add(today, n + (n === 0 && afterMaghrib ? 1 : 0)));
  });
  function nextWeekday(from, wd) { var d = add(from, 0); while (d.getDay() !== wd) d = add(d, 1); return d; }
  var ahead = { fri: nextWeekday(add(today, 2), 5), sun: nextWeekday(add(today, 2), 0), month: new Date(today.getFullYear(), today.getMonth() + 1, 1) };
  $$('[data-ahead]').forEach(function (el) { el.textContent = pageDate(ahead[el.getAttribute('data-ahead')]); });
  $$('[data-ahead-hijri]').forEach(function (el) { el.textContent = hijri(ahead[el.getAttribute('data-ahead-hijri')]); });

  var note = $('[data-place]');
  if (note) note.textContent = RZ.zone
    ? 'This is today’s page, with the prayer times for ' + RZ.zone[2] + ', guessed from your time zone. Try ticking something off.'
    : 'This is today’s page, with today’s date. Try ticking something off.';

  // The prayer line (PrayerLine, PrayerLineScale): Fajr to Isha over 88% of its length, the night after.
  var ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var INITIAL = { fajr: 'F', dhuhr: 'D', asr: 'A', maghrib: 'M', isha: 'I' };
  function scale(times, nextFajr) {
    var day = 0.88;
    return function (date) {
      var t = +date, f = +times.fajr, i = +times.isha, n = +nextFajr;
      if (t < f) return day + (1 - day) * Math.min(1, Math.max(0, (t - (i - 86400000)) / (f - (i - 86400000))));
      if (t <= i) return day * (t - f) / (i - f);
      return day + (1 - day) * Math.min(1, (t - i) / (n - i));
    };
  }
  function drawLine(el, times, nextFajr, now, h12) {
    var pos = scale(times, nextFajr), here = pos(now);
    var current = 'isha';
    ORDER.forEach(function (p) { if (times[p] <= now) current = p; });
    if (now < times.fajr) current = 'isha';
    var html = '<div class="pl-track"><i class="pl-base"></i><i class="pl-fill" style="width:calc((100% - 2.5px) * ' + here.toFixed(4) + ')"></i>';
    ORDER.forEach(function (p) {
      var x = pos(times[p]), covered = Math.abs(x - here) < 0.022;
      html += '<i class="pl-dot' + (times[p] <= now ? ' is-begun' : '') + '" style="left:calc(2.5px + (100% - 5px) * ' + x.toFixed(4) + ');' + (covered ? 'opacity:0' : '') + '"></i>';
    });
    if (RZ.zone) html += '<i class="pl-sun' + (times.sunrise <= now ? ' is-begun' : '') + '" style="left:calc(2.5px + (100% - 5px) * ' + pos(times.sunrise).toFixed(4) + ')"></i>';
    html += '<span class="pl-lantern" data-lantern style="left:calc(2.5px + (100% - 5px) * ' + here.toFixed(4) + ')">' + LANTERN + '</span></div>';
    var initials = '', clocks = '';
    ORDER.forEach(function (p) {
      var cls = p === current ? 'is-now' : (times[p] <= now ? 'is-past' : '');
      initials += '<span class="' + cls + '" data-x="' + pos(times[p]) + '">' + (p === 'dhuhr' && now.getDay() === 5 ? 'J' : INITIAL[p]) + '</span>';
      if (RZ.zone) clocks += '<span class="' + cls + '" data-x="' + pos(times[p]) + '">' + clock(times[p], h12) + '</span>';
    });
    html += '<div class="pl-row pl-initials">' + initials + '</div>' + (clocks ? '<div class="pl-row pl-times">' + clocks + '</div>' : '');
    el.innerHTML = html;
    el.setAttribute('aria-label', RZ.zone
      ? 'Prayer line: ' + ORDER.map(function (p) { return p[0].toUpperCase() + p.slice(1) + ' ' + clock(times[p], h12); }).join(', ')
      : 'Prayer line, without times');
    place(el);
  }
  // Each label centred under its dot; neighbours that would touch part evenly (BalancedTrack).
  function place(el) {
    var w = el.clientWidth;
    if (!w) return;
    $$('.pl-row', el).forEach(function (row) {
      var spans = $$('span', row), items = spans.map(function (s) {
        var width = s.offsetWidth; return { s: s, w: width, x: 2.5 + (w - 5) * (+s.getAttribute('data-x')) - width / 2 };
      });
      for (var pass = 0; pass < 4; pass++) for (var i = 1; i < items.length; i++) {
        var a = items[i - 1], b = items[i], overlap = a.x + a.w + 6 - b.x;
        if (overlap > 0) { a.x -= overlap / 2; b.x += overlap / 2; }
      }
      items.forEach(function (it) { it.x = Math.max(0, Math.min(w - it.w, it.x)); it.s.style.left = it.x + 'px'; });
    });
  }
  var LANTERN = (function () {
    var rows = ['...#...', '..###..', '.#####.', '.#...#.', '.#.#.#.', '.#...#.', '..###..'], r = '';
    rows.forEach(function (row, y) { for (var x = 0; x < row.length; x++) if (row[x] === '#') r += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>'; });
    return '<svg class="px lantern" viewBox="0 0 7 7" aria-hidden="true">' + r + '</svg>';
  })();
  function drawAllLines() {
    $$('[data-pl]').forEach(function (el) { if (!el.hasAttribute('data-demo-line')) drawLine(el, RZ.times, RZ.nextFajr, RZ.now, twelve); });
    $$('.pg [data-date="0"]').forEach(function () {});
  }
  drawAllLines();
  window.addEventListener('resize', function () { $$('[data-pl]').forEach(place); });

  // The star: its squares lit, centre first, as the day's habits are kept.
  function setStar(svg, share) {
    if (!svg) return;
    var rects = $$('rect', svg), lit = Math.round(share * rects.length);
    rects.forEach(function (r) {
      var i = +r.getAttribute('data-i'), on = i < lit;
      r.style.transition = reduce ? 'none' : 'fill 0s linear ' + Math.round(400 * (on ? i / rects.length : (rects.length - i) / rects.length) * 0.6) + 'ms';
      r.classList.toggle('on', on);
    });
  }

  // Habits: a click keeps it at once and lapis spreads from the seal's centre in 0.4s.
  function wireStrip(strip, starHost) {
    if (!strip) return;
    function refresh() {
      var habits = $$('.hb', strip), kept = habits.filter(function (h) { return h.classList.contains('is-kept'); }).length;
      setStar(starHost && $('svg', starHost), kept / habits.length);
    }
    $$('button.hb', strip).forEach(function (hb) {
      hb.addEventListener('click', function () {
        if (hb.classList.contains('is-rest')) return;
        var kept = !hb.classList.contains('is-kept');
        hb.classList.toggle('is-kept', kept);
        hb.setAttribute('aria-pressed', String(kept));
        var squares = $$('.run i', hb), last = squares[squares.length - 1];
        if (last) last.classList.toggle('k', kept);
        var fig = $('.run b', hb);
        if (fig && hb.hasAttribute('data-run')) { var n = +hb.getAttribute('data-run'); fig.textContent = kept ? n : n - 1; }
        if (fig && hb.hasAttribute('data-week')) { fig.textContent = (kept ? 1 : 0) + '/3'; }
        refresh();
      });
      var name = $('.hb-name', hb).textContent;
      hb.setAttribute('aria-label', name);
    });
    refresh();
  }
  wireStrip($('[data-page="today"] [data-strip]'), $('[data-page="today"] [data-star]'));
  wireStrip($('[data-plate] [data-strip]'), $('[data-plate] [data-star]'));

  // Today's lines: a tick answers at once; the line stays put, the strike draws across, the time
  // slides in; Tomorrow loses what's done; with everything ticked, صح.
  var todayPage = $('[data-page="today"]');
  var tomorrowPage = $('[data-page="tomorrow"]');
  function tallies(page) {
    $$('[data-sec]', page).forEach(function (sec) {
      var lines = $$('.ln', sec), done = lines.filter(function (l) { return l.classList.contains('is-done'); }).length;
      var t = $('.pg-tally', sec); if (t) t.textContent = done + '/' + lines.length;
    });
    var all = $$('.ln', page).every(function (l) { return l.classList.contains('is-done'); });
    var was = page.classList.contains('is-all-done');
    page.classList.toggle('is-all-done', all);
    // The frame crops the page's foot; with the last tick it runs up to show صح.
    if (all && !was && page.scrollHeight > page.clientHeight + 4) {
      setTimeout(function () { page.scrollTo({ top: page.scrollHeight, behavior: reduce ? 'auto' : 'smooth' }); }, 120);
    }
  }
  function syncTomorrow() {
    if (!tomorrowPage) return;
    var open = 0;
    $$('[data-copy]', tomorrowPage).forEach(function (copy) {
      var src = $('[data-line="' + copy.getAttribute('data-copy') + '"]', todayPage);
      var gone = src && src.classList.contains('is-done');
      copy.classList.toggle('is-gone', !!gone);
      if (!gone) open++;
    });
    $$('.pg-sec', tomorrowPage).forEach(function (sec) {
      var t = $('[data-open-in]', sec); if (t) t.textContent = $$('.ln:not(.is-gone)', sec).length;
    });
    var c = $('[data-open]', tomorrowPage); if (c) c.textContent = open + ' open';
  }
  if (todayPage) {
    $$('.ln', todayPage).forEach(function (line) {
      var box = $('button.bx', line), words = $('.lt', line).textContent.trim();
      var mg = $('.mg', line), carried = mg && mg.getAttribute('data-carried');
      box.setAttribute('aria-label', words);
      box.addEventListener('click', function () {
        var done = !line.classList.contains('is-done');
        line.classList.toggle('is-done', done);
        box.setAttribute('aria-pressed', String(done));
        if (done) { mg.textContent = clock(nowish(), twelve); mg.classList.remove('is-new'); void mg.offsetWidth; mg.classList.add('is-new'); }
        else { mg.textContent = carried ? '+' + carried : ''; mg.classList.remove('is-new'); }
        tallies(todayPage); syncTomorrow();
      });
    });
    tallies(todayPage); syncTomorrow();
  }

  // The plate: notes point at their part; the menu's rows work.
  var plate = $('[data-plate]');
  if (plate) {
    $$('.note').forEach(function (n) {
      var target = function () { return $('[data-part="' + n.getAttribute('data-for') + '"]', plate) || (n.getAttribute('data-for') === 'run' ? $('[data-part="seal"] .run', plate) : null); };
      var on = function () { var t = target(); if (t) t.classList.add('is-pointed'); };
      var off = function () { var t = target(); if (t) t.classList.remove('is-pointed'); };
      n.addEventListener('mouseenter', on); n.addEventListener('mouseleave', off);
      n.addEventListener('focus', on); n.addEventListener('blur', off);
    });
    var ex = $('[data-ex]', plate);
    var sealNames = [['gym', 'Dumbbell'], ['walk', 'Footprint'], ['swim', 'Pool'], ['ball', 'Ball']], sealAt = 0;
    var rhythms = [['3 times a week', '1/3'], ['Every day', null], ['Weekdays', null]], rhythmAt = 0;
    $$('.menu-item', plate).forEach(function (item) {
      item.addEventListener('click', function () {
        var act = item.getAttribute('data-act');
        if (act === 'keep') { ex.classList.remove('is-rest'); ex.click(); }
        if (act === 'rest') {
          var rest = !ex.classList.contains('is-rest');
          ex.classList.toggle('is-rest', rest);
          item.textContent = rest ? 'Rest ends' : 'Rest all today';
        }
        if (act === 'rhythm') {
          rhythmAt = (rhythmAt + 1) % rhythms.length;
          $('[data-rhythm]', plate).textContent = rhythms[rhythmAt][0];
          var fig = $('.run b', ex);
          if (fig) fig.textContent = rhythms[rhythmAt][1] ? (ex.classList.contains('is-kept') ? '1/3' : '0/3') : '';
        }
        if (act === 'seal') {
          sealAt = (sealAt + 1) % sealNames.length;
          var next = $('template[data-seal="' + sealNames[sealAt][0] + '"]', plate);
          if (next) $('.hb-seal', ex).replaceChildren(next.content.cloneNode(true));
          $('[data-seal-name]', plate).textContent = sealNames[sealAt][1];
        }
        syncMenu();
      });
    });
    var syncMenu = function () {
      var k = $('[data-act="keep"]', plate);
      k.textContent = ex.classList.contains('is-kept') ? 'Not kept today' : 'Keep today';
    };
    ex.addEventListener('click', function () { setTimeout(syncMenu, 0); });
  }

  // The prayer demo: one page and its settings, answering at once.
  var demo = $('[data-demo]');
  if (demo) {
    var page = $('[data-demo-page]', demo), line = $('[data-demo-line]', demo), range = $('[data-time]', demo);
    var state = { minutes: RZ.now.getHours() * 60 + RZ.now.getMinutes(), colour: 'prayer', h12: twelve, line: true };
    var base = RZ.startOfDay(RZ.now), dayTimes = RZ.timesFor(base), nextDay = RZ.timesFor(add(base, 1));
    range.value = state.minutes;
    $$('[data-clock]', demo).forEach(function (b) { b.setAttribute('aria-checked', String((b.getAttribute('data-clock') === '12') === twelve)); });
    function render() {
      var at = new Date(base.getTime() + state.minutes * 60000);
      var night = at >= dayTimes.maghrib || at < dayTimes.fajr;
      var dark = state.colour === 'night' || (state.colour === 'prayer' && night);
      page.classList.toggle('tone-dark', dark); page.classList.toggle('tone-light', !dark);
      $('[data-demo-clock]', demo).textContent = clock(at, state.h12);
      $('[data-time-val]', demo).textContent = clock(at, state.h12);
      range.setAttribute('aria-valuetext', clock(at, state.h12));
      $('[data-demo-hijri]', demo).textContent = hijri(add(base, at >= dayTimes.maghrib ? 1 : 0));
      var times = at < dayTimes.fajr ? RZ.timesFor(add(base, -1)) : dayTimes;
      drawLine(line, times, at < dayTimes.fajr ? dayTimes.fajr : nextDay.fajr, at, state.h12);
      line.classList.toggle('is-hidden', !state.line);
    }
    range.addEventListener('input', function () { state.minutes = +range.value; render(); });
    $$('[data-colour]', demo).forEach(function (b) { b.addEventListener('click', function () {
      state.colour = b.getAttribute('data-colour');
      $$('[data-colour]', demo).forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); });
      render();
    }); });
    $$('[data-clock]', demo).forEach(function (b) { b.addEventListener('click', function () {
      state.h12 = b.getAttribute('data-clock') === '12';
      $$('[data-clock]', demo).forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); });
      render();
    }); });
    $$('[data-toggle]', demo).forEach(function (b) { b.addEventListener('click', function () {
      var on = b.getAttribute('aria-checked') !== 'true', what = b.getAttribute('data-toggle');
      b.setAttribute('aria-checked', String(on));
      if (what === 'line') state.line = on;
      if (what === 'hijri') page.classList.toggle('hide-hijri', !on);
      if (what === 'tally') page.classList.toggle('hide-tally', !on);
      if (what === 'carried') page.classList.toggle('hide-carried', !on);
      render();
    }); });
    render();
    RZ.demo = { set: function (m) { state.minutes = m; range.value = m; render(); }, minutes: function () { return state.minutes; } };
  }

  // Once something has been seen: for the nudges, which wait until a part is on screen.
  function whenSeen(el, fn) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: 0.6 });
    io.observe(el);
  }

  // The habits panel asks for a tap: a lapis ring pulses out from the first seal not yet kept,
  // as a tap-here hint does, only while the panel is on screen and until the strip is first tapped.
  // With Reduce Motion the ring stands still.
  if (plate) {
    var hStrip = $('[data-strip]', plate), hTarget = $('.hb:not(.is-kept)', hStrip), tapped = false, first = true;
    if (hTarget) {
      hStrip.addEventListener('click', function () { tapped = true; hTarget.classList.remove('is-calling'); });
      var call = function (on) {
        if (tapped) return;
        if (on && first) { first = false; setTimeout(function () { if (!tapped) hTarget.classList.add('is-calling'); }, 1800); return; }
        hTarget.classList.toggle('is-calling', on);
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { call(es[0].isIntersecting); }, { threshold: 0.5 }).observe(plate);
      else call(true);
    }
  }

  // The time slider: lapis up to the handle, the day's prayers marked under it, and until it's
  // touched, a faint lantern that leaves the handle and glides on past Maghrib, where the page turns.
  if (demo) {
    var slider = $('[data-time]', demo), marks = $('[data-time-marks]', demo), ghost = $('[data-time-ghost]', demo);
    var THUMB = 24, touched = false, glides = 0, gTimer = null;
    var at = function (m) { return THUMB / 2 + (m / 1439) * (slider.offsetWidth - THUMB); };
    var follow = function () { slider.style.setProperty('--p', (at(+slider.value) / slider.offsetWidth * 100).toFixed(2) + '%'); };
    var base0 = RZ.startOfDay(RZ.now), t0 = RZ.timesFor(base0);
    var minute = function (k) { return (t0[k] - base0) / 60000; };
    var drawMarks = function () {
      if (!marks) return;
      marks.replaceChildren.apply(marks, ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].map(function (k) {
        var s = doc.createElement('span');
        s.textContent = k.charAt(0).toUpperCase(); s.style.left = at(minute(k)) + 'px'; return s;
      }));
    };
    var stop = function () { touched = true; clearTimeout(gTimer); };
    slider.addEventListener('input', follow);
    slider.addEventListener('pointerdown', stop);
    slider.addEventListener('keydown', stop);
    var glide = function () {
      if (touched || glides++ >= 3 || !ghost || !ghost.animate) return;
      var now = +slider.value, to = now < minute('maghrib') ? minute('maghrib') + 25 : minute('fajr');
      ghost.animate([
        { transform: 'translateX(' + at(now) + 'px)', opacity: 0 },
        { opacity: 0.75, offset: 0.12 },
        { opacity: 0.75, offset: 0.78 },
        { transform: 'translateX(' + at(to) + 'px)', opacity: 0 }
      ], { duration: 1700, easing: 'cubic-bezier(.65, 0, .35, 1)' });
      gTimer = setTimeout(glide, 5200);
    };
    drawMarks(); follow();
    window.addEventListener('resize', function () { drawMarks(); follow(); });
    var setDemo = RZ.demo.set;
    RZ.demo.set = function (m) { setDemo(m); follow(); };
    whenSeen(demo, function () { if (!reduce) gTimer = setTimeout(glide, 2600); });
  }

  // The prayer moment, drawn: it names the next prayer, and any answer closes it, as in the app.
  var moment = $('[data-moment]');
  if (moment) {
    // As the app has it (PrayerMoment): the prayer whose time is running out, and what ends it.
    var T = RZ.todayTimes, nowT = +RZ.now, prayer, end;
    var ramadan = false;
    try { ramadan = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(RZ.now) === '9'; } catch (e) {}
    if (nowT >= +T.fajr && nowT < +T.sunrise) { prayer = 'Fajr'; end = 'Sunrise'; }
    else if (nowT < +T.asr && nowT >= +T.sunrise) { prayer = 'Dhuhr'; end = 'Asr'; }
    else if (nowT >= +T.asr && nowT < +T.maghrib) { prayer = 'Asr'; end = ramadan ? 'Iftar' : 'Maghrib'; }
    else if (nowT >= +T.maghrib && nowT < +T.isha) { prayer = 'Maghrib'; end = 'Isha'; }
    else { prayer = 'Isha'; end = 'Fajr'; }
    $('[data-moment-title]', moment).textContent = end + ' in 15 minutes';
    $('[data-prayed]', moment).textContent = 'I’ve prayed ' + prayer + ' already';
    $('[data-praying]', moment).textContent = 'I’m going to pray ' + prayer + ' now';
    var mTimer = null;
    $$('[data-moment-act]', moment).forEach(function (b) {
      b.addEventListener('click', function () {
        moment.classList.add('is-answered');
        clearTimeout(mTimer);
        mTimer = setTimeout(function () { moment.classList.remove('is-answered'); }, 3200);
      });
    });
  }

  // The first page: write a task and it lands as a line; the Bismillah goes at the first letter.
  var first = $('[data-first]');
  if (first) {
    var input = $('[data-first-input]', first), lines = $('[data-first-lines]', first), basmala = $('[data-basmala]', first);
    input.addEventListener('input', function () { if (input.value.length) basmala.classList.add('is-faded'); });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !input.value.trim()) return;
      e.preventDefault();
      var ln = doc.createElement('div');
      ln.className = 'ln';
      var newBox = doc.createElement('button'), lt = doc.createElement('span'), mgEl = doc.createElement('span');
      newBox.type = 'button'; newBox.className = 'bx'; newBox.setAttribute('aria-pressed', 'false');
      newBox.appendChild($('[data-page="today"] .bx-m').cloneNode(true));
      lt.className = 'lt'; mgEl.className = 'mg';
      ln.append(newBox, lt, mgEl);
      $('.lt', ln).textContent = input.value.trim();
      var box = $('button.bx', ln);
      box.setAttribute('aria-label', input.value.trim());
      box.addEventListener('click', function () {
        var d = !ln.classList.contains('is-done'); ln.classList.toggle('is-done', d); box.setAttribute('aria-pressed', String(d));
        $('.mg', ln).textContent = d ? clock(nowish(), twelve) : '';
      });
      if ($$('.ln', lines).length >= 4) lines.removeChild($('.ln', lines));
      lines.appendChild(ln);
      input.value = '';
    });
  }

  // The name, written as First Light writes it: the app's strokes and timing, baked by
  // tools/NameWriter/web.py into media/written-name.png (green, how much ink a pixel holds; red, when
  // the pen reaches it, 0 to SPAN seconds). Ink shows over 14ms as the pen arrives, lands up to 45%
  // lapis and dries in 0.19s, as the app's shader has it. At the foot, as the app's settings end on the
  // name, written once as it comes into view. Without motion the CSS shows the font's own text instead.
  (function () {
    var names = $$('[data-name]');
    if (!names.length || reduce || !doc.documentElement.classList.contains('motion')) return;
    var SPAN = 1.4311, SOFT = 0.014, DRY = 0.19, END = SPAN + DRY;
    var work = doc.createElement('canvas'), wx = null, frame = null, where, at, ink, count = 0, waiting = [];
    var items = names.map(function (el) { var cv = $('.name-ink', el); return { el: el, cv: cv, g: cv.getContext('2d'), t: -1, started: false }; });
    function rgba(s) { var m = String(s).match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]; }
    function paint(it) {
      if (!count) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 3), w = Math.round(it.el.clientWidth * dpr), h = Math.round(it.el.clientHeight * dpr);
      if (!w || !h) return;
      if (it.cv.width !== w || it.cv.height !== h) { it.cv.width = w; it.cv.height = h; }
      var cs = getComputedStyle(it.el), c = rgba(cs.color), wet = rgba(cs.textDecorationColor), t = it.t, px = frame.data;
      for (var i = 0; i < count; i++) {
        var dt = t - at[i], j = where[i] * 4, a = 0, m = 0;
        if (dt > 0) {
          var u = dt >= SOFT ? 1 : dt / SOFT, age = dt >= DRY ? 1 : dt / DRY;
          a = ink[i] * u * u * (3 - 2 * u) * c[3];
          m = (1 - age) * (1 - age) * 0.45;
        }
        px[j] = c[0] + (wet[0] - c[0]) * m; px[j + 1] = c[1] + (wet[1] - c[1]) * m; px[j + 2] = c[2] + (wet[2] - c[2]) * m; px[j + 3] = a;
      }
      wx.putImageData(frame, 0, 0);
      it.g.clearRect(0, 0, w, h);
      it.g.imageSmoothingEnabled = true; it.g.imageSmoothingQuality = 'high';
      it.g.drawImage(work, 0, 0, w, h);
    }
    function write(it) {
      if (it.started) return;
      it.started = true;
      var t0 = null;
      requestAnimationFrame(function step(now) {
        if (t0 === null) t0 = now;
        var t = (now - t0) / 1000;
        it.t = t >= END ? Infinity : t;
        paint(it);
        if (t < END) requestAnimationFrame(step);
      });
    }
    function ready(fn) { if (count) fn(); else waiting.push(fn); }
    var pic = new Image();
    pic.onerror = function () { items.forEach(function (it) { it.el.classList.add('is-plain'); }); };
    pic.onload = function () {
      var W = pic.naturalWidth, H = pic.naturalHeight, read = doc.createElement('canvas');
      read.width = W; read.height = H;
      var rx = read.getContext('2d', { willReadFrequently: true });
      rx.drawImage(pic, 0, 0);
      var d = rx.getImageData(0, 0, W, H).data, n = 0, k;
      for (k = 0; k < W * H; k++) if (d[k * 4 + 1]) n++;
      where = new Uint32Array(n); at = new Float32Array(n); ink = new Uint8Array(n); n = 0;
      for (k = 0; k < W * H; k++) if (d[k * 4 + 1]) { where[n] = k; at[n] = d[k * 4] / 255 * SPAN; ink[n] = d[k * 4 + 1]; n++; }
      work.width = W; work.height = H; wx = work.getContext('2d'); frame = wx.createImageData(W, H);
      count = n;
      waiting.splice(0).forEach(function (fn) { fn(); });
    };
    pic.src = 'media/written-name.png';
    var seen = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        seen.unobserve(e.target);
        var it = items[names.indexOf(e.target)];
        setTimeout(function () { ready(function () { write(it); }); }, 150);
      });
    }, { threshold: 0.9 });
    items.forEach(function (it) { seen.observe(it.el); });
    if ('ResizeObserver' in window) items.forEach(function (it) { new ResizeObserver(function () { if (it.started) paint(it); }).observe(it.el); });
    // Day to night: the colour crossfades in 0.35s, so the written name follows it frame by frame.
    new MutationObserver(function () {
      var until = performance.now() + 600;
      requestAnimationFrame(function again(now) { items.forEach(function (it) { if (it.started) paint(it); }); if (now < until) requestAnimationFrame(again); });
    }).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-sky'] });
    RZ.nameAt = function (t) { ready(function () { items.forEach(function (it) { it.started = true; it.t = t; paint(it); }); }); };
  })();

  // The page keeps the app's clock: at Maghrib and at Fajr it turns, crossfading in 0.35s.
  setInterval(function () {
    var now = new Date(), t = RZ.timesFor(RZ.startOfDay(now));
    var night = now >= t.maghrib || now < t.fajr;
    var sky = night ? 'night' : 'day';
    if (doc.documentElement.getAttribute('data-sky') !== sky && !/[?&]at=/.test(location.search)) {
      doc.documentElement.classList.add('is-turning');
      doc.documentElement.setAttribute('data-sky', sky);
      setTimeout(function () { doc.documentElement.classList.remove('is-turning'); }, 500);
    }
    RZ.now = now;
    $$('[data-pl]').forEach(function (el) { if (!el.hasAttribute('data-demo-line')) drawLine(el, now < t.fajr ? RZ.timesFor(add(RZ.startOfDay(now), -1)) : t, now < t.fajr ? t.fajr : RZ.timesFor(add(RZ.startOfDay(now), 1)).fajr, now, twelve); });
  }, 60000);

  RZ.clock = clock; RZ.twelve = twelve; RZ.drawLine = drawLine; RZ.place = place;
})();
