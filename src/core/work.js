// Práce v homogenním elektrickém poli mezi dvěma nabitými deskami (lekce 05 a 06).
// Čistý modul (žádné DOM, žádné three.js), testuje se v Node.
//
// Kladná deska je vlevo, záporná vpravo (jako na obrázcích v lekci 05), takže siločáry
// a intenzita E míří ve směru +x. Velikost E je mezi deskami všude stejná (homogenní pole).
// Bod = { x, z } v metrech na stole; E ve V·m⁻¹; Q v coulombech (se znaménkem).

// Síla pole na náboj: F = Q·E (lekce 04, „vždy platí“). Kladné číslo = síla míří ve směru +x
// (po siločarách), záporné = proti siločarám (záporný náboj, 05 Př. 7).
export function forceOn(Q, E) {
  return Q * E;
}

// Napětí U_AB = práce, kterou pole vykoná při přemístění náboje 1 C z A do B (lekce 05).
// V homogenním poli při posunutí po siločarách platí U = E·d. Když se pohybujeme šikmo,
// práci koná jen ta část posunutí, která je rovnoběžná se siločarami, tedy d = x_B − x_A.
export function voltage(E, A, B) {
  return E * (B.x - A.x);
}

// Práce na jednom rovném úseku: W = F·s·cos α (lekce 05),
// α = úhel mezi posunutím a silou. Úsek po siločarách: α = 0°, cos α = 1;
// proti siločarám: α = 180°, cos α = −1; kolmo: α = 90°, cos α = 0 → práce se nekoná.
export function segmentWork(a, b, Q, E) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const s = Math.hypot(dx, dz);
  const F = Math.abs(forceOn(Q, E));
  if (s === 0 || F === 0) return { a, b, s, alpha: 90, W: 0, kind: 'perpendicular' };
  // síla míří po +x pro kladný náboj a po −x pro záporný
  const cos = (Math.sign(Q) * dx) / s;
  const alpha = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
  const kind = Math.abs(dx) < 1e-12 ? 'perpendicular' : Math.abs(dz) < 1e-12 ? 'parallel' : 'oblique';
  // F·s·cos α je totéž jako Q·E·dx — jen počítané „sešitovým“ vzorcem
  return { a, b, s, alpha, W: F * s * cos, kind };
}

// Práce podél lomené čáry (cesty) = součet prací na jednotlivých úsecích.
export function pathWork(points, Q, E) {
  const segments = [];
  let W = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = segmentWork(points[i - 1], points[i], Q, E);
    segments.push(seg);
    W += seg.W;
  }
  return { W, segments, length: segments.reduce((sum, s) => sum + s.s, 0) };
}

// Cesty z A do B jako na obrázku v lekci 06:
//  • 'primo'  — rovně (šikmý úsek, pokud A a B neleží na stejné siločáře)
//  • 'schody' — střídavě po siločarách (červené úseky) a kolmo na ně (zelené úseky)
//  • 'oklika' — kolmo ke kraji desek, podél kraje a zpátky
// zLimit = jak daleko od středu stolu smí cesta vést (zůstává mezi deskami).
export const PATHS = ['primo', 'schody', 'oklika'];

export function makePath(A, B, kind, zLimit) {
  const a = { x: A.x, z: A.z }, b = { x: B.x, z: B.z };
  if (kind === 'schody') {
    const n = 3, pts = [a];
    for (let i = 1; i <= n; i++) {
      const x = a.x + ((b.x - a.x) * i) / n;
      const z = a.z + ((b.z - a.z) * i) / n;
      const last = pts[pts.length - 1];
      pts.push({ x, z: last.z });   // krok po siločáře
      pts.push({ x, z });           // krok kolmo na siločáry
    }
    return dedupe(pts);
  }
  if (kind === 'oklika') {
    // na opačnou stranu, než leží A a B, ať je oklika opravdu vidět
    const side = (a.z + b.z) / 2 > 0 ? -1 : 1;
    const zEdge = side * zLimit;
    return dedupe([a, { x: a.x, z: zEdge }, { x: b.x, z: zEdge }, b]);
  }
  return dedupe([a, b]);
}

// stejné body za sebou (např. A a B na jedné siločáře u schodů) by dávaly úseky nulové délky
function dedupe(pts) {
  const out = [pts[0]];
  for (const p of pts.slice(1)) {
    const q = out[out.length - 1];
    if (Math.hypot(p.x - q.x, p.z - q.z) > 1e-12) out.push(p);
  }
  return out;
}

// Bod na cestě po uražení podílu t (0 … 1) celkové délky — pro animaci přenášeného náboje.
export function pointAt(points, t) {
  const total = pathLength(points);
  let left = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const s = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= s || i === points.length - 1) {
      const f = s > 0 ? Math.min(1, left / s) : 1;
      return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f };
    }
    left -= s;
  }
  return { ...points[points.length - 1] };
}

export function pathLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i++) L += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  return L;
}

// Práce vykonaná od A po bod na cestě (graf Obr. 2: rovné úseky = kolmo na siločáry).
// Vrací n+1 vzorků { s [m uražené dráhy], W [J] }.
export function workProfile(points, Q, E, n = 120) {
  const total = pathLength(points);
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = pointAt(points, i / n);
    out.push({ s: (total * i) / n, W: Q * E * (p.x - points[0].x) });
  }
  return out;
}
