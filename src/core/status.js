// Jedna česká věta do horní lišty: co se právě děje a proč.
// Formulace se drží sešitu („Náboje stejného znaménka se odpuzují…“). Čistý modul.

import { formatNumber, formatCharge } from './format.js';

// Česky „krát“ s desetinnou čárkou: 4 → „čtyřikrát“, 2,25 → „2,25krát“.
const WORDS = { 2: 'dvakrát', 3: 'třikrát', 4: 'čtyřikrát', 9: 'devětkrát', 16: 'šestnáctkrát' };
function times(x) {
  const r = Math.round(x);
  if (Math.abs(x - r) < 0.03 && WORDS[r]) return WORDS[r];
  return `${formatNumber(x, 3)}krát`;
}

const near = (a, b, tol = 0.03) => Math.abs(a - b) / b < tol;

// state:
//   count     počet nábojů
//   single    náboj, když je jen jeden ({ Q })
//   pair      { Q1, Q2, r, F, attractive } pro náboje Q₁ a Q₂, nebo null
//   medium    { name, loc, epsR }
//   rMin      nejmenší možná vzdálenost (kuličky se dotýkají)
//   event     null | 'touched' | 'medium'
//   baseline  stav na začátku pohybu / změny: { r, F, Q1, Q2, epsR, medium }
export function statusSentence(state) {
  const { count, pair, medium, event, baseline } = state;

  if (count === 0) return 'Přidej náboj tlačítkem vlevo.';

  if (count === 1) {
    return state.single && state.single.Q < 0
      ? 'Jeden náboj vytváří kolem sebe radiální pole — u záporného náboje siločáry do náboje vstupují.'
      : 'Jeden náboj vytváří kolem sebe radiální pole — siločáry z kladného náboje vycházejí jako paprsky Slunce.';
  }

  if (event === 'touched' && pair) {
    return `Kuličky se dotkly a náboj se rozdělil napůl: každá má teď ${formatCharge(pair.Q1, 3)}. ` +
      'Celkový náboj se nezměnil — zákon zachování elektrického náboje.';
  }

  if (event === 'medium' && baseline && pair && baseline.epsR !== medium.epsR) {
    const ratio = medium.epsR / baseline.epsR;
    if (medium.epsR === 1) return `Ve vakuu je síla největší: εᵣ = 1, takže prostředí sílu nezmenšuje.`;
    if (ratio > 1) return `${cap(medium.loc)} je síla ${times(ratio)} menší než ${baseline.medium.loc} (εᵣ = ${formatNumber(medium.epsR, 5)}).`;
    return `${cap(medium.loc)} je síla ${times(1 / ratio)} větší než ${baseline.medium.loc} (εᵣ = ${formatNumber(medium.epsR, 5)}).`;
  }

  if (!pair) return '';

  // Změna vzdálenosti oproti začátku pohybu — ukázka, že F ~ 1/r².
  if (baseline && baseline.Q1 === pair.Q1 && baseline.Q2 === pair.Q2 && baseline.epsR === medium.epsR) {
    const k = pair.r / baseline.r;
    if (!near(k, 1, 0.08)) {
      if (near(k, 0.5)) return 'Vzdálenost se zmenšila na polovinu — síla vzrostla čtyřikrát.';
      if (near(k, 2)) return 'Vzdálenost se zvětšila na dvojnásobek — síla klesla na čtvrtinu.';
      if (near(k, 1 / 3)) return 'Vzdálenost se zmenšila na třetinu — síla vzrostla devětkrát.';
      if (near(k, 3)) return 'Vzdálenost se zvětšila na trojnásobek — síla klesla na devítinu.';
      if (k < 1) return `Vzdálenost se zmenšila ${times(1 / k)} — síla vzrostla ${times(1 / (k * k))} (síla klesá s druhou mocninou vzdálenosti).`;
      // daleko od sebe: síla skoro zmizela
      if ((state.rMin / pair.r) ** 2 < 0.01) return 'Elektrická síla s rostoucí vzdáleností klesá — náboj je daleko, takže síla je téměř nulová.';
      return `Vzdálenost se zvětšila ${times(k)} — síla klesla ${times(k * k)} (síla klesá s druhou mocninou vzdálenosti).`;
    }
  }

  if (state.rMin && (state.rMin / pair.r) ** 2 < 0.01) {
    return 'Elektrická síla s rostoucí vzdáleností klesá — náboj je daleko, takže síla je téměř nulová.';
  }

  const F = `${formatNumber(pair.F, 3)} N`;
  const base = pair.attractive
    ? `Náboje opačného znaménka se přitahují silou ${F}.`
    : `Náboje stejného znaménka se odpuzují silou ${F}.`;
  if (count > 2) return `${base} Na každý náboj působí všechny ostatní — šipka ukazuje výslednou sílu.`;
  return base;
}

// ── Režim 2: Elektrické pole ─────────────────────────────────────────────────
// state:
//   count, single     jako výše
//   charges           [{ Q }] — znaménka kuliček
//   plates            true = jsou na stole nabité desky
//   testBetween       true = vybraný náboj je mezi deskami
//   probe             { E } — intenzita v bodě P, nebo null
//   event             null | 'probe' | 'medium' | 'touched'
//   medium, baseline  jako výše (pro změnu prostředí)
export function fieldSentence(state) {
  const { count, plates, probe, event, medium, baseline } = state;

  if (event === 'medium' && baseline && baseline.epsR !== medium.epsR) {
    const ratio = medium.epsR / baseline.epsR;
    if (medium.epsR === 1) return 'Ve vakuu je intenzita pole největší: εᵣ = 1, prostředí pole nezeslabuje.';
    const how = ratio > 1 ? `${times(ratio)} menší` : `${times(1 / ratio)} větší`;
    return `${cap(medium.loc)} je intenzita pole ${how} než ${baseline.medium.loc} (εᵣ = ${formatNumber(medium.epsR, 5)}) — ${ratio > 1 ? 'barvy ztmavly' : 'barvy zesvětlaly'}.`;
  }

  if (event === 'probe' && probe) {
    const E = formatNumber(probe.E, 3);
    return `V bodě P má pole intenzitu ${E} V·m⁻¹ — na náboj 1 C by tu působila síla ${E} N.`;
  }

  if (event === 'touched') return statusSentence(state);

  if (plates && state.testBetween) {
    return 'Náboj je mezi deskami — pole je tu homogenní, takže na něj všude působí stejná síla F = Q·E.';
  }
  if (plates) {
    return 'Mezi deskami je pole všude stejné — homogenní: vektory mají stejný směr i stejnou barvu.';
  }

  if (count === 0) return 'Přidej náboj — kolem něj vznikne elektrické pole.';
  if (count === 1) {
    return state.single && state.single.Q < 0
      ? 'Radiální pole: u záporného náboje všechny vektory míří k náboji; dál od náboje je pole slabší (tmavší barva).'
      : 'Radiální pole: všechny vektory míří od náboje; čím dál od náboje, tím je pole slabší (tmavší barva).';
  }
  if (count === 2) {
    const [a, b] = state.charges;
    if (a.Q * b.Q < 0) return 'Pole dipólu: siločáry vycházejí z kladného náboje a končí v záporném.';
    return 'Dva souhlasné náboje: mezi nimi je místo, kde se jejich pole vyruší (E = 0) — nejtmavší místo obrázku.';
  }
  return 'Každý náboj vytváří kolem sebe pole; výsledné pole v každém bodě je součtem jejich příspěvků.';
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Režim 3: Práce v elektrickém poli (lekce 05, 06) ─────────────────────────
// state:
//   W, U        práce pole [J] a napětí U_AB [V] (core/work.js)
//   Q           přenášený náboj [C] se znaménkem
//   kinds       druhy úseků cesty: 'parallel' | 'perpendicular' | 'oblique'
//   event       null | 'path' (jiná cesta, stejné A a B) | 'sign' | 'moved'
//   prevW       práce před změnou cesty (pro větu „jiná cesta, stejná práce“)
export function workSentence(state) {
  const { W, Q, kinds = [], event, prevW } = state;
  const Wtxt = `${formatNumber(W, 3)} J`;
  const zero = Math.abs(W) < 1e-15;

  if (event === 'path' && prevW != null && Math.abs(prevW - W) <= Math.abs(W) * 1e-9 + 1e-18) {
    return `Jiná cesta, stejná práce W = ${Wtxt} — síly elektrického pole jsou konzervativní.`;
  }
  if (event === 'sign' && Q < 0) {
    return `Záporný náboj: síla pole míří proti siločarám, takže se otočí i znaménko práce (W = ${Wtxt}).`;
  }
  if (zero) {
    return 'A a B leží na stejné ekvipotenciální ploše — pohyb kolmo na siločáry, pole práci nekoná (cos 90° = 0).';
  }
  if (W < 0) {
    return `Práce pole je záporná (W = ${Wtxt}): náboj jde proti síle pole, musí ho tlačit jiná síla.`;
  }
  if (kinds.includes('perpendicular') && kinds.includes('parallel')) {
    return `Práci konají jen úseky po siločarách (červené), úseky kolmo na ně (zelené) ne — celkem W = ${Wtxt}.`;
  }
  return `Pole koná kladnou práci W = ${Wtxt}: síla pole táhne náboj z A do B.`;
}

// ── „Co je náboj?“ — tření tyče o hadr (lekce 02) ─────────────────────────────
// moved = kolik elektronů přešlo z hadru na tyč
export function rubSentence(moved) {
  if (moved === 0) return 'Tyč i hadr jsou zatím neutrální: mají stejně kladného i záporného náboje.';
  const verb = moved === 1 ? 'přešel' : moved < 5 ? 'přešly' : 'přešlo';
  return `Na tyč ${verb} ${moved} ${electrons(moved)}: tyč je nabitá záporně (−${moved}e), hadr kladně (+${moved}e). Celkem pořád 0.`;
}

// 1 elektron, 2–4 elektrony, 5 a víc elektronů
function electrons(n) {
  return n === 1 ? 'elektron' : n < 5 ? 'elektrony' : 'elektronů';
}
