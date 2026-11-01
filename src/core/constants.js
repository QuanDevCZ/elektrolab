// Fyzikální konstanty a tabulka prostředí — hodnoty PŘESNĚ podle sešitu / učebních textů.
// Nic sem nepřidávej, co nebylo v hodině (viz CLAUDE.md, „class-alignment rules“).

// Permitivita vakua ε₀ (lekce 03 „Permitivita prostředí“): 8,85·10⁻¹² C²·N⁻¹·m⁻²
export const EPS0 = 8.85e-12;

// Elementární náboj e (lekce 02): 1,602·10⁻¹⁹ C — náboj protonu (+e) a elektronu (−e).
export const E_CHARGE = 1.602e-19;

// Zaokrouhlená Coulombova konstanta ze sešitu: k = 9·10⁹ N·m²·C⁻².
// „Platí pro vakuum a přibližně také pro vzduch.“ Počítáme ale přesněji z ε₀ (viz kFor),
// tohle číslo se jen ukazuje u vzorce.
export const K_ROUNDED = 9e9;

// Relativní permitivita εᵣ — jen hodnoty z tabulky v lekci 03 (Př. 4).
// Látky, které mají v tabulce jen rozsah (papír 2–2,5, sklo 5–10), záměrně chybí,
// abychom si žádné číslo nevymýšleli.
// `loc` = 6. pád pro větu ve stavovém řádku („v ethanolu“, „ve vodě“).
export const MEDIA = [
  { id: 'vakuum',   name: 'vakuum',   loc: 've vakuu',    epsR: 1 },
  { id: 'vzduch',   name: 'vzduch',   loc: 've vzduchu',  epsR: 1.0006 },
  { id: 'petrolej', name: 'petrolej', loc: 'v petroleji', epsR: 2.0 },
  { id: 'porcelan', name: 'porcelán', loc: 'v porcelánu', epsR: 6 },
  { id: 'ethanol',  name: 'ethanol',  loc: 'v ethanolu',  epsR: 24 },
  { id: 'voda',     name: 'voda',     loc: 've vodě',     epsR: 81 },
];

export function mediumById(id) {
  return MEDIA.find((m) => m.id === id) || null;
}

// Konstanta úměrnosti v Coulombově zákoně pro dané prostředí (lekce 03):
//   k = 1 / (4·π·ε),   kde ε = ε₀·εᵣ  (permitivita prostředí)
// Ve vakuu (εᵣ = 1) vyjde k ≈ 8,99·10⁹ ≈ 9·10⁹ N·m²·C⁻² — to je to číslo ze sešitu.
// Čím větší εᵣ, tím menší k, a tím menší síla („prostředí zmenšuje velikost elektrické síly“).
export function kFor(epsR = 1) {
  return 1 / (4 * Math.PI * EPS0 * epsR);
}
