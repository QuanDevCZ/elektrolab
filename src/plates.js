// Nabité desky ve scéně (homogenní pole) a bod P (sonda intenzity).

import * as THREE from 'three';
import { textSprite } from './charges.js';
import { formatCharge } from './core/format.js';

export function createPlateLayer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  let key = '';

  // plates = core/plates.js makePlates(); radius = poloměr kuličky (měřítko popisků)
  function sync(plates, radius) {
    const k = plates.map((p) => `${p.x}:${p.Q}:${p.half}`).join('|') + `:${radius}`;
    if (k === key) return;
    key = k;
    group.clear();
    for (const pl of plates) {
      const plus = pl.Q > 0;
      const color = plus ? 0xd2392e : 0x2f62e0;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(radius * 0.4, pl.half * 2, pl.half * 2),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: true, opacity: 0.55, emissive: color, emissiveIntensity: 0.15 }),
      );
      box.position.set(pl.x, 0, 0);
      group.add(box);
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(box.geometry),
        new THREE.LineBasicMaterial({ color: plus ? 0xff8a7a : 0x8fb0ff }),
      );
      edge.position.copy(box.position);
      group.add(edge);

      // znaménka po horní hraně desky a popisek náboje
      for (let i = -2; i <= 2; i++) {
        const s = textSprite(plus ? '+' : '−', { font: '600 120px IBM Plex Sans, sans-serif', w: 128, h: 128, color: plus ? '#ff8a7a' : '#8fb0ff' });
        s.scale.set(radius * 1.6, radius * 1.6, 1);
        s.position.set(pl.x, pl.half + radius * 1.2, (i * pl.half) / 2.5);
        group.add(s);
      }
      const label = textSprite(formatCharge(pl.Q, 2), { font: '500 56px IBM Plex Sans, sans-serif', color: '#1d1b17', bg: '#f3eee3e6', w: 256, h: 88 });
      label.scale.set(radius * 2 * label.userData.aspect, radius * 2, 1);
      label.position.set(pl.x, pl.half + radius * 3.4, 0);
      group.add(label);
    }
  }

  return { sync };
}

export function createProbeLayer(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const marker = new THREE.Mesh(
    new THREE.OctahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ color: 0xf6f1e4, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 0.25 }),
  );
  marker.userData.probe = true;
  root.add(marker);
  const label = textSprite('P', { font: "600 72px 'Source Serif 4', serif", color: '#1d1b17', bg: '#f3eee3e6', w: 112, h: 88 });
  root.add(label);
  // bílá šipka: směr intenzity v bodě P (stejná délka vždy — velikost je v panelu Měření)
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0xffffff);
  root.add(arrow);

  function sync(probe, E, radius, size, visible) {
    root.visible = visible && !!probe;
    if (!root.visible) return;
    root.position.set(probe.x, probe.y, probe.z);
    marker.scale.set(radius * 0.7, radius * 1.0, radius * 0.7);
    label.scale.set(radius * 1.8 * label.userData.aspect, radius * 1.8, 1);
    label.position.set(0, radius * 2.6, -radius * 2);
    const L = Math.hypot(E.x, E.y, E.z);
    arrow.visible = L > 0;
    if (L > 0) {
      arrow.setDirection(new THREE.Vector3(E.x / L, E.y / L, E.z / L));
      arrow.setLength(size * 0.1, radius * 1.2, radius * 0.7);
    }
  }

  return { sync, marker };
}
