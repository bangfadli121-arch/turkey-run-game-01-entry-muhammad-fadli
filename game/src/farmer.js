// The farmer: the chaser. A big, round farmer in denim overalls and a
// straw hat, built from the same smooth primitives as the turkey, running
// with a carving knife in his right hand. He stays behind the turkey; how
// close he gets is the game's pressure gauge.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function mat(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function sphere(r, color, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), mat(color));
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

function cyl(rt, rb, h, color, seg = 14) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.castShadow = true;
  return m;
}

export function buildFarmer() {
  const group = new THREE.Group();
  const parts = {};

  // Legs: denim, mid-stride.
  parts.legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    const thigh = cyl(0.13, 0.11, 0.55, PALETTE.farmerDenim);
    thigh.position.y = 0.62;
    leg.add(thigh);
    const boot = sphere(0.13, '#4E342E', 1, 0.7, 1.7);
    boot.position.set(0, 0.06, 0.08);
    leg.add(boot);
    leg.position.set(side * 0.2, 0, 0);
    group.add(leg);
    parts.legs.push(leg);
  }

  // Torso: red plaid shirt, round belly.
  const torso = sphere(0.48, PALETTE.farmerShirt, 1, 1.15, 0.85);
  torso.position.set(0, 1.25, 0);
  group.add(torso);
  parts.torso = torso;

  // Overalls bib: a denim patch on the chest.
  const bib = sphere(0.3, PALETTE.farmerDenim, 1, 1.1, 0.4);
  bib.position.set(0, 1.32, 0.38);
  group.add(bib);

  // Arms: shirt sleeves, pumping while he runs.
  parts.arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    const sleeve = cyl(0.11, 0.09, 0.6, PALETTE.farmerShirt);
    sleeve.position.y = -0.3;
    arm.add(sleeve);
    const hand = sphere(0.1, PALETTE.farmerSkin);
    hand.position.y = -0.62;
    arm.add(hand);
    arm.position.set(side * 0.52, 1.62, 0);
    group.add(arm);
    parts.arms.push(arm);
  }

  // The carving knife in his right hand: a real blade silhouette
  // (extruded shape with a bevel, not a flat box) + a dark handle.
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.62, 0.02);
  bladeShape.lineTo(0.78, 0.07);
  bladeShape.lineTo(0.62, 0.13);
  bladeShape.lineTo(0, 0.12);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  const blade = new THREE.Mesh(bladeGeo, new THREE.MeshStandardMaterial({ color: PALETTE.knifeBlade, roughness: 0.25, metalness: 0.85 }));
  blade.castShadow = true;
  const handle = cyl(0.035, 0.04, 0.22, PALETTE.knifeHandle, 10);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.12, 0.06, 0);
  const knife = new THREE.Group();
  knife.add(blade);
  knife.add(handle);
  knife.position.set(0, -0.68, 0.05);
  knife.rotation.z = -0.5;
  parts.arms[1].add(knife);
  parts.knife = knife;

  // Head: skin sphere, big nose, moustache, angry brows.
  const head = sphere(0.3, PALETTE.farmerSkin, 1, 1, 0.95);
  head.position.set(0, 1.98, 0.02);
  group.add(head);
  const nose = sphere(0.08, PALETTE.farmerSkin, 1, 0.9, 1.2);
  nose.position.set(0, 1.94, 0.3);
  group.add(nose);
  const moustache = sphere(0.09, '#5D4037', 1.8, 0.5, 0.7);
  moustache.position.set(0, 1.86, 0.28);
  group.add(moustache);
  for (const side of [-1, 1]) {
    const eye = sphere(0.045, '#1A1210');
    eye.position.set(side * 0.11, 2.04, 0.28);
    group.add(eye);
    const brow = sphere(0.05, '#5D4037', 1.6, 0.5, 0.6);
    brow.position.set(side * 0.11, 2.12, 0.28);
    brow.rotation.z = side * -0.4;
    group.add(brow);
  }

  // Straw hat: a wide brim disc + a soft dome.
  const brim = cyl(0.46, 0.48, 0.04, PALETTE.farmerHat, 24);
  brim.position.set(0, 2.2, 0.02);
  group.add(brim);
  const crown = sphere(0.26, PALETTE.farmerHat, 1, 0.75, 1);
  crown.position.set(0, 2.24, 0.02);
  group.add(crown);
  const band = cyl(0.27, 0.27, 0.06, PALETTE.farmerShirt, 20);
  band.position.set(0, 2.2, 0.02);
  group.add(band);

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, parts };
}

/** Run-cycle animation: legs pump, arms swing, knife arm raised. */
export function animateFarmer(built, t, speedNorm) {
  const { group, parts } = built;
  const phase = t * (9 + speedNorm * 7);
  group.position.y = Math.abs(Math.sin(phase)) * 0.07;
  group.rotation.x = 0.14 + Math.sin(phase) * 0.02;
  parts.legs[0].rotation.x = Math.sin(phase) * 0.85;
  parts.legs[1].rotation.x = -Math.sin(phase) * 0.85;
  parts.arms[0].rotation.x = -Math.sin(phase) * 0.7 - 0.2;
  // Right arm stays raised, knife glinting.
  parts.arms[1].rotation.x = -1.1 + Math.sin(phase) * 0.25;
  parts.knife.rotation.z = -0.5 + Math.sin(phase * 0.5) * 0.15;
}
