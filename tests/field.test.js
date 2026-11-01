import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePlates, plateSources, crossedPlate, betweenPlates } from '../src/core/plates.js';
import { fieldAt, length, measure } from '../src/core/physics.js';
import { sampleGrid } from '../src/core/fieldgrid.js';
import { logRange, colorAt, position, legendTicks } from '../src/core/colormap.js';
import { traceLines } from '../src/core/fieldlines.js';

const S = 4;
const plates = makePlates(S);
const src = plateSources(plates);

test('desky: kladná vlevo, záporná vpravo, stejně velké náboje', () => {
  assert.ok(plates[0].x < plates[1].x);
  assert.ok(plates[0].Q > 0 && plates[1].Q < 0);
  assert.equal(plates[0].Q, -plates[1].Q);
  const total = src.reduce((s, c) => s + c.Q, 0);
  assert.ok(Math.abs(total) < 1e-18);
});

test('homogenní pole: mezi deskami má E všude skoro stejnou velikost i směr (+ → −)', () => {
  const E0 = fieldAt({ x: 0, y: 0, z: 0 }, src);
  assert.ok(E0.x > 0, 'pole míří od kladné desky k záporné');
  const pts = [
    { x: -0.25, y: 0, z: 0 }, { x: 0.25, y: 0, z: 0 },
    { x: 0, y: 0, z: 0.3 }, { x: 0, y: 0.3, z: -0.3 }, { x: 0.2, y: -0.2, z: 0.2 },
  ];
  for (const p of pts) {
    const E = fieldAt(p, src);
    assert.ok(Math.abs(length(E) / length(E0) - 1) < 0.12, `|E| v ${JSON.stringify(p)} se liší o víc než 12 %`);
    assert.ok(E.x / length(E) > 0.97, `směr v ${JSON.stringify(p)} není kolmo na desky`);
  }
});

test('vně desek je pole mnohem slabší než mezi nimi', () => {
  const inside = length(fieldAt({ x: 0, y: 0, z: 0 }, src));
  const outside = length(fieldAt({ x: 1.4, y: 0, z: 0 }, src));
  assert.ok(outside < inside / 3, `vně ${outside}, uvnitř ${inside}`);
});

test('průchod deskou a prostor mezi deskami', () => {
  const pl = plates[1];
  assert.equal(crossedPlate({ x: pl.x - 0.1, y: 0, z: 0 }, { x: pl.x + 0.1, y: 0, z: 0 }, plates), 1);
  assert.equal(crossedPlate({ x: pl.x - 0.1, y: 0, z: 1.5 }, { x: pl.x + 0.1, y: 0, z: 1.5 }, plates), -1);
  assert.equal(betweenPlates({ x: 0, y: 0, z: 0.1 }, plates), true);
  assert.equal(betweenPlates({ x: 1, y: 0, z: 0 }, plates), false);
});

test('náboj mezi deskami: síla F = Q·E je všude stejná', () => {
  const at = (x, z) => measure([{ id: 1, Q: 1e-6, x, y: 0, z }], 1, 1, src).selected.F;
  const F0 = at(0, 0);
  for (const [x, z] of [[-0.25, 0.2], [0.2, -0.3], [0.1, 0.35]]) {
    assert.ok(Math.abs(at(x, z) / F0 - 1) < 0.12);
  }
});

test('siločáry z kladné desky končí na záporné desce', () => {
  const lines = traceLines([], { size: S, radius: 0.08, mode: 'plane', plates, sources: src });
  const fromPlus = lines.filter((l) => l.from === 'plate0');
  assert.ok(fromPlus.length >= 9);
  const toMinus = fromPlus.filter((l) => l.end === 'plate' && l.endIndex === 1);
  assert.ok(toMinus.length >= 7, `na zápornou desku dorazilo jen ${toMinus.length} čar`);
  for (const l of lines) assert.equal(l.mags.length, l.points.length);
});

test('mřížka vektorů: v rovině 17 × 17 bodů bez míst v kuličkách a deskách', () => {
  const full = sampleGrid([{ id: 1, Q: 1e-6, x: 3, y: 0, z: 3 }], { size: S, mode: 'plane' });
  assert.equal(full.points.length, 17 * 17);
  const charge = { id: 1, Q: 1e-6, x: 0, y: 0, z: 0 };
  const avoided = sampleGrid([charge], { size: S, mode: 'plane', avoid: [charge], avoidR: 0.2 });
  assert.ok(avoided.points.length < 17 * 17);
  assert.ok(avoided.points.every((s) => Math.hypot(s.p.x, s.p.z) >= 0.2));
  const withPlates = sampleGrid(src, { size: S, mode: 'plane', plates });
  assert.ok(withPlates.points.length < 17 * 17);
  const space = sampleGrid([charge], { size: S, mode: 'space' });
  assert.equal(space.points.length, 9 * 9 * 5 - 1); // bod přesně v náboji má E = „nekonečno“ → vynechán? ne: E = 0 jen ve středu
});

test('mřížka: εᵣ zmenší intenzitu', () => {
  const c = [{ id: 1, Q: 1e-6, x: 0.1, y: 0, z: 0.1 }];
  const a = sampleGrid(c, { size: S, mode: 'plane' }).points[0].mag;
  const b = sampleGrid(c, { size: S, mode: 'plane', epsR: 24 }).points[0].mag;
  assert.ok(Math.abs(a / b - 24) < 1e-9);
});

test('barevná stupnice: celé řády, světlejší = silnější', () => {
  const r = logRange([2e3, 5e3, 1e4, 3e4, 8e4, 2e5, 7e5]);
  assert.ok(Number.isInteger(r.lo) && Number.isInteger(r.hi));
  assert.ok(r.hi - r.lo >= 2);
  assert.ok(position(1e3, r) <= position(1e5, r));
  const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  let prev = -1;
  for (let e = r.lo; e <= r.hi; e += 0.25) {
    const L = lum(colorAt(10 ** e, r));
    assert.ok(L >= prev - 1e-9, 'barva musí světlat se silnějším polem');
    prev = L;
  }
  const ticks = legendTicks(r);
  assert.equal(ticks.length, r.hi - r.lo + 1);
  assert.equal(ticks[0].t, 0);
  assert.equal(ticks[ticks.length - 1].t, 1);
});
