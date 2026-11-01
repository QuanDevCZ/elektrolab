// „Příklad ze sešitu“ — jedno kliknutí postaví scénu z příkladu v učebním textu,
// aby měření ukázalo stejný výsledek jako sešit. Čistý modul (testuje ho tests/examples.test.js).
//
// charges: náboje položené na osu x symetricky kolem středu (vzdálenost r).
// expect:  výsledek ze sešitu + počet platných číslic, na který ho sešit zaokrouhlil.
// sešit počítá s k = 9·10⁹, aplikace přesněji s ε₀ = 8,85·10⁻¹² — po zaokrouhlení vyjde stejně.

import { kFor } from './constants.js';

const pairAt = (r, Q1, Q2) => [
  { Q: Q1, x: -r / 2, y: 0, z: 0 },
  { Q: Q2, x: r / 2, y: 0, z: 0 },
];

export const EXAMPLES = [
  {
    id: '02-1',
    mode: 'coulomb',
    lesson: '02 Coulombův zákon',
    title: 'Př. 1',
    text: 'Urči sílu, kterou by se odpuzovaly 2 bodové náboje o velikosti 0,01 C umístěné 0,5 m od sebe.',
    scale: 4,
    medium: 'vakuum',
    charges: pairAt(0.5, 0.01, 0.01),
    expect: { label: 'F', value: 3600000, unit: 'N', sig: 2, shown: '3 600 000 N' },
  },
  {
    id: '02-3',
    mode: 'coulomb',
    lesson: '02 Coulombův zákon',
    title: 'Př. 3',
    text: 'Dvě stejné kuličky nabité stejně velkým souhlasným nábojem, vzdálené 1 metr od sebe, se odpuzují silou 1000 N. ' +
      'V sešitě vyšel náboj Q = 3,3·10⁻⁴ C.',
    scale: 4,
    medium: 'vakuum',
    // náboj spočítaný přesně z F = 1000 N (Q = √(F·r²/k)), aby síla vyšla 1000 N
    charges: pairAt(1, Math.sqrt(1000 / kFor(1)), Math.sqrt(1000 / kFor(1))),
    expect: { label: 'F', value: 1000, unit: 'N', sig: 2, shown: '1000 N' },
  },
  {
    id: '03-1',
    mode: 'coulomb',
    lesson: '03 Permitivita prostředí',
    title: 'Př. 1',
    text: 'Náboje Q₁ = 150 nC a Q₂ = 100 nC se ve vakuu odpuzují silou 0,12 N. V sešitě vyšla vzdálenost 0,034 m.',
    scale: 0.4,
    medium: 'vakuum',
    charges: pairAt(0.034, 150e-9, 100e-9),
    expect: { label: 'F', value: 0.12, unit: 'N', sig: 2, shown: '0,12 N' },
  },
  {
    id: '03-6',
    mode: 'coulomb',
    lesson: '03 Permitivita prostředí',
    title: 'Př. 6',
    text: 'Urči sílu, kterou se v ethanolu (εᵣ = 24) odpuzují bodové náboje Q₁ = 150 nC a Q₂ = 100 nC, jejichž vzdálenost je 3,4 cm.',
    scale: 0.4,
    medium: 'ethanol',
    charges: pairAt(0.034, 150e-9, 100e-9),
    expect: { label: 'F', value: 4.9e-3, unit: 'N', sig: 2, shown: '4,9·10⁻³ N' },
  },
  {
    id: '03-7',
    mode: 'coulomb',
    lesson: '03 Permitivita prostředí',
    title: 'Př. 7',
    text: 'Dvě malé kuličky s náboji Q₁ = +80 nC a Q₂ = −20 nC jsou ve vakuu 10 cm od sebe. ' +
      'a) Jakou silou se přitahují? b) Jak na sebe působí, když se dotknou a vrátí zpět? (tlačítko „Dotkni se“)',
    scale: 0.4,
    medium: 'vakuum',
    charges: pairAt(0.1, 80e-9, -20e-9),
    expect: { label: 'F', value: 1.44e-3, unit: 'N', sig: 3, shown: '1,44·10⁻³ N' },
    afterTouch: { label: 'F', value: 8.1e-4, unit: 'N', sig: 2, shown: '8,1·10⁻⁴ N' },
  },
  {
    id: '04-1',
    mode: 'pole',
    lesson: '04 Elektrické pole',
    title: 'Př. 1',
    text: 'Ve vakuu do vzdálenosti 2 m od náboje Q₀ = 10⁻³ C postupně umisťujeme náboje Q₁. Urči sílu, která na ně působí. ' +
      'Přepínej Q₁: síla se mění, ale intenzita E v místě Q₁ zůstává stejná — popisuje pole, které vytvořil Q₀.',
    scale: 4,
    medium: 'vakuum',
    charges: [
      { Q: 1e-3, x: -1, y: 0, z: 0, label: 'Q₀' },
      { Q: 1, x: 1, y: 0, z: 0, label: 'Q₁' },
    ],
    expect: { label: 'F', value: 2250000, unit: 'N', sig: 3, shown: '2 250 000 N' },
    expectE: { value: 2.25e6, sig: 3, shown: '2,25·10⁶ V·m⁻¹' },
    // varianty a)–d) z učebnice: Q₁ a výsledná síla ze sešitu
    variants: [
      { key: 'a', Q: 1, value: 2250000, sig: 3, shown: '2 250 000 N' },
      { key: 'b', Q: 1e-4, value: 225, sig: 3, shown: '225 N' },
      { key: 'c', Q: 2e-6, value: 4.5, sig: 2, shown: '4,5 N' },
      { key: 'd', Q: 3.14e-4, value: 706, sig: 3, shown: '706 N' },
    ],
  },
];

// ── Práce v elektrickém poli (lekce 05) ──────────────────────────────────────
// Stůl 40 cm, desky 10 cm od sebe (x = ±0,05 m) — přesně vzdálenost z 05 Př. 6.
// A, B = body na stole { x, z } [m]; pole míří od kladné desky (vlevo) k záporné (+x).
export const WORK_EXAMPLES = [
  {
    id: '05-6a', lesson: '05 Práce v elektrickém poli', title: 'Př. 6a',
    text: 'Jakou práci vykoná elektrická síla v homogenním poli o intenzitě 1000 V·m⁻¹ při přemístění kladného náboje 1 µC do vzdálenosti 10 cm ve směru siločar?',
    E: 1000, Q: 1e-6, A: { x: -0.05, z: 0 }, B: { x: 0.05, z: 0 },
    expect: { value: 1e-4, sig: 2, shown: '10⁻⁴ J' },
  },
  {
    id: '05-6b', lesson: '05 Práce v elektrickém poli', title: 'Př. 6b',
    text: 'Totéž proti směru siločar: α = 180°, cos α = −1, práce pole je záporná.',
    E: 1000, Q: 1e-6, A: { x: 0.05, z: 0 }, B: { x: -0.05, z: 0 },
    expect: { value: -1e-4, sig: 2, shown: '−10⁻⁴ J' },
  },
  {
    id: '05-6c', lesson: '05 Práce v elektrickém poli', title: 'Př. 6c',
    text: 'Totéž kolmo na směr siločar: α = 90°, cos 90° = 0, pole práci nekoná.',
    E: 1000, Q: 1e-6, A: { x: 0, z: -0.05 }, B: { x: 0, z: 0.05 },
    expect: { value: 0, sig: 1, shown: '0 J' },
  },
  {
    id: '05-7', lesson: '05 Práce v elektrickém poli', title: 'Př. 7',
    text: 'Jak by se Př. 6a změnil, kdyby přesunovaný náboj měl záporné znaménko? Síla změní směr, změní se znaménko práce.',
    E: 1000, Q: -1e-6, A: { x: -0.05, z: 0 }, B: { x: 0.05, z: 0 },
    expect: { value: -1e-4, sig: 2, shown: '−10⁻⁴ J' },
  },
];

// Napětí a intenzita „kolem nás“ (lekce 05) — počítá se jen U = E·d a F = Q·E.
// Zásuvku počítáme jako v hodině (d = 0,02 m); učebnice má 1,8 cm → 12 800 V·m⁻¹.
export const VOLTAGE_FACTS = [
  { id: '05-1', label: '05 Př. 1 — síla v poli', what: 'F = Q·E = 2·10⁻⁵ C · 2500 N·C⁻¹', value: 2e-5 * 2500, unit: 'N', sig: 2, expect: 0.05 },
  { id: '05-3a', label: 'monočlánek', what: 'napětí mezi póly', value: 1.5, unit: 'V', sig: 2, expect: 1.5 },
  { id: '05-4', label: 'plochá baterie', what: 'tři monočlánky: U = 3·1,5 V', value: 3 * 1.5, unit: 'V', sig: 2, expect: 4.5 },
  { id: '05-8', label: 'zásuvka (jako v hodině)', what: 'E = U/d = 230 V / 0,02 m', value: 230 / 0.02, unit: 'V·m⁻¹', sig: 3, expect: 11500 },
  { id: '05-9', label: '05 Př. 9 — vedení 220 kV', what: 'E = U/d = 220 000 V / 0,05 m', value: 220000 / 0.05, unit: 'V·m⁻¹', sig: 2, expect: 4400000 },
];

export function exampleById(id) {
  return EXAMPLES.find((e) => e.id === id) || null;
}

// Zaokrouhlení na `sig` platných číslic — tak porovnáváme aplikaci se sešitem.
export function roundSig(x, sig) {
  if (x === 0) return 0;
  const e = Math.floor(Math.log10(Math.abs(x)));
  const f = 10 ** (sig - 1 - e);
  return Math.round(x * f) / f;
}

export function matchesSesit(value, expect) {
  const a = roundSig(value, expect.sig);
  const b = roundSig(expect.value, expect.sig);
  return Math.abs(a - b) <= Math.abs(b) * 1e-9;
}
