// Barevná stupnice pro velikost intenzity |E| — logaritmická (každý dílek = 10× silnější pole).
// Jako v lekci 04: síla pole se ukazuje BARVOU, ne délkou šipky — světlejší = silnější pole.
// Čistý modul.

// tmavě modrá (slabé pole) → tyrkysová → zelená → žlutá → skoro bílá (silné pole)
export const PALETTE = ['#2b4a72', '#2f7f8c', '#5fb36e', '#d4dd5c', '#fff8dc'];

function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const STOPS = PALETTE.map(hex);

// Rozsah stupnice v celých řádech: { lo, hi } jsou exponenty (10^lo … 10^hi V·m⁻¹).
// Krajní 5 % hodnot ignorujeme (těsně u náboje je pole obrovské a stupnici by „přetáhlo“).
export function logRange(magnitudes, minSpan = 2) {
  const logs = magnitudes.filter((m) => m > 0 && Number.isFinite(m)).map(Math.log10).sort((a, b) => a - b);
  if (logs.length === 0) return { lo: 0, hi: minSpan };
  const at = (q) => logs[Math.min(logs.length - 1, Math.max(0, Math.round(q * (logs.length - 1))))];
  let lo = Math.floor(at(0.05));
  let hi = Math.ceil(at(0.95));
  if (hi - lo < minSpan) {
    const mid = (lo + hi) / 2;
    lo = Math.floor(mid - minSpan / 2);
    hi = lo + minSpan;
  }
  return { lo, hi };
}

// 0 … 1 — kde na stupnici leží daná velikost intenzity
export function position(mag, range) {
  if (!(mag > 0)) return 0;
  const t = (Math.log10(mag) - range.lo) / (range.hi - range.lo);
  return Math.min(1, Math.max(0, t));
}

// barva [r, g, b] v rozsahu 0 … 1
export function colorAt(mag, range) {
  const t = position(mag, range) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const a = STOPS[i], b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// popisky legendy: každý řád jeden dílek
export function legendTicks(range) {
  const ticks = [];
  for (let e = range.lo; e <= range.hi; e++) ticks.push({ exp: e, t: (e - range.lo) / (range.hi - range.lo) });
  return ticks;
}
