import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traceLines } from '../src/core/fieldlines.js';
import { fieldAt } from '../src/core/physics.js';

const opts = { size: 4, radius: 0.08 };

test('jeden kladný náboj: radiální pole, všechny čáry odcházejí do dálky', () => {
  const lines = traceLines([{ id: 1, Q: 1e-6, x: 0, y: 0, z: 0 }], { ...opts, mode: 'plane' });
  assert.equal(lines.length, 16);
  for (const l of lines) {
    assert.equal(l.end, 'out');
    const a = l.points[1], b = l.points[l.points.length - 1];
    // radiální: konec leží na stejné přímce ze středu jako začátek
    const cross = a.x * b.z - a.z * b.x;
    assert.ok(Math.abs(cross) / (Math.hypot(a.x, a.z) * Math.hypot(b.x, b.z)) < 1e-3);
  }
});

test('dipól: čáry z kladného náboje končí v záporném (nebo odcházejí pryč)', () => {
  const charges = [{ id: 1, Q: 1e-6, x: -0.5, y: 0, z: 0 }, { id: 2, Q: -1e-6, x: 0.5, y: 0, z: 0 }];
  const lines = traceLines(charges, { ...opts, mode: 'plane' });
  const fromPlus = lines.filter((l) => l.from === 0);
  assert.equal(fromPlus.length, 16);
  const intoMinus = fromPlus.filter((l) => l.end === 'charge' && l.endIndex === 1);
  assert.ok(intoMinus.length >= 12, `do záporného náboje vešlo jen ${intoMinus.length} čar`);
  for (const l of intoMinus) {
    const last = l.points[l.points.length - 1];
    assert.ok(Math.hypot(last.x - 0.5, last.z) < 1e-9);
  }
});

test('čáry jsou orientované ve směru E (od + k −), i ty, které vstupují do záporného náboje', () => {
  const charges = [{ id: 1, Q: -1e-6, x: 0, y: 0, z: 0 }];
  const lines = traceLines(charges, { ...opts, mode: 'plane' });
  assert.equal(lines.length, 16);
  for (const l of lines) {
    const i = Math.floor(l.points.length / 2);
    const p = l.points[i], q = l.points[i + 1];
    const E = fieldAt(p, charges);
    const dot = (q.x - p.x) * E.x + (q.z - p.z) * E.z;
    assert.ok(dot > 0);
    // poslední bod je střed záporného náboje
    const last = l.points[l.points.length - 1];
    assert.ok(Math.hypot(last.x, last.z) < 1e-9);
  }
});

test('počet čar je úměrný náboji', () => {
  const charges = [{ id: 1, Q: 2e-6, x: -1, y: 0, z: 0 }, { id: 2, Q: 1e-6, x: 1, y: 0, z: 0 }];
  const lines = traceLines(charges, { ...opts, mode: 'plane' });
  assert.equal(lines.filter((l) => l.from === 0).length, 16);
  assert.equal(lines.filter((l) => l.from === 1).length, 8);
});

test('v prostoru (3D) čáry vycházejí do všech směrů a hrubý režim je rychlý', () => {
  const charges = [
    { id: 1, Q: 1e-6, x: -0.6, y: 0, z: 0 }, { id: 2, Q: -2e-6, x: 0.6, y: 0, z: 0.3 },
    { id: 3, Q: 5e-7, x: 0, y: 0, z: -0.8 },
  ];
  const t0 = performance.now();
  const lines = traceLines(charges, { ...opts, mode: 'space', coarse: true });
  const dt = performance.now() - t0;
  assert.ok(lines.some((l) => l.points.some((p) => Math.abs(p.y) > 0.2)));
  assert.ok(dt < 250, `trvalo ${dt.toFixed(0)} ms`);
});
