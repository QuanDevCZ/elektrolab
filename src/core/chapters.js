// Průvodce — kapitoly v pořadí lekcí 02 → 06. Čistý modul (jen data), testuje ho
// tests/chapters.test.js. Každá kapitola má stejnou stavbu (pod vzorcem je ovládání scény):
//   1. Co to je      — pár vět ze sešitu (zápisky z hodiny + lekce)
//   2. Vzorec        — klíč vzorce, story.js ho vykreslí (a pod něj dosadí čísla ze scény)
//   3. Příklad       — zadání ze sešitu; řešení se ukáže až po kliknutí
//
// Stránka:
//   id        jméno stránky (i scény, kterou main.js postaví)
//   chapter   číslo kapitoly 1–5 (kapitola 1 má dvě stránky: náboj a Coulombův zákon)
//   lesson    lekce, ze které text pochází
//   title     nadpis
//   lead      true = podle této stránky se jmenuje kapitola v tečkách postupu
//   theory    „Co to je“ — každá položka je jedna věta
//   note      drobná poznámka pod teorií (nepovinná)
//   formula   klíč vzorce pro story.js, nebo null
//   try       co si vyzkoušet ve scéně
//   controls  ovládací prvky (nejvýš dva)
//   examples  příklady ze sešitu: [{ lesson, title, task, given, steps, answer, scene, action }]
//             scene  = id příkladu z core/examples.js, který se dá postavit ve scéně
//             action = další tlačítko u příkladu ('touch' = dotek kuliček), nepovinné
//   display   co je ve 3D scéně vidět

export const CONTROL_IDS = ['rub', 'distance', 'sign', 'medium', 'fieldType', 'workPath', 'workSign', 'unit', 'planet'];

export const PAGES = [
  {
    id: 'naboj',
    chapter: 1,
    lesson: '02 Coulombův zákon',
    title: 'Elektrický náboj',
    theory: [
      'Tělesa se dají nabít třením — v hodině jsme třeli ebonitovou tyč hadrem.',
      'Při tření přejdou elektrony z hadru na tyč: tyč se nabije záporně, hadr kladně.',
      'Náboj nelze vyrobit ani zničit (zákon zachování elektrického náboje): celkový náboj tyče a hadru se nezmění.',
      'Náboje stejného znaménka se odpuzují, náboje opačného znaménka se přitahují.',
    ],
    note: 'Nejmenší možný náboj je elementární náboj e = 1,602·10⁻¹⁹ C — náboj elektronu (−e) a protonu (+e).',
    formula: null,
    try: 'Zkus: několikrát zatři tyčí o hadr.',
    controls: ['rub'],
    examples: [],
    display: { forces: false, lines: 'off', vectors: 'off', probe: false },
  },
  {
    id: 'coulomb',
    chapter: 1,
    lesson: '02 Coulombův zákon',
    title: 'Coulombův zákon',
    lead: true,
    theory: [
      'Dva bodové náboje na sebe působí elektrickou silou Fₑ.',
      'Náboje stejného znaménka se odpuzují, náboje opačného znaménka se přitahují.',
      'Síla roste s velikostí nábojů a klesá s druhou mocninou vzdálenosti: poloviční vzdálenost r znamená čtyřikrát větší sílu.',
      'Konstanta k = 1/(4·π·ε), kde ε je permitivita prostředí — závisí na tom, v jakém prostředí náboje jsou.',
      'Hodnota k = 9·10⁹ N·m²·C⁻² platí pro vakuum a přibližně také pro vzduch (Newtonův gravitační zákon na prostředí nezávisí).',
    ],
    formula: 'coulomb',
    try: 'Zkus: zmenši vzdálenost na polovinu, nebo otoč znaménko náboje Q₂.',
    controls: ['distance', 'sign'],
    examples: [{
      lesson: '02 Coulombův zákon', title: 'Př. 1',
      task: 'Urči sílu, kterou by se odpuzovaly 2 bodové náboje o velikosti 0,01 C umístěné 0,5 m od sebe.',
      given: 'Q₁ = Q₂ = 0,01 C, r = 0,5 m, Fₑ = ?',
      steps: ['Fₑ = k · Q₁·Q₂ / r²', 'Fₑ = 9·10⁹ · 0,01·0,01 / 0,5² N', 'Fₑ = 3 600 000 N'],
      answer: 'Dva bodové náboje o velikosti 0,01 C umístěné 0,5 m od sebe se odpuzují silou 3 600 000 N — ' +
        'takovou silou je na Zemi přitahován předmět o hmotnosti 360 tun.',
      scene: '02-1',
    }, {
      lesson: '02 Coulombův zákon', title: 'Př. 3',
      task: 'Dvě stejné ocelové kuličky nabité stejně velkým souhlasným nábojem, vzdálené 1 metr od sebe, ' +
        'se odpuzují silou F = 1000 N. Urči náboj kuliček.',
      given: 'r = 1 m, Fₑ = 1000 N, Q₁ = Q₂ = Q, Q = ?',
      steps: [
        'Fₑ = k · Q₁·Q₂ / r² = k · Q² / r²   (náboje jsou stejné)',
        'Q² = Fₑ·r² / k  ⇒  Q = √(Fₑ·r² / k)',
        'Q = √(1000 · 1² / 9·10⁹) C',
        'Q = 3,3·10⁻⁴ C',
      ],
      answer: 'Každá kulička má náboj 3,3·10⁻⁴ C. Tady se vzorec používá obráceně: známe sílu a hledáme náboj.',
      scene: '02-3',
    }, {
      lesson: '03 Permitivita prostředí', title: 'Př. 7',
      task: 'Dvě malé kuličky nesoucí náboje Q₁ = 80 nC a Q₂ = −20 nC jsou umístěny ve vakuu 10 cm od sebe. ' +
        'Urči: a) jakou silou se budou přitahovat, b) jak na sebe budou působit, když je necháme, aby se dotkly, ' +
        'a pak je vrátíme do původní polohy.',
      given: 'Q₁ = 80 nC, Q₂ = −20 nC, r = 10 cm = 0,1 m, k = 9·10⁹ N·m²·C⁻², Fₑ = ?',
      steps: [
        'a)  Fₑ = k · Q₁·Q₂ / r²',
        'Fₑ = 9·10⁹ · 80·10⁻⁹ · 20·10⁻⁹ / 0,1² N = 1,44·10⁻³ N',
        'b)  po doteku: 80 nC + (−20 nC) = 60 nC  →  na 1 kuličku připadá 30 nC',
        'Fₑ = 9·10⁹ · 30·10⁻⁹ · 30·10⁻⁹ / 0,1² N = 8,1·10⁻⁴ N',
      ],
      answer: 'a) Kuličky se budou přitahovat silou 1,44·10⁻³ N. b) Při doteku se část kladného náboje vyruší se ' +
        'záporným, každá kulička má 30 nC a kuličky se budou odpuzovat silou 8,1·10⁻⁴ N.',
      scene: '03-7',
      action: 'touch',
    }],
    display: { forces: true, lines: 'off', vectors: 'off', probe: false },
  },
  {
    // Povídání z hodiny při Coulombově zákonu — v sešitě to není, proto je to tak označené.
    id: 'relativita',
    chapter: 1,
    lesson: 'z hodiny (mimo sešit)',
    title: 'Relativita a absolutismus',
    theory: [
      'Relativní údaj je vždy vůči něčemu — porovnáváme ho se zvolenou vztažnou jednotkou.',
      'Absolutní údaj je vyjádřený přímo v jednotkách, například v kilometrech.',
      'Vědci změřili vzdálenost Země–Slunce, asi 150 000 000 km, a zvolili ji za jednotku 1 AU (astronomická jednotka).',
      'Vzdálenosti ostatních planet se pak udávají vůči ní: Venuše je asi 0,72 AU od Slunce, tedy blíž než Země.',
      'Stejně je to v elektrostatice: relativní permitivita εᵣ říká, kolikrát je permitivita větší než ve vakuu, a potenciál měříme vůči Zemi.',
    ],
    note: 'Probírali jsme v hodině u Coulombova zákona, v sešitě to není. Vzdálenosti planet jsou zaokrouhlené.',
    formula: 'relativita',
    try: 'Zkus: přepni AU a km a vyber planetu — u vnějších planet se změní měřítko, 1 AU je pak kratší úsečka.',
    controls: ['unit', 'planet'],
    examples: [{
      lesson: 'z hodiny', title: 'Venuše',
      task: 'Venuše je od Slunce asi 0,72 AU. Jak daleko je to v kilometrech?',
      given: 'vzdálenost = 0,72 AU, 1 AU ≐ 150 000 000 km, vzdálenost v km = ?',
      steps: [
        'vzdálenost v km = údaj v AU · 150 000 000 km',
        'vzdálenost = 0,72 · 150 000 000 km',
        'vzdálenost ≐ 108 000 000 km',
      ],
      answer: 'Venuše je od Slunce asi 108 000 000 km. Relativní údaj 0,72 AU říká totéž: je to 0,72krát vzdálenost Země–Slunce.',
      scene: null,
    }],
    display: { forces: false, lines: 'off', vectors: 'off', probe: false },
  },
  {
    id: 'permitivita',
    chapter: 2,
    lesson: '03 Permitivita prostředí',
    title: 'Permitivita prostředí',
    theory: [
      'Velikost elektrické síly závisí na prostředí, ve kterém náboje jsou.',
      'Vliv prostředí popisuje permitivita ε = ε₀·εᵣ: ε₀ = 8,85·10⁻¹² C²·N⁻¹·m⁻² je permitivita vakua, εᵣ je relativní permitivita látky.',
      'Čím větší εᵣ, tím menší síla: v ethanolu (εᵣ = 24) je síla 24krát menší než ve vakuu.',
    ],
    formula: 'permitivita',
    try: 'Zkus: přepni vakuum na vodu a sleduj šipky sil.',
    controls: ['medium'],
    examples: [{
      lesson: '03 Permitivita prostředí', title: 'Př. 6',
      task: 'Urči sílu, kterou se v ethanolu odpuzují bodové náboje o velikostech Q₁ = 150 nC a Q₂ = 100 nC, jejichž vzdálenost je 3,4 cm.',
      given: 'Q₁ = 150 nC, Q₂ = 100 nC, εᵣ = 24, r = 3,4 cm = 0,034 m, Fₑ = ?',
      steps: [
        'Fₑ = 1/(4·π·ε₀·εᵣ) · Q₁·Q₂ / r²',
        'Fₑ = 1/(4·π·8,85·10⁻¹²·24) · 150·10⁻⁹·100·10⁻⁹ / 0,034² N',
        'Fₑ = 4,9·10⁻³ N',
      ],
      answer: 'Bodové náboje se v ethanolu odpuzují silou 4,9·10⁻³ N — to je 24krát menší síla než za stejných podmínek ve vakuu.',
      scene: '03-6',
    }],
    display: { forces: true, lines: 'off', vectors: 'off', probe: false },
  },
  {
    id: 'pole',
    chapter: 3,
    lesson: '04 Elektrické pole',
    title: 'Elektrické pole',
    theory: [
      'Náboj svou existencí změní prostor kolem sebe — vytvoří elektrické pole a elektrické síly jsou jeho důsledkem.',
      'Pole zobrazujeme siločárami: siločára je čára, po které by se pohyboval jednotkový kladný náboj.',
      'Jeden náboj: siločáry vycházejí z náboje a jdou do nekonečna (jako paprsky Slunce) — radiální pole.',
      'Dva opačné náboje tvoří pole dipólu; mezi dvěma nabitými deskami jsou siločáry rovnoběžné a pole je všude stejné — homogenní.',
    ],
    formula: null,
    try: 'Zkus: přepni radiální pole, dipól a dvě nabité desky.',
    controls: ['fieldType'],
    examples: [{
      lesson: '04 Elektrické pole', title: 'Př. 1a',
      task: 'Ve vakuu do vzdálenosti 2 m od náboje Q₀ = 10⁻³ C umístíme náboj Q₁ = 1 C. Urči sílu, která na něj bude působit.',
      given: 'Q₀ = 10⁻³ C, Q₁ = 1 C, r = 2 m, Fₑ = ?',
      steps: ['Fₑ = 1/(4·π·ε₀) · Q₁·Q₀ / r²', 'Fₑ = 1/(4·π·8,85·10⁻¹²) · 1·10⁻³ / 2² N', 'Fₑ = 2 250 000 N'],
      answer: 'Na náboj Q₁ působí síla 2 250 000 N. Když Q₁ vyměníme za jiný náboj, síla se změní, ale část ' +
        '1/(4·π·ε₀)·Q₀/r² zůstane stejná — ta popisuje pole, které kolem sebe vytvořil náboj Q₀.',
      scene: '04-1',
    }],
    display: { forces: false, lines: 'space', vectors: 'off', probe: false },
  },
  {
    id: 'intenzita',
    chapter: 4,
    lesson: '04 Elektrické pole',
    title: 'Intenzita elektrického pole',
    theory: [
      'Intenzita elektrického pole E říká, jaká síla by v daném místě působila na jednotkový kladný náboj (1 C).',
      'Jednotka intenzity je V·m⁻¹ = N·C⁻¹.',
      'Vždy platí F = Q·E: sílu na náboj určíme jako násobek jeho velikosti a intenzity v místě, kde se nachází.',
      'Pro pole bodového náboje: E = k·Q/r², takže dál od náboje je pole slabší.',
    ],
    formula: 'intenzita',
    try: 'Zkus: přetáhni bod P blíž k náboji a pak dál od něj.',
    controls: [],
    examples: [{
      lesson: '04 Elektrické pole', title: 'Př. 3',
      task: 'Urči intenzitu elektrického pole v místě, ve kterém na náboj 3·10⁻⁷ C působí síla 0,2 N.',
      given: 'Q = 3·10⁻⁷ C, F = 0,2 N, E = ?',
      steps: ['F = Q·E  ⇒  E = F / Q', 'E = 0,2 / (3·10⁻⁷) N·C⁻¹', 'E = 670 000 N·C⁻¹'],
      answer: 'Elektrické pole má v daném místě intenzitu 670 000 N·C⁻¹.',
      scene: null,
    }],
    display: { forces: false, lines: 'plane', vectors: 'plane', probe: true },
  },
  {
    id: 'prace',
    chapter: 5,
    lesson: '05 Práce v elektrickém poli · 06 Elektrický potenciál',
    title: 'Práce v elektrickém poli',
    theory: [
      'Když pole přemístí náboj, koná práci W = F·s·cos α, kde α je úhel mezi posunutím a silou.',
      'V homogenním poli mezi deskami je W = Q·E·d; součin E·d popisuje pole a nazývá se elektrické napětí U [V].',
      'Napětí U_AB říká, jakou práci pole vykoná při přemístění náboje 1 C z bodu A do bodu B: W = Q·U_AB.',
      'Práce nezávisí na cestě z A do B — síly elektrického pole jsou konzervativní.',
    ],
    formula: 'prace',
    // „Vysvětlení od začátku“ — rozklikávací výklad jednoduchými slovy (přání uživatele 2026-10-31)
    explainer: {
      sections: [
        { heading: '1. Co je práce', formula: 'W = F·s',
          text: 'Práci koná síla, když něčím pohne: síla krát dráha. Tlačíš krabici silou 10 N po dráze 2 m → 20 J. Tlačíš do zdi a nepohne se → práce je 0.' },
        { heading: '2. Proč cos α', formula: 'W = F·s·cos α',
          text: 'Práci koná jen ta část síly, která táhne ve směru pohybu. α = 0°: cos α = 1, celá práce. α = 90°: cos α = 0, žádná práce (neseš tašku po rovné chodbě). α = 180°: cos α = −1, síla brzdí a práce je záporná.' },
        { heading: '3. Práce v elektrickém poli', formula: 'F = Q·E  ⇒  W = Q·E·d',
          text: 'Mezi deskami tlačí pole na náboj silou F = Q·E. Když se náboj posune o d po siločarách, dosadíme do W = F·d.' },
        { heading: '4. Napětí', formula: 'U = E·d  ⇒  W = Q·U',
          text: 'Část E·d je stejná pro každý náboj, proto má vlastní jméno — napětí U ve voltech. Říká, kolik práce pole vykoná na 1 C. Pak už stačí násobit nábojem — jako cena za kus krát počet kusů.' },
        { heading: '5. Proč nezáleží na cestě', formula: null,
          text: 'Pole tlačí jen po siločarách. Kroky po siločarách (červené) práci konají, kroky do boku (zelené) ne. Sečte se jen posunutí po siločarách d — stejně jako výška kopce nezávisí na tom, jestli jdeš serpentinami.' },
      ],
      table: [
        ['sílu a dráhu po siločarách', 'W = F·s'],
        ['sílu, dráhu a úhel', 'W = F·s·cos α'],
        ['náboj, intenzitu a posunutí', 'W = Q·E·d'],
        ['napětí (baterie, zásuvka)', 'W = Q·U'],
        ['intenzitu a vzdálenost → napětí', 'U = E·d'],
      ],
      example: {
        heading: 'Příklad ze života: zásuvka (jak v hodině)',
        steps: ['U = 230 V, d = 0,02 m (vzdálenost dírek), E = ?', 'U = E·d  ⇒  E = U / d', 'E = 230 / 0,02 V·m⁻¹ = 11 500 V·m⁻¹'],
      },
      summary: 'Práce = síla krát posunutí ve směru síly. V poli je síla Q·E, takže W = Q·E·d, a protože E·d je napětí, platí W = Q·U.',
    },
    try: 'Zkus: vyber jinou cestu z A do B a porovnej práci W.',
    controls: ['workPath', 'workSign'],
    examples: [{
      lesson: '05 Práce v elektrickém poli', title: 'Př. 6a',
      task: 'Jakou práci vykoná elektrická síla v homogenním elektrickém poli o intenzitě 1000 V·m⁻¹ při přemístění ' +
        'kladného náboje 1 µC do vzdálenosti 10 cm ve směru elektrických siločar?',
      given: 'E = 1000 V·m⁻¹, Q = 1 µC = 10⁻⁶ C, s = 10 cm = 0,1 m, α = 0°, W = ?',
      steps: ['W = F·s·cos α = E·Q·s·cos α', 'W = 1000 · 10⁻⁶ · 0,1 · 1 J', 'W = 10⁻⁴ J'],
      answer: 'Pole vykoná práci 10⁻⁴ J. Proti směru siločar by vyšlo −10⁻⁴ J (cos 180° = −1), kolmo na siločáry 0 J (cos 90° = 0).',
      scene: '05-6a',
    }, {
      // jak jsme to počítali v hodině (učebnice má 1,8 cm → 12 800 V·m⁻¹)
      lesson: '05 Práce v elektrickém poli', title: 'Př. 8 — zásuvka',
      task: 'Urči intenzitu elektrického pole mezi dírkami domácí zásuvky. Vzdálenost dírek jsme naměřili 0,02 m, ' +
        'napětí zásuvky je 230 V. Předpokládej, že pole je homogenní.',
      given: 'U = 230 V, d = 0,02 m, E = ?',
      steps: ['U = E·d  ⇒  E = U / d', 'E = 230 / 0,02 V·m⁻¹', 'E = 11 500 V·m⁻¹'],
      answer: 'Mezi dírkami zásuvky má pole intenzitu asi 11 500 V·m⁻¹. (Učebnice počítá se vzdáleností 1,8 cm a vyjde jí 12 800 V·m⁻¹.)',
      scene: null,
    }],
    display: { forces: false, lines: 'plane', vectors: 'off', probe: false },
  },
];

export const CHAPTER_COUNT = Math.max(...PAGES.map((p) => p.chapter));

export function pageById(id) {
  return PAGES.find((p) => p.id === id) || null;
}

// Názvy kapitol pro tečky postupu: stránka s `lead: true` (u kapitoly 1 Coulombův zákon),
// jinak první stránka kapitoly.
export function chapterTitles() {
  const out = [];
  for (let n = 1; n <= CHAPTER_COUNT; n++) {
    const pages = PAGES.filter((p) => p.chapter === n);
    const lead = pages.find((p) => p.lead) || pages[0];
    out.push({ n, title: lead.title, first: pages[0].id });
  }
  return out;
}
