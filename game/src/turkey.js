// Turkey Escape — the turkey mesh and its run animation.
// Written from scratch in this session (27 Nov 2026 rewrite).
// A plump brown bird built from spheres and cones: round body, fan tail
// of autumn feathers, orange beak, red wattle, skinny orange legs.
// The renderer drives it with the jump height from the world state, so
// a jump is always visible — the bird actually leaves the ground.

import * as THREE from 'three';

const BROWN = 0x7a4a21;
const BROWN_LIGHT = 0x9c6b35;
const FEATHER = 0xc96a1e;
const FEATHER_RED = 0xb03a12;
const BEAK = 0xe8912d;
const WATTLE = 0xc22e2e;
const LEG = 0xe8a13c;

function mat(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 });
}

export function buildTurkey() {
  const g = new THREE.Group();
  g.name = 'turkey';

  // Body: a squashed sphere, slightly tilted forward like a running bird.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), mat(BROWN));
  body.scale.set(1, 0.92, 1.25);
  body.position.y = 0.78;
  body.castShadow = true;
  g.add(body);

  // Lighter belly patch on the front.
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), mat(BROWN_LIGHT));
  belly.scale.set(0.85, 0.8, 0.6);
  belly.position.set(0, 0.66, 0.34);
  g.add(belly);

  // Head on a short neck, held high and forward.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat(BROWN));
  head.position.set(0, 1.38, 0.52);
  head.castShadow = true;
  g.add(head);

  // Beak: a cone pointing forward and slightly down.
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 10), mat(BEAK, 0.6));
  beak.rotation.x = Math.PI / 2 + 0.25;
  beak.position.set(0, 1.36, 0.78);
  g.add(beak);

  // Wattle: a red drop under the beak.
  const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(WATTLE, 0.5));
  wattle.scale.set(1, 1.5, 1);
  wattle.position.set(0, 1.24, 0.72);
  g.add(wattle);

  // Eyes: two small dark beads with a white glint each.
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat(0x1a1210, 0.3));
    eye.position.set(side * 0.13, 1.44, 0.68);
    g.add(eye);
  }

  // Tail fan: five flattened feather blobs fanning up behind the body.
  const tail = new THREE.Group();
  tail.position.set(0, 0.95, -0.55);
  const fanColors = [FEATHER_RED, FEATHER, 0xd98a2b, FEATHER, FEATHER_RED];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i - 2) * 0.38;
    const feather = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), mat(fanColors[i]));
    feather.scale.set(0.55, 1.5, 0.22);
    feather.position.set(Math.sin(angle) * 0.55, Math.cos(angle) * 0.5 + 0.25, -0.08);
    feather.rotation.z = -angle * 0.9;
    feather.castShadow = true;
    tail.add(feather);
  }
  g.add(tail);
  g.userData.tail = tail;

  // Wings: flattened blobs on the sides that flap while running.
  const wings = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat(BROWN_LIGHT));
    wing.scale.set(0.28, 0.85, 1.1);
    wing.position.set(side * 0.52, 0.85, 0.05);
    wing.castShadow = true;
    g.add(wing);
    wings.push(wing);
  }
  g.userData.wings = wings;

  // Legs and feet: thin orange cylinders with three-toed feet.
  const legs = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.18, 0.42, 0.05);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 8), mat(LEG, 0.6));
    shin.position.y = -0.18;
    leg.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.3), mat(LEG, 0.6));
    foot.position.set(0, -0.4, 0.05);
    leg.add(foot);
    g.add(leg);
    legs.push(leg);
  }
  g.userData.legs = legs;

  return g;
}

// Animate one frame. jumpY comes straight from the world state (the
// turkey's real height); bob is only the running bounce on top of it,
// so the jump is never hidden by the animation.
export function animateTurkey(group, t, jumpY, speed, grounded, lean) {
  const running = grounded && speed > 0.5;
  const bob = running ? Math.abs(Math.sin(t * 11)) * 0.07 : 0;
  group.position.y = jumpY + bob;
  group.rotation.x = 0.06 + speed * 0.004;
  group.rotation.z = lean * 0.18;

  const wings = group.userData.wings || [];
  wings.forEach((wing, i) => {
    const side = i === 0 ? -1 : 1;
    wing.rotation.z = side * (0.25 + (running ? Math.sin(t * 11) * 0.35 : 0.1));
  });

  const legs = group.userData.legs || [];
  legs.forEach((leg, i) => {
    if (!grounded) {
      // Tucked up mid-jump.
      leg.rotation.x = i === 0 ? 0.7 : 0.45;
    } else if (running) {
      leg.rotation.x = Math.sin(t * 11 + i * Math.PI) * 0.55;
    } else {
      leg.rotation.x = 0;
    }
  });

  const tail = group.userData.tail;
  if (tail) tail.rotation.x = -0.15 + Math.sin(t * 3.1) * 0.05;
}
