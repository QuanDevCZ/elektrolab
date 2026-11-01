// Relativita a absolutismus — povídání z hodiny (není v sešitě). Čistý modul, testuje se v Node.
//
// Relativní údaj je vždy vůči něčemu. Astronomové změřili vzdálenost Země–Slunce a zvolili ji
// za jednotku: 1 AU (astronomická jednotka) ≐ 150 000 000 km. Vzdálenosti ostatních planet
// se pak udávají vůči ní — „kolikrát dál nebo blíž než Země“.

// 1 AU v kilometrech, zaokrouhleně tak, jak to řekl učitel (přesněji 149 597 871 km).
export const AU_KM = 150_000_000;

// Střední vzdálenost od Slunce v AU, zaokrouhleno na dvě desetinná místa.
// size = poloměr kuličky ve scéně (jen pro názornost, velikosti planet nejsou v měřítku)
export const PLANETS = [
  { id: 'merkur', name: 'Merkur', au: 0.39, color: 0x9a948a, size: 0.05 },
  { id: 'venuse', name: 'Venuše', au: 0.72, color: 0xe8c27a, size: 0.075 },
  { id: 'zeme', name: 'Země', au: 1, color: 0x3f8fe0, size: 0.08 },
  { id: 'mars', name: 'Mars', au: 1.52, color: 0xd0623a, size: 0.065 },
  { id: 'jupiter', name: 'Jupiter', au: 5.2, color: 0xd8b48a, size: 0.16 },
  { id: 'saturn', name: 'Saturn', au: 9.54, color: 0xe3cf94, size: 0.14, ring: true },
  { id: 'uran', name: 'Uran', au: 19.19, color: 0x8fd3dc, size: 0.11 },
  { id: 'neptun', name: 'Neptun', au: 30.07, color: 0x4a6fe0, size: 0.11 },
];

// Vnitřní planety (Merkur–Mars) se dají ukázat v jiném měřítku než celá sluneční soustava:
// Neptun je 30 AU daleko, v měřítku vnitřních planet by byl desítky metrů za stolem.
export const INNER_MAX_AU = 2;
export const scaleFor = (planet) => (planet.au <= INNER_MAX_AU ? 'inner' : 'outer');

export function planetById(id) {
  return PLANETS.find((p) => p.id === id) || null;
}

// relativní údaj → absolutní: vzdálenost v km = údaj v AU · 150 000 000 km
export const auToKm = (au) => Math.round(au * AU_KM);
// absolutní údaj → relativní: údaj v AU = vzdálenost v km / 150 000 000 km
export const kmToAu = (km) => km / AU_KM;

// Velké číslo s mezerami po tisících, jak se píše v sešitě: 108 000 000
export function grouped(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Údaj o planetě v dané jednotce: 'au' (relativní) nebo 'km' (absolutní)
export function distanceText(planet, unit) {
  if (unit === 'km') return `${grouped(auToKm(planet.au))} km`;
  return `${String(planet.au).replace('.', ',')} AU`;
}

// Stavová věta pro průvodce
export function relativeSentence(planet, unit) {
  if (planet.id === 'zeme') {
    return unit === 'km'
      ? 'Země je od Slunce asi 150 000 000 km — právě tuto vzdálenost vědci zvolili za jednotku 1 AU.'
      : 'Země je od Slunce přesně 1 AU — to je vztažná jednotka, se kterou všechno porovnáváme.';
  }
  const more = planet.au > 1;
  const ratio = String(planet.au).replace('.', ',');
  if (unit === 'km') {
    return `${planet.name} je od Slunce asi ${grouped(auToKm(planet.au))} km — absolutní údaj v kilometrech.`;
  }
  return `${planet.name} je od Slunce ${ratio} AU — to je ${ratio}krát vzdálenost Země–Slunce, tedy ${more ? 'dál' : 'blíž'} než Země.`;
}
