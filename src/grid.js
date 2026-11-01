// Mřížka vektorů intenzity ve scéně — všechny šipky stejně dlouhé, velikost |E| ukazuje barva
// (jako obrázky v lekci 04: „světlejší barva znamená silnější pole“).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { colorAt } from './core/colormap.js';

const MAX = 512;

export function createGridLayer(scene) {
  // šipka délky 1 podél osy +Y, střed v počátku: tělo + hrot
  const shaft = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 6).translate(0, -0.19, 0);
  const head = new THREE.ConeGeometry(0.13, 0.38, 10).translate(0, 0.31, 0);
  const geo = mergeGeometries([shaft, head]);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
  mesh.count = 0;
  mesh.frustumCulled = false;
  scene.add(mesh);

  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), d = new THREE.Vector3(), p = new THREE.Vector3();
  const c = new THREE.Color();

  // samples = výstup core/fieldgrid.js; range = barevná stupnice (core/colormap.js)
  function update(grid, range, visible) {
    mesh.visible = visible;
    if (!visible || !grid) { mesh.count = 0; return; }
    const L = grid.step * 0.7;
    s.set(L, L, L);
    let n = 0;
    for (const g of grid.points) {
      if (n >= MAX) break;
      d.set(g.E.x, g.E.y, g.E.z).normalize();
      q.setFromUnitVectors(up, d);
      p.set(g.p.x, g.p.y, g.p.z);
      m.compose(p, q, s);
      mesh.setMatrixAt(n, m);
      const [r, gg, b] = colorAt(g.mag, range);
      c.setRGB(r, gg, b, THREE.SRGBColorSpace);
      mesh.setColorAt(n, c);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  return { update };
}
