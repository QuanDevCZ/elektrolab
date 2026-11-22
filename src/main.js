// Elektrolab — hlavní smyčka: stav aplikace → fyzika (core/) → 3D scéna + panely + stavová věta.
// Všechny pohledy jsou propojené: cokoli se změní, přepočítá se vše najednou v recompute().
//
// Dvě zobrazení: Průvodce (story.js — jedna kapitola, jedna věta, málo ovládání) a Laboratoř
// (všechny panely, grafy, měřicí přístroj). Obě sdílejí stejnou scénu a stejný stav.

import * as THREE from 'three';
import { createScene } from './scene.js';
import { createChargeLayer, qName } from './charges.js';
import { createArrowLayer } from './arrows.js';
import { createLineLayer } from './lines.js';
import { createGridLayer } from './grid.js';
import { createPlateLayer, createProbeLayer } from './plates.js';
import { createWorkLayer } from './work-scene.js';
import { createNabojLayer } from './naboj.js';
import { createRelativitaLayer } from './relativita-scene.js';
import { createGraph } from './graphs.js';
import { createGauge } from './gauge.js';
import { createStory } from './story.js';
import * as ui from './ui.js';
import { measure, distance, touchShare, fieldAt, length } from './core/physics.js';
import { traceLines } from './core/fieldlines.js';
import { sampleGrid } from './core/fieldgrid.js';
import { makePlates, plateSources, betweenPlates } from './core/plates.js';
import { logRange, PALETTE } from './core/colormap.js';
import { statusSentence, fieldSentence, workSentence, rubSentence } from './core/status.js';
import { MEDIA, mediumById, E_CHARGE, kFor } from './core/constants.js';
import { EXAMPLES, WORK_EXAMPLES, matchesSesit } from './core/examples.js';
import { pathWork, makePath, voltage, pointAt, workProfile } from './core/work.js';
import { forceCurve, fieldProfile } from './core/curves.js';
import { pageById } from './core/chapters.js';
import { relativeSentence, planetById } from './core/relativita.js';
import { formatNumber, formatCharge, chargeUnit } from './core/format.js';

const $ = (id) => document.getElementById(id);
const MAX_CHARGES = 6;
const GRID = { 4: 0.5, 0.4: 0.05 };          // velikost stolu [m] → krok mřížky [m]
const radiusFor = (S) => S * 0.02;           // poloměr kuličky
const rMinFor = (S) => radiusFor(S) * 2.5;   // nejmenší vzdálenost středů (kuličky se nepřekrývají)

// Práce v poli: stůl 40 cm, desky 10 cm od sebe (05 Př. 6), cesta zůstává mezi deskami.
const WORK_SCALE = 0.4;
const WORK_Z = 0.08;                         // jak daleko od středu smí vést oklika [m]

// Předvolby nábojů — jen hodnoty, které se objevily v hodině.
const PRESETS = [
  { name: 'elektron', Q: -E_CHARGE, label: '−e', title: 'Elementární náboj e = 1,602·10⁻¹⁹ C (lekce 02)' },
  { name: 'proton', Q: E_CHARGE, label: '+e', title: 'Elementární náboj e = 1,602·10⁻¹⁹ C (lekce 02)' },
  { name: '1 µC', Q: 1e-6, label: '', title: 'Lekce 05, Př. 6' },
  { name: '2 µC', Q: 2e-6, label: '', title: 'Lekce 04, Př. 2' },
  { name: 'skleněná tyč', Q: 50e-9, label: '≈ +50 nC', title: 'Třením se tyč ze skla nabíjí kladně (lekce 01). Velikost náboje v sešitě není — 50 nC je jen odhad.' },
  { name: 'ebonitová tyč', Q: -50e-9, label: '≈ −50 nC', title: 'Ebonitová tyč se třením nabíjí záporně (jako v hodině). Velikost náboje v sešitě není — 50 nC je jen odhad.' },
];

// ── Stav ─────────────────────────────────────────────────────────────────────
const state = {
  charges: [],            // { id, Q [C], x, y, z [m] }
  nextId: 1,
  selectedId: null,
  medium: { ...mediumById('vakuum') },
  scale: 4,
  lineMode: 'space',      // 'space' | 'plane' | 'off'
  showForces: true,
  event: null,            // 'touched' | 'medium' | null — co se naposledy stalo (pro stavovou větu)
  baseline: null,         // stav na začátku pohybu / změny, se kterým porovnáváme
  example: null,
  exampleDirty: false,
  touched: false,
  // 'naboj' (Co je náboj?) | 'relativita' (AU — obojí jen v průvodci) | 'coulomb' | 'pole' | 'prace'
  mode: 'coulomb',
  view: 'guide',          // 'guide' (Průvodce) | 'lab' (Laboratoř)
  vectorMode: 'off',      // vektory intenzity: 'plane' | 'space' | 'off'
  plates: [],             // nabité desky (core/plates.js), nebo []
  fieldScene: null,       // 'radialni' | 'dipol' | 'desky' | null
  probe: { x: 0.6, y: 0, z: 0.6 },  // bod P
  showProbe: true,
  // relativita: jednotka popisků ('au' relativně | 'km' absolutně) a vybraná planeta
  rel: { unit: 'au', planet: 'venuse' },
  // práce v homogenním poli mezi deskami (core/work.js)
  work: {
    A: { x: -0.04, z: -0.03 }, B: { x: 0.04, z: 0.03 },
    Q: 1e-6, E: 1000, path: 'primo',
    t: 1,                 // jak daleko po cestě je přenášený náboj (0 … 1)
    anim: null,
    event: null,          // 'path' | 'sign' | 'moved' | null
    prevW: null,
    example: null,
    exampleDirty: false,
  },
};

// ── Scéna ────────────────────────────────────────────────────────────────────
const viewport = $('viewport');
const scene = createScene(viewport);
const chargeLayer = createChargeLayer(scene.scene);
const arrowLayer = createArrowLayer(scene.scene);
const lineLayer = createLineLayer(scene.scene);
const gridLayer = createGridLayer(scene.scene);
const plateLayer = createPlateLayer(scene.scene);
const probeLayer = createProbeLayer(scene.scene);
const workLayer = createWorkLayer(scene.scene);
const nabojLayer = createNabojLayer(scene.scene);
nabojLayer.onChange(() => invalidate());
const relLayer = createRelativitaLayer(scene.scene);

const fig2 = createGraph($('fig2'));
const fig3 = createGraph($('fig3'));
const gauge = createGauge($('gauge'));

// Drobné náboje desek (superpozice) se počítají jen při změně desek.
let plateCache = { key: '', sources: [] };
function plateCharges() {
  const key = JSON.stringify(state.plates);
  if (key !== plateCache.key) plateCache = { key, sources: plateSources(state.plates) };
  return plateCache.sources;
}

// Barevná stupnice se mění jen se „sestavou“ (náboje, desky, stůl) — ne s prostředím ani
// tažením. Díky tomu po přepnutí na vodu barvy opravdu ztmavnou (pole je 81× slabší).
let rangeCache = { key: '', range: { lo: 3, hi: 6 } };
function colorRange(sources) {
  const key = `${state.scale}|${state.charges.map((c) => c.Q).join(',')}|${JSON.stringify(state.plates)}`;
  if (key !== rangeCache.key) {
    const g = sampleGrid(sources, { size: state.scale, mode: 'plane', avoid: state.charges, avoidR: rMinFor(state.scale) });
    rangeCache = { key, range: logRange(g.points.map((p) => p.mag)) };
  }
  return rangeCache.range;
}

let pending = { coarse: false };
let anim = null;
let drag = null;

function invalidate(coarse = false) {
  pending = { coarse: coarse && (!pending || pending.coarse) };
}

function snapshot() {
  const [a, b] = state.charges;
  const base = { epsR: state.medium.epsR, medium: { ...state.medium } };
  if (!a || !b) return base; // r, Q1, Q2 chybí — porovnání vzdáleností se nepoužije
  return { ...base, r: distance(a, b), Q1: a.Q, Q2: b.Q };
}

// něco se změnilo „rukou“ — příklad ze sešitu už neplatí
function touchExample() {
  if (state.example) state.exampleDirty = true;
}

// Práce v poli: cesta, práce na úsecích, napětí, poloha přenášeného náboje.
function workState() {
  const w = state.work;
  const points = makePath(w.A, w.B, w.path, WORK_Z);
  const res = pathWork(points, w.Q, w.E);
  return {
    ...w, points,
    segments: res.segments,
    W: res.W,
    U: voltage(w.E, w.A, w.B),
    d: w.B.x - w.A.x,          // posunutí po směru siločar (záporné = proti nim)
    carrier: pointAt(points, w.t),
  };
}

// ── Přepočet všeho ───────────────────────────────────────────────────────────
function recompute({ coarse = false } = {}) {
  const S = state.scale, radius = radiusFor(S), rMin = rMinFor(S), epsR = state.medium.epsR;
  const mode = state.mode;
  const extra = plateCharges();
  const sources = [...state.charges, ...extra];
  const m = measure(state.charges, epsR, state.selectedId, extra);
  const range = colorRange(sources);
  const w = mode === 'prace' ? workState() : null;

  nabojLayer.setVisible(mode === 'naboj');
  relLayer.setVisible(mode === 'relativita');
  if (mode === 'relativita') relLayer.sync(state.rel);
  chargeLayer.sync(state.charges, state.selectedId, radius);
  plateLayer.sync(state.plates, radius);
  scene.setBenchOpacity(state.plates.length ? 0.45 : 1);
  // reference pro délku šipek: kuličky + celkové náboje desek
  arrowLayer.sync(state.charges, m.forces, radius, S, rMin, state.showForces, [...state.charges, ...state.plates]);
  workLayer.sync(w || { A: state.work.A, B: state.work.B, Q: 1, points: [], segments: [], carrier: state.work.A }, radius, state.plates[0]?.half ?? 0, !!w);

  if (state.lineMode === 'off' || mode === 'naboj' || mode === 'relativita') {
    lineLayer.update([], S, radius, false, range, epsR);
  } else {
    const lines = traceLines(state.charges, { size: S, radius, mode: state.lineMode, coarse, sources, plates: state.plates });
    lineLayer.update(lines, S, radius, true, range, epsR);
  }

  let grid = null;
  const vectorsOn = state.vectorMode !== 'off' && (mode === 'coulomb' || mode === 'pole');
  if (vectorsOn) {
    const avoid = mode === 'pole' && state.showProbe ? [...state.charges, state.probe] : state.charges;
    grid = sampleGrid(sources, { size: S, mode: state.vectorMode, epsR, avoid, avoidR: radius * 1.6, plates: state.plates });
  }
  gridLayer.update(grid, range, vectorsOn);
  const hasField = sources.length > 0 && (mode === 'coulomb' || mode === 'pole');
  ui.renderColorbar(range, PALETTE, hasField && (state.lineMode !== 'off' || vectorsOn));

  // bod P — intenzita v libovolném místě
  const probeOn = mode === 'pole' && state.showProbe;
  const Ep = probeOn ? fieldAt(state.probe, sources, epsR) : { x: 0, y: 0, z: 0 };
  probeLayer.sync(state.probe, Ep, radius, S, probeOn);
  ui.renderProbe(length(Ep), probeOn);

  const selIndex = state.charges.findIndex((c) => c.id === state.selectedId);
  const sel = state.charges[selIndex];
  const labels = [state.charges[0]?.label || 'Q₁', state.charges[1]?.label || 'Q₂'];
  ui.renderFormula(m.pair, state.medium);
  ui.renderFieldFormula();
  ui.renderPair(m.pair, labels);
  ui.renderSelected(m.selected, selIndex, sel?.label);
  ui.renderFqe(m.selected);
  ui.renderMedium(state.medium);
  if (mode === 'prace') renderWorkExample(w);
  else ui.renderExample(state.example, m.pair, { dirty: state.exampleDirty, touched: state.touched });
  if (w) ui.renderWork(w);

  const common = {
    count: state.charges.length,
    single: state.charges[0],
    charges: state.charges,
    pair: m.pair,
    medium: state.medium,
    rMin,
    event: state.event,
    baseline: state.baseline,
  };
  let status;
  if (mode === 'naboj') status = rubSentence(nabojLayer.moved);
  else if (mode === 'relativita') status = relativeSentence(planetById(state.rel.planet), state.rel.unit);
  else if (mode === 'prace') {
    status = workSentence({ W: w.W, Q: w.Q, kinds: w.segments.map((s) => s.kind), event: w.event, prevW: w.prevW });
  } else if (mode === 'pole') {
    status = fieldSentence({
      ...common,
      plates: state.plates.length > 0,
      testBetween: !!sel && betweenPlates(sel, state.plates),
      probe: probeOn ? { E: length(Ep) } : null,
    });
  } else status = statusSentence(common);
  $('status').textContent = status;

  if (state.view === 'lab') renderLab(m, w, sources, range, probeOn ? length(Ep) : null);
  else story.update({ status, pair: m.pair, medium: state.medium, probeE: probeOn ? length(Ep) : null, work: w, rub: nabojLayer.moved, rel: state.rel, fieldScene: state.fieldScene, rActive: rSliderActive });

  syncControls(m);
}

// ── Laboratoř: grafy (Obr. 2, 3), měřicí přístroj, sestava ───────────────────
function renderLab(m, w, sources, range, probeE) {
  const S = state.scale, radius = radiusFor(S), mode = state.mode;
  let f2 = null, f3 = null, t2 = '', t3 = '';

  if (mode === 'coulomb' && m.pair) {
    t2 = 'Síla Fₑ v závislosti na vzdálenosti r (Q₁, Q₂ a prostředí jako ve scéně)';
    f2 = { kind: 'force', curve: forceCurve(m.pair.Q1, m.pair.Q2, state.medium.epsR, rMinFor(S), S * 0.9), r: m.pair.r, F: m.pair.F };
    const [a, b] = state.charges;
    t3 = 'Velikost intenzity |E| na spojnici Q₁ → Q₂ (logaritmicky, barvy jako ve scéně)';
    f3 = {
      kind: 'field', range, x0: 0, xLabel: 'od Q₁ [m]',
      profile: fieldProfile(sources, a, b, state.medium.epsR, { skipR: radius * 1.05, avoid: state.charges }),
      marks: [],
    };
  } else if (mode === 'pole') {
    const z = state.showProbe ? state.probe.z : 0;
    t2 = `Velikost intenzity |E| podél přímky z = ${formatNumber(z, 2)} m${state.showProbe ? ' (přes bod P)' : ''}`;
    f2 = {
      kind: 'field', range, x0: -S / 2, xLabel: 'x [m]',
      profile: fieldProfile(sources, { x: -S / 2, y: 0, z }, { x: S / 2, y: 0, z }, state.medium.epsR, { skipR: radius * 1.05, avoid: state.charges }),
      marks: state.showProbe ? [{ s: state.probe.x + S / 2, text: `P: ${formatNumber(probeE, 3)} V·m⁻¹` }] : [],
    };
  } else if (mode === 'prace') {
    t2 = 'Práce pole od bodu A podél zvolené cesty — vodorovné úseky (kolmo na siločáry) práci nekonají';
    f2 = {
      kind: 'work', profile: workProfile(w.points, w.Q, w.E), segments: w.segments,
      Wmax: Math.abs(w.Q * w.E) * 0.1, progress: w.t,
    };
  }
  $('fig2-title').textContent = t2;
  $('fig3-title').textContent = t3;
  $('fig3-box').hidden = !f3;
  $('strip').hidden = !f2;
  fig2.draw(f2);
  fig3.draw(f3);

  // ručkový přístroj
  if (mode === 'prace') {
    const lim = Math.abs(w.E) * 0.1;
    gauge.set({ name: 'voltmetr U_AB', min: -lim, max: lim, log: false, value: w.U, text: `U_AB = ${formatNumber(w.U, 3)} V`, note: 'práce pole na 1 C z A do B' });
  } else if (mode === 'pole') {
    const E = probeE ?? m.selected?.E ?? 0;
    gauge.set({ name: '|E|', min: range.lo, max: range.hi, log: true, value: E, text: `|E| = ${formatNumber(E, 3)} V·m⁻¹`, note: probeE != null ? 'v bodě P · logaritmická stupnice' : 'u vybraného náboje' });
  } else {
    const F = m.pair?.F ?? 0;
    gauge.set({ name: 'siloměr Fₑ', min: -12, max: 6, log: true, value: F, text: m.pair ? `Fₑ = ${formatNumber(F, 3)} N` : 'Fₑ = —', note: 'logaritmická stupnice' });
  }

  // sestava
  const rows = [];
  if (mode === 'prace') {
    rows.push(['desky', `+ vlevo, − vpravo, d = 10 cm`], ['intenzita E', `${formatNumber(w.E, 4)} V·m⁻¹ (homogenní)`],
      ['náboj Q', formatCharge(w.Q)], ['bod A', `x = ${formatNumber(w.A.x * 100, 3)} cm, z = ${formatNumber(w.A.z * 100, 3)} cm`],
      ['bod B', `x = ${formatNumber(w.B.x * 100, 3)} cm, z = ${formatNumber(w.B.z * 100, 3)} cm`],
      ['cesta', { primo: 'přímo', schody: 'po schodech', oklika: 'oklikou' }[w.path]]);
  } else {
    rows.push(['stůl', S === 4 ? '4 × 4 m' : '40 × 40 cm'], ['prostředí', `${state.medium.name}, εᵣ = ${formatNumber(state.medium.epsR, 5)}`],
      ['k', `${formatNumber(kFor(state.medium.epsR), 3)} N·m²·C⁻²`]);
    state.charges.forEach((c, i) => rows.push([c.label || qName(i), `${formatCharge(c.Q, 3)} · x = ${formatNumber(c.x, 3)} m, z = ${formatNumber(c.z, 3)} m`]));
    if (state.plates.length) rows.push(['desky', `±${formatCharge(state.plates[0].Q, 2).replace('+', '')} (scénická hodnota)`]);
  }
  ui.renderSestava(rows);
}

// Karta příkladu v režimu práce: výsledek aplikace vs. sešit (cesta příklad nezmění).
function renderWorkExample(w) {
  const card = $('example-card');
  const ex = state.work.example;
  if (!ex) { card.hidden = true; return; }
  card.hidden = false;
  card.className = 'group excard';
  const ok = ex.expect.value === 0 ? Math.abs(w.W) < 1e-15 : matchesSesit(w.W, ex.expect);
  const compare = state.work.exampleDirty
    ? '<p class="stale">Scéna je změněná — pro porovnání klikni na příklad znovu.</p>'
    : `<dl class="compare"><dt>v sešitě</dt><dd>W = ${ex.expect.shown}</dd>
       <dt>aplikace</dt><dd>W = ${formatNumber(w.W, 3)} J ${ok ? '<span class="ok">✓ souhlasí</span>' : ''}</dd></dl>`;
  card.innerHTML = `<h3>${ex.lesson}, ${ex.title}</h3><p>${ex.text}</p>${compare}`;
}

// ── Ovládací prvky ↔ stav ────────────────────────────────────────────────────
const Q_MIN_EXP = -19, Q_MAX_EXP = -2;     // slider |Q|: od e do 0,01 C (rozsah příkladů ze sešitu)
const NICE = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8];
const EPS_MAX = 100;
const UNIT_FACTOR = { nC: 1e-9, 'µC': 1e-6, C: 1 };

function rRange() {
  return { min: rMinFor(state.scale), max: state.scale * 0.9 };
}

function syncControls(m) {
  const sel = state.charges.find((c) => c.id === state.selectedId);
  const qInput = $('q-input'), qUnit = $('q-unit'), qSlider = $('q-slider');
  for (const el of [qInput, qUnit, qSlider]) el.disabled = !sel;
  if (sel) {
    if (document.activeElement !== qInput && document.activeElement !== qUnit) {
      const { factor, unit } = chargeUnit(sel.Q);
      qUnit.value = unit;
      qInput.value = String(Number((sel.Q / factor).toPrecision(4)));
    }
    if (document.activeElement !== qSlider) {
      qSlider.value = String((Math.log10(Math.abs(sel.Q)) - Q_MIN_EXP) / (Q_MAX_EXP - Q_MIN_EXP));
    }
  }

  const rSlider = $('r-slider');
  rSlider.disabled = !m.pair;
  $('touch').disabled = !m.pair || !!anim;
  if (m.pair) {
    const { min, max } = rRange();
    if (!rSliderActive) rSlider.value = String(Math.log(m.pair.r / min) / Math.log(max / min));
    $('r-value').textContent = `r = ${formatNumber(m.pair.r, 4)} m`;
  } else {
    $('r-value').textContent = 'r = —';
  }

  const eps = state.medium.epsR;
  if (document.activeElement !== $('eps-slider')) $('eps-slider').value = String(Math.log10(eps) / Math.log10(EPS_MAX));
  if (document.activeElement !== $('eps-input')) $('eps-input').value = String(eps);
  $('medium').value = MEDIA.some((x) => x.id === state.medium.id) ? state.medium.id : 'vlastni';

  $('add-plus').disabled = $('add-minus').disabled = state.charges.length >= MAX_CHARGES;
  $('delete').disabled = !sel;

  const w = state.work;
  document.querySelectorAll('#work-q [data-q]').forEach((b) => b.classList.toggle('on', Number(b.dataset.q) === w.Q));
  document.querySelectorAll('#work-e [data-e]').forEach((b) => b.classList.toggle('on', Number(b.dataset.e) === w.E));
  document.querySelectorAll('[data-path]').forEach((b) => b.classList.toggle('on', b.dataset.path === w.path));
  $('work-run').disabled = !!w.anim;
}

// volné místo pro nový náboj
function freeSpot() {
  const S = state.scale;
  // s deskami dáváme nový (zkušební) náboj doprostřed mezi ně
  const spots = state.plates.length
    ? [[0, 0], [0, -0.12], [0, 0.12], [-0.05, 0.06], [0.05, -0.06], [0, 0.18]]
    : [[-0.2, 0], [0.2, 0], [0, -0.25], [0, 0.25], [-0.3, -0.3], [0.3, 0.3], [0.3, -0.3], [-0.3, 0.3], [0, 0]];
  for (const [fx, fz] of spots) {
    const p = { x: fx * S, y: 0, z: fz * S };
    if (state.charges.every((c) => distance(c, p) > rMinFor(S) * 1.6)) return p;
  }
  return { x: (Math.random() - 0.5) * S * 0.6, y: 0, z: (Math.random() - 0.5) * S * 0.6 };
}

function addCharge(Q) {
  if (state.charges.length >= MAX_CHARGES) return;
  const c = { id: state.nextId++, Q, ...freeSpot() };
  constrain(c);
  state.charges.push(c);
  state.selectedId = c.id;
  state.event = null;
  state.baseline = null;
  touchExample();
  invalidate();
}

function setSelectedQ(Q) {
  const sel = state.charges.find((c) => c.id === state.selectedId);
  if (!sel || !Number.isFinite(Q) || Q === 0) { invalidate(); return; }
  sel.Q = Q;
  state.event = null;
  state.baseline = null;
  // 04 Př. 1: změna Q₁ je součást příkladu (varianty a–d), příklad zůstává platný
  if (!(state.example?.variants && sel === state.charges[1])) touchExample();
  invalidate();
}

// kulička musí zůstat na stole a nesmí se překrývat s ostatními
function constrain(c) {
  const S = state.scale, half = S / 2 - radiusFor(S), rMin = rMinFor(S);
  for (let pass = 0; pass < 3; pass++) {
    c.x = Math.max(-half, Math.min(half, c.x));
    c.z = Math.max(-half, Math.min(half, c.z));
    for (const o of state.charges) {
      if (o === c || o.id === c.id) continue;
      const d = distance(o, c);
      if (d < rMin) {
        const ux = d > 1e-12 ? (c.x - o.x) / d : 1, uz = d > 1e-12 ? (c.z - o.z) / d : 0;
        c.x = o.x + ux * rMin;
        c.z = o.z + uz * rMin;
      }
    }
    // kulička nesmí vjet do desky — zůstane na té straně, kde je
    for (const pl of state.plates) {
      const gap = radiusFor(S) * 1.6;
      if (Math.abs(c.x - pl.x) < gap && Math.abs(c.z) <= pl.half + radiusFor(S)) {
        c.x = pl.x + (c.x >= pl.x ? gap : -gap);
      }
    }
  }
}

// bod P zůstává na stole a mimo kuličky
function constrainProbe(p) {
  const S = state.scale, half = S / 2 - radiusFor(S), keep = radiusFor(S) * 1.4;
  p.x = Math.max(-half, Math.min(half, p.x));
  p.z = Math.max(-half, Math.min(half, p.z));
  for (const c of state.charges) {
    const d = distance(c, p);
    if (d < keep) {
      const ux = d > 1e-12 ? (p.x - c.x) / d : 1, uz = d > 1e-12 ? (p.z - c.z) / d : 0;
      p.x = c.x + ux * keep; p.z = c.z + uz * keep;
    }
  }
}

// body A a B zůstávají mezi deskami (tam je pole homogenní)
function constrainWorkPoint(p) {
  const pl = state.plates;
  const lo = pl.length ? Math.min(pl[0].x, pl[1].x) : -0.05, hi = pl.length ? Math.max(pl[0].x, pl[1].x) : 0.05;
  p.x = Math.max(lo, Math.min(hi, p.x));
  p.z = Math.max(-WORK_Z, Math.min(WORK_Z, p.z));
}

function setDistance(r) {
  const [a, b] = state.charges;
  if (!a || !b) return;
  const d = distance(a, b);
  const ux = d > 0 ? (b.x - a.x) / d : 1, uz = d > 0 ? (b.z - a.z) / d : 0;
  let mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
  const half = state.scale / 2 - radiusFor(state.scale);
  // když by se kuličky nevešly na stůl, posuneme dvojici do středu
  if (Math.abs(mx) + Math.abs(ux * r / 2) > half || Math.abs(mz) + Math.abs(uz * r / 2) > half) { mx = 0; mz = 0; }
  a.x = mx - ux * r / 2; a.z = mz - uz * r / 2;
  b.x = mx + ux * r / 2; b.z = mz + uz * r / 2;
}

// posuvník vzdálenosti (laboratoř i průvodce): začátek tahu si zapamatuje výchozí stav,
// aby stavová věta mohla říct „vzdálenost se zmenšila na polovinu — síla vzrostla čtyřikrát“
let rSliderActive = false;
function distanceStart() {
  if (rSliderActive) return;
  rSliderActive = true;
  state.baseline = snapshot();
  state.event = null;
}
function distanceTo(r) {
  setDistance(r);
  touchExample();
  invalidate(true);
}
function distanceEnd() {
  rSliderActive = false;
  invalidate(false);
}

function setMedium(next) {
  if (next.epsR === state.medium.epsR && next.id === state.medium.id) return;
  state.baseline = snapshot();
  state.event = 'medium';
  state.medium = next;
  touchExample();
  invalidate();
}

function customMedium(epsR) {
  const v = formatNumber(epsR, 4);
  return { id: 'vlastni', name: `vlastní (εᵣ = ${v})`, loc: `v prostředí s εᵣ = ${v}`, epsR };
}

const CAPTION = $('caption').innerHTML;
const CAPTION_WORK = '<b>Obr. 1</b> Dvě nabité desky 10 cm od sebe na stole 40 × 40 cm — pole mezi nimi je homogenní ' +
  'a míří od kladné desky k záporné. <b>Červené</b> úseky cesty vedou po siločarách (pole koná práci), ' +
  '<b>zelené</b> kolmo na ně (práci nekoná), žluté šikmo (W = F·s·cos α). Čárkované čáry přes A a B jsou ' +
  'ekvipotenciální — kolmé na siločáry. Oranžová šipka = síla F = Q·E na přenášený náboj.';

function setScale(S, { rescale }) {
  const old = state.scale;
  if (rescale && old !== S) {
    state.baseline = snapshot();
    state.event = null;
    for (const c of state.charges) { c.x *= S / old; c.z *= S / old; }
    state.probe.x *= S / old; state.probe.z *= S / old;
    if (state.plates.length) state.plates = makePlates(S);
    touchExample();
  }
  state.scale = S;
  scene.setBench(S, GRID[S], radiusFor(S));
  document.querySelectorAll('[data-scale]').forEach((b) => b.classList.toggle('on', Number(b.dataset.scale) === S));
  const cs = $('cap-scale');
  if (cs) cs.textContent = S === 4 ? '4 × 4 m, mřížka 0,5 m' : '40 × 40 cm, mřížka 5 cm';
  invalidate();
}

function loadExample(ex) {
  setMode(ex.mode, { keepScene: true });
  setScale(ex.scale, { rescale: false });
  state.plates = [];
  setFieldSceneButton(null);
  state.medium = { ...mediumById(ex.medium) };
  state.charges = ex.charges.map((c) => ({ id: state.nextId++, ...c }));
  state.probe = { x: 0, y: 0, z: ex.scale * 0.25 };
  state.selectedId = state.charges[1].id;
  state.example = ex;
  state.exampleDirty = false;
  state.touched = false;
  state.event = null;
  state.baseline = null;
  document.querySelectorAll('.example-btn').forEach((b) => b.classList.toggle('on', b.dataset.id === ex.id));
  scene.setView(currentView);
  invalidate();
}

function clearExample() {
  state.example = null;
  state.exampleDirty = false;
  state.work.example = null;
  document.querySelectorAll('.example-btn').forEach((b) => b.classList.remove('on'));
}

// Výchozí dvojice: kladný a záporný náboj 1 µC, 1,2 m od sebe.
function defaultPair() {
  clearExample();
  if (state.scale !== 4) setScale(4, { rescale: false });
  state.plates = [];
  setFieldSceneButton(null);
  state.charges = [
    { id: state.nextId++, Q: 1e-6, x: -0.6, y: 0, z: 0 },
    { id: state.nextId++, Q: -1e-6, x: 0.6, y: 0, z: 0 },
  ];
  state.selectedId = state.charges[1].id;
  state.event = null;
  state.baseline = null;
}

// ── Režimy: Co je náboj? / 1. Coulombův zákon / 2. Elektrické pole / 3. Práce v poli ─
// keepScene = scénu postaví volající (příklad ze sešitu, kapitola průvodce)
function setMode(mode, { keepScene = false } = {}) {
  const from = state.mode;
  if (from === mode) return;
  state.mode = mode;
  document.body.dataset.mode = mode;
  document.querySelectorAll('.modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  document.querySelectorAll('.example-btn').forEach((b) => { b.hidden = b.dataset.mode !== mode; });
  // výchozí zobrazení: v režimu pole jsou vidět vektory intenzity
  setVectorMode(mode === 'pole' ? 'plane' : 'off');
  if (state.example && state.example.mode !== mode) clearExample();
  if (from === 'prace') {
    state.work.example = null;
    currentView = 'sikmo';
    document.querySelectorAll('.views [data-view]').forEach((x) => x.classList.toggle('on', x.dataset.view === currentView));
    scene.setView(currentView);
  }
  $('caption').innerHTML = mode === 'prace' ? CAPTION_WORK : CAPTION;
  state.event = null;
  state.baseline = null;

  if (mode === 'prace') enterWork();
  else if (mode === 'naboj' || mode === 'relativita') {
    if (state.scale !== 4) setScale(4, { rescale: false });
    state.charges = []; state.plates = []; state.selectedId = null;
    setFieldSceneButton(null);
  } else if (!keepScene && (from === 'prace' || from === 'naboj' || from === 'relativita')) {
    // ze scény s deskami / tyčí se vracíme do běžné scény daného režimu
    if (mode === 'pole') { if (state.scale !== 4) setScale(4, { rescale: false }); loadFieldScene('dipol'); } else defaultPair();
  }
  invalidate();
}

function setVectorMode(v) {
  state.vectorMode = v;
  document.querySelectorAll('[data-vectors]').forEach((x) => x.classList.toggle('on', x.dataset.vectors === v));
  invalidate();
}

function setLineMode(v) {
  state.lineMode = v;
  document.querySelectorAll('[data-lines]').forEach((x) => x.classList.toggle('on', x.dataset.lines === v));
  invalidate();
}

function setFieldSceneButton(name) {
  state.fieldScene = name;
  document.querySelectorAll('[data-scene]').forEach((b) => b.classList.toggle('on', b.dataset.scene === name));
}

// Typ pole z lekce 04: radiální, dipól, homogenní (dvě nabité desky)
function loadFieldScene(name) {
  const S = state.scale;
  clearExample();
  setFieldSceneButton(name);
  state.plates = [];
  state.event = null;
  state.baseline = null;
  if (name === 'radialni') {
    state.charges = [{ id: state.nextId++, Q: 1e-6, x: 0, y: 0, z: 0 }];
    state.probe = { x: 0.22 * S, y: 0, z: 0.12 * S };
  } else if (name === 'dipol') {
    state.charges = [
      { id: state.nextId++, Q: 1e-6, x: -0.15 * S, y: 0, z: 0 },
      { id: state.nextId++, Q: -1e-6, x: 0.15 * S, y: 0, z: 0 },
    ];
    state.probe = { x: 0, y: 0, z: 0.18 * S };
  } else if (name === 'desky') {
    state.plates = makePlates(S);
    state.charges = [];
    state.probe = { x: 0, y: 0, z: 0.1 * S };
  }
  state.selectedId = state.charges.length ? state.charges[0].id : null;
  invalidate();
}

// ── Práce v poli (lekce 05, 06) ──────────────────────────────────────────────
function enterWork() {
  if (state.scale !== WORK_SCALE) setScale(WORK_SCALE, { rescale: false });
  state.charges = [];
  state.selectedId = null;
  state.plates = makePlates(WORK_SCALE);
  setFieldSceneButton(null);
  if (state.lineMode === 'space') setLineMode('plane');
  currentView = 'prace';
  document.querySelectorAll('.views [data-view]').forEach((x) => x.classList.remove('on'));
  scene.setView(currentView);
  const w = state.work;
  w.t = 1; w.anim = null; w.event = null; w.prevW = null;
}

function resetWork() {
  Object.assign(state.work, {
    A: { x: -0.04, z: -0.03 }, B: { x: 0.04, z: 0.03 }, Q: 1e-6, E: 1000, path: 'primo',
    t: 1, anim: null, event: null, prevW: null, example: null, exampleDirty: false,
  });
}

function runWork() {
  state.work.t = 0;
  state.work.anim = { t0: performance.now() };
  invalidate(true);
}

function setWorkPath(kind) {
  const w = state.work;
  w.prevW = workState().W;
  w.event = w.path === kind ? null : 'path';
  w.path = kind;
  runWork();
}

function setWorkQ(Q) {
  const w = state.work;
  w.event = Math.sign(Q) !== Math.sign(w.Q) ? 'sign' : null;
  w.Q = Q;
  if (w.example) w.exampleDirty = true;
  runWork();
}

function setWorkE(E) {
  state.work.E = E;
  state.work.event = null;
  if (state.work.example) state.work.exampleDirty = true;
  runWork();
}

function loadWorkExample(ex) {
  if (state.mode !== 'prace') setMode('prace');
  Object.assign(state.work, {
    A: { ...ex.A }, B: { ...ex.B }, Q: ex.Q, E: ex.E, path: 'primo',
    event: null, prevW: null, example: ex, exampleDirty: false,
  });
  document.querySelectorAll('.example-btn').forEach((b) => b.classList.toggle('on', b.dataset.id === ex.id));
  runWork();
}

function stepWork() {
  const w = state.work;
  if (!w.anim) return;
  const t = Math.min(1, (performance.now() - w.anim.t0) / 2200);
  w.t = ease(t);
  if (t >= 1) { w.anim = null; w.t = 1; invalidate(false); } else invalidate(true);
}

// ── Dotek dvou kuliček (lekce 03, Př. 7) ─────────────────────────────────────
function startTouch() {
  if (anim && (!state.charges.includes(anim.a) || !state.charges.includes(anim.b))) anim = null;
  if (state.charges.length < 2 || anim) return;
  const [a, b] = state.charges;
  const d = distance(a, b);
  const ux = (b.x - a.x) / d, uz = (b.z - a.z) / d;
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, rad = radiusFor(state.scale);
  anim = {
    t0: performance.now(),
    a, b,
    from: { a: { x: a.x, z: a.z }, b: { x: b.x, z: b.z } },
    contact: { a: { x: mx - ux * rad, z: mz - uz * rad }, b: { x: mx + ux * rad, z: mz + uz * rad } },
    shared: false,
  };
  state.event = null;
  state.baseline = null;
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });

function stepTouch() {
  if (!anim) return;
  // scéna se mezitím vyměnila (příklad, kapitola) — animace patří ke kuličkám, které už nejsou na stole
  if (!state.charges.includes(anim.a) || !state.charges.includes(anim.b)) { anim = null; return; }
  const T = (performance.now() - anim.t0) / 1600; // 0 … 1
  const { a, b, from, contact } = anim;
  let pa, pb;
  if (T < 0.4) {
    const t = ease(T / 0.4);
    pa = lerp(from.a, contact.a, t); pb = lerp(from.b, contact.b, t);
  } else if (T < 0.55) {
    pa = contact.a; pb = contact.b;
  } else {
    const t = ease(Math.min(1, (T - 0.55) / 0.45));
    pa = lerp(contact.a, from.a, t); pb = lerp(contact.b, from.b, t);
  }
  // dotek: náboj se rozdělí napůl, celkový náboj zůstává stejný. Mimo fáze výše, aby se to stalo
  // i na pomalém zařízení, kde žádný snímek nepadne přesně do krátké chvíle doteku.
  if (T >= 0.4 && !anim.shared) {
    const [qa, qb] = touchShare(a.Q, b.Q);
    a.Q = qa; b.Q = qb;
    anim.shared = true;
  }
  a.x = pa.x; a.z = pa.z; b.x = pb.x; b.z = pb.z;
  if (T >= 1) {
    anim = null;
    state.event = 'touched';
    if (state.example && state.example.afterTouch && !state.exampleDirty) state.touched = true;
    else touchExample();
    invalidate(false);
  } else {
    invalidate(true);
  }
}

// ── Tažení nábojů, bodu P a bodů A, B (myš i prst) ───────────────────────────
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const benchPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hitPoint = new THREE.Vector3();

function setRay(e) {
  const rect = scene.renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, scene.camera);
}

const overProbe = () => state.mode === 'pole' && state.showProbe && raycaster.intersectObject(probeLayer.marker, false).length > 0;
const overWork = () => (state.mode === 'prace' ? workLayer.pick(raycaster) : null);

// capture: true → zpracujeme dotek DŘÍV než OrbitControls; když uživatel chytí kuličku,
// kamera se neotáčí.
viewport.addEventListener('pointerdown', (e) => {
  if (drag || anim || e.target.closest('.views')) return;
  $('drag-hint').hidden = true;
  setRay(e);
  // relativita: ťuknutí na planetu ji vybere (scéna se dál otáčí)
  if (state.mode === 'relativita') {
    const pid = relLayer.pick(raycaster);
    if (pid) { state.rel.planet = pid; invalidate(); }
    return;
  }
  const id = chargeLayer.pick(raycaster);
  const onProbe = id == null && overProbe();
  const point = id == null && !onProbe ? overWork() : null;
  if (id == null && !onProbe && !point) return;
  e.stopPropagation();
  e.preventDefault();
  if (onProbe) {
    drag = { probe: true, pointerId: e.pointerId };
    state.event = 'probe';
  } else if (point) {
    drag = { point, pointerId: e.pointerId };
  } else {
    state.selectedId = id;
    drag = { id, pointerId: e.pointerId };
    state.baseline = snapshot();
    state.event = null;
  }
  scene.controls.enabled = false;
  viewport.setPointerCapture(e.pointerId);
  invalidate();
}, { capture: true });

viewport.addEventListener('pointermove', (e) => {
  if (!drag) {
    // myš nad kuličkou → ručička „chytit“
    if (e.pointerType === 'mouse') {
      setRay(e);
      viewport.style.cursor = chargeLayer.pick(raycaster) != null || overProbe() || overWork() ? 'grab' : '';
    }
    return;
  }
  if (e.pointerId !== drag.pointerId) return;
  viewport.style.cursor = 'grabbing';
  setRay(e);
  if (!raycaster.ray.intersectPlane(benchPlane, hitPoint)) return;
  if (drag.probe) {
    // bod P nemění fyziku — příklad ze sešitu zůstává platný
    state.probe.x = hitPoint.x; state.probe.z = hitPoint.z;
    constrainProbe(state.probe);
    state.event = 'probe';
    invalidate(true);
    return;
  }
  if (drag.point) {
    const w = state.work, p = w[drag.point];
    p.x = hitPoint.x; p.z = hitPoint.z;
    constrainWorkPoint(p);
    w.event = 'moved';
    w.t = 1; w.anim = null;
    if (w.example) w.exampleDirty = true;
    invalidate(true);
    return;
  }
  const c = state.charges.find((ch) => ch.id === drag.id);
  if (!c) return;
  c.x = hitPoint.x; c.z = hitPoint.z;
  constrain(c);
  touchExample();
  invalidate(true);
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  drag = null;
  scene.controls.enabled = true;
  if (viewport.hasPointerCapture(e.pointerId)) viewport.releasePointerCapture(e.pointerId);
  invalidate(false); // po puštění siločáry v plné kvalitě
}
viewport.addEventListener('pointerup', endDrag);
viewport.addEventListener('pointercancel', endDrag);

// ── Napojení ovládacích prvků (laboratoř) ────────────────────────────────────
$('add-plus').addEventListener('click', () => addCharge(1e-6));
$('add-minus').addEventListener('click', () => addCharge(-1e-6));
$('delete').addEventListener('click', () => {
  state.charges = state.charges.filter((c) => c.id !== state.selectedId);
  state.selectedId = state.charges.length ? state.charges[state.charges.length - 1].id : null;
  state.event = null;
  state.baseline = null;
  touchExample();
  invalidate();
});

const presetBox = $('presets');
for (const p of PRESETS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `chip ${p.Q > 0 ? 'plus' : 'minus'}`;
  b.title = p.title;
  b.innerHTML = `${p.name}<span class="q">${p.label || formatCharge(p.Q)}</span>`;
  b.addEventListener('click', () => {
    if (state.charges.some((c) => c.id === state.selectedId)) setSelectedQ(p.Q);
    else addCharge(p.Q);
  });
  presetBox.append(b);
}

$('q-input').addEventListener('change', () => {
  const v = parseFloat($('q-input').value.replace(',', '.'));
  setSelectedQ(v * UNIT_FACTOR[$('q-unit').value]);
});
$('q-unit').addEventListener('change', () => {
  const v = parseFloat($('q-input').value.replace(',', '.'));
  setSelectedQ(v * UNIT_FACTOR[$('q-unit').value]);
});
$('q-slider').addEventListener('input', () => {
  const sel = state.charges.find((c) => c.id === state.selectedId);
  if (!sel) return;
  // logaritmický posuvník, přichytí se na „hezká“ čísla 1; 1,5; 2; 2,5; 3; 4; 5; 6; 8 × 10ⁿ
  const exp = Q_MIN_EXP + Number($('q-slider').value) * (Q_MAX_EXP - Q_MIN_EXP);
  let e = Math.floor(exp), best = Infinity, mant = 1;
  for (const nn of [...NICE, 10]) {
    const diff = Math.abs(Math.log10(nn) - (exp - e));
    if (diff < best) { best = diff; mant = nn; }
  }
  if (mant === 10) { mant = 1; e += 1; }
  setSelectedQ(Math.sign(sel.Q) * Number((mant * 10 ** e).toPrecision(3)));
});

$('r-slider').addEventListener('input', () => {
  distanceStart();
  const { min, max } = rRange();
  distanceTo(min * Math.pow(max / min, Number($('r-slider').value)));
});
$('r-slider').addEventListener('change', distanceEnd);

$('touch').addEventListener('click', startTouch);

const mediumSel = $('medium');
for (const m of MEDIA) mediumSel.add(new Option(`${m.name} (εᵣ = ${formatNumber(m.epsR, 5)})`, m.id));
mediumSel.add(new Option('vlastní εᵣ', 'vlastni'));
mediumSel.addEventListener('change', () => {
  const m = mediumById(mediumSel.value);
  setMedium(m ? { ...m } : customMedium(state.medium.epsR));
});
$('eps-slider').addEventListener('input', () => {
  const eps = Number(Math.pow(EPS_MAX, Number($('eps-slider').value)).toPrecision(2));
  setMedium(customMedium(Math.max(1, eps)));
});
$('eps-input').addEventListener('change', () => {
  const eps = parseFloat($('eps-input').value.replace(',', '.'));
  if (!(eps >= 1)) { invalidate(); return; } // εᵣ je vždy ≥ 1 (lekce 03)
  const known = MEDIA.find((m) => m.epsR === eps);
  setMedium(known ? { ...known } : customMedium(Math.min(EPS_MAX, eps)));
});

document.querySelectorAll('[data-lines]').forEach((b) => b.addEventListener('click', () => setLineMode(b.dataset.lines)));
document.querySelectorAll('[data-scale]').forEach((b) => b.addEventListener('click', () => {
  setScale(Number(b.dataset.scale), { rescale: true });
  scene.setView(currentView);
}));
$('show-forces').addEventListener('change', (e) => { state.showForces = e.target.checked; invalidate(); });
$('show-probe').addEventListener('change', (e) => { state.showProbe = e.target.checked; state.event = null; invalidate(); });
document.querySelectorAll('[data-vectors]').forEach((b) => b.addEventListener('click', () => setVectorMode(b.dataset.vectors)));
document.querySelectorAll('.modes button').forEach((b) => b.addEventListener('click', () => {
  setMode(b.dataset.mode);
  updateUrl();
}));
document.querySelectorAll('[data-scene]').forEach((b) => b.addEventListener('click', () => loadFieldScene(b.dataset.scene)));

// práce v poli: náboj, intenzita, cesta
const WORK_Q = [
  { Q: 1e-6, label: '+1 µC', title: '05 Př. 6' },
  { Q: -1e-6, label: '−1 µC', title: '05 Př. 7 — záporný náboj' },
  { Q: 2e-5, label: '+2·10⁻⁵ C', title: '05 Př. 1' },
];
const WORK_E = [
  { E: 1000, title: '05 Př. 6' },
  { E: 2500, title: '05 Př. 1' },
];
for (const q of WORK_Q) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `chip ${q.Q > 0 ? 'plus' : 'minus'}`;
  b.dataset.q = q.Q;
  b.title = q.title;
  b.innerHTML = `${q.label}<span class="q">${q.title}</span>`;
  b.addEventListener('click', () => setWorkQ(q.Q));
  $('work-q').append(b);
}
for (const x of WORK_E) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'chip';
  b.dataset.e = x.E;
  b.innerHTML = `${formatNumber(x.E, 4)} V·m⁻¹<span class="q">${x.title}</span>`;
  b.addEventListener('click', () => setWorkE(x.E));
  $('work-e').append(b);
}
document.querySelectorAll('[data-path]').forEach((b) => b.addEventListener('click', () => setWorkPath(b.dataset.path)));
$('work-run').addEventListener('click', () => { state.work.event = null; runWork(); });

// 04 Př. 1 — varianty a)–d): jiný náboj Q₁ ve stejném místě
$('example-card').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-variant]');
  if (!btn || !state.example?.variants || state.charges.length < 2) return;
  const v = state.example.variants.find((x) => x.key === btn.dataset.variant);
  state.charges[1].Q = v.Q;
  state.selectedId = state.charges[1].id;
  state.event = null;
  invalidate();
});

let currentView = 'sikmo';
document.querySelectorAll('.views [data-view]').forEach((b) => b.addEventListener('click', () => {
  currentView = b.dataset.view;
  document.querySelectorAll('.views [data-view]').forEach((x) => x.classList.toggle('on', x === b));
  scene.setView(currentView);
}));

const exBox = $('examples');
for (const ex of EXAMPLES) {
  const [c1, c2] = ex.charges;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'example-btn';
  b.dataset.id = ex.id;
  b.dataset.mode = ex.mode;
  b.hidden = ex.mode !== state.mode;
  b.innerHTML = `<b>${ex.lesson.slice(0, 2)} · ${ex.title}</b> ${ex.lesson.slice(3)}` +
    `<span>${formatCharge(c1.Q, 2)}, ${formatCharge(c2.Q, 2)} · r = ${formatNumber(c2.x - c1.x, 3)} m · ${mediumById(ex.medium).name}</span>`;
  b.addEventListener('click', () => loadExample(ex));
  exBox.append(b);
}
for (const ex of WORK_EXAMPLES) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'example-btn';
  b.dataset.id = ex.id;
  b.dataset.mode = 'prace';
  b.hidden = state.mode !== 'prace';
  b.innerHTML = `<b>${ex.lesson.slice(0, 2)} · ${ex.title}</b> ${ex.lesson.slice(3)}` +
    `<span>${formatCharge(ex.Q, 2)} · E = ${formatNumber(ex.E, 4)} V·m⁻¹ · s = 10 cm</span>`;
  b.addEventListener('click', () => loadWorkExample(ex));
  exBox.append(b);
}

// ── Průvodce ↔ Laboratoř ─────────────────────────────────────────────────────
const DRAG_HINTS = {
  naboj: 'Scénou otočíš tažením, kolečkem nebo dvěma prsty přiblížíš.',
  relativita: 'Ťukni na planetu a vybereš ji. Scénou otočíš tažením.',
  coulomb: 'Kuličky můžeš i přetáhnout myší nebo prstem.',
  permitivita: 'Šipky ukazují sílu na každý náboj.',
  pole: 'Scénou otočíš tažením.',
  intenzita: 'Táhni bod P — bílá šipka ukazuje směr intenzity.',
  prace: 'Body A a B můžeš přetáhnout.',
};

function applyDisplay(d) {
  state.showForces = d.forces;
  $('show-forces').checked = d.forces;
  setLineMode(d.lines);
  setVectorMode(d.vectors);
  state.showProbe = d.probe;
  $('show-probe').checked = d.probe;
}

// Kapitola průvodce → scéna (texty jsou v core/chapters.js)
function loadPage(id) {
  const page = pageById(id);
  clearExample();
  state.medium = { ...mediumById('vakuum') };
  if (id === 'naboj') {
    setMode('naboj');
    nabojLayer.reset();
  } else if (id === 'relativita') {
    setMode('relativita');
    state.rel = { unit: 'au', planet: 'venuse' };
  } else if (id === 'coulomb' || id === 'permitivita') {
    setMode('coulomb', { keepScene: true });
    defaultPair();
  } else if (id === 'pole' || id === 'intenzita') {
    setMode('pole', { keepScene: true });
    if (state.scale !== 4) setScale(4, { rescale: false });
    loadFieldScene(id === 'pole' ? 'dipol' : 'radialni');
  } else if (id === 'prace') {
    resetWork();
    if (state.mode === 'prace') enterWork(); else setMode('prace');
  }
  applyDisplay(page.display);
  state.event = null;
  state.baseline = null;
  currentView = id === 'prace' || id === 'relativita' ? id : 'sikmo';
  document.querySelectorAll('.views [data-view]').forEach((x) => x.classList.toggle('on', x.dataset.view === currentView));
  scene.setView(currentView);
  $('drag-hint').textContent = DRAG_HINTS[id] || '';
  $('drag-hint').hidden = !DRAG_HINTS[id];
  invalidate();
}

function setViewMode(v) {
  state.view = v;
  document.body.dataset.view = v;
  document.querySelectorAll('[data-viewmode]').forEach((b) => b.classList.toggle('on', b.dataset.viewmode === v));
  if (v === 'lab') {
    $('drag-hint').hidden = true;
    if (state.mode === 'naboj' || state.mode === 'relativita') setMode('coulomb');
    updateUrl();
  } else {
    story.reload();
  }
  invalidate();
}

function updateUrl() {
  if (state.view !== 'lab') return;
  const url = new URL(location.href);
  url.searchParams.set('lab', state.mode);
  url.searchParams.delete('kapitola');
  history.replaceState(null, '', url);
}

document.querySelectorAll('[data-viewmode]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.viewmode !== state.view) setViewMode(b.dataset.viewmode);
}));

const story = createStory($('guide'), {
  loadPage,
  openLab: () => setViewMode('lab'),
  rub: () => nabojLayer.rub(),
  resetRub: () => nabojLayer.reset(),
  setUnit(u) { state.rel.unit = u; invalidate(); },
  setPlanet(id) { state.rel.planet = id; invalidate(); },
  rRange,
  distanceStart,
  setDistance: distanceTo,
  distanceEnd,
  setSign(s) {
    const b = state.charges[1];
    if (!b) return;
    b.Q = s * Math.abs(b.Q);
    state.event = null;
    state.baseline = null;
    invalidate();
  },
  setMedium: (id) => setMedium({ ...mediumById(id) }),
  fieldScene: loadFieldScene,
  workPath: setWorkPath,
  workSign: (s) => setWorkQ(s * 1e-6),
  // dotek dvou kuliček (03 Př. 7b) — náboj se rozdělí napůl
  touch: startTouch,
  // příklad ze sešitu → scéna (čísla v kartě pak ukážou výsledek ze sešitu)
  showExample(id) {
    const ex = EXAMPLES.find((x) => x.id === id);
    if (ex) { loadExample(ex); return; }
    const wex = WORK_EXAMPLES.find((x) => x.id === id);
    if (wex) loadWorkExample(wex);
  },
});

// ── Start ────────────────────────────────────────────────────────────────────
setScale(4, { rescale: false });
defaultPair();
{
  const params = new URLSearchParams(location.search);
  const lab = params.get('lab');
  if (lab && ['coulomb', 'pole', 'prace'].includes(lab)) {
    state.view = 'lab';
    document.body.dataset.view = 'lab';
    document.querySelectorAll('[data-viewmode]').forEach((b) => b.classList.toggle('on', b.dataset.viewmode === 'lab'));
    setMode(lab);
    if (lab === 'pole' && !state.fieldScene) loadFieldScene('dipol');
  } else {
    story.start(params.get('kapitola') || 'naboj');
  }
}

function frame() {
  requestAnimationFrame(frame);
  stepTouch();
  stepWork();
  if (state.mode === 'naboj') nabojLayer.step(performance.now());
  if (pending) {
    const p = pending;
    pending = null;
    recompute(p);
  }
  scene.update();
}
frame();

// ladicí přístup z konzole (jen čtení)
// flush() = přepočítat hned (testy v prohlížeči; na skryté kartě se snímky nevykreslují)
window.__el = {
  state, scene, qName, story,
  flush() { const p = pending || { coarse: false }; pending = null; recompute(p); },
};
