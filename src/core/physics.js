// Fyzika bodových nábojů — čistý modul (žádné DOM, žádné three.js), testuje se v Node.
//
// Náboj = { id, Q, x, y, z }: Q v coulombech [C], poloha v metrech [m].
// Všechno je v jednotkách SI, aby čísla seděla s výpočty v sešitě.

import { kFor } from './constants.js';

// Nejmenší vzdálenost, se kterou počítáme. Coulombův zákon platí pro BODOVÉ náboje:
// pro r → 0 by síla rostla nade všechny meze (F ~ 1/r²) a počítač by dělil nulou.
// Pojistka 10⁻¹⁵ m (velikost jádra atomu) nevadí ani příkladu s elektrony 10⁻⁹ m od sebe.
// Na stole se kuličky stejně nesmí překrývat, takže r nikdy neklesne pod dva poloměry.
export const MIN_R = 1e-15;

export function distance(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ── Coulombův zákon ────────────────────────────────────────────────────────────
// Velikost síly mezi dvěma bodovými náboji (tak, jak ho píšeme v sešitě):
//
//        F_e = 1/(4·π·ε) · |Q₁·Q₂| / r²      (ε = ε₀·εᵣ)
//
// Znaménka nábojů rozhodují jen o směru: stejná znaménka → odpuzování,
// opačná znaménka → přitahování. Proto tady bereme absolutní hodnotu.
export function coulombForce(Q1, Q2, r, epsR = 1) {
  const rr = Math.max(r, MIN_R);
  return (kFor(epsR) * Math.abs(Q1 * Q2)) / (rr * rr);
}

// true = přitažlivá síla (opačná znaménka), false = odpudivá (stejná znaménka).
export function isAttractive(Q1, Q2) {
  return Q1 * Q2 < 0;
}

// ── Intenzita elektrického pole ────────────────────────────────────────────────
// Velikost intenzity pole jednoho bodového náboje (lekce 04):
//
//        E = k · |Q| / r²      [V·m⁻¹ = N·C⁻¹]
//
// Intenzita říká, jaká síla by v daném místě působila na jednotkový kladný náboj (1 C).
export function pointFieldMagnitude(Q, r, epsR = 1) {
  const rr = Math.max(r, MIN_R);
  return (kFor(epsR) * Math.abs(Q)) / (rr * rr);
}

// Vektor intenzity v bodě p od všech nábojů dohromady.
// Každý náboj přispívá vektorem velikosti k·|Q|/r², který míří OD kladného náboje
// a K zápornému náboji. Příspěvky se sčítají jako vektory (skládání sil).
// `skip` = id náboje, který vynecháme (náboj „necítí“ své vlastní pole).
export function fieldAt(p, charges, epsR = 1, skip = null) {
  const k = kFor(epsR);
  let ex = 0, ey = 0, ez = 0;
  for (const c of charges) {
    if (c.id === skip) continue;
    const dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
    const r2 = Math.max(dx * dx + dy * dy + dz * dz, MIN_R * MIN_R);
    const r = Math.sqrt(r2);
    // k·Q/r² je velikost (se znaménkem), dělení r udělá z (dx,dy,dz) jednotkový vektor.
    const s = (k * c.Q) / (r2 * r);
    ex += s * dx; ey += s * dy; ez += s * dz;
  }
  return { x: ex, y: ey, z: ez };
}

export function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

// Výsledná síla na náboj: F = Q · E  (vždy platí, lekce 04),
// kde E je intenzita, kterou v místě náboje vytvářejí VŠECHNY OSTATNÍ náboje.
export function netForceOn(charge, charges, epsR = 1) {
  const E = fieldAt(charge, charges, epsR, charge.id);
  return { x: charge.Q * E.x, y: charge.Q * E.y, z: charge.Q * E.z };
}

// ── Dotek dvou kuliček (lekce 03, Př. 7) ──────────────────────────────────────
// Když se dvě stejné vodivé kuličky dotknou, náboj se mezi nimi rozdělí napůl.
// Celkový náboj se nezmění — zákon zachování elektrického náboje:
//   (+80 nC) + (−20 nC) = +60 nC  →  každá kulička +30 nC.
export function touchShare(Q1, Q2) {
  const each = (Q1 + Q2) / 2;
  return [each, each];
}

// ── Souhrnné měření pro panel „Měření“ ────────────────────────────────────────
// Dvojice = náboje Q₁ a Q₂ (první dva přidané). Vybraný náboj = ten, na který uživatel ťukl.
// `extra` = další zdroje pole, které nejsou kuličky (drobné náboje nabitých desek).
export function measure(charges, epsR = 1, selectedId = null, extra = []) {
  const out = { pair: null, forces: [], selected: null };
  const sources = extra.length ? [...charges, ...extra] : charges;

  for (const c of charges) {
    const F = netForceOn(c, sources, epsR);
    out.forces.push({ id: c.id, F, magnitude: length(F) });
  }

  if (charges.length >= 2) {
    const [a, b] = charges;
    const r = distance(a, b);
    out.pair = {
      Q1: a.Q,
      Q2: b.Q,
      r,
      F: coulombForce(a.Q, b.Q, r, epsR),
      attractive: isAttractive(a.Q, b.Q),
    };
  }

  const sel = charges.find((c) => c.id === selectedId);
  if (sel) {
    const E = fieldAt(sel, sources, epsR, sel.id);
    const force = out.forces.find((f) => f.id === sel.id);
    out.selected = {
      id: sel.id,
      Q: sel.Q,
      E: length(E),             // intenzita od ostatních nábojů v místě vybraného náboje
      F: force.magnitude,       // výsledná síla = Q·E
    };
  }
  return out;
}
