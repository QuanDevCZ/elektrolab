// Data pro grafy v laboratoři (Obr. 2 a Obr. 3). Čistý modul, testuje se v Node.

import { coulombForce, fieldAt, length } from './physics.js';

// F_e v závislosti na r pro dvojici Q₁, Q₂ (Coulombův zákon): F klesá s druhou mocninou r.
// Vrací n+1 vzorků { r, F } rovnoměrně od rMin do rMax.
export function forceCurve(Q1, Q2, epsR, rMin, rMax, n = 160) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const r = rMin + ((rMax - rMin) * i) / n;
    out.push({ r, F: coulombForce(Q1, Q2, r, epsR) });
  }
  return out;
}

// Velikost intenzity |E| podél úsečky a → b (skládání polí všech zdrojů).
// Vrací { s [m od bodu a], E [V·m⁻¹] }; body uvnitř kuliček (blíž než `skipR`) mají E = null,
// aby graf v místě náboje nevystřelil do nekonečna.
export function fieldProfile(sources, a, b, epsR, { n = 200, skipR = 0, avoid = [] } = {}) {
  const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
    const inside = avoid.some((c) => Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z) < skipR);
    out.push({ s: L * t, E: inside ? null : length(fieldAt(p, sources, epsR)) });
  }
  return out;
}
