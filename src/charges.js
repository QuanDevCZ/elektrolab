// Kuličky nábojů ve scéně: koule (červená = +, modrá = −), znaménko, popisek Q₁, Q₂…
// a kroužek pod vybraným nábojem.

import * as THREE from 'three';

const COLORS = { plus: 0xd2392e, minus: 0x2f62e0 };
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
export const qName = (i) => `Q${String(i + 1).split('').map((d) => SUB[+d]).join('')}`;

export function textSprite(text, { font = '600 96px IBM Plex Sans, sans-serif', color = '#fff', bg = null, w = 256, h = 128 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    const r = h / 2;
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, r - 4);
    g.fill();
  }
  g.fillStyle = color;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.renderOrder = 10;
  s.userData.aspect = w / h;
  return s;
}

export function createChargeLayer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const sphereGeo = new THREE.SphereGeometry(1, 40, 24);
  const mats = {
    plus: new THREE.MeshStandardMaterial({ color: COLORS.plus, roughness: 0.35, metalness: 0.05, emissive: COLORS.plus, emissiveIntensity: 0.22 }),
    minus: new THREE.MeshStandardMaterial({ color: COLORS.minus, roughness: 0.35, metalness: 0.05, emissive: COLORS.minus, emissiveIntensity: 0.22 }),
  };
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.35, 1.6, 48),
    new THREE.MeshBasicMaterial({ color: 0xe0a82e, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const items = new Map(); // id → { root, sphere, sign, label, signKey, labelKey }

  function sync(charges, selectedId, radius) {
    const seen = new Set();
    charges.forEach((c, i) => {
      seen.add(c.id);
      let it = items.get(c.id);
      if (!it) {
        const root = new THREE.Group();
        const sphere = new THREE.Mesh(sphereGeo, mats.plus);
        sphere.userData.chargeId = c.id;
        root.add(sphere);
        group.add(root);
        it = { root, sphere, sign: null, label: null, signKey: '', labelKey: '' };
        items.set(c.id, it);
      }
      const key = c.Q >= 0 ? 'plus' : 'minus';
      it.sphere.material = mats[key];
      it.sphere.scale.setScalar(radius);
      it.root.position.set(c.x, c.y, c.z);

      if (it.signKey !== key) {
        if (it.sign) { it.root.remove(it.sign); it.sign.material.map.dispose(); it.sign.material.dispose(); }
        it.sign = textSprite(key === 'plus' ? '+' : '−', { font: '600 120px IBM Plex Sans, sans-serif', w: 128, h: 128 });
        it.root.add(it.sign);
        it.signKey = key;
      }
      it.sign.scale.set(radius * 1.3, radius * 1.3, 1);

      const name = c.label || qName(i);
      if (it.labelKey !== name) {
        if (it.label) { it.root.remove(it.label); it.label.material.map.dispose(); it.label.material.dispose(); }
        it.label = textSprite(name, { font: '500 64px IBM Plex Sans, sans-serif', color: '#1d1b17', bg: '#f3eee3e6', w: 160, h: 88 });
        it.root.add(it.label);
        it.labelKey = name;
      }
      const lh = radius * 2.1;
      it.label.scale.set(lh * it.label.userData.aspect, lh, 1);
      it.label.position.set(0, radius * 3, -radius * 2.2); // kousek dozadu, aby shora nezakrýval kuličku

      if (c.id === selectedId) {
        ring.visible = true;
        ring.position.set(c.x, -radius * 0.98, c.z);
        ring.scale.setScalar(radius);
      }
    });
    if (!charges.some((c) => c.id === selectedId)) ring.visible = false;

    for (const [id, it] of items) {
      if (!seen.has(id)) {
        group.remove(it.root);
        for (const s of [it.sign, it.label]) if (s) { s.material.map.dispose(); s.material.dispose(); }
        items.delete(id);
      }
    }
  }

  // id náboje pod paprskem (nebo null)
  function pick(raycaster) {
    const spheres = [...items.values()].map((it) => it.sphere);
    const hit = raycaster.intersectObjects(spheres, false)[0];
    return hit ? hit.object.userData.chargeId : null;
  }

  return { sync, pick };
}
