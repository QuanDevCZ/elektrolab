import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forceCurve, fieldProfile } from '../src/core/curves.js';
import { coulombForce } from '../src/core/physics.js';

test('F(r/2) = 4·F(r) — síla klesá s druhou mocninou vzdálenosti', () => {
  const c = forceCurve(1e-6, 1e-6, 1, 0.5, 1, 2); // r = 0,5; 0,75; 1
  assert.equal(c.length, 3);
  assert.ok(Math.abs(c[0].F / c[2].F - 4) < 1e-12);
  assert.ok(Math.abs(c[2].F - coulombForce(1e-6, 1e-6, 1)) < 1e-15);
});

test('|E| podél úsečky mezi dvěma souhlasnými náboji má uprostřed nulu', () => {
  const s = [{ id: 1, Q: 1e-6, x: -1, y: 0, z: 0 }, { id: 2, Q: 1e-6, x: 1, y: 0, z: 0 }];
  const p = fieldProfile(s, { x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 1, { n: 100, skipR: 0.1, avoid: s });
  assert.equal(p[0].E, null);   // uvnitř kuličky se nekreslí
  assert.ok(p[50].E < 1e-6);    // uprostřed se pole vyruší
  assert.ok(p[20].E > p[40].E); // blíž k náboji silnější
});
