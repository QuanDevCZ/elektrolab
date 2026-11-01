// 3D scéna: renderer, kamera, otáčení/zoom (OrbitControls), stůl s mřížkou, světla, pohledy.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const VIEWS = {
  // pozice kamery jako násobek velikosti stolu S
  sikmo: [0.55, 0.62, 0.9],
  bok: [0, 0.06, 1.3],
  shora: [0, 1.5, 0.001],
  // práce v poli: blíž, šikmo shora, ať je vidět cesta mezi deskami
  prace: [0.08, 0.95, 0.55],
  // relativita: zepředu shora, planety v jedné řadě zleva doprava
  relativita: [-0.05, 0.85, 0.9],
};

// poměr šířka/výška, pod kterým musí kamera odstoupit, aby byla vidět celá scéna
const VIEW_FIT = { relativita: 1.7, prace: 1.25 };

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0d0f13);
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.001, 1000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI * 0.495; // pod stůl se nedíváme

  scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1c24, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  scene.add(sun);

  const bench = new THREE.Group();
  scene.add(bench);

  let size = 4;
  let view = 'sikmo';
  let tween = null;

  const benchMat = new THREE.MeshStandardMaterial({ color: 0x161920, roughness: 0.95, transparent: true, opacity: 1 });

  function buildBench(S, step, radius) {
    bench.clear();
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(S, S), benchMat);
    plate.rotation.x = -Math.PI / 2;
    bench.add(plate);

    const grid = new THREE.GridHelper(S, Math.round(S / step), 0x343a46, 0x262a33);
    grid.position.y = 0.0005 * S;
    bench.add(grid);

    // osy x (vodorovně) a z jemně zvýrazněné, ať je vidět střed stolu
    const axisMat = new THREE.LineBasicMaterial({ color: 0x4a5160 });
    const axes = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-S / 2, 0.001 * S, 0), new THREE.Vector3(S / 2, 0.001 * S, 0),
      new THREE.Vector3(0, 0.001 * S, -S / 2), new THREE.Vector3(0, 0.001 * S, S / 2),
    ]);
    bench.add(new THREE.LineSegments(axes, axisMat));

    // náboje leží v rovině y = 0 (tam počítáme fyziku), stůl je o poloměr kuličky níž
    bench.position.y = -radius;
  }

  function setBench(S, step, radius) {
    size = S;
    buildBench(S, step, radius);
    sun.position.set(0.8 * S, 1.6 * S, 0.6 * S);
    controls.minDistance = 0.15 * S;
    controls.maxDistance = 3 * S;
    setView(view, false);
  }

  function setView(name, animate = true) {
    view = name;
    const [x, y, z] = VIEWS[name];
    // scény, které potřebují celou šířku stolu: na úzké obrazovce (telefon) kamera odstoupí dál
    const fit = VIEW_FIT[name];
    const k = fit ? Math.max(1, fit / camera.aspect) : 1;
    const to = new THREE.Vector3(x * size * k, y * size * k, z * size * k);
    if (!animate) {
      camera.position.copy(to);
      controls.target.set(0, 0, 0);
      controls.update();
      return;
    }
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to, t0: performance.now(), dur: 650 };
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  function update() {
    if (tween) {
      const t = Math.min(1, (performance.now() - tween.t0) / tween.dur);
      const e = 1 - Math.pow(1 - t, 3); // ease-out
      camera.position.lerpVectors(tween.from, tween.to, e);
      controls.target.lerpVectors(tween.fromT, new THREE.Vector3(), e);
      if (t === 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }

  // průhledný stůl, když jím procházejí nabité desky (spodní polovina desek je pod deskou stolu)
  function setBenchOpacity(o) {
    benchMat.opacity = o;
    benchMat.depthWrite = o >= 1;
  }

  return { THREE, renderer, scene, camera, controls, setBench, setView, setBenchOpacity, update, get size() { return size; } };
}
