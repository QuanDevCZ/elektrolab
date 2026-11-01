// Relativita a absolutismus ve scéně: Slunce a planety na jedné přímce s drahami, vzadu
// vztažná jednotka 1 AU (úsečka Slunce–Země) a vpředu úsečka k vybrané planetě — délky se dají
// porovnat okem. Popisky se přepínají mezi relativním (AU) a absolutním (km) údajem.
//
// Dvě měřítka: vnitřní planety (Merkur–Mars) a celá sluneční soustava (až Neptun, 30 AU).
// Měřítko se řídí vybranou planetou. Úsečka 1 AU se v celé soustavě zkrátí, ale pořád znamená 1 AU.
// Data a převody jsou v core/relativita.js.

import * as THREE from 'three';
import { textSprite } from './charges.js';
import { PLANETS, planetById, distanceText, scaleFor } from './core/relativita.js';

const SUN_X = -1.75;      // Slunce u levého okraje stolu 4 m
const Y = 0.12;           // výška středů nad stolem
const SCALES = {
  inner: { mPerAu: 2.1, sun: 0.22, shrink: 1 },     // Mars 1,52 AU se ještě vejde
  outer: { mPerAu: 0.115, sun: 0.12, shrink: 0.6 },  // Neptun 30 AU se vejde, vnitřní planety splynou u Slunce
};

export function createRelativitaLayer(scene) {
  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  let scale = SCALES.inner;
  const xOf = (au) => SUN_X + au * scale.mPerAu;

  // Slunce
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 24),
    new THREE.MeshStandardMaterial({ color: 0xffc34d, emissive: 0xff9d1c, emissiveIntensity: 1.1, roughness: 0.6 }),
  );
  root.add(sun);
  const sunLabel = label('Slunce', 0.17);
  root.add(sunLabel);

  // dráhy (kružnice o poloměru 1, zvětšené na vzdálenost planety) a planety
  const planets = new Map();
  const circle = [];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    circle.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
  }
  const circleGeo = new THREE.BufferGeometry().setFromPoints(circle);
  for (const p of PLANETS) {
    const orbit = new THREE.Line(circleGeo, new THREE.LineBasicMaterial({ color: 0x4a5160, transparent: true, opacity: 0.7 }));
    root.add(orbit);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 20),
      new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55, emissive: p.color, emissiveIntensity: 0.25 }),
    );
    mesh.userData.planet = p.id;
    root.add(mesh);
    let ring = null;
    if (p.ring) {
      ring = new THREE.Mesh(
        new THREE.RingGeometry(1.4, 2.2, 48),
        new THREE.MeshBasicMaterial({ color: 0xcdb98a, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
      );
      ring.rotation.x = -Math.PI / 2 + 0.35;
      root.add(ring);
    }
    planets.set(p.id, { p, mesh, orbit, ring, label: null, key: '' });
  }

  // kroužek pod vybranou planetou
  const selRing = new THREE.Mesh(
    new THREE.RingGeometry(0.13, 0.16, 48),
    new THREE.MeshBasicMaterial({ color: 0xe0a82e, side: THREE.DoubleSide }),
  );
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.01;
  root.add(selRing);

  // úsečky se staví znovu při změně jednotky, planety nebo měřítka
  let unitBar = null, unitLabel = null, pickBar = null, pickLabel = null, key = '';

  function sync({ unit, planet }) {
    const sel = planetById(planet);
    const scaleName = scaleFor(sel);
    scale = SCALES[scaleName];

    sun.scale.setScalar(scale.sun);
    sun.position.set(SUN_X, Y + 0.1 * scale.shrink, 0);
    // v celé soustavě je hned vedle Slunce Jupiter — popisek Slunce posuneme dál dopředu
    sunLabel.position.set(SUN_X, 0.03, scaleName === 'outer' ? 0.66 : 0.42);

    PLANETS.forEach((p, i) => {
      const it = planets.get(p.id);
      const x = xOf(p.au);
      const onBench = x <= 1.9;                        // za okrajem stolu planety nekreslíme
      // v celé soustavě vnitřní planety splývají se Sluncem — popisek mají jen vnější planety a vybraná
      const crowded = scaleName === 'outer' && p.au <= 2 && p.id !== sel.id;
      it.mesh.visible = it.orbit.visible = onBench;
      it.mesh.scale.setScalar(p.size * scale.shrink);
      it.mesh.position.set(x, Y, 0);
      it.orbit.scale.setScalar(p.au * scale.mPerAu);
      it.orbit.position.set(SUN_X, 0.005, 0);
      if (it.ring) {
        it.ring.visible = onBench;
        it.ring.scale.setScalar(p.size * scale.shrink);
        it.ring.position.copy(it.mesh.position);
      }
      const k = unit;
      if (it.key !== k) {
        if (it.label) { root.remove(it.label); it.label.material.map.dispose(); it.label.material.dispose(); }
        it.label = label(`${p.name} · ${distanceText(p, unit)}`, 0.12, '#1d1b17', '#f3eee3e6', unit === 'km' ? 660 : 420);
        root.add(it.label);
        it.key = k;
      }
      it.label.visible = onBench && !crowded;
      // popisky před planetami, sousední střídavě blíž a dál, ať se nepřekrývají
      it.label.position.set(x, 0.03, i % 2 ? 0.62 : 0.34);
    });
    selRing.position.x = xOf(sel.au);
    selRing.scale.setScalar(scale.shrink * (sel.size > 0.1 ? 1.6 : 1));

    const k2 = `${unit}|${planet}|${scaleName}`;
    if (k2 === key) return;
    key = k2;
    for (const o of [unitBar, unitLabel, pickBar, pickLabel]) {
      if (o) { root.remove(o); o.traverse((c) => { c.geometry?.dispose(); c.material?.map?.dispose(); c.material?.dispose(); }); }
    }
    // vztažná jednotka 1 AU: úsečka Slunce–Země (vzadu)
    unitBar = bar(xOf(0), xOf(1), -0.55, 0xf3eee3);
    unitLabel = label(scaleName === 'outer'
      ? '1 AU = Země–Slunce (v tomto měřítku kratší úsečka)'
      : '1 AU = Země–Slunce ≐ 150 000 000 km', 0.15, '#1d1b17', '#e0a82ee6', scaleName === 'outer' ? 1280 : 900);
    // v celé soustavě je úsečka 1 AU krátká — popisek posuneme doprava od ní
    unitLabel.position.set(scaleName === 'outer' ? xOf(1) + 1.1 : (xOf(0) + xOf(1)) / 2, 0.22, -0.55);
    // úsečka k vybrané planetě (vpředu)
    pickBar = bar(xOf(0), xOf(sel.au), 0.95, 0xe0a82e);
    const text = unit === 'km'
      ? `${sel.name}: ${distanceText(sel, 'km')} (absolutně)`
      : `${sel.name}: ${distanceText(sel, 'au')} = ${String(sel.au).replace('.', ',')}krát délka 1 AU`;
    pickLabel = label(text, 0.14, '#1d1b17', '#f3eee3e6', 900);
    pickLabel.position.set(Math.max(xOf(0) + 0.9, (xOf(0) + xOf(sel.au)) / 2), 0.03, 1.18);
    root.add(unitBar, unitLabel, pickBar, pickLabel);
  }

  // která planeta je pod paprskem (klik vybere planetu)
  function pick(raycaster) {
    const meshes = [...planets.values()].filter((it) => it.mesh.visible).map((it) => it.mesh);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object.userData.planet : null;
  }

  return { setVisible(v) { root.visible = v; }, sync, pick };
}

// vodorovná úsečka s koncovými zarážkami na stole (z = poloha před / za planetami)
function bar(x0, x1, z, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const len = Math.max(x1 - x0, 0.001);
  const line = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.03), mat);
  line.position.set(x0 + len / 2, 0.02, z);
  g.add(line);
  for (const x of [x0, x1]) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 0.18), mat);
    tick.position.set(x, 0.02, z);
    g.add(tick);
  }
  return g;
}

function label(text, h, color = '#1d1b17', bg = '#f3eee3e6', w = 360) {
  const s = textSprite(text, { font: '500 46px IBM Plex Sans, sans-serif', color, bg, w, h: 80 });
  s.scale.set(h * s.userData.aspect, h, 1);
  return s;
}
