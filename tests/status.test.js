import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusSentence, fieldSentence, workSentence, rubSentence } from '../src/core/status.js';
import { mediumById } from '../src/core/constants.js';
import { coulombForce, isAttractive } from '../src/core/physics.js';

const vakuum = mediumById('vakuum');
const pair = (Q1, Q2, r, epsR = 1) => ({ Q1, Q2, r, F: coulombForce(Q1, Q2, r, epsR), attractive: isAttractive(Q1, Q2) });
const base = { count: 2, medium: vakuum, rMin: 0.2, event: null, baseline: null };

test('prázdný stůl', () => {
  assert.equal(statusSentence({ ...base, count: 0, pair: null }), 'Přidej náboj tlačítkem vlevo.');
});

test('jeden náboj — radiální pole', () => {
  assert.match(statusSentence({ ...base, count: 1, pair: null, single: { Q: 1e-6 } }), /radiální pole/);
  assert.match(statusSentence({ ...base, count: 1, pair: null, single: { Q: -1e-6 } }), /vstupují/);
});

test('znaménka: přitahování / odpuzování (věty ze sešitu)', () => {
  assert.match(statusSentence({ ...base, pair: pair(1e-6, -1e-6, 1) }), /^Náboje opačného znaménka se přitahují/);
  assert.match(statusSentence({ ...base, pair: pair(1e-6, 1e-6, 1) }), /^Náboje stejného znaménka se odpuzují/);
});

test('poloviční vzdálenost → čtyřikrát větší síla', () => {
  const baseline = { r: 1, F: 0, Q1: 1e-6, Q2: 1e-6, epsR: 1, medium: vakuum };
  assert.equal(
    statusSentence({ ...base, pair: pair(1e-6, 1e-6, 0.5), baseline }),
    'Vzdálenost se zmenšila na polovinu — síla vzrostla čtyřikrát.',
  );
  assert.equal(
    statusSentence({ ...base, pair: pair(1e-6, 1e-6, 2), baseline }),
    'Vzdálenost se zvětšila na dvojnásobek — síla klesla na čtvrtinu.',
  );
});

test('náboj daleko → síla téměř nulová', () => {
  assert.match(statusSentence({ ...base, rMin: 0.05, pair: pair(1e-6, 1e-6, 1.5) }), /téměř nulová/);
});

test('změna prostředí: v ethanolu 24krát menší síla', () => {
  const ethanol = mediumById('ethanol');
  const baseline = { r: 0.034, Q1: 150e-9, Q2: 100e-9, epsR: 1, medium: vakuum };
  assert.equal(
    statusSentence({ ...base, event: 'medium', medium: ethanol, baseline, pair: pair(150e-9, 100e-9, 0.034, 24) }),
    'V ethanolu je síla 24krát menší než ve vakuu (εᵣ = 24).',
  );
});

test('režim pole: radiální, dipól, souhlasné náboje, desky, bod P, prostředí', () => {
  const f = (s) => fieldSentence({ count: 0, charges: [], plates: false, probe: null, event: null, medium: vakuum, baseline: null, ...s });
  assert.match(f({ count: 1, single: { Q: 1e-6 }, charges: [{ Q: 1e-6 }] }), /^Radiální pole: všechny vektory míří od náboje/);
  assert.match(f({ count: 1, single: { Q: -1e-6 }, charges: [{ Q: -1e-6 }] }), /míří k náboji/);
  assert.match(f({ count: 2, charges: [{ Q: 1e-6 }, { Q: -1e-6 }] }), /^Pole dipólu/);
  assert.match(f({ count: 2, charges: [{ Q: 1e-6 }, { Q: 2e-6 }] }), /E = 0/);
  assert.match(f({ plates: true }), /homogenní/);
  assert.match(f({ plates: true, testBetween: true, count: 1 }), /F = Q·E/);
  assert.equal(
    f({ event: 'probe', probe: { E: 2.25e6 } }),
    'V bodě P má pole intenzitu 2,25·10⁶ V·m⁻¹ — na náboj 1 C by tu působila síla 2,25·10⁶ N.',
  );
  assert.match(
    f({ event: 'medium', medium: mediumById('voda'), baseline: { epsR: 1, medium: vakuum } }),
    /^Ve vodě je intenzita pole 81krát menší než ve vakuu .* barvy ztmavly\.$/,
  );
});

test('dotek: zákon zachování náboje', () => {
  const s = statusSentence({ ...base, event: 'touched', pair: pair(30e-9, 30e-9, 0.1) });
  assert.match(s, /\+30 nC/);
  assert.match(s, /zákon zachování elektrického náboje/);
});

test('práce: jiná cesta, stejná práce (lekce 06)', () => {
  const s = workSentence({ W: 1e-4, Q: 1e-6, kinds: ['parallel', 'perpendicular'], event: 'path', prevW: 1e-4 });
  assert.match(s, /^Jiná cesta, stejná práce/);
  assert.match(s, /konzervativní/);
});

test('práce: znaménka a kolmý pohyb (05 Př. 6, 7)', () => {
  assert.match(workSentence({ W: -1e-4, Q: 1e-6, kinds: ['parallel'] }), /záporná/);
  assert.match(workSentence({ W: 0, Q: 1e-6, kinds: ['perpendicular'] }), /cos 90° = 0/);
  assert.match(workSentence({ W: -1e-4, Q: -1e-6, event: 'sign' }), /^Záporný náboj/);
  assert.match(workSentence({ W: 1e-4, Q: 1e-6, kinds: ['parallel'] }), /kladnou práci/);
});

test('tření tyče: zákon zachování náboje a české tvary', () => {
  assert.match(rubSentence(0), /neutrální/);
  assert.match(rubSentence(1), /přešel 1 elektron:/);
  assert.match(rubSentence(3), /přešly 3 elektrony:/);
  assert.match(rubSentence(12), /přešlo 12 elektronů:.*Celkem pořád 0/);
});
