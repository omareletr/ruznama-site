/* Rūznāma: the visitor's day, worked out before the page draws.
   The page keeps the app's clock: a day starts at 4am, the page is cream from Fajr and black from
   Maghrib, and the Hijri date steps on at Maghrib. Prayer times come from the visitor's time zone,
   placed at that zone's main city (the site never asks for a location), by the method usual there.
   Without a known zone the page keeps the app's own fallback, 6am to 6pm, and shows no times. */
(function () {
  'use strict';

  // Zone: [latitude, longitude, city, method]. Methods as PrayerTimes names them.
  var ZONES = {
    'Europe/London': [51.51, -0.13, 'London', 'mwl'], 'Europe/Dublin': [53.35, -6.26, 'Dublin', 'mwl'],
    'Europe/Paris': [48.86, 2.35, 'Paris', 'mwl'], 'Europe/Berlin': [52.52, 13.40, 'Berlin', 'mwl'],
    'Europe/Madrid': [40.42, -3.70, 'Madrid', 'mwl'], 'Europe/Rome': [41.90, 12.50, 'Rome', 'mwl'],
    'Europe/Amsterdam': [52.37, 4.90, 'Amsterdam', 'mwl'], 'Europe/Brussels': [50.85, 4.35, 'Brussels', 'mwl'],
    'Europe/Vienna': [48.21, 16.37, 'Vienna', 'mwl'], 'Europe/Zurich': [47.37, 8.54, 'Zurich', 'mwl'],
    'Europe/Stockholm': [59.33, 18.07, 'Stockholm', 'mwl'], 'Europe/Oslo': [59.91, 10.75, 'Oslo', 'mwl'],
    'Europe/Copenhagen': [55.68, 12.57, 'Copenhagen', 'mwl'], 'Europe/Helsinki': [60.17, 24.94, 'Helsinki', 'mwl'],
    'Europe/Warsaw': [52.23, 21.01, 'Warsaw', 'mwl'], 'Europe/Prague': [50.08, 14.44, 'Prague', 'mwl'],
    'Europe/Budapest': [47.50, 19.04, 'Budapest', 'mwl'], 'Europe/Athens': [37.98, 23.73, 'Athens', 'mwl'],
    'Europe/Istanbul': [41.01, 28.98, 'Istanbul', 'turkey'], 'Europe/Moscow': [55.76, 37.62, 'Moscow', 'mwl'],
    'Europe/Lisbon': [38.72, -9.14, 'Lisbon', 'mwl'], 'Europe/Sarajevo': [43.86, 18.41, 'Sarajevo', 'mwl'],
    'Europe/Bucharest': [44.43, 26.10, 'Bucharest', 'mwl'], 'Europe/Sofia': [42.70, 23.32, 'Sofia', 'mwl'],
    'Europe/Kyiv': [50.45, 30.52, 'Kyiv', 'mwl'], 'Europe/Kiev': [50.45, 30.52, 'Kyiv', 'mwl'],
    'Europe/Belgrade': [44.79, 20.45, 'Belgrade', 'mwl'], 'Europe/Tirane': [41.33, 19.82, 'Tirana', 'mwl'],
    'Africa/Cairo': [30.04, 31.24, 'Cairo', 'egypt'], 'Africa/Casablanca': [33.57, -7.59, 'Casablanca', 'mwl'],
    'Africa/Algiers': [36.75, 3.06, 'Algiers', 'mwl'], 'Africa/Tunis': [36.81, 10.18, 'Tunis', 'mwl'],
    'Africa/Tripoli': [32.89, 13.19, 'Tripoli', 'egypt'], 'Africa/Khartoum': [15.50, 32.56, 'Khartoum', 'egypt'],
    'Africa/Lagos': [6.52, 3.38, 'Lagos', 'mwl'], 'Africa/Accra': [5.60, -0.19, 'Accra', 'mwl'],
    'Africa/Dakar': [14.72, -17.47, 'Dakar', 'mwl'], 'Africa/Nairobi': [-1.29, 36.82, 'Nairobi', 'mwl'],
    'Africa/Addis_Ababa': [9.03, 38.74, 'Addis Ababa', 'mwl'], 'Africa/Mogadishu': [2.05, 45.32, 'Mogadishu', 'mwl'],
    'Africa/Johannesburg': [-26.20, 28.05, 'Johannesburg', 'mwl'],
    'Asia/Riyadh': [24.71, 46.68, 'Riyadh', 'makkah'], 'Asia/Dubai': [25.20, 55.27, 'Dubai', 'gulf'],
    'Asia/Qatar': [25.29, 51.53, 'Doha', 'gulf'], 'Asia/Kuwait': [29.38, 47.99, 'Kuwait City', 'gulf'],
    'Asia/Bahrain': [26.23, 50.59, 'Manama', 'gulf'], 'Asia/Muscat': [23.59, 58.41, 'Muscat', 'gulf'],
    'Asia/Baghdad': [33.31, 44.36, 'Baghdad', 'mwl'], 'Asia/Amman': [31.95, 35.93, 'Amman', 'mwl'],
    'Asia/Beirut': [33.89, 35.50, 'Beirut', 'mwl'], 'Asia/Damascus': [33.51, 36.28, 'Damascus', 'mwl'],
    'Asia/Jerusalem': [31.77, 35.21, 'Jerusalem', 'mwl'], 'Asia/Gaza': [31.50, 34.47, 'Gaza', 'mwl'],
    'Asia/Hebron': [31.53, 35.10, 'Hebron', 'mwl'], 'Asia/Tehran': [35.69, 51.39, 'Tehran', 'mwl'],
    'Asia/Karachi': [24.86, 67.01, 'Karachi', 'karachi'], 'Asia/Kolkata': [28.61, 77.21, 'Delhi', 'karachi'],
    'Asia/Calcutta': [28.61, 77.21, 'Delhi', 'karachi'], 'Asia/Dhaka': [23.81, 90.41, 'Dhaka', 'karachi'],
    'Asia/Kabul': [34.56, 69.21, 'Kabul', 'karachi'], 'Asia/Tashkent': [41.30, 69.24, 'Tashkent', 'mwl'],
    'Asia/Almaty': [43.24, 76.89, 'Almaty', 'mwl'], 'Asia/Baku': [40.41, 49.87, 'Baku', 'mwl'],
    'Asia/Jakarta': [-6.21, 106.85, 'Jakarta', 'singapore'], 'Asia/Kuala_Lumpur': [3.14, 101.69, 'Kuala Lumpur', 'singapore'],
    'Asia/Singapore': [1.35, 103.82, 'Singapore', 'singapore'], 'Asia/Manila': [14.60, 120.98, 'Manila', 'mwl'],
    'Asia/Bangkok': [13.76, 100.50, 'Bangkok', 'mwl'], 'Asia/Shanghai': [31.23, 121.47, 'Shanghai', 'mwl'],
    'Asia/Hong_Kong': [22.32, 114.17, 'Hong Kong', 'mwl'], 'Asia/Tokyo': [35.68, 139.69, 'Tokyo', 'mwl'],
    'Asia/Seoul': [37.57, 126.98, 'Seoul', 'mwl'], 'Asia/Colombo': [6.93, 79.86, 'Colombo', 'karachi'],
    'Asia/Kathmandu': [27.72, 85.32, 'Kathmandu', 'karachi'],
    'America/New_York': [40.71, -74.01, 'New York', 'isna'], 'America/Toronto': [43.65, -79.38, 'Toronto', 'isna'],
    'America/Detroit': [42.33, -83.05, 'Detroit', 'isna'], 'America/Chicago': [41.88, -87.63, 'Chicago', 'isna'],
    'America/Denver': [39.74, -104.99, 'Denver', 'isna'], 'America/Phoenix': [33.45, -112.07, 'Phoenix', 'isna'],
    'America/Los_Angeles': [34.05, -118.24, 'Los Angeles', 'isna'], 'America/Vancouver': [49.28, -123.12, 'Vancouver', 'isna'],
    'America/Edmonton': [53.55, -113.49, 'Edmonton', 'isna'], 'America/Winnipeg': [49.90, -97.14, 'Winnipeg', 'isna'],
    'America/Halifax': [44.65, -63.57, 'Halifax', 'isna'], 'America/Anchorage': [61.22, -149.90, 'Anchorage', 'isna'],
    'Pacific/Honolulu': [21.31, -157.86, 'Honolulu', 'isna'], 'America/Mexico_City': [19.43, -99.13, 'Mexico City', 'mwl'],
    'America/Bogota': [4.71, -74.07, 'Bogotá', 'mwl'], 'America/Lima': [-12.05, -77.04, 'Lima', 'mwl'],
    'America/Santiago': [-33.45, -70.67, 'Santiago', 'mwl'], 'America/Sao_Paulo': [-23.55, -46.63, 'São Paulo', 'mwl'],
    'America/Argentina/Buenos_Aires': [-34.60, -58.38, 'Buenos Aires', 'mwl'],
    'Australia/Sydney': [-33.87, 151.21, 'Sydney', 'mwl'], 'Australia/Melbourne': [-37.81, 144.96, 'Melbourne', 'mwl'],
    'Australia/Brisbane': [-27.47, 153.03, 'Brisbane', 'mwl'], 'Australia/Adelaide': [-34.93, 138.60, 'Adelaide', 'mwl'],
    'Australia/Perth': [-31.95, 115.86, 'Perth', 'mwl'], 'Pacific/Auckland': [-36.85, 174.76, 'Auckland', 'mwl']
  };

  // Fajr and Isha angles; Isha as minutes after Maghrib where the method says so.
  var METHODS = {
    mwl: { fajr: 18, isha: 17 }, isna: { fajr: 15, isha: 15 }, egypt: { fajr: 19.5, isha: 17.5 },
    makkah: { fajr: 18.5, ishaMinutes: 90 }, karachi: { fajr: 18, isha: 18, hanafi: true },
    singapore: { fajr: 20, isha: 18 }, gulf: { fajr: 18.2, isha: 18.2 }, turkey: { fajr: 18, isha: 17 }
  };

  var rad = Math.PI / 180;
  function dsin(d) { return Math.sin(d * rad); }
  function dcos(d) { return Math.cos(d * rad); }
  function dtan(d) { return Math.tan(d * rad); }
  function darcsin(x) { return Math.asin(x) / rad; }
  function darccos(x) { return Math.acos(x) / rad; }
  function darctan2(y, x) { return Math.atan2(y, x) / rad; }
  function darccot(x) { return Math.atan(1 / x) / rad; }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sun(jd) {
    var D = jd - 2451545.0;
    var g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    var L = fix(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g), 360);
    var e = 23.439 - 0.00000036 * D;
    var RA = darctan2(dcos(e) * dsin(L), dcos(L)) / 15;
    return { declination: darcsin(dsin(e) * dsin(L)), equation: q / 15 - fix(RA, 24) };
  }

  // The five prayers and sunrise for the calendar day `day` (a local Date at midnight), as Dates.
  function prayerTimes(day, lat, lng, methodName) {
    var method = METHODS[methodName] || METHODS.mwl;
    var y = day.getFullYear(), m = day.getMonth() + 1, d = day.getDate();
    var jd = julian(y, m, d) - lng / (15 * 24);
    var tz = -new Date(y, m - 1, d, 12).getTimezoneOffset() / 60;
    function noon(t) { return fix(12 - sun(jd + t).equation, 24); }
    function angleTime(angle, t, before) {
      var s = sun(jd + t);
      var T = darccos((-dsin(angle) - dsin(s.declination) * dsin(lat)) / (dcos(s.declination) * dcos(lat))) / 15;
      return noon(t) + (before ? -T : T);
    }
    function asrTime(factor, t) {
      var s = sun(jd + t);
      return angleTime(-darccot(factor + dtan(Math.abs(lat - s.declination))), t);
    }
    var h = {
      fajr: angleTime(method.fajr, 5 / 24, true),
      sunrise: angleTime(0.833, 6 / 24, true),
      dhuhr: noon(12 / 24),
      asr: asrTime(method.hanafi ? 2 : 1, 13 / 24),
      maghrib: angleTime(0.833, 18 / 24),
      isha: method.ishaMinutes ? null : angleTime(method.isha, 18 / 24)
    };
    for (var k in h) if (h[k] !== null) h[k] += tz - lng / 15;
    if (method.ishaMinutes) h.isha = h.maghrib + method.ishaMinutes / 60;
    // Angle-based, as the app defaults to: where twilight never gets that deep, or from 48°,
    // Fajr and Isha keep to the method's share of the night.
    var night = 24 - (h.maghrib - h.sunrise);
    var hold = Math.abs(lat) >= 48;
    var fajrShare = method.fajr / 60 * night;
    if (isNaN(h.fajr) || (hold && h.sunrise - h.fajr > fajrShare)) h.fajr = h.sunrise - fajrShare;
    if (!method.ishaMinutes) {
      var ishaShare = method.isha / 60 * night;
      if (isNaN(h.isha) || (hold && h.isha - h.maghrib > ishaShare)) h.isha = h.maghrib + ishaShare;
    }
    var out = {};
    for (var key in h) out[key] = new Date(day.getTime() + h[key] * 3600000);
    return out;
  }

  function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function addDays(date, n) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n); }

  // ?at=21:30 holds the time of day, as the Debug apps' -RuznamaClock does.
  var now = new Date();
  var held = /[?&]at=(\d{1,2}):(\d{2})/.exec(location.search);
  if (held) now = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +held[1], +held[2]);

  var zoneName = '';
  try { zoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
  var zone = ZONES[zoneName] || null;

  function timesFor(calendarDay) {
    if (zone) return prayerTimes(calendarDay, zone[0], zone[1], zone[3]);
    // The app's fallback day without a location: 6am to 6pm, at the places the times would take.
    var at = function (hh, mm) { return new Date(calendarDay.getTime() + (hh * 60 + mm) * 60000); };
    return { fajr: at(6, 0), sunrise: at(7, 0), dhuhr: at(12, 0), asr: at(15, 0), maghrib: at(18, 0), isha: at(19, 15) };
  }

  var today = startOfDay(now);
  var t = timesFor(today);
  var yesterdayTimes = timesFor(addDays(today, -1));
  var tomorrowTimes = timesFor(addDays(today, 1));
  // Before Fajr it is still last night; the page belongs to the day that began at yesterday's Fajr.
  var lineTimes = now < t.fajr ? yesterdayTimes : t;
  var nextFajr = now < t.fajr ? t.fajr : tomorrowTimes.fajr;
  var isNight = now >= t.maghrib || now < t.fajr;
  // A Rūznāma day starts at 4am: what's done before then counts for the day before.
  var logicalDay = startOfDay(new Date(now.getTime() - 4 * 3600000));

  window.RZ = {
    now: now, zone: zone, zoneName: zoneName, times: lineTimes, nextFajr: nextFajr,
    todayTimes: t, isNight: isNight, logicalDay: logicalDay,
    timesFor: timesFor, addDays: addDays, startOfDay: startOfDay
  };
  document.documentElement.setAttribute('data-sky', isNight ? 'night' : 'day');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isNight ? '#0D0D0E' : '#FAF5EA');
})();
