// Turkey Escape — the farmer mesh and his chase animation.
// Written from scratch in this session (27 Nov 2026 rewrite).
// A broad farmer in a red shirt and straw hat, carving knife in hand,
// running a few metres behind the turkey and gaining on every hit.
// When he catches the bird he stops over it, knife raised — dinner time.

import * as THREE from 'three';

const SHIRT = 0xc22e2e;
const SHIRT_DARK = 0x8f1d1d;
const SKIN = 0xe8b98a;
const HAT = 0xd9b25f;
const HAT_BAND = 0x8f1d1d;
const PANTS = 0x3a4a6b;
const BOOT = 0x4a2f1d;
const BLADE = 0xd7dde2;

function mat(color, rough = 0.85, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

export function buildFarmer() {
  const g = new THREE.Group();
  g.name = 'farmer';

  // Torso: a broad red shirt, wider at the belly.
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.85, 14), mat(SHIRT));
  torso.position.y = 1.15;
  torso.castShadow = true;
  g.add(torso);

  // Dark apron circle on the belly.
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.5, 14), mat(0x2e2a26));
  apron.position.set(0, 1.05, 0.22);
  apron.scale.set(1, 1, 0.6);
  g.add(apron);

  // Head: skin sphere with a nose and a grey moustache.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat(SKIN));
  head.position.y = 1.82;
  head.castShadow = true;
  g.add(head);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(0xd89a6a));
  nose.position.set(0, 1.8, 0.3);
  g.add(nose);
  const moustache = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.06), mat(0x8a8a8a, 0.9));
  moustache.position.set(0, 1.72, 0.29);
  g.add(moustache);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(0x1a1210, 0.3));
    eye.position.set(side * 0.11, 1.88, 0.27);
    g.add(eye);
  }

  // Straw hat: wide brim disc plus a domed crown, red band between.
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.58, 0.05, 18), mat(HAT));
  brim.position.y = 2.02;
  brim.castShadow = true;
  g.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.24, 14), mat(HAT));
  crown.position.y = 2.14;
  g.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.36, 0.07, 14), mat(HAT_BAND));
  band.position.y = 2.05;
  g.add(band);

  // Arms: red sleeves; the right one holds the carving knife.
  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.5, 1.5, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.62, 10), mat(SHIRT));
    sleeve.position.y = -0.28;
    arm.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(SKIN));
    hand.position.y = -0.62;
    arm.add(hand);
    g.add(arm);
    arms.push(arm);
  }
  g.userData.arms = arms;

  // The carving knife in the right hand: grey blade, dark handle.
  const knife = new THREE.Group();
  knife.position.set(0.5, 0.88, 0.1);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.02), mat(BLADE, 0.35, 0.8));
  blade.position.y = -0.45;
  knife.add(blade);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.04), mat(0x2e2a26, 0.7));
  handle.position.y = -0.08;
  knife.add(handle);
  g.add(knife);
  g.userData.knife = knife;

  // Legs: blue trousers and brown boots.
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.22, 0.72, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.12, 0.62, 10), mat(PANTS));
    thigh.position.y = -0.28;
    leg.add(thigh);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), mat(BOOT, 0.7));
    boot.position.set(0, -0.62, 0.06);
    leg.add(boot);
    g.add(leg);
    legs.push(leg);
  }
  g.userData.legs = legs;

  return g;
}

// Run cycle while chasing; on the caught screen the renderer parks him
// over the turkey instead, so this only animates the chase.
export function animateFarmer(group, t, speed, chasing) {
  if (!chasing) {
    group.rotation.x = 0;
    return;
  }
  const run = Math.max(0.5, speed);
  const phase = t * (6 + run * 0.45);
  group.position.y = Math.abs(Math.sin(phase)) * 0.06;
  group.rotation.x = 0.1;

  const legs = group.userData.legs || [];
  legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(phase + i * Math.PI) * 0.7;
  });

  const arms = group.userData.arms || [];
  arms.forEach((arm, i) => {
    arm.rotation.x = Math.sin(phase + i * Math.PI + Math.PI) * 0.6 - 0.3;
  });

  // The knife arm pumps higher, waving the blade as he runs.
  const knife = group.userData.knife;
  if (knife) {
    knife.rotation.x = -0.5 + Math.sin(phase) * 0.35;
    knife.rotation.z = Math.sin(phase * 0.5) * 0.15;
  }
}
