// Dvě nabité desky — homogenní pole (lekce 04: „Pole v prostoru mezi deskami je všude stejné
// a nazývá se homogenní.“). Čistý modul, testuje se v Node.
//
// Deska je čtverec postavený kolmo na stůl (v rovině y–z) v místě x. Pole desky počítáme stejně
// jako pole bodových nábojů: desku rozdělíme na mřížku malých nábojů a jejich pole sečteme
// (skládání polí). Mezi deskami se příspěvky skládají tak, že pole vyjde skoro všude stejné.

// Kladná deska vlevo, záporná vpravo — jako na obrázcích v lekcích 05 a 06.
// size = velikost stolu S; Q = náboj jedné desky (scénická hodnota, v hodině nezazněla).
export function makePlates(size, Q = 5e-6) {
  const d = 0.25 * size;     // vzdálenost desek
  const half = 0.25 * size;  // polovina strany desky (desky jsou širší než mezera → pole uvnitř je homogenní)
  return [
    { x: -d / 2, Q: +Math.abs(Q), half },
    { x: +d / 2, Q: -Math.abs(Q), half },
  ];
}

// Deska → mřížka n × n bodových nábojů (každý nese Q/n²).
export function plateSources(plates, n = 11) {
  const out = [];
  plates.forEach((pl, pi) => {
    const q = pl.Q / (n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        out.push({
          id: `plate${pi}-${i}-${j}`,
          plate: pi,
          Q: q,
          x: pl.x,
          y: -pl.half + (2 * pl.half * i) / (n - 1),
          z: -pl.half + (2 * pl.half * j) / (n - 1),
        });
      }
    }
  });
  return out;
}

// Protne úsečka a→b některou desku? Vrací index desky, nebo −1.
export function crossedPlate(a, b, plates) {
  for (let i = 0; i < plates.length; i++) {
    const pl = plates[i];
    const da = a.x - pl.x, db = b.x - pl.x;
    if (da * db > 0 || da === db) continue;
    const t = da / (da - db);
    const y = a.y + (b.y - a.y) * t, z = a.z + (b.z - a.z) * t;
    if (Math.abs(y) <= pl.half && Math.abs(z) <= pl.half) return i;
  }
  return -1;
}

// Leží bod v prostřední části prostoru mezi deskami (do `margin` × polovina desky od středu)?
// Tam se intenzita liší jen o pár procent; blíž k okrajům desek pole slábne (okrajový jev).
export function betweenPlates(p, plates, margin = 0.5) {
  if (plates.length < 2) return false;
  const [a, b] = plates;
  const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x);
  const h = a.half * margin;
  return p.x > lo && p.x < hi && Math.abs(p.y) < h && Math.abs(p.z) < h;
}
