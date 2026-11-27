// Turkey Escape — farm scenery and obstacle meshes.
// Written from scratch in this session (27 Nov 2026 rewrite).
// Golden-hour farm: a dirt track through green fields, wooden fences,
// autumn trees, a red barn at the start, pine woods at the end, a low sun
// and drifting clouds under a red-orange sky. Obstacles are the farm's
// own props: the black oven, the giant carving knife, hay bales and
// pumpkins — plus the corn the turkey runs for.

import * as THREE from 'three';
import { hashInt } from './random.js';

function mat(color, rough = 0.9, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

// --- Ground, track, sky props -------------------------------------------

export function buildGround() {
  // One wide green plane; the renderer slides it to follow the camera.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    mat(0x3f7a2e, 1),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

export function buildTrack() {
  // The dirt track itself, slightly raised so it never z-fights the grass.
  const track = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.12, 260), mat(0x8a5a30, 1));
  track.position.y = -0.02;
  track.receiveShadow = true;
  return track;
}

export function buildSun() {
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(9, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
  );
  sun.position.set(12, 30, 150);
  return sun;
}

export function buildCloud(x, y, z, scale) {
  const cloud = new THREE.Group();
  // Basic material, unfogged: clouds stay pale against the red sky.
  const white = new THREE.MeshBasicMaterial({ color: 0xffe8d0, fog: false });
  const puffs = [
    [0, 0, 0, 2.2],
    [2.4, -0.2, 0, 1.7],
    [-2.4, -0.3, 0, 1.6],
    [1.2, 0.7, 0, 1.4],
  ];
  for (const [px, py, pz, r] of puffs) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), white);
    puff.scale.y = 0.45;
    puff.position.set(px, py, pz);
    cloud.add(puff);
  }
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  return cloud;
}

export function buildBarn() {
  const barn = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 6), mat(0x7a2e22, 0.9));
  walls.position.y = 2.25;
  walls.castShadow = true;
  barn.add(walls);
  // Gambrel-ish roof: two slanted boxes meeting at the ridge.
  for (const side of [-1, 1]) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.25, 6.6), mat(0x4a2f1d, 0.9));
    roof.position.set(side * 1.85, 5.3, 0);
    roof.rotation.z = side * -0.55;
    roof.castShadow = true;
    barn.add(roof);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.15), mat(0x3a2418, 0.9));
  door.position.set(0, 1.5, 3.05);
  barn.add(door);
  return barn;
}

// --- Trees ----------------------------------------------------------------

export function buildAutumnTree(seedIndex) {
  // Deterministic variety from the index: size, lean and foliage tint.
  const h1 = hashInt(seedIndex * 7 + 1);
  const h2 = hashInt(seedIndex * 7 + 2);
  const h3 = hashInt(seedIndex * 7 + 3);
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.34, 2.6, 8),
    mat(0x6b4423, 1),
  );
  trunk.position.y = 1.3;
  trunk.castShadow = true;
  tree.add(trunk);
  const tint = [0xd96a1e, 0xe8912d, 0xc25a1a, 0xe8a13c][Math.floor(h2 * 4)];
  const blobs = [
    [0, 3.6, 0, 2.1],
    [1.2, 3.0, 0.4, 1.4],
    [-1.1, 3.1, -0.3, 1.5],
    [0.2, 4.4, -0.2, 1.3],
  ];
  for (const [x, y, z, r] of blobs) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(tint, 1));
    blob.position.set(x, y, z);
    blob.castShadow = true;
    tree.add(blob);
  }
  tree.scale.setScalar(0.85 + h1 * 0.5);
  tree.rotation.y = h3 * Math.PI * 2;
  return tree;
}

export function buildPine(seedIndex) {
  const h1 = hashInt(seedIndex * 13 + 5);
  const h2 = hashInt(seedIndex * 13 + 9);
  const pine = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.28, 1.6, 8),
    mat(0x5a3a20, 1),
  );
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  pine.add(trunk);
  const green = mat(0x1e4a24, 1);
  const tiers = [
    [2.2, 2.6, 1.9],
    [1.7, 4.0, 1.5],
    [1.2, 5.3, 1.1],
  ];
  for (const [r, y, ] of tiers) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 2.6, 10), green);
    cone.position.y = y;
    cone.castShadow = true;
    pine.add(cone);
  }
  pine.scale.setScalar(0.9 + h1 * 0.6);
  pine.rotation.y = h2 * Math.PI * 2;
  return pine;
}

// --- Fences ---------------------------------------------------------------

export function buildFencePost() {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.15, 8), mat(0xa97c4a, 1));
  post.position.y = 0.57;
  post.castShadow = true;
  return post;
}

export function buildFenceRail(length) {
  // A long thin cylinder lying along the track (z axis).
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, length, 6), mat(0xc49a5e, 1));
  rail.rotation.x = Math.PI / 2;
  rail.castShadow = true;
  return rail;
}

// --- Obstacles ------------------------------------------------------------
// All four are built at the origin, facing down the track (-z is behind
// the turkey, +z is ahead). The renderer places the row group at the
// row's relative distance and each obstacle at its lane x.

export function buildOven() {
  const oven = new THREE.Group();
  // Round black body with a glowing round door.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 18, 14), mat(0x241d1a, 0.6));
  body.scale.set(1, 1.15, 0.9);
  body.position.y = 0.95;
  body.castShadow = true;
  oven.add(body);
  const door = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    new THREE.MeshBasicMaterial({ color: 0xffb347 }),
  );
  door.position.set(0, 0.85, -0.78);
  door.rotation.y = Math.PI;
  oven.add(door);
  const doorBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.05), mat(0x3a2f28, 0.6));
  doorBar.position.set(0, 0.85, -0.8);
  oven.add(doorBar);
  // Chimney on top with a wisp of heat shimmer (a pale cone).
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.6, 8), mat(0x3a2f28, 0.7));
  chimney.position.set(0.3, 2.0, 0.1);
  oven.add(chimney);
  return oven;
}

export function buildKnife() {
  const knife = new THREE.Group();
  // A giant carving knife stuck point-down in the track, leaning.
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.1, 0.07), mat(0xd7dde2, 0.3, 0.85));
  blade.position.y = 1.05;
  blade.castShadow = true;
  knife.add(blade);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.5, 4), mat(0xd7dde2, 0.3, 0.85));
  tip.rotation.x = Math.PI;
  tip.rotation.y = Math.PI / 4;
  tip.scale.set(1, 1, 0.14);
  tip.position.y = -0.22;
  knife.add(tip);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.6, 0.12), mat(0x2e2a26, 0.7));
  handle.position.y = 2.35;
  knife.add(handle);
  knife.rotation.z = 0.28;
  knife.rotation.x = -0.08;
  return knife;
}

export function buildHay() {
  const hay = new THREE.Group();
  // A round bale lying on its side, golden straw with darker bands.
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.0, 16), mat(0xd9a83c, 1));
  bale.rotation.x = Math.PI / 2;
  bale.position.y = 0.62;
  bale.castShadow = true;
  hay.add(bale);
  for (const z of [-0.3, 0.3]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.035, 8, 20), mat(0x8a6a20, 1));
    band.position.set(0, 0.62, z);
    hay.add(band);
  }
  return hay;
}

export function buildPumpkin() {
  const pumpkin = new THREE.Group();
  // A squat ribbed pumpkin: a flattened sphere with a stem.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), mat(0xe06a12, 0.8));
  body.scale.set(1, 0.78, 1);
  body.position.y = 0.48;
  body.castShadow = true;
  pumpkin.add(body);
  for (let i = 0; i < 6; i += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 6, 18), mat(0xc25a1a, 0.9));
    rib.position.y = 0.48;
    rib.scale.set(1, 0.78, 1);
    rib.rotation.y = (i / 6) * Math.PI;
    pumpkin.add(rib);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.28, 8), mat(0x4a6b2a, 1));
  stem.position.y = 1.02;
  stem.rotation.z = 0.2;
  pumpkin.add(stem);
  return pumpkin;
}

export function buildCorn() {
  // One cob: yellow kernels in a cylinder, green husk leaves peeled back.
  const corn = new THREE.Group();
  const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.55, 10), mat(0xf2c230, 0.7));
  cob.rotation.z = Math.PI / 2;
  cob.position.y = 0.55;
  cob.castShadow = true;
  corn.add(cob);
  for (const side of [-1, 1]) {
    const husk = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 6), mat(0x5a8a2e, 0.9));
    husk.rotation.z = side * 1.9;
    husk.position.set(side * 0.28, 0.45, 0);
    corn.add(husk);
  }
  return corn;
}
