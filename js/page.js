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
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    ? 'Today’s page, set to your day: prayer times for ' + RZ.zone[2] + ', from your time zone. Tick a task.'
    : 'Today’s page, set to your day. Tick a task.';

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
