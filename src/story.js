// Průvodce: karta kapitoly vedle 3D scény. Každá kapitola má stejnou stavbu —
// Co to je (teorie ze sešitu) → Vzorec (a pod ním čísla ze scény) → ovládání scény a živá
// hodnota → Příklad ze sešitu (řešení až po kliknutí).
// Texty jsou v core/chapters.js, scénu staví main.js (přes `api`). Tady je jen DOM.

import { PAGES, chapterTitles, CHAPTER_COUNT } from './core/chapters.js';
import { MEDIA, kFor } from './core/constants.js';
import { PLANETS, planetById, grouped, auToKm } from './core/relativita.js';
import { VOLTAGE_FACTS } from './core/examples.js';
import { formatNumber, formatSubstCharge, UNITS } from './core/format.js';
import { frac, coulombSubstHTML } from './ui.js';

const N = (x, sig = 3) => formatNumber(x, sig);

// Vzorce tak, jak jsou v sešitě
const FORMULAS = {
  coulomb: `<span><i>F</i><sub>e</sub></span> = <i>k</i> · ${frac('<i>Q</i><sub>1</sub>·<i>Q</i><sub>2</sub>', '<i>r</i><sup>2</sup>')}` +
    `<span class="muted">&nbsp;&nbsp;<i>k</i> = ${frac('1', '4·π·<i>ε</i>')}</span>`,
  permitivita: `<span><i>F</i><sub>e</sub></span> = ${frac('1', '4·π·<i>ε</i>₀·<i>ε</i>ᵣ')} · ${frac('<i>Q</i><sub>1</sub>·<i>Q</i><sub>2</sub>', '<i>r</i><sup>2</sup>')}`,
  intenzita: `<i>E</i> = ${frac('<i>F</i>', '<i>Q</i>')}<span class="muted">&nbsp;&nbsp;⇒&nbsp;&nbsp;</span><i>F</i> = <i>Q</i>·<i>E</i>` +
    `<span class="muted">&nbsp;&nbsp;[V·m⁻¹ = N·C⁻¹]</span>`,
  relativita: `údaj v AU = ${frac('vzdálenost v km', '150 000 000 km')}<span class="muted">&nbsp;&nbsp;·&nbsp;&nbsp;</span><i>ε</i>ᵣ = ${frac('<i>ε</i>', '<i>ε</i>₀')}`,
  // každý vzorec v jednom kuse (nowrap), ať se „·cos α“ neodtrhne na další řádek
  prace: `<span class="nw"><i>W</i> = <i>Q</i>·<i>U</i></span><span class="muted">&nbsp;&nbsp;·&nbsp;&nbsp;</span>` +
    `<span class="nw"><i>U</i> = <i>E</i>·<i>d</i></span><span class="muted">&nbsp;&nbsp;·&nbsp;&nbsp;</span>` +
    `<span class="nw"><i>W</i> = <i>F</i>·<i>s</i>·cos α</span>`,
};

export function createStory(el, api) {
  let index = 0;
  let info = null;

  el.innerHTML = `
    <nav class="g-progress" aria-label="Kapitoly"></nav>
    <header class="g-head">
      <p class="g-kicker"></p>
      <h2 class="g-title"></h2>
    </header>
    <section class="g-sec g-theory">
      <h3>Co to je</h3>
      <ul></ul>
      <p class="g-note"></p>
      <details class="g-explain"><summary>Vysvětlení od začátku — jednoduše</summary><div class="g-explain-body"></div></details>
    </section>
    <section class="g-sec g-formula">
      <h3>Vzorec</h3>
      <div class="formula g-formula-main"></div>
      <div class="formula subst g-formula-live"></div>
      <details class="g-why"><summary>Odkud je 8,85·10⁻¹²?</summary><div class="g-why-body"></div></details>
    </section>
    <section class="g-sec g-picture">
      <div class="g-controls"></div>
      <p class="g-try"></p>
      <div class="g-live" aria-live="polite"><div class="g-number"></div><p class="g-status"></p></div>
      <div class="g-calc" hidden></div>
    </section>
    <section class="g-sec g-example">
      <h3 class="g-ex-head">Příklady ze sešitu</h3>
      <div class="g-ex-list"></div>
    </section>
    <details class="g-more"><summary>Víc k tématu</summary><div class="g-more-body"></div></details>
    <div class="g-nav">
      <button type="button" class="btn g-prev">← Zpět</button>
      <button type="button" class="btn g-next">Další →</button>
    </div>
    <button type="button" class="g-lab">Otevřít v laboratoři — všechny ovládací prvky →</button>`;
  const $ = (sel) => el.querySelector(sel);

  const progress = $('.g-progress');
  for (const ch of chapterTitles()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.chapter = ch.n;
    b.title = ch.title;
    b.innerHTML = `<span class="n">${ch.n}</span><span class="t">${ch.title}</span>`;
    b.addEventListener('click', () => go(PAGES.findIndex((p) => p.id === ch.first)));
    progress.append(b);
  }

  $('.g-prev').addEventListener('click', () => go(index - 1));
  $('.g-next').addEventListener('click', () => (index < PAGES.length - 1 ? go(index + 1) : api.openLab()));
  $('.g-lab').addEventListener('click', () => api.openLab());
  $('.g-more').addEventListener('toggle', () => renderMore());
  // tlačítka u příkladů: řešení (ukázat / skrýt), postavit ve scéně, dotek kuliček
  $('.g-ex-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.g-ex');
    const ex = PAGES[index].examples[Number(card.dataset.i)];
    if (btn.dataset.act === 'solve') {
      const sol = card.querySelector('.g-solution');
      sol.hidden = !sol.hidden;
      btn.textContent = sol.hidden ? 'Ukázat řešení' : 'Skrýt řešení';
    } else if (btn.dataset.act === 'scene') {
      api.showExample(ex.scene);
    } else if (btn.dataset.act === 'touch') {
      api.showExample(ex.scene);
      api.touch();
    }
  });

  // šipky na klávesnici — pro promítání ve třídě
  window.addEventListener('keydown', (e) => {
    if (document.body.dataset.view !== 'guide') return;
    if (e.target.closest('input, select, textarea')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(index + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(index - 1); e.preventDefault(); }
  });

  function go(i) {
    if (i < 0 || i >= PAGES.length) return;
    index = i;
    const p = PAGES[i];
    const same = PAGES.filter((x) => x.chapter === p.chapter);
    const part = same.length > 1 ? ` · část ${same.indexOf(p) + 1}/${same.length}` : '';
    $('.g-kicker').textContent = `Kapitola ${p.chapter} z ${CHAPTER_COUNT}${part} · lekce ${p.lesson}`;
    $('.g-title').textContent = p.title;

    $('.g-theory ul').innerHTML = p.theory.map((t) => `<li>${t}</li>`).join('');
    $('.g-note').textContent = p.note || '';
    $('.g-note').hidden = !p.note;
    $('.g-explain').hidden = !p.explainer;
    $('.g-explain').open = false;
    $('.g-explain-body').innerHTML = p.explainer ? explainerHTML(p.explainer) : '';

    $('.g-formula').hidden = !p.formula;
    $('.g-formula-main').innerHTML = p.formula ? FORMULAS[p.formula] : '';

    $('.g-try').textContent = p.try;

    $('.g-example').hidden = p.examples.length === 0;
    const fromSesit = p.examples.some((x) => /^\d\d /.test(x.lesson));
    $('.g-ex-head').textContent = fromSesit ? (p.examples.length > 1 ? 'Příklady ze sešitu' : 'Příklad ze sešitu') : 'Příklad z hodiny (není v sešitě)';
    $('.g-ex-list').innerHTML = p.examples.map(exampleHTML).join('');

    $('.g-more').hidden = !hasMore(p.id);
    $('.g-more').open = false;

    $('.g-prev').disabled = i === 0;
    const next = PAGES[i + 1];
    $('.g-next').textContent = next ? `Další: ${next.title} →` : 'Hotovo — otevři laboratoř →';
    progress.querySelectorAll('button').forEach((b) => {
      const n = Number(b.dataset.chapter);
      b.classList.toggle('on', n === p.chapter);
      b.classList.toggle('done', n < p.chapter);
    });
    el.scrollTop = 0;
    // nová kapitola začíná nahoře — na mobilu se posouvá celá stránka, ne jen karta.
    // Okamžitě, ne plynule: přes dlouhou stránku by plynulé posouvání trvalo zbytečně dlouho.
    window.scrollTo({ top: 0, behavior: 'instant' });
    buildControls(p);
    api.loadPage(p.id);
    const url = new URL(location.href);
    url.searchParams.set('kapitola', p.id);
    url.searchParams.delete('lab');
    history.replaceState(null, '', url);
  }

  // ── ovládací prvky karty ───────────────────────────────────────────────────
  function seg(items, onPick, key) {
    const box = document.createElement('div');
    box.className = 'seg';
    box.dataset.k = key;
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.key = it.key;
      b.innerHTML = it.html;
      b.addEventListener('click', () => onPick(it.key));
      box.append(b);
    }
    return box;
  }

  function buildControls(p) {
    const box = $('.g-controls');
    box.innerHTML = '';
    for (const c of p.controls) {
      if (c === 'rub') {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = '<button type="button" class="btn btn-primary" data-act="rub">Zatřít tyčí o hadr</button>' +
          '<button type="button" class="btn btn-ghost g-small" data-act="reset">Znovu</button>';
        row.querySelector('[data-act=rub]').addEventListener('click', () => api.rub());
        row.querySelector('[data-act=reset]').addEventListener('click', () => api.resetRub());
        box.append(row);
      } else if (c === 'distance') {
        const lab = document.createElement('label');
        lab.className = 'slider';
        lab.innerHTML = '<span class="slider-label" data-k="r">vzdálenost r</span><input type="range" min="0" max="1" step="0.001" data-k="r-slider" aria-label="Vzdálenost r">';
        const input = lab.querySelector('input');
        input.addEventListener('pointerdown', () => api.distanceStart());
        input.addEventListener('keydown', () => api.distanceStart());
        input.addEventListener('input', () => {
          api.distanceStart();
          const { min, max } = api.rRange();
          api.setDistance(min * Math.pow(max / min, Number(input.value)));
        });
        input.addEventListener('change', () => api.distanceEnd());
        box.append(lab);
      } else if (c === 'sign') {
        box.append(seg([
          { key: 'plus', html: 'Q₂ kladný <b class="plus">+</b>' },
          { key: 'minus', html: 'Q₂ záporný <b class="minus">−</b>' },
        ], (k) => api.setSign(k === 'plus' ? 1 : -1), 'sign'));
      } else if (c === 'medium') {
        const chips = document.createElement('div');
        chips.className = 'chips';
        chips.dataset.k = 'medium';
        for (const m of MEDIA) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip';
          b.dataset.key = m.id;
          b.innerHTML = `${m.name}<span class="q">εᵣ = ${N(m.epsR, 5)}</span>`;
          b.addEventListener('click', () => api.setMedium(m.id));
          chips.append(b);
        }
        box.append(chips);
      } else if (c === 'fieldType') {
        box.append(seg([
          { key: 'radialni', html: 'radiální' },
          { key: 'dipol', html: 'pole dipólu' },
          { key: 'desky', html: 'homogenní' },
        ], (k) => api.fieldScene(k), 'fieldType'));
      } else if (c === 'workPath') {
        const wrap = document.createElement('div');
        wrap.innerHTML = '<span class="slider-label">cesta z A do B — vyber a náboj se přenese</span>';
        wrap.append(seg([
          { key: 'primo', html: 'přímo' },
          { key: 'schody', html: 'po schodech' },
          { key: 'oklika', html: 'oklikou' },
        ], (k) => api.workPath(k), 'workPath'));
        box.append(wrap);
      } else if (c === 'unit') {
        box.append(seg([
          { key: 'au', html: 'relativně · AU' },
          { key: 'km', html: 'absolutně · km' },
        ], (k) => api.setUnit(k), 'unit'));
      } else if (c === 'planet') {
        // osm planet se do jednoho řádku nevejde — štítky, které se zalomí
        const chips = document.createElement('div');
        chips.className = 'chips';
        chips.dataset.k = 'planet';
        for (const p of PLANETS) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'chip';
          b.dataset.key = p.id;
          b.innerHTML = `${p.name}<span class="q">${String(p.au).replace('.', ',')} AU</span>`;
          b.addEventListener('click', () => api.setPlanet(p.id));
          chips.append(b);
        }
        box.append(chips);
      } else if (c === 'workSign') {
        box.append(seg([
          { key: 'plus', html: 'náboj +1 µC' },
          { key: 'minus', html: 'náboj −1 µC' },
        ], (k) => api.workSign(k === 'plus' ? 1 : -1), 'workSign'));
      }
    }
  }

  function syncControls() {
    const on = (k, key) => el.querySelectorAll(`[data-k="${k}"] [data-key]`).forEach((b) => b.classList.toggle('on', b.dataset.key === key));
    if (info.pair) {
      on('sign', info.pair.Q2 > 0 ? 'plus' : 'minus');
      const r = el.querySelector('[data-k="r-slider"]');
      if (r && !info.rActive) {
        const { min, max } = api.rRange();
        r.value = String(Math.log(info.pair.r / min) / Math.log(max / min));
      }
      const rl = el.querySelector('[data-k="r"]');
      if (rl) rl.textContent = `vzdálenost r = ${N(info.pair.r, 3)} m`;
    }
    on('medium', info.medium.id);
    on('fieldType', info.fieldScene);
    if (info.rel) { on('unit', info.rel.unit); on('planet', info.rel.planet); }
    if (info.work) {
      on('workPath', info.work.path);
      on('workSign', info.work.Q > 0 ? 'plus' : 'minus');
    }
  }

  // ── vzorec s čísly ze scény ────────────────────────────────────────────────
  function renderFormulaLive() {
    const id = PAGES[index].id;
    let html = '';
    if ((id === 'coulomb' || id === 'permitivita') && info.pair) {
      html = coulombSubstHTML(info.pair, info.medium);
    } else if (id === 'intenzita' && info.probeE != null) {
      html = `<i>E</i> v bodě P = ${N(info.probeE)} ${UNITS.field} → na náboj 1 C by tu působila síla ${N(info.probeE)} N`;
    } else if (id === 'relativita' && info.rel) {
      const p = planetById(info.rel.planet);
      html = `${p.name}: ${String(p.au).replace('.', ',')} AU = ${grouped(auToKm(p.au))} km / 150 000 000 km`;
    } else if (id === 'prace' && info.work) {
      const w = info.work;
      html = `<i>W</i> = <i>Q</i>·<i>E</i>·<i>d</i> = ${formatSubstCharge(w.Q)} · ${N(w.E, 4)} · ${N(w.d, 3)} J = <span class="res">${N(w.W)} J</span>`;
    }
    const live = $('.g-formula-live');
    live.innerHTML = html ? `<span class="g-tag-live">ve scéně</span>${html}` : '';
    live.hidden = !html;

    // vysvětlení konstanty — jen tam, kde je v dosazení ε₀
    const why = (id === 'coulomb' || id === 'permitivita') && info.pair;
    $('.g-why').hidden = !why;
    if (why) $('.g-why-body').innerHTML = whyEps0(info.medium);
  }

  // ── živé číslo pod ovládáním ───────────────────────────────────────────────
  function renderLive() {
    const p = PAGES[index];
    let html = '';
    if (p.id === 'naboj') {
      const n = info.rub;
      html = `<span class="num"><small>tyč</small> ${n ? `−${n}e` : '0'}</span>` +
        `<span class="num"><small>hadr</small> ${n ? `+${n}e` : '0'}</span>` +
        `<span class="num"><small>celkem</small> 0</span>`;
    } else if ((p.id === 'coulomb' || p.id === 'permitivita') && info.pair) {
      const kind = info.pair.attractive ? '<em class="attr">přitažlivá</em>' : '<em class="rep">odpudivá</em>';
      html = `<span class="num"><small>síla F<sub>e</sub></small> ${N(info.pair.F)} N</span>` +
        (p.id === 'coulomb'
          ? `<span class="num"><small>vzdálenost r</small> ${N(info.pair.r, 3)} m</span>`
          : `<span class="num"><small>prostředí</small> ${info.medium.name}</span>`) +
        `<span class="num"><small>síla je</small> ${kind}</span>`;
    } else if (p.id === 'intenzita' && info.probeE != null) {
      html = `<span class="num"><small>intenzita v bodě P</small> ${N(info.probeE)} V·m⁻¹</span>` +
        `<span class="num"><small>síla na 1 C</small> ${N(info.probeE)} N</span>`;
    } else if (p.id === 'relativita' && info.rel) {
      const pl = planetById(info.rel.planet);
      html = `<span class="num"><small>${pl.name} — relativně</small> ${String(pl.au).replace('.', ',')} AU</span>` +
        `<span class="num"><small>absolutně</small> ${grouped(auToKm(pl.au))} km</span>`;
    } else if (p.id === 'prace' && info.work) {
      html = `<span class="num"><small>práce pole W</small> ${N(info.work.W)} J</span>` +
        `<span class="num"><small>napětí U<sub>AB</sub></small> ${N(info.work.U)} V</span>`;
    }
    $('.g-number').innerHTML = html;
    $('.g-number').hidden = !html;
    $('.g-status').textContent = info.status;
  }

  function renderMore() {
    if (!$('.g-more').open || !info) return;
    $('.g-more-body').innerHTML = moreHTML(PAGES[index].id, info);
  }

  // „Jak se to spočítalo“ — práce W a napětí U_AB krok za krokem z čísel ve scéně (kapitola 5)
  function renderCalc() {
    const box = $('.g-calc');
    const w = PAGES[index].id === 'prace' ? info.work : null;
    box.hidden = !w;
    if (!w) return;
    const m = (x) => `${N(x, 3)} m`;
    const xa = w.A.x, xb = w.B.x;
    box.innerHTML = `
      <h4>Jak se to spočítalo</h4>
      <ol>
        <li><b>d</b> — posunutí po siločarách z A do B (siločáry míří od + desky k − desce):
          <span class="calc">d = x<sub>B</sub> − x<sub>A</sub> = ${m(xb)} − (${m(xa)}) = <b class="nw">${m(w.d)}</b></span></li>
        <li><b>Napětí</b> — práce pole na náboj 1 C z A do B:
          <span class="calc">U<sub>AB</sub> = E·d = ${N(w.E, 4)} V·m⁻¹ · ${m(w.d)} = <b class="nw">${N(w.U)} V</b></span></li>
        <li><b>Práce pole</b> na přenášený náboj:
          <span class="calc">W = Q·U<sub>AB</sub> = ${formatSubstCharge(w.Q)} C · ${N(w.U)} V = <b class="nw">${N(w.W)} J</b></span></li>
      </ol>
      <p class="hint">Zelené úseky cesty (kolmo na siločáry) se do d nepočítají — proto vyjde stejná práce po každé cestě.
        ${w.d < 0 ? 'd je záporné: B leží proti směru siločar, takže práce kladného náboje vyjde záporná.' : ''}
        ${w.Q < 0 ? 'Náboj je záporný, proto má práce opačné znaménko (05 Př. 7).' : ''}</p>`;
  }

  function update(next) {
    info = next;
    syncControls();
    renderFormulaLive();
    renderLive();
    renderCalc();
    renderMore();
  }

  function start(id) {
    const i = PAGES.findIndex((p) => p.id === id || String(p.chapter) === String(id));
    go(i >= 0 ? i : 0);
  }

  return { start, update, get page() { return PAGES[index]; }, reload() { go(index); } };
}

// „Vysvětlení od začátku“ — krátké body, tabulka „který vzorec kdy“, zásuvka, shrnutí.
function explainerHTML(e) {
  const sections = e.sections.map((s) =>
    `<div class="ex-sec"><h4>${s.heading}</h4>${s.formula ? `<p class="ex-f">${s.formula}</p>` : ''}<p>${s.text}</p></div>`).join('');
  const rows = e.table.map(([a, b]) => `<tr><td>${a}</td><td class="nw">${b}</td></tr>`).join('');
  return `${sections}
    <h4>Který vzorec kdy</h4>
    <table class="mini"><thead><tr><th>když znáš…</th><th>použij</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="ex-sec ex-socket"><h4>${e.example.heading}</h4><ol>${e.example.steps.map((s) => `<li>${s}</li>`).join('')}</ol></div>
    <p class="ex-sum"><b>Jednou větou:</b> ${e.summary}</p>`;
}

// Jeden příklad ze sešitu: zadání je vidět hned, postup až po kliknutí.
function exampleHTML(ex, i) {
  return `<article class="g-ex" data-i="${i}">
    <p class="g-ex-tag"><span class="tag">${/^\d\d /.test(ex.lesson) ? ex.lesson.slice(0, 2) : ex.lesson} · ${ex.title}</span></p>
    <p class="g-task">${ex.task}</p>
    <p class="g-given">Dáno: ${ex.given}</p>
    <div class="g-ex-buttons">
      <button type="button" class="btn btn-primary" data-act="solve">Ukázat řešení</button>
      ${ex.scene ? '<button type="button" class="btn" data-act="scene">Ukázat ve scéně</button>' : ''}
    </div>
    <div class="g-solution" hidden>
      <ol class="g-steps">${ex.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      <p class="g-answer">${ex.answer}</p>
      ${ex.action === 'touch' ? '<button type="button" class="btn g-touch" data-act="touch">Ve scéně: nechat kuličky dotknout (b)</button>' : ''}
    </div>
  </article>`;
}

// Proč je v dosazení 8,85·10⁻¹²: k = 1/(4·π·ε), ε = ε₀·εᵣ (lekce 03).
function whyEps0(medium) {
  const vacuum = medium.epsR === 1;
  const k = kFor(medium.epsR);
  const p1 = '<p>Číslo <b>8,85·10⁻¹²</b> je <b>ε₀ — permitivita vakua</b> (8,85·10⁻¹² C²·N⁻¹·m⁻²), jedna z nejdůležitějších fyzikálních konstant (lekce 03).</p>';
  const p2 = '<p>Konstanta ve vzorci je <i>k</i> = 1/(4·π·<i>ε</i>) a permitivita prostředí je <i>ε</i> = <i>ε</i>₀·<i>ε</i>ᵣ.</p>';
  const p3 = vacuum
    ? '<p>Ve vakuu je <i>ε</i>ᵣ = 1, takže <i>ε</i> = <i>ε</i>₀ a do vzorce dosadíme jen 8,85·10⁻¹².</p>'
    : `<p>${cap(medium.loc)} je <i>ε</i>ᵣ = ${N(medium.epsR, 5)}, proto je ve jmenovateli ještě · ${N(medium.epsR, 5)}.</p>`;
  const p4 = `<p>Když to spočítáš: 1/(4·π·8,85·10⁻¹²${vacuum ? '' : `·${N(medium.epsR, 5)}`}) ≐ <b>${N(k)} N·m²·C⁻²</b>` +
    (vacuum ? ' ≐ 9·10⁹ — to je přesně to <i>k</i> ze vzorce. Aplikace počítá s ε₀, protože je přesnější; po zaokrouhlení vyjde stejně jako se 9·10⁹.</p>' : ' — tolik je <i>k</i> v tomto prostředí. Čím větší εᵣ, tím menší k a tím menší síla.</p>');
  return p1 + p2 + p3 + p4;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// „Víc k tématu“ — jen tam, kde je ze sešitu co přidat.
const hasMore = (id) => id === 'permitivita' || id === 'prace';

function moreHTML(id, info) {
  if (id === 'permitivita') {
    const rows = MEDIA.map((m) => `<tr class="${m.id === info.medium.id ? 'on' : ''}"><td>${m.name}</td><td>${N(m.epsR, 5)}</td>` +
      `<td>${m.epsR === 1 ? '—' : m.epsR < 1.01 ? 'skoro stejná (k ≈ 9·10⁹)' : `${N(m.epsR, 3)}krát menší`}</td></tr>`).join('');
    return `<table class="mini"><thead><tr><th>látka</th><th>εᵣ</th><th>síla oproti vakuu</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="hint">Hodnoty εᵣ z tabulky v lekci 03.</p>`;
  }
  if (id === 'prace') {
    const facts = VOLTAGE_FACTS.map((f) => `<tr><td>${f.label}</td><td>${f.what}</td><td>${N(f.value, f.sig)} ${f.unit}</td></tr>`).join('');
    return `<p class="chain"><i>E</i> = <i>F</i>/<i>Q</i> → <i>F</i> = <i>Q</i>·<i>E</i> → <i>W</i> = <i>F</i>·<i>d</i> → <i>W</i> = <i>Q</i>·<i>E</i>·<i>d</i> → <i>U</i> = <i>E</i>·<i>d</i> → <i>W</i> = <i>Q</i>·<i>U</i><sub>AB</sub></p>
      <h4>Závěrečný přehled (lekce 06)</h4>
      <table class="mini"><thead><tr><th>význam</th><th>závisí na náboji</th><th>nezávisí na náboji</th></tr></thead><tbody>
        <tr><td>„strmost kopce“</td><td>síla F</td><td>intenzita E</td></tr>
        <tr><td>energie („nadmořská výška“)</td><td>energie Ep</td><td>potenciál φ</td></tr>
        <tr><td>práce („převýšení“)</td><td>práce W</td><td>napětí U</td></tr>
      </tbody></table>
      <p class="hint">Za hladinu nulového potenciálu považujeme Zemi. U<sub>AB</sub> = φ<sub>A</sub> − φ<sub>B</sub>.</p>
      <h4>Napětí kolem nás (lekce 05)</h4>
      <table class="mini"><tbody>${facts}</tbody></table>
      <p class="hint">Zásuvku jsme v hodině počítali s d = 0,02 m; učebnice má 1,8 cm → 12 800 V·m⁻¹.</p>`;
  }
  return '';
}
