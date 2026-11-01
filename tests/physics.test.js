import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coulombForce, pointFieldMagnitude, fieldAt, netForceOn, touchShare, measure, isAttractive } from '../src/core/physics.js';
import { kFor, EPS0, MEDIA, mediumById } from '../src/core/constants.js';
import { roundSig } from '../src/core/examples.js';

// Každý test = příklad ze sešitu; porovnáváme na tolik platných číslic, kolik má výsledek v sešitě.
const sesit = (value, expected, sig) => assert.equal(roundSig(value, sig), roundSig(expected, sig));

test('k ve vakuu ≈ 9·10⁹ (02, 03)', () => {
  sesit(kFor(1), 9e9, 1);
  sesit(kFor(1), 8.99e9, 3);
});

test('k pro ethanol = 3,75·10⁸ N·m²·C⁻² (03 Př. 3)', () => {
  sesit(kFor(24), 3.75e8, 3);
});

test('02 Př. 1: 0,01 C a 0,01 C ve vzdálenosti 0,5 m → 3 600 000 N', () => {
  sesit(coulombForce(0.01, 0.01, 0.5), 3600000, 2);
});

test('02 Př. 2: dva elektrony 10⁻⁹ m od sebe → 2,3·10⁻¹⁰ N', () => {
  sesit(coulombForce(-1.6e-19, -1.6e-19, 1e-9), 2.3e-10, 2);
});

test('02 Př. 3: F = 1000 N na 1 m → Q = 3,3·10⁻⁴ C', () => {
  const Q = Math.sqrt((1000 * 1 ** 2) / kFor(1));
  sesit(Q, 3.3e-4, 2);
});

test('03 Př. 1: 150 nC a 100 nC na 0,034 m ve vakuu → 0,12 N', () => {
  sesit(coulombForce(150e-9, 100e-9, 0.034), 0.12, 2);
});

test('03 Př. 5: εᵣ = 2 → síla se zmenší na polovinu', () => {
  const F1 = coulombForce(1e-6, 1e-6, 0.1, 1);
  const F2 = coulombForce(1e-6, 1e-6, 0.1, 2);
  assert.ok(Math.abs(F2 / F1 - 0.5) < 1e-12);
});

test('03 Př. 6: totéž v ethanolu → 4,9·10⁻³ N', () => {
  sesit(coulombForce(150e-9, 100e-9, 0.034, 24), 4.9e-3, 2);
});

test('03 Př. 7: +80 nC a −20 nC na 10 cm → přitahují se 1,44·10⁻³ N; po doteku 30 nC a 8,1·10⁻⁴ N', () => {
  assert.equal(isAttractive(80e-9, -20e-9), true);
  sesit(coulombForce(80e-9, -20e-9, 0.1), 1.44e-3, 3);
  const [a, b] = touchShare(80e-9, -20e-9);
  sesit(a, 30e-9, 3);
  sesit(b, 30e-9, 3);
  assert.equal(isAttractive(a, b), false);
  sesit(coulombForce(a, b, 0.1), 8.1e-4, 2);
});

test('03 Př. 8: F = 2,3·10⁻⁴ N pro 30 nC na 10 cm → εᵣ ≈ 3,5', () => {
  const Q = 30e-9, r = 0.1, F = 2.3e-4;
  const epsR = (Q * Q) / (4 * Math.PI * EPS0 * r * r * F);
  sesit(epsR, 3.5, 2);
});

test('tabulka prostředí obsahuje jen hodnoty z lekce 03', () => {
  assert.deepEqual(MEDIA.map((m) => [m.id, m.epsR]), [
    ['vakuum', 1], ['vzduch', 1.0006], ['petrolej', 2.0], ['porcelan', 6], ['ethanol', 24], ['voda', 81],
  ]);
  assert.equal(mediumById('voda').loc, 've vodě');
});

test('04 Př. 2: náboj 2·10⁻⁶ C má intenzitu 1 N·C⁻¹ ve vzdálenosti 134 m', () => {
  const r = Math.sqrt((kFor(1) * 2e-6) / 1);
  sesit(r, 134, 3);
  sesit(pointFieldMagnitude(2e-6, r), 1, 6);
});

test('04 Př. 3: F = 0,2 N na náboj 3·10⁻⁷ C → E = 670 000 N·C⁻¹', () => {
  sesit(0.2 / 3e-7, 670000, 2);
});

test('04 Př. 1: E od Q₀ = 10⁻³ C ve 2 m, F = Q·E pro Q₁ = 1 C → 2 250 000 N', () => {
  const E = pointFieldMagnitude(1e-3, 2);
  sesit(1 * E, 2250000, 3);
});

test('superpozice: uprostřed mezi dvěma stejnými náboji je E = 0', () => {
  const charges = [{ id: 1, Q: 1e-6, x: -1, y: 0, z: 0 }, { id: 2, Q: 1e-6, x: 1, y: 0, z: 0 }];
  const E = fieldAt({ x: 0, y: 0, z: 0 }, charges);
  assert.ok(Math.hypot(E.x, E.y, E.z) < 1e-6);
});

test('intenzita kladného náboje míří od něj, záporného k němu', () => {
  const plus = fieldAt({ x: 1, y: 0, z: 0 }, [{ id: 1, Q: 1e-6, x: 0, y: 0, z: 0 }]);
  const minus = fieldAt({ x: 1, y: 0, z: 0 }, [{ id: 1, Q: -1e-6, x: 0, y: 0, z: 0 }]);
  assert.ok(plus.x > 0);
  assert.ok(minus.x < 0);
});

test('síly akce a reakce: na oba náboje působí stejně velká opačná síla', () => {
  const a = { id: 1, Q: 2e-6, x: 0, y: 0, z: 0 };
  const b = { id: 2, Q: -5e-9, x: 0.3, y: 0, z: 0.4 };
  const Fa = netForceOn(a, [a, b]);
  const Fb = netForceOn(b, [a, b]);
  assert.ok(Math.abs(Fa.x + Fb.x) < 1e-15 && Math.abs(Fa.z + Fb.z) < 1e-15);
  // opačná znaménka → a je tažen směrem k b (x > 0)
  assert.ok(Fa.x > 0);
  sesit(Math.hypot(Fa.x, Fa.z), coulombForce(2e-6, -5e-9, 0.5), 10);
});

test('measure: dvojice Q₁–Q₂ a vybraný náboj', () => {
  const charges = [
    { id: 1, Q: 150e-9, x: -0.017, y: 0, z: 0 },
    { id: 2, Q: 100e-9, x: 0.017, y: 0, z: 0 },
  ];
  const m = measure(charges, 24, 2);
  sesit(m.pair.F, 4.9e-3, 2);
  assert.equal(m.pair.attractive, false);
  sesit(m.selected.F, m.pair.F, 10);
  sesit(m.selected.E, m.pair.F / 100e-9, 10); // E = F/Q
});
