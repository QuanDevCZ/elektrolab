// Siločáry — čistý modul (bez three.js), testuje se v Node.
//
// Siločára = „čára, po které by se pohyboval jednotkový kladný náboj“ (lekce 04).
// V každém jejím bodě má směr intenzity E. Kreslíme ji tak, že z bodu kousek popojdeme
// ve směru E, znovu změříme E, zase popojdeme… (numerická integrace, metoda RK4).
//
// • Siločáry vycházejí z kladných nábojů a končí v záporných (nebo odcházejí „do nekonečna“).
// • Počet čar z náboje je úměrný velikosti náboje — větší náboj = hustší čáry = silnější pole.
// • U nabitých desek čáry vycházejí z kladné desky a končí na záporné.

import { fieldAt } from './physics.js';
import { crossedPlate } from './plates.js';

// Body rovnoměrně rozložené po kouli („Fibonacciho koule“) — startovní místa čar v prostoru.
function sphereDirs(n) {
  const dirs = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const rad = Math.sqrt(1 - y * y);
    const t = golden * i;
    dirs.push({ x: Math.cos(t) * rad, y, z: Math.sin(t) * rad });
  }
  return dirs;
}

// Startovní směry v rovině stolu (y = 0) — jako obrázky v sešitě.
function circleDirs(n, phase = 0) {
  const dirs = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (2 * Math.PI * i) / n;
    dirs.push({ x: Math.cos(a), y: 0, z: Math.sin(a) });
  }
  return dirs;
}

// Jednotkový vektor ve směru E (nebo proti E, když sign = −1) + velikost |E| v tom bodě.
// Délka čáry nás nezajímá, jen její směr, proto E normujeme.
function dirAt(p, sources, sign) {
  const E = fieldAt(p, sources);
  const L = Math.hypot(E.x, E.y, E.z);
  if (L === 0) return null; // bod, kde se pole vyruší (např. přesně mezi dvěma stejnými náboji)
  return { x: (sign * E.x) / L, y: (sign * E.y) / L, z: (sign * E.z) / L, m: L };
}

function nearest(p, charges) {
  let best = Infinity, idx = -1;
  charges.forEach((c, i) => {
    const d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z);
    if (d < best) { best = d; idx = i; }
  });
  return { d: best, idx };
}

// Jedna siločára z bodu `start`. sign = +1 → po směru E, −1 → proti směru E.
// end ∈ 'charge' | 'plate' | 'out' | 'steps' | 'zero'; endIndex = index náboje / desky.
// mags = velikost |E| v každém bodě (pro obarvení podle síly pole).
function trace(start, charges, sign, o) {
  const pts = [start];
  const mags = [];
  let p = start;
  const done = (end, endIndex = -1) => {
    while (mags.length < pts.length) mags.push(mags[mags.length - 1] ?? 0);
    return { points: pts, mags, end, endIndex };
  };
  for (let i = 0; i < o.maxSteps; i++) {
    const near = charges.length ? nearest(p, charges) : { d: Infinity, idx: -1 };
    const dPlate = o.plates.length ? Math.min(...o.plates.map((pl) => Math.abs(p.x - pl.x))) : Infinity;
    // délka kroku: blízko nábojů malé kroky (pole se tam rychle mění), daleko větší
    const h = Math.min(o.hMax, Math.max(o.hMin, 0.25 * Math.min(near.d, dPlate + o.hMax)));

    // RK4 — průměr čtyř odhadů směru, přesnější než prosté „popojdi ve směru E“
    const k1 = dirAt(p, o.sources, sign);
    if (!k1) return done('zero');
    mags.push(k1.m);
    const p2 = { x: p.x + (h / 2) * k1.x, y: p.y + (h / 2) * k1.y, z: p.z + (h / 2) * k1.z };
    const k2 = dirAt(p2, o.sources, sign) || k1;
    const p3 = { x: p.x + (h / 2) * k2.x, y: p.y + (h / 2) * k2.y, z: p.z + (h / 2) * k2.z };
    const k3 = dirAt(p3, o.sources, sign) || k2;
    const p4 = { x: p.x + h * k3.x, y: p.y + h * k3.y, z: p.z + h * k3.z };
    const k4 = dirAt(p4, o.sources, sign) || k3;
    const next = {
      x: p.x + (h / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),
      y: p.y + (h / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),
      z: p.z + (h / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
    };

    // narazila čára na desku? skončí na jejím povrchu
    const pi = o.plates.length ? crossedPlate(p, next, o.plates) : -1;
    if (pi >= 0 && i > 0) {
      const pl = o.plates[pi];
      const t = (p.x - pl.x) / (p.x - next.x);
      pts.push({ x: pl.x, y: p.y + (next.y - p.y) * t, z: p.z + (next.z - p.z) * t });
      return done('plate', pi);
    }
    p = next;
    pts.push(p);

    // čára doběhla až k povrchu desky (u mřížky nábojů desky by se jinak „zasekla“ v jednom z nich)
    if (i > 2) {
      for (let k = 0; k < o.plates.length; k++) {
        const pl = o.plates[k];
        if (Math.abs(p.x - pl.x) < o.plateCapture && Math.abs(p.y) <= pl.half && Math.abs(p.z) <= pl.half) {
          pts.push({ x: pl.x, y: p.y, z: p.z });
          return done('plate', k);
        }
      }
    }

    const after = charges.length ? nearest(p, charges) : { d: Infinity };
    if (i > 1 && after.d < o.capture) {
      pts.push({ x: charges[after.idx].x, y: charges[after.idx].y, z: charges[after.idx].z });
      return done('charge', after.idx);
    }
    if (Math.abs(p.x) > o.bound || Math.abs(p.z) > o.bound || Math.abs(p.y) > o.bound) return done('out');
  }
  return done('steps');
}

// Startovní body na deskách: na vnitřní straně (proti druhé desce) hustěji, na vnější řidčeji.
function plateSeeds(pl, other, mode, offset) {
  const inward = Math.sign(other.x - pl.x) || 1;
  const seeds = [];
  const grid = (count, side) => {
    const vals = [];
    for (let i = 0; i < count; i++) vals.push(-0.8 * pl.half + (1.6 * pl.half * i) / (count - 1));
    const ys = mode === 'plane' ? [0] : vals;
    for (const y of ys) for (const z of vals) seeds.push({ x: pl.x + side * offset, y, z, side });
  };
  grid(mode === 'plane' ? 9 : 4, inward);
  grid(mode === 'plane' ? 5 : 3, -inward);
  return seeds;
}

// Všechny siločáry.
//   charges       bodové náboje, ze kterých čáry vycházejí / do kterých vstupují
//   opts.sources  všechny zdroje pole (bodové náboje + drobné náboje desek); výchozí = charges
//   opts.plates   desky (core/plates.js) — čáry z nich vycházejí a na nich končí
//   opts.mode     'space' (v prostoru) | 'plane' (v rovině stolu)
//   opts.size     velikost stolu [m] — podle ní se volí délka kroku a hranice
//   opts.radius   poloměr kuličky [m] — čáry startují těsně u jejího povrchu
//   opts.perMax   počet čar z náboje s největším |Q|
//   opts.coarse   true = rychlejší, hrubší výpočet (během tažení prstem/myší)
// Každá vrácená čára je orientovaná ve směru E (od + k −), takže šipky ukazují správně.
export function traceLines(charges, opts = {}) {
  const size = opts.size ?? 4;
  const radius = opts.radius ?? size * 0.02;
  const mode = opts.mode ?? 'space';
  const coarse = !!opts.coarse;
  const perMax = opts.perMax ?? (mode === 'plane' ? 16 : 22);
  const plates = opts.plates ?? [];
  const o = {
    sources: opts.sources ?? charges,
    plates,
    maxSteps: coarse ? 260 : 900,
    hMin: size * (coarse ? 0.004 : 0.002),
    hMax: size * (coarse ? 0.03 : 0.015),
    capture: radius * 0.9,
    plateCapture: size * 0.012,
    bound: size * 0.6,
  };
  const lines = [];
  const keep = (t, from) => lines.push({ points: t.points, mags: t.mags, from, end: t.end, endIndex: t.endIndex });
  const endsOnPositive = (t) =>
    (t.end === 'charge' && charges[t.endIndex].Q > 0) || (t.end === 'plate' && plates[t.endIndex].Q > 0);
  const reversed = (t, into) => ({
    points: [...t.points].reverse(), mags: [...t.mags].reverse(), end: 'into', endIndex: into,
  });

  // ── bodové náboje ──
  const maxQ = charges.length ? Math.max(...charges.map((c) => Math.abs(c.Q))) : 0;
  charges.forEach((c, ci) => {
    if (c.Q === 0 || maxQ === 0) return;
    // počet čar úměrný náboji (malé náboje vedle velkých mají málo čar — to je fyzikálně správně)
    const n = Math.round((perMax * Math.abs(c.Q)) / maxQ);
    if (n === 0) return;
    const dirs = mode === 'plane' ? circleDirs(n, Math.PI / n) : sphereDirs(n);
    const center = { x: c.x, y: c.y, z: c.z };

    for (const d of dirs) {
      const start = { x: c.x + d.x * radius * 1.05, y: c.y + d.y * radius * 1.05, z: c.z + d.z * radius * 1.05 };
      if (c.Q > 0) {
        // z kladného náboje jdeme PO směru E
        const t = trace(start, charges, +1, o);
        keep({ ...t, points: [center, ...t.points], mags: [t.mags[0], ...t.mags] }, ci);
      } else {
        // do záporného náboje čáry vstupují: jdeme od něj PROTI směru E…
        const t = trace(start, charges, -1, o);
        // …a čáru, která skončila v kladném náboji / desce, už máme nakreslenou z druhé strany
        if (endsOnPositive(t)) continue;
        // otočíme ji, aby mířila ve směru E (z dálky DO záporného náboje)
        const r = reversed(t, ci);
        keep({ ...r, points: [...r.points, center], mags: [...r.mags, r.mags[r.mags.length - 1]] }, -1);
      }
    }
  });

  // ── desky ──
  if (plates.length === 2) {
    const offset = size * 0.025;
    plates.forEach((pl, pi) => {
      const other = plates[1 - pi];
      for (const s of plateSeeds(pl, other, mode, offset)) {
        const start = { x: s.x, y: s.y, z: s.z };
        const onPlate = { x: pl.x, y: s.y, z: s.z };
        if (pl.Q > 0) {
          const t = trace(start, charges, +1, o);
          keep({ ...t, points: [onPlate, ...t.points], mags: [t.mags[0], ...t.mags] }, `plate${pi}`);
        } else if (s.side !== Math.sign(other.x - pl.x)) {
          // na vnější stranu záporné desky přicházejí čáry z dálky
          const t = trace(start, charges, -1, o);
          if (endsOnPositive(t)) continue;
          const r = reversed(t, `plate${pi}`);
          keep({ ...r, points: [...r.points, onPlate], mags: [...r.mags, r.mags[r.mags.length - 1]] }, -1);
        }
      }
    });
  }
  return lines;
}
