// Panely „Měření“ a karta příkladu — jen vykreslování do DOM, žádná fyzika
// (všechna čísla přicházejí hotová z core/physics.js).

import { formatNumber, formatCharge, formatSubstCharge, UNITS, superscript } from './core/format.js';
import { EPS0, K_ROUNDED, kFor, E_CHARGE } from './core/constants.js';
import { matchesSesit } from './core/examples.js';
import { qName } from './charges.js';

const $ = (id) => document.getElementById(id);
export const frac = (num, den) => `<span class="frac"><span>${num}</span><span>${den}</span></span>`;
const N = (x, sig = 3) => formatNumber(x, sig);

function dl(rows) {
  return rows.map(([dt, dd, cls = '']) => `<dt>${dt}</dt><dd class="${cls}">${dd}</dd>`).join('');
}

// ε₀ = 8,85·10⁻¹² v dosazení (tak, jak se píše v sešitě)
const EPS0_TXT = `${N(EPS0 / 1e-12, 3)}·10${superscript(-12)}`;

// Coulombův zákon v tom tvaru, jak byl napsán na tabuli
export const COULOMB_LAW_HTML =
  `<span><i>F</i><sub>e</sub></span> = ${frac('1', '4·π·<i>ε</i>')} · ${frac('<i>Q</i><sub>1</sub>·<i>Q</i><sub>2</sub>', '<i>r</i><sup>2</sup>')}` +
  `<span class="muted">&nbsp; ε = ε₀·εᵣ</span>`;

// dosazení čísel jako v sešitě: 1/(4·π·8,85·10⁻¹²·24) · 150·10⁻⁹·100·10⁻⁹ / 0,034² N
export function coulombSubstHTML(pair, medium) {
  const eps = medium.epsR === 1 ? EPS0_TXT : `${EPS0_TXT}·${N(medium.epsR, 5)}`;
  return `<span><i>F</i><sub>e</sub></span> = ${frac('1', `4·π·${eps}`)} · ` +
    `${frac(`${formatSubstCharge(pair.Q1)}·${formatSubstCharge(pair.Q2)}`, `${N(pair.r, 4)}<sup>2</sup>`)} N ` +
    `= <span class="res">${N(pair.F)} N</span>`;
}

export function renderFormula(pair, medium) {
  $('formula-law').innerHTML = COULOMB_LAW_HTML;
  $('formula-k').innerHTML =
    `Ve vakuu a přibližně i ve vzduchu: <i>F</i> = <i>k</i>·<i>Q</i>₁·<i>Q</i>₂ / <i>r</i>², ` +
    `<i>k</i> = ${N(K_ROUNDED)} ${UNITS.k}.`;

  if (!pair) {
    $('formula-subst').innerHTML = '<span class="muted">Přidej aspoň dva náboje — Q₁ a Q₂.</span>';
    return;
  }
  $('formula-subst').innerHTML = coulombSubstHTML(pair, medium);
}

// ── Režim 2: intenzita ───────────────────────────────────────────────────────
export function renderFieldFormula() {
  // tak, jak je to v sešitě: E = F/Q („jaká síla připadá na jednotkový náboj“)
  $('formula-e').innerHTML =
    `<i>E</i> = ${frac('<i>F</i>', '<i>Q</i>')} <span class="muted">&nbsp;[V·m⁻¹ = N·C⁻¹]</span>` +
    `<span class="muted">&nbsp;&nbsp;⇒&nbsp;</span> <span><i>F</i> = <i>Q</i>·<i>E</i></span>`;
  $('formula-e-point').innerHTML = `|<i>E</i>| = <i>k</i>·|<i>Q</i>| / <i>r</i>² = 1/(4·π·ε)·|<i>Q</i>| / <i>r</i>²`;
}

export function renderProbe(E, visible) {
  $('probe-section').hidden = !visible;
  if (!visible) return;
  $('probe-values').innerHTML = dl([
    ['intenzita |E|', `${N(E)} ${UNITS.field}<span class="note">= ${N(E)} ${UNITS.fieldAlt}</span>`, 'big'],
    ['síla na 1 C', `${N(E)} N`],
  ]);
}

// F = Q·E s dosazením pro vybraný náboj
export function renderFqe(sel) {
  const el = $('formula-fqe');
  if (!sel || !(sel.E > 0)) { el.innerHTML = ''; return; }
  el.innerHTML = `<span><i>F</i> = <i>Q</i>·<i>E</i></span> = ${formatSubstCharge(Math.abs(sel.Q))} · ${N(sel.E)} N ` +
    `= <span class="res">${N(Math.abs(sel.Q) * sel.E)} N</span>`;
}

// Barevná stupnice ve scéně (světlejší = silnější pole)
export function renderColorbar(range, palette, visible) {
  const el = $('colorbar');
  el.hidden = !visible;
  if (!visible) return;
  const ticks = [];
  for (let e = range.lo; e <= range.hi; e++) {
    const t = ((e - range.lo) / (range.hi - range.lo)) * 100;
    ticks.push(`<span style="left:${t}%">10${superscript(e)}</span>`);
  }
  el.innerHTML =
    `<div class="cb-title">|E| v V·m⁻¹ · světlejší = silnější</div>` +
    `<div class="cb-bar" style="background:linear-gradient(90deg,${palette.join(',')})"></div>` +
    `<div class="cb-ticks">${ticks.join('')}</div>`;
}

export function renderPair(pair, labels = ['Q₁', 'Q₂']) {
  if (!pair) {
    $('pair-values').innerHTML = dl([['', '<span class="note">Zatím jen jeden náboj (nebo žádný).</span>']]);
    return;
  }
  const kind = pair.attractive
    ? '<span class="note attr">přitažlivá — opačná znaménka</span>'
    : '<span class="note rep">odpudivá — stejná znaménka</span>';
  $('pair-values').innerHTML = dl([
    [labels[0], formatCharge(pair.Q1)],
    [labels[1], formatCharge(pair.Q2)],
    ['vzdálenost r', `${N(pair.r, 4)} m`],
    ['síla F<sub>e</sub>', `${N(pair.F)} N${kind}`, 'big'],
  ]);
}

export function renderSelected(sel, index, label) {
  const name = label || (index >= 0 ? qName(index) : '—');
  $('sel-name').textContent = name;
  $('sel-name-2').textContent = name;
  if (!sel) {
    $('sel-values').innerHTML = dl([['', '<span class="note">Ťukni na náboj ve scéně.</span>']]);
    return;
  }
  // n = |Q|/e — kolik elektronů má kulička navíc (−) nebo jí chybí (+), lekce 02 Př. 3
  const n = Math.abs(sel.Q) / E_CHARGE;
  $('sel-values').innerHTML = dl([
    ['náboj Q', `${formatCharge(sel.Q)}<span class="note">n = |Q|/e = ${N(n)} ${sel.Q < 0 ? 'elektronů navíc' : 'elektronů chybí'}</span>`],
    ['výsledná síla F', `${N(sel.F)} N`, 'big'],
    ['intenzita E', `${N(sel.E)} ${UNITS.field}<span class="note">= ${N(sel.E)} ${UNITS.fieldAlt}</span>`],
  ]);
}

export function renderMedium(medium) {
  $('medium-values').innerHTML = dl([
    ['prostředí', medium.name],
    ['εᵣ', N(medium.epsR, 5)],
    ['ε = ε₀·εᵣ', `${N(EPS0 * medium.epsR)} C²·N⁻¹·m⁻²`],
    ['k = 1/(4·π·ε)', `${N(kFor(medium.epsR))} ${UNITS.k}`],
  ]);
}

// Karta „Příklad ze sešitu“: zadání + porovnání výsledku aplikace se sešitem.
export function renderExample(ex, pair, { dirty, touched }) {
  const card = $('example-card');
  if (!ex) { card.hidden = true; return; }
  card.hidden = false;
  card.className = 'group excard';
  const expect = touched && ex.afterTouch ? ex.afterTouch : ex.expect;
  const stale = '<p class="stale">Scéna je změněná — pro porovnání klikni na příklad znovu.</p>';
  let compare;
  if (ex.variants) {
    // 04 Př. 1: intenzita v místě Q₁ zůstává, síla se mění s Q₁ (varianty a–d)
    const Q1 = pair ? pair.Q2 : 0;
    const chips = ex.variants.map((v) =>
      `<button type="button" data-variant="${v.key}" class="${pair && Math.abs(v.Q - Q1) <= Math.abs(v.Q) * 1e-9 ? 'on' : ''}">` +
      `${v.key}) ${N(v.Q)} C</button>`).join('');
    if (dirty || !pair) {
      compare = stale;
    } else {
      const E = pair.F / Math.abs(Q1); // F = Q·E  ⇒  E = F/Q
      const v = ex.variants.find((x) => Math.abs(x.Q - Q1) <= Math.abs(x.Q) * 1e-9);
      const okE = matchesSesit(E, ex.expectE);
      const okF = v && matchesSesit(pair.F, v);
      compare = `<dl class="compare">
        <dt>E v místě Q₁</dt><dd>sešit ${ex.expectE.shown} · aplikace ${N(E)} V·m⁻¹ ${okE ? '<span class="ok">✓</span>' : ''}</dd>
        <dt>síla F</dt><dd>${v ? `sešit ${v.shown} · ` : ''}aplikace ${N(pair.F)} N ${okF ? '<span class="ok">✓</span>' : ''}</dd>
      </dl>`;
    }
    card.innerHTML = `<h3>${ex.lesson}, ${ex.title}</h3><p>${ex.text}</p><div class="variants">${chips}</div>${compare}`;
    return;
  }
  if (dirty || !pair) {
    compare = stale;
  } else {
    const ok = matchesSesit(pair.F, expect);
    compare = `<dl class="compare">
      <dt>v sešitě</dt><dd>F = ${expect.shown}</dd>
      <dt>aplikace</dt><dd>F = ${N(pair.F)} N ${ok ? '<span class="ok">✓ souhlasí</span>' : ''}</dd>
    </dl>`;
  }
  card.innerHTML = `<h3>${ex.lesson}, ${ex.title}</h3><p>${ex.text}</p>${compare}`;
}

// ── Režim 3: Práce v poli ────────────────────────────────────────────────────
// w = { Q, E, A, B, d, U, W, segments, path }
const KIND_TXT = { parallel: 'po siločáře', perpendicular: 'kolmo na siločáry', oblique: 'šikmo' };
export function renderWork(w) {
  $('formula-work').innerHTML =
    `<i>W</i> = <i>Q</i>·<i>E</i>·<i>d</i> = ${formatSubstCharge(w.Q)} · ${N(w.E, 4)} · ${N(w.d, 3)} J = <span class="res">${N(w.W)} J</span>`;
  $('work-values').innerHTML = dl([
    ['napětí U<sub>AB</sub> = E·d', `${N(w.U)} V<span class="note">práce pole na 1 C z A do B</span>`, 'big'],
    ['práce pole W = Q·U', `${N(w.W)} J`, 'big'],
    ['síla F = Q·E', `${N(Math.abs(w.Q * w.E))} N<span class="note">${w.Q > 0 ? 'po siločarách' : 'proti siločarám'}</span>`],
    ['d (po siločarách)', `${N(w.d, 3)} m`],
  ]);
  $('work-segments').innerHTML = w.segments.map((s, i) =>
    `<li class="${s.kind}"><span>${i + 1}. ${KIND_TXT[s.kind]}</span>` +
    `<span>s = ${N(s.s * 100, 3)} cm · α = ${N(Math.round(s.alpha), 3)}° · W = ${N(s.W)} J</span></li>`).join('');
}

// „Sestava“ — co je právě na stole (jako tabulka přístrojů u pokusu)
export function renderSestava(rows) {
  $('sestava').innerHTML = `<table class="mini sestava"><tbody>${rows.map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</tbody></table>`;
}
