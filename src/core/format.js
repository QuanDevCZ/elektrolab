// České formátování čísel jako v sešitě: desetinná čárka, zápis „3,6·10⁶“ (tečka, ne ×),
// jednotky typu V·m⁻¹. Čistý modul, testuje se v Node.

const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };

export function superscript(n) {
  return String(n).split('').map((ch) => SUP[ch] ?? ch).join('');
}

export const MINUS = '−'; // typografické minus (U+2212), ne spojovník

function comma(s) {
  return s.replace('.', ',').replace(/^-/, MINUS);
}

// Zaokrouhlí na `sig` platných číslic a odstraní koncové nuly za čárkou.
function trimmed(x, decimals) {
  let s = x.toFixed(Math.max(0, decimals));
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

// Rozklad na mantisu a exponent: 0,00486 → { m: 4.86, e: -3 } (zaokrouhleno na sig číslic).
export function toSci(x, sig = 3) {
  if (x === 0) return { m: 0, e: 0 };
  let e = Math.floor(Math.log10(Math.abs(x)));
  let m = Number((x / 10 ** e).toFixed(sig - 1));
  if (Math.abs(m) >= 10) { m /= 10; e += 1; } // 9,996 → 10,0 → 1,00·10¹
  return { m, e };
}

// Číslo „jak v sešitě“:
//  • běžná čísla (0,01 ≤ |x| < 10 000) normálně: 0,117 · 997 · 0,034
//  • velmi malá / velká v tvaru mantisa·10ⁿ: 4,86·10⁻³ · 3,6·10⁶
export function formatNumber(x, sig = 3) {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= 0.01 && ax < 10000) {
    const e = Math.floor(Math.log10(ax));
    const decimals = sig - 1 - e;
    const rounded = Number(x.toFixed(Math.max(0, decimals)));
    // zaokrouhlení může přeskočit do vyššího řádu (9 999,6 → 10 000)
    if (Math.abs(rounded) >= 10000) return formatNumber(rounded, sig);
    return comma(trimmed(rounded, decimals));
  }
  const { m, e } = toSci(x, sig);
  // 0,009996 se zaokrouhlí na 0,0100 — to už patří mezi „běžná“ čísla
  if (Math.abs(m * 10 ** e) >= 0.01 && Math.abs(m * 10 ** e) < 10000) return formatNumber(m * 10 ** e, sig);
  return `${comma(trimmed(m, sig - 1))}·10${superscript(e)}`;
}

export function formatQuantity(x, unit, sig = 3) {
  return `${formatNumber(x, sig)} ${unit}`;
}

// Náboj s předponou, jak se píše v hodině: 150 nC, 2 µC, 0,01 C, 1,602·10⁻¹⁹ C.
export function chargeUnit(Q) {
  const a = Math.abs(Q);
  if (a >= 1e-9 && a < 1e-6 - 1e-15) return { unit: 'nC', factor: 1e-9, exp: -9 };
  if (a >= 1e-6 && a < 1e-3 - 1e-12) return { unit: 'µC', factor: 1e-6, exp: -6 };
  return { unit: 'C', factor: 1, exp: 0 };
}

export function formatCharge(Q, sig = 4) {
  const { unit, factor } = chargeUnit(Q);
  const sign = Q > 0 ? '+' : '';
  return `${sign}${formatNumber(Q / factor, sig)} ${unit}`;
}

// Číslo pro „dosazení do vzorce“ — předpona nC/µC se přepíše na mocninu deseti,
// přesně jak se to dělá v sešitě: 150 nC → „150·10⁻⁹“, −20 nC → „(−20·10⁻⁹)“.
export function formatSubstCharge(Q, sig = 4) {
  const { factor, exp } = chargeUnit(Q);
  let s;
  if (exp === 0) s = formatNumber(Q, sig);
  else s = `${formatNumber(Q / factor, sig)}·10${superscript(exp)}`;
  return Q < 0 ? `(${s})` : s;
}

export const UNITS = {
  force: 'N',
  field: 'V·m⁻¹',
  fieldAlt: 'N·C⁻¹',
  k: 'N·m²·C⁻²',
  distance: 'm',
};
