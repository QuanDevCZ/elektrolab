// „Co je náboj?“ — ebonitová tyč a hadr, jak jsme to dělali v hodině (lekce 02: „Pokud jsme
// umělohmotnou tyč nabíjeli záporně, musel být hadr nabitý kladně.“). Kuličky na povrchu: červená = proton (+e),
// modrá = elektron (−e). Při tření přeskočí elektrony z hadru na tyč; protony zůstávají.
// Zjednodušeno: ve skutečnosti přejde obrovské množství elektronů, tady jich je pár.

import * as THREE from 'three';
import { textSprite } from './charges.js';

const START = 10;       // na začátku má každé těleso 10 protonů a 10 elektronů → je neutrální
const PER_RUB = 2;      // kolik elektronů přeskočí při jednom zatření
const MAX_MOVED = 8;

export function createNabojLayer(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const pGeo = new THREE.SphereGeometry(0.045, 16, 12);
  const mats = {
    proton: new THREE.MeshStandardMaterial({ color: 0xd2392e, emissive: 0xd2392e, emissiveIntensity: 0.3, roughness: 0.4 }),
    electron: new THREE.MeshStandardMaterial({ color: 0x4b7dff, emissive: 0x2f62e0, emissiveIntensity: 0.6, roughness: 0.3 }),
  };

  // ebonitová tyč (vodorovně, podél x) — ebonit je černý, proto tmavá barva
  const rod = new THREE.Group();
  rod.position.set(0, 0.12, -0.45);
  const rodMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 2.4, 32),
    new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.25, metalness: 0.1 }),
  );
  rodMesh.rotation.z = Math.PI / 2;
  rod.add(rodMesh);
  root.add(rod);

  // hadr (měkký plochý kvádr)
  const rag = new THREE.Group();
  const ragHome = new THREE.Vector3(0, 0.0, 0.75);
  rag.position.copy(ragHome);
  const ragMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.07, 0.62, 8, 1, 6),
    new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 1 }),
  );
  rag.add(ragMesh);
  root.add(rag);

  // místa pro částice: tyč — po horní straně, hadr — v mřížce na povrchu
  const rodSlot = (i) => new THREE.Vector3(-1.05 + (i % 15) * 0.15, 0.13 + Math.floor(i / 15) * 0.02, (i % 2 ? 0.05 : -0.05));
  const ragSlot = (i) => new THREE.Vector3(-0.4 + (i % 5) * 0.2, 0.07, -0.22 + Math.floor(i / 5) * 0.15);

  const labels = {
    rod: textSprite('ebonitová tyč', { font: '500 52px IBM Plex Sans, sans-serif', color: '#1d1b17', bg: '#f3eee3e6', w: 480, h: 84 }),
    rag: textSprite('hadr', { font: '500 52px IBM Plex Sans, sans-serif', color: '#1d1b17', bg: '#f3eee3e6', w: 200, h: 84 }),
  };
  labels.rod.scale.set(0.2 * labels.rod.userData.aspect, 0.2, 1);
  labels.rod.position.set(-1.5, 0.45, 0);
  rod.add(labels.rod);
  labels.rag.scale.set(0.2 * labels.rag.userData.aspect, 0.2, 1);
  labels.rag.position.set(-0.75, 0.35, 0);
  rag.add(labels.rag);

  const counters = { rod: null, rag: null };
  function setCounter(which, text, color) {
    const parent = which === 'rod' ? rod : rag;
    if (counters[which]) { parent.remove(counters[which]); counters[which].material.map.dispose(); counters[which].material.dispose(); }
    const s = textSprite(text, { font: '600 64px IBM Plex Mono, monospace', color, bg: '#0d0f13d0', w: 200, h: 96 });
    s.scale.set(0.22 * s.userData.aspect, 0.22, 1);
    s.position.set(which === 'rod' ? 1.55 : 0.75, which === 'rod' ? 0.45 : 0.35, 0);
    parent.add(s);
    counters[which] = s;
  }

  let rodElectrons = [], ragElectrons = [];
  const flying = [];
  let moved = 0;
  let rub = null;      // animace tření
  const listeners = [];

  function addParticle(parent, pos, kind) {
    const m = new THREE.Mesh(pGeo, mats[kind]);
    m.position.copy(pos);
    parent.add(m);
    return m;
  }

  function build() {
    for (const g of [rod, rag]) {
      for (const o of [...g.children]) if (o.geometry === pGeo) g.remove(o);
    }
    for (const f of flying) root.remove(f.mesh);
    flying.length = 0;
    rodElectrons = []; ragElectrons = [];
    // protony a elektrony střídavě vedle sebe — těleso je navenek neutrální
    for (let i = 0; i < START; i++) {
      addParticle(rod, rodSlot(2 * i), 'proton');
      rodElectrons.push(addParticle(rod, rodSlot(2 * i + 1), 'electron'));
      addParticle(rag, ragSlot(2 * i).add(new THREE.Vector3(0, 0, 0)), 'proton');
      ragElectrons.push(addParticle(rag, ragSlot(2 * i + 1), 'electron'));
    }
    moved = 0;
    rag.position.copy(ragHome);
    updateCounters();
  }

  function updateCounters() {
    setCounter('rod', moved ? `−${moved}e` : '0', moved ? '#8fb0ff' : '#e9e4d8');
    setCounter('rag', moved ? `+${moved}e` : '0', moved ? '#ff8a7a' : '#e9e4d8');
  }

  // jedno zatření: hadr dojede k tyči, třikrát po ní přejede a vrátí se
  function startRub() {
    if (rub || moved >= MAX_MOVED) return false;
    rub = { t0: performance.now(), sent: false };
    return true;
  }

  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const ragAtRod = new THREE.Vector3(0, 0.28, -0.45 + 0.2);

  // vrací true, dokud se něco hýbe (main.js pak překresluje)
  function step(now) {
    let active = false;
    if (rub) {
      active = true;
      const T = (now - rub.t0) / 2200;
      if (T < 0.2) {
        rag.position.lerpVectors(ragHome, ragAtRod, ease(T / 0.2));
        rag.rotation.x = -0.5 * ease(T / 0.2);
      } else if (T < 0.75) {
        const u = (T - 0.2) / 0.55;
        rag.position.set(ragAtRod.x + Math.sin(u * Math.PI * 6) * 0.6, ragAtRod.y, ragAtRod.z);
        if (!rub.sent && u > 0.4) { rub.sent = true; transfer(); }
      } else if (T < 1) {
        const u = ease((T - 0.75) / 0.25);
        rag.position.lerpVectors(ragAtRod, ragHome, u);
        rag.rotation.x = -0.5 * (1 - u);
      } else {
        rag.position.copy(ragHome);
        rag.rotation.x = 0;
        rub = null;
      }
    }
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      active = true;
      const t = Math.max(0, Math.min(1, (now - f.t0) / 700));
      const to = rod.localToWorld(f.slot.clone());
      f.mesh.position.lerpVectors(f.from, to, ease(t)).add(new THREE.Vector3(0, Math.sin(t * Math.PI) * 0.25, 0));
      if (t >= 1) {
        root.remove(f.mesh);
        f.mesh.position.copy(f.slot);
        rod.add(f.mesh);
        rodElectrons.push(f.mesh);
        flying.splice(i, 1);
      }
    }
    return active;
  }

  // elektrony přeskočí z hadru na tyč; protony se nehýbou
  function transfer() {
    for (let k = 0; k < PER_RUB && ragElectrons.length; k++) {
      const e = ragElectrons.pop();
      const from = rag.localToWorld(e.position.clone());
      rag.remove(e);
      root.add(e);
      e.position.copy(from);
      const slot = rodSlot(2 * START + moved + k);
      flying.push({ mesh: e, from, slot, t0: performance.now() + k * 120 });
    }
    moved += PER_RUB;
    updateCounters();
    for (const fn of listeners) fn(moved);
  }

  build();

  return {
    root,
    setVisible(v) { root.visible = v; },
    rub: startRub,
    reset() { rub = null; build(); for (const fn of listeners) fn(moved); },
    step,
    onChange(fn) { listeners.push(fn); },
    get moved() { return moved; },
    get full() { return moved >= MAX_MOVED; },
  };
}
