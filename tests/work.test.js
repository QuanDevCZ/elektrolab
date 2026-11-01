import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forceOn, voltage, segmentWork, pathWork, makePath, PATHS, pointAt, workProfile } from '../src/core/work.js';
import { WORK_EXAMPLES, VOLTAGE_FACTS, matchesSesit } from '../src/core/examples.js';

const close = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

test('F = Q·E (05 Př. 1: 0,05 N)', () => {
  assert.ok(close(forceOn(2e-5, 2500), 0.05));
});

test('W = Q·U a U = E·d (lekce 05)', () => {
  const A = { x: -0.05, z: 0 }, B = { x: 0.05, z: 0 };
  const U = voltage(1000, A, B);
  assert.ok(close(U, 100));                                   // U = E·d = 1000 · 0,1
  assert.ok(close(pathWork([A, B], 1e-6, 1000).W, 1e-6 * U)); // W = Q·U
});

test('úhel α a znaménko práce: po, proti a kolmo na siločáry', () => {
  const o = { x: 0, z: 0 };
  const along = segmentWork(o, { x: 0.1, z: 0 }, 1e-6, 1000);
  const against = segmentWork(o, { x: -0.1, z: 0 }, 1e-6, 1000);
  const perp = segmentWork(o, { x: 0, z: 0.1 }, 1e-6, 1000);
  assert.equal(Math.round(along.alpha), 0);
  assert.equal(Math.round(against.alpha), 180);
  assert.equal(Math.round(perp.alpha), 90);
  assert.ok(along.W > 0 && against.W < 0 && Math.abs(perp.W) < 1e-20);
  assert.equal(along.kind, 'parallel');
  assert.equal(perp.kind, 'perpendicular');
});

test('záporný náboj otočí znaménko práce (05 Př. 7)', () => {
  const A = { x: -0.05, z: 0 }, B = { x: 0.05, z: 0 };
  assert.ok(close(pathWork([A, B], -1e-6, 1000).W, -pathWork([A, B], 1e-6, 1000).W));
});

test('práce nezávisí na cestě (lekce 06, konzervativní síly)', () => {
  const A = { x: -0.04, z: -0.03 }, B = { x: 0.045, z: 0.02 };
  const works = PATHS.map((k) => pathWork(makePath(A, B, k, 0.08), 1e-6, 1000).W);
  for (const W of works) assert.ok(close(W, works[0], 1e-9), `${W} vs ${works[0]}`);
  assert.ok(close(works[0], 1e-6 * voltage(1000, A, B), 1e-9));
});

test('cesty začínají v A, končí v B; schody jsou jen po siločarách a kolmo', () => {
  const A = { x: -0.04, z: -0.03 }, B = { x: 0.04, z: 0.03 };
  for (const k of PATHS) {
    const p = makePath(A, B, k, 0.08);
    assert.deepEqual(p[0], A);
    assert.deepEqual(p[p.length - 1], B);
  }
  const kinds = pathWork(makePath(A, B, 'schody', 0.08), 1e-6, 1000).segments.map((s) => s.kind);
  assert.ok(kinds.every((x) => x === 'parallel' || x === 'perpendicular'));
  assert.ok(kinds.includes('parallel') && kinds.includes('perpendicular'));
  const ok = makePath(A, B, 'oklika', 0.08);
  assert.ok(ok.some((p) => Math.abs(p.z) === 0.08));
});

test('pointAt a průběh práce podél cesty', () => {
  const A = { x: -0.05, z: 0 }, B = { x: 0.05, z: 0 };
  const path = makePath(A, B, 'oklika', 0.08);
  assert.deepEqual(pointAt(path, 0), A);
  assert.ok(close(pointAt(path, 1).x, B.x));
  const prof = workProfile(path, 1e-6, 1000, 60);
  assert.equal(prof[0].W, 0);
  assert.ok(close(prof[prof.length - 1].W, 1e-4, 1e-9));
});

for (const ex of WORK_EXAMPLES) {
  test(`${ex.lesson} ${ex.title}: ${ex.expect.shown}`, () => {
    const { W } = pathWork([ex.A, ex.B], ex.Q, ex.E);
    if (ex.expect.value === 0) assert.ok(Math.abs(W) < 1e-15);
    else assert.ok(matchesSesit(W, ex.expect), `${W} vs ${ex.expect.value}`);
    // body leží mezi deskami na stole 40 cm (desky v x = ±0,05 m)
    for (const p of [ex.A, ex.B]) assert.ok(Math.abs(p.x) <= 0.05 && Math.abs(p.z) <= 0.1);
  });
}

for (const f of VOLTAGE_FACTS) {
  test(`napětí kolem nás: ${f.label}`, () => {
    assert.ok(matchesSesit(f.value, { value: f.expect, sig: f.sig }), `${f.value} vs ${f.expect}`);
  });
}
