// Siločáry ve scéně: čáry (z core/fieldlines.js) obarvené podle velikosti |E|
// + malé kužely ukazující směr, kterým by se pohyboval jednotkový kladný náboj.

import * as THREE from 'three';
import { colorAt } from './core/colormap.js';

const MAX_CONES = 4000;

export function createLineLayer(scene) {
  const geo = new THREE.BufferGeometry();
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 });
  const segs = new THREE.LineSegments(geo, mat);
  segs.frustumCulled = false;
  scene.add(segs);

  const coneGeo = new THREE.ConeGeometry(1, 2.6, 10);
  coneGeo.translate(0, 0.4, 0);
  const cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_CONES);
  cones.count = 0;
  cones.frustumCulled = false;
  scene.add(cones);

  const up = new THREE.Vector3(0, 1, 0);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const d = new THREE.Vector3();
  const p = new THREE.Vector3();
  const col = new THREE.Color();

  // lines: výstup traceLines (velikosti |E| v mags jsou spočítané ve vakuu → dělíme εᵣ)
  function update(lines, size, radius, visible, range, epsR = 1) {
    segs.visible = cones.visible = visible;
    if (!visible) return;

    let n = 0;
    for (const l of lines) n += Math.max(0, l.points.length - 1);
    const pos = new Float32Array(n * 6);
    const colors = new Float32Array(n * 6);
    let o = 0;
    let cone = 0;
    const spacing = size * 0.16;
    const coneR = radius * 0.22;
    s.set(coneR, coneR, coneR);
    const rgb = (mag) => {
      const [r, g, b] = colorAt(mag / epsR, range);
      col.setRGB(r, g, b, THREE.SRGBColorSpace);
      return col;
    };

    for (const l of lines) {
      const pts = l.points, mags = l.mags;
      let run = spacing * 0.55; // první šipka kousek od náboje
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const ca = rgb(mags[i]);
        colors[o] = ca.r; colors[o + 1] = ca.g; colors[o + 2] = ca.b;
        pos[o++] = a.x; pos[o++] = a.y; pos[o++] = a.z;
        const cb = rgb(mags[i + 1]);
        colors[o] = cb.r; colors[o + 1] = cb.g; colors[o + 2] = cb.b;
        pos[o++] = b.x; pos[o++] = b.y; pos[o++] = b.z;

        const segLen = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
        run -= segLen;
        if (run <= 0 && cone < MAX_CONES && segLen > 0) {
          run = spacing;
          // šipku nedáváme těsně ke konci čáry (tam je kulička)
          if (i > pts.length - 4) continue;
          d.set(b.x - a.x, b.y - a.y, b.z - a.z).normalize();
          q.setFromUnitVectors(up, d);
          p.set(b.x, b.y, b.z);
          m.compose(p, q, s);
          cones.setMatrixAt(cone, m);
          cones.setColorAt(cone, cb);
          cone++;
        }
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeBoundingSphere();
    cones.count = cone;
    cones.instanceMatrix.needsUpdate = true;
    if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
  }

  return { update };
}
