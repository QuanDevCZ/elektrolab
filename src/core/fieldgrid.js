// Mřížka vektorů intenzity — jak na obrázcích v lekci 04 („Zobrazení pomocí vektorů intenzity“).
// V každém bodě mřížky změříme vektor E; šipky budou stejně dlouhé, velikost ukáže barva.
// Čistý modul.

import { fieldAt, length } from './physics.js';

// sources  všechny náboje, které vytvářejí pole (i drobné náboje desek)
// opts.size     velikost stolu S [m]
// opts.mode     'plane' = jedna vrstva v rovině stolu, 'space' = několik vrstev nad sebou
// opts.avoid    body, kolem kterých šipky vynecháme (kuličky) — { x, y, z }
// opts.avoidR   poloměr vynechání [m]
// opts.plates   desky — šipky přímo v desce vynecháme
// Vrací [{ p, E, mag }] — p bod, E vektor intenzity, mag jeho velikost.
export function sampleGrid(sources, opts = {}) {
  const S = opts.size ?? 4;
  const mode = opts.mode ?? 'plane';
  const epsR = opts.epsR ?? 1;
  const n = mode === 'plane' ? 17 : 9;
  const span = S * 0.9;                       // mřížka nezasahuje až na okraj stolu
  const step = span / (n - 1);
  const layers = mode === 'plane' ? [0] : [-0.3 * S, -0.15 * S, 0, 0.15 * S, 0.3 * S];
  const avoid = opts.avoid ?? [];
  const avoidR = opts.avoidR ?? S * 0.05;
  const plates = opts.plates ?? [];

  const out = [];
  for (const y of layers) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const p = { x: -span / 2 + i * step, y, z: -span / 2 + j * step };
        if (avoid.some((c) => Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z) < avoidR)) continue;
        if (plates.some((pl) => Math.abs(p.x - pl.x) < step * 0.35 && Math.abs(p.y) <= pl.half && Math.abs(p.z) <= pl.half)) continue;
        const E = fieldAt(p, sources, epsR);
        const mag = length(E);
        if (mag === 0) continue;
        out.push({ p, E, mag });
      }
    }
  }
  return { points: out, step };
}
