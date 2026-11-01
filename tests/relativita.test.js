import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AU_KM, PLANETS, planetById, auToKm, kmToAu, grouped, distanceText, relativeSentence, scaleFor } from '../src/core/relativita.js';

test('1 AU = vzdálenost Země–Slunce ≐ 150 000 000 km (jak říkal učitel)', () => {
  assert.equal(AU_KM, 150000000);
  assert.equal(planetById('zeme').au, 1);
  assert.equal(auToKm(1), AU_KM);
});

test('převod relativní ↔ absolutní: Venuše 0,72 AU ≐ 108 000 000 km', () => {
  assert.equal(auToKm(0.72), 108000000);
  assert.ok(Math.abs(kmToAu(108000000) - 0.72) < 1e-12);
  assert.equal(distanceText(planetById('venuse'), 'km'), '108 000 000 km');
  assert.equal(distanceText(planetById('venuse'), 'au'), '0,72 AU');
});

test('planety seřazené podle vzdálenosti, Venuše blíž a Mars dál než Země', () => {
  for (let i = 1; i < PLANETS.length; i++) assert.ok(PLANETS[i].au > PLANETS[i - 1].au);
  assert.match(relativeSentence(planetById('venuse'), 'au'), /blíž než Země/);
  assert.match(relativeSentence(planetById('mars'), 'au'), /dál než Země/);
  assert.match(relativeSentence(planetById('zeme'), 'au'), /vztažná jednotka/);
});

test('všech osm planet; vnější planety mají vlastní měřítko', () => {
  assert.deepEqual(PLANETS.map((p) => p.name), ['Merkur', 'Venuše', 'Země', 'Mars', 'Jupiter', 'Saturn', 'Uran', 'Neptun']);
  assert.equal(scaleFor(planetById('mars')), 'inner');
  assert.equal(scaleFor(planetById('jupiter')), 'outer');
  assert.equal(distanceText(planetById('neptun'), 'au'), '30,07 AU');
  assert.equal(distanceText(planetById('neptun'), 'km'), '4 510 500 000 km');
  assert.match(relativeSentence(planetById('jupiter'), 'au'), /5,2krát .* dál než Země/);
});

test('čísla s mezerami po tisících a desetinnou čárkou', () => {
  assert.equal(grouped(150000000), '150 000 000');
  assert.equal(grouped(58500000), '58 500 000');
  assert.doesNotMatch(relativeSentence(planetById('mars'), 'au'), /\d\.\d/);
});
