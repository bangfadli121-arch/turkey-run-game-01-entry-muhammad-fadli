// The turkey: a plump bird built only from smooth, rounded primitives —
// spheres, cones and lathed shapes — so it reads as a soft storybook
// animal from any angle, never as a box. The group exposes the parts the
// run animation moves: wings, legs, tail and the whole body for bob/lean.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function mat(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

function sphere(r, color, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat(color));
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

function cone(r, h, color) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 20), mat(color));
  m.castShadow = true;
  return m;
}

export function buildTurkey() {
  const group = new THREE.Group();
  const parts = {};

  // Body: a plump egg, tilted slightly forward.
  const body = sphere(0.62, PALETTE.turkey, 1, 0.88, 1.18);
  body.position.set(0, 0.78, 0);
  body.rotation.x = 0.12;
  group.add(body);
  parts.body = body;

  // Cream belly patch on the front.
  const belly = sphere(0.42, PALETTE.turkeyBelly, 1, 0.95, 0.7);
  belly.position.set(0, 0.66, 0.34);
  group.add(belly);

  // Head, high on the front of the body.
  const head = sphere(0.26, PALETTE.turkeyDark, 1, 1, 1);
  head.position.set(0, 1.42, 0.42);
  group.add(head);
  parts.head = head;

  // Eyes: dark beads with a white glint.
  for (const side of [-1, 1]) {
    const eye = sphere(0.055, '#1A1210', 1, 1, 0.6);
    eye.position.set(side * 0.13, 1.48, 0.62);
    group.add(eye);
    const glint = sphere(0.02, '#FFFFFF', 1, 1, 0.6);
    glint.position.set(side * 0.13 + 0.02, 1.5, 0.66);
    group.add(glint);
  }

  // Beak: a short orange cone pointing forward and down.
  const beak = cone(0.09, 0.3, PALETTE.beak);
  beak.rotation.x = Math.PI / 2 + 0.35;
  beak.position.set(0, 1.38, 0.68);
  group.add(beak);

  // Snood + wattle: the red danglers that make it a turkey, not a chicken.
  const snood = cone(0.045, 0.16, PALETTE.wattle);
  snood.rotation.x = Math.PI;
  snood.position.set(0, 1.56, 0.62);
  group.add(snood);
  const wattle = sphere(0.07, PALETTE.wattle, 0.8, 1.3, 0.8);
  wattle.position.set(0, 1.28, 0.6);
  group.add(wattle);

  // Tail fan: five flattened feathers fanning up behind the body.
  const tail = new THREE.Group();
  tail.position.set(0, 0.95, -0.62);
  const tailColors = [PALETTE.turkeyTail[2], PALETTE.turkeyTail[0], PALETTE.turkeyTail[1], PALETTE.turkeyTail[0], PALETTE.turkeyTail[2]];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i - 2) * 0.42;
    const feather = sphere(0.34, tailColors[i], 0.55, 1.5, 0.22);
    feather.position.set(Math.sin(angle) * 0.52, Math.cos(angle) * 0.42 + 0.28, -0.05);
    feather.rotation.z = -angle * 0.9;
    tail.add(feather);
  }
  group.add(tail);
  parts.tail = tail;

  // Wings: flattened ovals hugging the body, flapping while running.
  parts.wings = [];
  for (const side of [-1, 1]) {
    const wing = sphere(0.34, PALETTE.turkeyDark, 0.32, 1, 1.15);
    wing.position.set(side * 0.58, 0.86, -0.05);
    wing.rotation.z = side * 0.25;
    group.add(wing);
    parts.wings.push(wing);
  }

  // Legs: thin orange stilts with flat little feet.
  parts.legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 10), mat(PALETTE.beak, 0.6));
    shin.position.y = 0.21;
    shin.castShadow = true;
    leg.add(shin);
    const foot = sphere(0.09, PALETTE.beak, 1.4, 0.4, 1.8);
    foot.position.set(0, 0.02, 0.06);
    leg.add(foot);
    leg.position.set(side * 0.22, 0, 0.05);
    group.add(leg);
    parts.legs.push(leg);
  }

  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group, parts };
}

/** Run-cycle animation: bob, wing flap, leg swing, lean into lane changes.
 *  `jumpY` is the world's jump height (0 on the ground): it lifts the
 *  whole bird, so a jump reads as a jump instead of a wing flutter. */
export function animateTurkey(built, t, speedNorm, lean, airborne, vy, jumpY) {
  const { group, parts } = built;
  const runPhase = t * (10 + speedNorm * 8);
  const bob = Math.abs(Math.sin(runPhase)) * 0.09;
  group.position.y = jumpY + bob;
  group.rotation.z = -lean * 0.35;
  group.rotation.x = airborne ? -0.12 : 0.06 + Math.sin(runPhase) * 0.03;
  parts.tail.rotation.x = -0.15 - Math.sin(runPhase) * 0.06;
  parts.wings[0].rotation.z = 0.25 + Math.sin(runPhase) * 0.55 + (airborne ? 0.5 : 0);
  parts.wings[1].rotation.z = -0.25 - Math.sin(runPhase) * 0.55 - (airborne ? 0.5 : 0);
  parts.legs[0].rotation.x = Math.sin(runPhase) * 0.9;
  parts.legs[1].rotation.x = -Math.sin(runPhase) * 0.9;
  if (airborne) {
    parts.legs[0].rotation.x = 0.5;
    parts.legs[1].rotation.x = -0.3;
  }
  void vy;
}
