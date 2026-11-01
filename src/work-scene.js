// Práce v poli ve scéně: body A a B, cesta z A do B obarvená po úsecích (jako obrázek v lekci 06:
// červené úseky po siločarách konají práci, zelené kolmo na ně ne), ekvipotenciální čáry přes
// A a B a přenášený náboj se šipkou síly F = Q·E. Fyzika je v core/work.js.

import * as THREE from 'three';
import { textSprite } from './charges.js';

const KIND_COLOR = { parallel: 0xff5a4a, perpendicular: 0x3fd07f, oblique: 0xf0b429 };

export function createWorkLayer(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const pathGroup = new THREE.Group();
  const equiGroup = new THREE.Group();
  root.add(pathGroup, equiGroup);

  const markerGeo = new THREE.CylinderGeometry(1, 1, 0.25, 32);
  const markers = {};
  for (const name of ['A', 'B']) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(markerGeo, new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15 }));
    disc.userData.point = name;
    const label = textSprite(name, { font: "600 76px 'Source Serif 4', serif", color: '#1d1b17', bg: '#f3eee3e6', w: 112, h: 92 });
    g.add(disc, label);
    root.add(g);
    markers[name] = { g, disc, label };
  }

  // přenášený náboj
  const ballMats = {
    plus: new THREE.MeshStandardMaterial({ color: 0xd2392e, roughness: 0.35, emissive: 0xd2392e, emissiveIntensity: 0.25 }),
    minus: new THREE.MeshStandardMaterial({ color: 0x2f62e0, roughness: 0.35, emissive: 0x2f62e0, emissiveIntensity: 0.25 }),
  };
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), ballMats.plus);
  const signs = {
    plus: textSprite('+', { font: '600 120px IBM Plex Sans, sans-serif', w: 128, h: 128 }),
    minus: textSprite('−', { font: '600 120px IBM Plex Sans, sans-serif', w: 128, h: 128 }),
  };
  const force = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xd98a12);
  const carrier = new THREE.Group();
  carrier.add(ball, signs.plus, signs.minus, force);
  root.add(carrier);

  let pathKey = '';

  // tlustší „čára“ = tenký válec mezi dvěma body (WebGL čáry mají vždy 1 px)
  function rod(a, b, r, color, opacity = 1) {
    const A = new THREE.Vector3(a.x, 0, a.z), B = new THREE.Vector3(b.x, 0, b.z);
    const len = A.distanceTo(B);
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, 10),
      new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }),
    );
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    return m;
  }

  function clear(group) {
    for (const o of [...group.children]) { group.remove(o); o.geometry?.dispose(); o.material?.dispose(); }
  }

  // w = { A, B, Q, points, segments, carrier: {x,z} }, radius = poloměr kuličky, half = polovina desky
  function sync(w, radius, half, visible) {
    root.visible = visible;
    if (!visible) return;

    for (const name of ['A', 'B']) {
      const p = w[name], m = markers[name];
      m.g.position.set(p.x, -radius * 0.9, p.z);
      m.disc.scale.set(radius * 0.9, radius, radius * 0.9);
      m.label.scale.set(radius * 2 * m.label.userData.aspect, radius * 2, 1);
      m.label.position.set(name === 'A' ? -radius * 2.2 : radius * 2.2, radius * 3.2, 0);
    }

    const key = JSON.stringify([w.points, w.segments.map((s) => s.kind), radius]);
    if (key !== pathKey) {
      pathKey = key;
      clear(pathGroup);
      for (const s of w.segments) pathGroup.add(rod(s.a, s.b, radius * 0.16, KIND_COLOR[s.kind]));
      // ekvipotenciální čáry přes A a B — rovnoběžné s deskami, kolmé na siločáry (lekce 06)
      clear(equiGroup);
      for (const p of [w.A, w.B]) {
        const n = 14;
        for (let i = 0; i < n; i++) {
          if (i % 2) continue; // čárkovaně
          const z0 = -half + (2 * half * i) / n, z1 = -half + (2 * half * (i + 1)) / n;
          equiGroup.add(rod({ x: p.x, z: z0 }, { x: p.x, z: z1 }, radius * 0.06, 0xf3eee3, 0.45));
        }
      }
    }
    pathGroup.position.y = equiGroup.position.y = -radius * 0.75;

    const plus = w.Q >= 0;
    ball.material = plus ? ballMats.plus : ballMats.minus;
    ball.scale.setScalar(radius * 0.8);
    signs.plus.visible = plus;
    signs.minus.visible = !plus;
    for (const s of Object.values(signs)) s.scale.set(radius * 1.05, radius * 1.05, 1);
    carrier.position.set(w.carrier.x, 0, w.carrier.z);
    // síla pole na náboj: kladný po siločarách (+x), záporný proti nim
    force.setDirection(new THREE.Vector3(plus ? 1 : -1, 0, 0));
    force.setLength(radius * 3.2, radius * 1.1, radius * 0.7);
    force.position.set(0, radius * 1.3, 0);
  }

  // který bod (A / B) je pod paprskem
  function pick(raycaster) {
    const hit = raycaster.intersectObjects([markers.A.disc, markers.B.disc], false)[0];
    return hit ? hit.object.userData.point : null;
  }

  return { sync, pick };
}
