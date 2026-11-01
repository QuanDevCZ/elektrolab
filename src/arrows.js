// Šipky výsledné elektrické síly na každý náboj.
//
// Síly v aplikaci se liší o mnoho řádů (elektron vs. 0,01 C), proto délka šipky NENÍ
// úměrná síle, ale jejímu logaritmu: každý dílek navíc = 10× větší síla. Referencí je
// největší síla, jaká může na stole vzniknout (dva největší náboje těsně u sebe ve vakuu).
// Díky tomu je vidět, že dvojnásobná vzdálenost = čtvrtinová síla (šipka se zkrátí),
// a že v ethanolu (εᵣ = 24) je síla menší (šipka se zkrátí o víc než jeden dílek).

import * as THREE from 'three';
import { kFor } from './core/constants.js';

const DECADES = 5;          // kolik řádů (×10) se vejde mezi nejkratší a nejdelší šipku
const COLOR = 0xe39313;

export function forceReference(charges, rMin) {
  const qs = charges.map((c) => Math.abs(c.Q)).sort((a, b) => b - a);
  if (qs.length < 2) return 0;
  return (kFor(1) * qs[0] * qs[1]) / (rMin * rMin);
}

// délka šipky [m] pro sílu F; 0 = šipku neukazovat (síla je zanedbatelná)
export function arrowLength(F, Fref, size) {
  if (!(F > 0) || !(Fref > 0)) return 0;
  const t = (Math.log10(F / Fref) + DECADES) / DECADES; // 0 … 1
  if (t <= 0) return 0;
  return size * (0.04 + 0.16 * Math.min(1, t));
}

// Plná 3D šipka: válec (tělo) + kužel (hrot), osa +Y, délka 1 — škálujeme ji v sync().
const shaftGeo = new THREE.CylinderGeometry(1, 1, 1, 12).translate(0, 0.5, 0);
const headGeo = new THREE.ConeGeometry(1, 1, 16).translate(0, 0.5, 0);
const material = new THREE.MeshStandardMaterial({ color: COLOR, emissive: COLOR, emissiveIntensity: 0.45, roughness: 0.4 });

function makeArrow() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(shaftGeo, material), new THREE.Mesh(headGeo, material));
  return g;
}

export function createArrowLayer(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const arrows = new Map();
  const up = new THREE.Vector3(0, 1, 0);

  // refCharges = náboje pro referenční sílu (kuličky + celkové náboje desek)
  function sync(charges, forces, radius, size, rMin, visible, refCharges = charges) {
    group.visible = visible;
    const Fref = forceReference(refCharges, rMin);
    const seen = new Set();
    for (const f of forces) {
      const c = charges.find((ch) => ch.id === f.id);
      if (!c) continue;
      const L = arrowLength(f.magnitude, Fref, size);
      let a = arrows.get(f.id);
      if (!a) { a = makeArrow(); group.add(a); arrows.set(f.id, a); }
      seen.add(f.id);
      if (L === 0) { a.visible = false; continue; }
      a.visible = true;
      const dir = new THREE.Vector3(f.F.x, f.F.y, f.F.z).normalize();
      // šipka začíná na povrchu kuličky
      a.position.set(c.x + dir.x * radius, c.y + dir.y * radius, c.z + dir.z * radius);
      a.quaternion.setFromUnitVectors(up, dir);
      const head = Math.min(L * 0.4, radius * 1.3);
      const [shaft, cone] = a.children;
      shaft.scale.set(radius * 0.22, L - head, radius * 0.22);
      cone.scale.set(radius * 0.6, head, radius * 0.6);
      cone.position.y = L - head;
    }
    for (const [id, a] of arrows) {
      if (!seen.has(id)) { group.remove(a); arrows.delete(id); }
    }
  }

  return { sync };
}
