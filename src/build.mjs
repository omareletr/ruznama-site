// Builds ../index.html from src/parts/*.html: expands {{…}} tokens into the app's own pixel marks,
// drawn from the same grids as RuznamaUI (Theme.swift, PixelLens, PixelMic, HabitSeal+Drawings).
// Run: node store/site/src/build.mjs
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SEALS = JSON.parse(readFileSync(join(here, 'seals.json'), 'utf8'));

const MARKS = {
  star: { rows: ['...#...', '.#.#.#.', '..###..', '#######', '..###..', '.#.#.#.', '...#...'], gap: 1 / 3 },
  lantern: { rows: ['...#...', '..###..', '.#####.', '.#...#.', '.#.#.#.', '.#...#.', '..###..'], gap: 0 },
  lens: { rows: ['.###...', '#...#..', '#...#..', '#...#..', '.####..', '.....#.', '......#'], gap: 0.5 },
  sliders: { rows: ['.#.....', '#######', '.#.....', '.......', '.....#.', '#######', '.....#.'], gap: 0.5 },
  plus: { rows: ['...#...', '...#...', '#######', '...#...', '...#...'], gap: 0 },
  mic: { rows: ['...##...', '..####..', '..####..', '..####..', '..####..', '#.####.#', '#..##..#', '.#....#.', '..####..', '...##...', '...##...', '..####..'], gap: 0 },
  repeat: { rows: ['......#..', '.#######.', '#.....#..', '#.......#', '..#.....#', '.#######.', '..#......'], gap: 0 },
  arrow: { rows: ['...#...', '....#..', '.....#.', '#######', '.....#.', '....#..', '...#...'], gap: 0 },
  chevron: { rows: ['#....', '.#...', '..#..', '.#...', '#....'], gap: 0 },
  phone: { rows: ['.####.', '#....#', '#....#', '#....#', '#....#', '#....#', '#....#', '#.##.#', '.####.'], gap: 0 },
  mac: { rows: ['.#########.', '.#.......#.', '.#.......#.', '.#.......#.', '.#.......#.', '.#########.', '###########'], gap: 0 },
  boxOpen: { rows: ['.######.', '#......#', '#......#', '#......#', '#......#', '#......#', '#......#', '.######.'], gap: 0 },
};
const BOX_DONE = ['.######.', '########', '######.#', '#.###.##', '##.#.###', '###.####', '########', '.######.'];

function cells(rows) {
  const out = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') out.push({ x, y }); }));
  return out;
}
// Centre first, then outwards ring by ring (HabitSeal.centreOut).
function centreOut(list, size) {
  const c = size - 1;
  const d = (p) => (2 * p.x - c) ** 2 + (2 * p.y - c) ** 2;
  return [...list].sort((a, b) => d(a) - d(b) || a.y - b.y || a.x - b.x);
}
// The spread's curve, timingCurve(0.5, 1, 0.89, 1): when does it reach `y`?
function bezier(p1x, p1y, p2x, p2y) {
  const at = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (y) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (at(mid, p1y, p2y) < y) lo = mid; else hi = mid;
    }
    return at((lo + hi) / 2, p1x, p2x);
  };
}
const spreadTime = bezier(0.5, 1, 0.89, 1);

function svg(rows, gap, cls, extra = '') {
  const w = rows[0].length, h = rows.length, p = 1 + gap;
  const rects = cells(rows).map((c) => `<rect x="${+(c.x * p).toFixed(3)}" y="${+(c.y * p).toFixed(3)}" width="1" height="1"/>`).join('');
  return `<svg class="px ${cls}" viewBox="0 0 ${+((w - 1) * p + 1).toFixed(3)} ${+((h - 1) * p + 1).toFixed(3)}" aria-hidden="true" focusable="false"${extra}>${rects}</svg>`;
}

// A drawing that fills from the centre: each square carries when it lights (--d) and when it goes
// out as the fill drains back (--r), in ms, so CSS can play the app's spread.
function spreading(rows, size, gap, cls, ms) {
  const w = rows[0].length, h = rows.length, p = 1 + gap;
  const order = centreOut(cells(rows), size);
  const n = order.length;
  const rects = order.map((c, i) => {
    const on = Math.round(ms * spreadTime((i + 0.5) / n));
    const off = Math.round(ms * spreadTime(1 - (i + 0.5) / n));
    return `<rect x="${+(c.x * p).toFixed(3)}" y="${+(c.y * p).toFixed(3)}" width="1" height="1" style="--d:${on}ms;--r:${off}ms"/>`;
  }).join('');
  return `<svg class="px ${cls}" viewBox="0 0 ${+((w - 1) * p + 1).toFixed(3)} ${+((h - 1) * p + 1).toFixed(3)}" aria-hidden="true" focusable="false">${rects}</svg>`;
}

// The star with `lit` of its squares lit, centre first (the day's habits kept).
function star(lit) {
  const rows = MARKS.star.rows, p = 4 / 3;
  const order = centreOut(cells(rows), 7);
  const rects = order.map((c, i) => `<rect x="${+(c.x * p).toFixed(3)}" y="${+(c.y * p).toFixed(3)}" width="1" height="1" data-i="${i}"${i < lit ? ' class="on"' : ''}/>`).join('');
  return `<svg class="px star" viewBox="0 0 9 9" data-lit="${lit}" aria-hidden="true" focusable="false">${rects}</svg>`;
}

// The pixel switch: 13 by 7, a one-square outline, the knob the gap. Off and on drawn apart and
// crossfaded, as SwitchCells does.
function switchMark() {
  const draw = (knob) => {
    const rows = [];
    for (let y = 0; y < 7; y++) {
      let row = '';
      for (let x = 0; x < 13; x++) {
        const corner = (y === 0 || y === 6) && (x === 0 || x === 12);
        const edge = y === 0 || y === 6 || x === 0 || x === 12;
        const inKnob = y >= 1 && y <= 5 && x >= knob && x <= knob + 4;
        row += !corner && (edge || !inKnob) ? '#' : '.';
      }
      rows.push(row);
    }
    return rows;
  };
  return `<span class="sw">${svg(draw(1), 0, 'sw-off')}${svg(draw(7), 0, 'sw-on')}</span>`;
}

function box() {
  return `<span class="bx-m">${svg(MARKS.boxOpen.rows, 0, 'bx-open')}${spreading(BOX_DONE, 8, 0, 'bx-done', 240)}</span>`;
}

function seal(name) {
  const rows = SEALS[name];
  if (!rows) throw new Error(`No seal named ${name}`);
  return spreading(rows, 9, 0.25, 'seal', 400);
}

// A habit's last seven times due: 1 kept (lapis), 0 not, then its figure.
function run(pattern, figure) {
  const squares = [...pattern].map((k) => `<i${k === '1' ? ' class="k"' : ''}></i>`).join('');
  return `<span class="run" aria-hidden="true">${squares}${figure ? `<b>${figure}</b>` : ''}</span>`;
}

// The ways in while it's in beta: the iPhone app through TestFlight's public link (the "External
// Testers" group), the Mac's not out yet, so it stands in the button's place without a link.
const BETA = 'https://testflight.apple.com/join/cyVZVRZA';
function store(which) {
  if (which === 'mac') {
    return `<span class="store store-mac is-soon">${svg(MARKS.mac.rows, 0, 'mac')}<span class="store-t"><small>Coming soon to</small>Mac</span></span>`;
  }
  return `<a class="store store-phone" href="${BETA}" aria-label="Join the iPhone beta on TestFlight">${svg(MARKS.phone.rows, 0, 'phone')}<span class="store-t"><small>Join the beta for</small>iPhone</span></a>`;
}

// رُوزنامه as First Light writes it. js/page.js writes it into the canvas from media/written-name.png
// (tools/NameWriter/web.py); without motion the font's own text stands there instead, set as the
// picture has it: the box is font units 26 to 2176 across and 744 down to −89, so the run starts at
// −26 and its baseline is 744 down.
function writtenName() {
  return '<canvas class="name-ink"></canvas><svg class="name-text" viewBox="0 0 2150 833" focusable="false">'
    + '<text x="-26" y="744" font-size="1000" lang="fa">رُوزنامه</text></svg>';
}

// The page is written in parts (src/parts, in name order) and joined here.
const partsDir = join(here, 'parts');
const src = readdirSync(partsDir).filter((f) => f.endsWith('.html')).sort()
  .map((f) => readFileSync(join(partsDir, f), 'utf8')).join('\n');
const expand = (text) => text.replace(/\{\{(\w+)(?::([^:}]*))?(?::([^}]*))?\}\}/g, (_, kind, a, b) => {
  switch (kind) {
    case 'px': return svg(MARKS[a].rows, MARKS[a].gap, a);
    case 'star': return star(Number(a));
    case 'seal': return seal(a);
    case 'box': return box();
    case 'run': return run(a, b);
    case 'switch': return switchMark();
    case 'store': return store(a);
    case 'stores': return `<div class="stores">${store('phone')}${store('mac')}</div>`;
    case 'name': return writtenName();
    default: throw new Error(`Unknown token ${kind}`);
  }
});
const html = expand(src);
// Each stylesheet and script carries a version, so a new build is never served from cache.
const version = Date.now().toString(36);
const stamped = html.replace(/(href|src)="((?:css|js)\/[\w.-]+\.(?:css|js)|sky\.js)"/g, `$1="$2?v=${version}"`);
writeFileSync(join(here, '..', 'index.html'), stamped);
console.log(`index.html: ${(html.length / 1024).toFixed(1)} KB`);

// Mocks for choosing between options (src/mocks), built the same way into mocks/. Not published.
const mocksDir = join(here, 'mocks');
if (existsSync(mocksDir)) {
  const out = join(here, '..', 'mocks');
  mkdirSync(out, { recursive: true });
  for (const f of readdirSync(mocksDir).filter((n) => n.endsWith('.html'))) {
    writeFileSync(join(out, f), expand(readFileSync(join(mocksDir, f), 'utf8')));
    console.log(`mocks/${f}`);
  }
}
