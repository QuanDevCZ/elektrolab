import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, CONTROL_IDS, CHAPTER_COUNT, chapterTitles } from '../src/core/chapters.js';
import { EXAMPLES, WORK_EXAMPLES, matchesSesit } from '../src/core/examples.js';

const SCENES = [...EXAMPLES, ...WORK_EXAMPLES];
const sentences = (t) => (t.match(/[.!?](\s|$)/g) || []).length;

function texts(p) {
  const out = [p.title, p.try, ...p.theory];
  if (p.note) out.push(p.note);
  for (const ex of p.examples) out.push(ex.task, ex.given, ex.answer, ...ex.steps);
  const e = p.explainer;
  if (e) {
    for (const s of e.sections) out.push(s.heading, s.text, s.formula || '');
    for (const [a, b] of e.table) out.push(a, b);
    out.push(e.example.heading, ...e.example.steps, e.summary);
  }
  return out;
}

test('kapitoly 1 … 5 v pořadí lekcí', () => {
  assert.equal(CHAPTER_COUNT, 5);
  let last = 0;
  for (const p of PAGES) {
    assert.ok(p.chapter === last || p.chapter === last + 1, p.id);
    last = p.chapter;
  }
  assert.equal(chapterTitles().length, 5);
});

test('„Co to je“: 2–5 bodů, každý je jedna věta', () => {
  for (const p of PAGES) {
    assert.ok(p.theory.length >= 2 && p.theory.length <= 5, p.id);
    for (const t of p.theory) assert.equal(sentences(t), 1, `${p.id}: „${t}“`);
  }
});

test('ovládání zůstává jednoduché', () => {
  for (const p of PAGES) {
    assert.ok(p.controls.length <= 2, p.id);
    for (const c of p.controls) assert.ok(CONTROL_IDS.includes(c), `${p.id}: ${c}`);
  }
});

test('příklady ze sešitu: zadání, postup, odpověď; scéna existuje a ukáže výsledek ze sešitu', () => {
  for (const p of PAGES) {
    for (const ex of p.examples) {
      const name = `${p.id} ${ex.title}`;
      assert.ok(ex.task && ex.given && ex.answer, name);
      assert.ok(ex.steps.length >= 2, `${name}: postup`);
      assert.match(ex.lesson, /^(0[2-6] |z hodiny)/, `${name}: lekce`);
      if (ex.action) assert.equal(ex.action, 'touch', name);
      if (!ex.scene) continue;
      const sc = SCENES.find((s) => s.id === ex.scene);
      assert.ok(sc, `${name}: scéna ${ex.scene} neexistuje`);
      // výsledek, který scéna ukáže, je v zadání nebo v postupu (u obrácené úlohy je síla zadaná)
      const all = [ex.given, ...ex.steps].join(' ');
      assert.ok(all.includes(sc.expect.shown), `${name}: chybí ${sc.expect.shown}`);
      if (sc.afterTouch) assert.ok(all.includes(sc.afterTouch.shown), `${name}: chybí ${sc.afterTouch.shown}`);
    }
  }
  assert.ok(PAGES.find((p) => p.id === 'coulomb').examples.length >= 2, 'Coulombův zákon: aspoň dva příklady');
  // bez scény / obrácená úloha — výsledek ověříme přímo:
  // 04 Př. 3: E = F/Q = 0,2 / 3·10⁻⁷ ≐ 670 000 N·C⁻¹;  02 Př. 3: Q = √(F·r²/k) = √(1000/9·10⁹) ≐ 3,3·10⁻⁴ C
  assert.ok(matchesSesit(0.2 / 3e-7, { value: 670000, sig: 2 }));
  assert.ok(matchesSesit(Math.sqrt(1000 / 9e9), { value: 3.3e-4, sig: 2 }));
  // 05 Př. 8 jak v hodině: E = U/d = 230 / 0,02 = 11 500 V·m⁻¹
  assert.ok(matchesSesit(230 / 0.02, { value: 11500, sig: 3 }));
});

test('jen značky ze sešitu: žádné q, R jako vzdálenost, ×, k·Q/r', () => {
  for (const p of PAGES) {
    for (const t of texts(p)) {
      assert.doesNotMatch(t, /(^|[^\p{L}])q([^\p{L}]|$)/u, `${p.id}: malé q v „${t}“`);
      assert.doesNotMatch(t, /(^|[^\p{L}])R([^\p{L}]|$)/u, `${p.id}: R v „${t}“`);
      assert.doesNotMatch(t, /×/, `${p.id}: ×`);
      assert.doesNotMatch(t, /k·Q\/r(?!²)/, `${p.id}: φ = k·Q/r`);
      assert.doesNotMatch(t, /balónek/i, p.id);
    }
  }
});

test('práce v poli: vysvětlení od začátku je krátké a obsahuje zásuvku (11 500 V·m⁻¹)', () => {
  const e = PAGES.find((p) => p.id === 'prace').explainer;
  assert.ok(e.sections.length <= 6);
  for (const s of e.sections) assert.ok(s.text.length <= 260, `${s.heading}: moc dlouhé`);
  assert.ok(e.example.steps.join(' ').includes('11 500 V·m⁻¹'));
  assert.ok(matchesSesit(230 / 0.02, { value: 11500, sig: 3 }));
});

test('tečky postupu: kapitola 1 se jmenuje Coulombův zákon, Relativita je hned za ním', () => {
  assert.equal(chapterTitles()[0].title, 'Coulombův zákon');
  const ids = PAGES.map((p) => p.id);
  assert.equal(ids.indexOf('relativita'), ids.indexOf('coulomb') + 1);
});
