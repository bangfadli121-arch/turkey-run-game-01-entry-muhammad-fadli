// The farm at golden hour: gradient sky, low sun, drifting clouds, a dirt
// track through autumn grass, fences, pumpkins, trees and a red barn — plus
// the obstacles (oven, giant carving knife, hay bale, pumpkin) and the corn
// pickups. Everything is rounded geometry; the only flat things are the
// ground planes themselves.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function mat(color, roughness = 0.9, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
}

/** Runtime-generated speckle textures (no files, no network): they break
 *  up the flat ground planes so the near track does not read as one
 *  solid orange band. */
function speckleTexture(base, speckles, size = 256, count = 900) {
  // Seeded speckles: the same texture every load, so screenshots are
  // byte-identical between runs.
  let s = 0x9e3779b9;
  const rng = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < count; i += 1) {
    g.fillStyle = speckles[Math.floor(rng() * speckles.length)];
    g.globalAlpha = 0.25 + rng() * 0.4;
    const r = 1 + rng() * 3;
    g.beginPath();
    g.arc(rng() * size, rng() * size, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let dirtTex = null;
let grassTex = null;
function groundTextures() {
  if (!dirtTex) {
    dirtTex = speckleTexture('#A9743F', ['#8D5A2B', '#C89B6A', '#7A4A26']);
    dirtTex.repeat.set(2, 8);
    grassTex = speckleTexture('#7CB342', ['#558B2F', '#AED581', '#689F38']);
    grassTex.repeat.set(6, 8);
  }
  return { dirtTex, grassTex };
}

/** Sky dome + sun, in one group that follows the camera down the track
 *  (the dome is centred on the camera, so the woods 1500 m out still have
 *  a sky behind them). */
export function buildSky(scene) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(400, 32, 20);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      mid: { value: new THREE.Color(PALETTE.skyMid) },
      low: { value: new THREE.Color(PALETTE.skyLow) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 low;
      void main(){
        float h = normalize(vP).y;
        vec3 c = h > 0.45 ? mix(mid, top, smoothstep(0.45, 0.9, h)) : h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.45, h) * 0.45) : mix(low, mid, smoothstep(-0.05, 0.12, h));
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(geo, material);
  group.add(sky);

  // Low sun: a warm disc.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(11, 32),
    new THREE.MeshBasicMaterial({ color: PALETTE.sun, fog: false }),
  );
  sun.position.set(-90, 26, -330);
  sun.lookAt(0, 0, 0);
  group.add(sun);
  scene.add(group);
  return group;
}

/** A few soft cloud blobs, drifting slowly. */
export function buildClouds(scene, rng) {
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#FFE8D6', roughness: 1, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 9; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let j = 0; j < puffs; j += 1) {
      const r = 4 + rng() * 6;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), cloudMat);
      puff.position.set(j * 6 - puffs * 3 + rng() * 3, rng() * 2, rng() * 3);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set((rng() - 0.5) * 320, 45 + rng() * 35, -40 - rng() * 260);
    clouds.add(cloud);
  }
  scene.add(clouds);
  return clouds;
}

function tree(rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 2.2, 10), mat('#6D4520'));
  trunk.position.y = 1.1;
  trunk.castShadow = true;
  g.add(trunk);
  const cols = [PALETTE.tree, PALETTE.treeDark, PALETTE.leaf];
  const blobs = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < blobs; i += 1) {
    const r = 1.1 + rng() * 0.9;
    const b = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(cols[i % cols.length]));
    b.position.set((rng() - 0.5) * 1.6, 2.6 + rng() * 1.2, (rng() - 0.5) * 1.6);
    b.castShadow = true;
    g.add(b);
  }
  return g;
}

function fenceRun(length) {
  const g = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.1, 8);
  const postMat = mat(PALETTE.fence);
  const railGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
  for (let z = 0; z <= length; z += 3) {
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(0, 0.55, -z);
    p.castShadow = true;
    g.add(p);
  }
  for (const y of [0.45, 0.85]) {
    for (let z = 1.5; z < length; z += 3) {
      const r = new THREE.Mesh(railGeo, postMat);
      r.rotation.x = Math.PI / 2;
      r.position.set(0, y, -z);
      g.add(r);
    }
  }
  return g;
}

function pumpkin(rng) {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.55 + rng() * 0.25, 16, 12), mat(PALETTE.pumpkin));
  p.scale.set(1, 0.8, 1);
  p.position.y = 0.42;
  p.castShadow = true;
  g.add(p);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8), mat('#558B2F'));
  stem.position.y = 0.85;
  stem.rotation.z = 0.2;
  g.add(stem);
  return g;
}

/** One 30 m slice of the farm. Decorations are seeded per slice index so
 *  the world is the same every run with the same seed. */
export function buildSegment(index, rng) {
  const LEN = 30;
  const g = new THREE.Group();
  g.position.z = -index * LEN;

  const { dirtTex, grassTex } = groundTextures();
  // Grass base + dirt track (three lanes wide, with soft edges).
  const grassMat = mat(index % 2 ? PALETTE.grass : PALETTE.grassDark);
  grassMat.map = grassTex;
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, LEN + 0.2), grassMat);
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(0, 0, -LEN / 2);
  grass.receiveShadow = true;
  g.add(grass);
  const dirtMat = mat(PALETTE.dirt);
  dirtMat.map = dirtTex;
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(7.6, LEN + 0.2), dirtMat);
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.set(0, 0.01, -LEN / 2);
  dirt.receiveShadow = true;
  g.add(dirt);
  const dirtMid = new THREE.Mesh(new THREE.PlaneGeometry(5.4, LEN + 0.2), mat(PALETTE.dirtDark));
  dirtMid.rotation.x = -Math.PI / 2;
  dirtMid.position.set(0, 0.02, -LEN / 2);
  dirtMid.receiveShadow = true;
  g.add(dirtMid);

  // Fences along both edges.
  const fl = fenceRun(LEN);
  fl.position.set(-4.4, 0, 0);
  g.add(fl);
  const fr = fenceRun(LEN);
  fr.position.set(4.4, 0, 0);
  g.add(fr);

  // Scattered autumn trees, pumpkins and hay on the grass.
  const decorCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < decorCount; i += 1) {
    const side = rng() < 0.5 ? -1 : 1;
    const x = side * (7.5 + rng() * 13);
    const z = -(rng() * LEN);
    const roll = rng();
    let d;
    if (roll < 0.55) d = tree(rng);
    else if (roll < 0.8) d = pumpkin(rng);
    else {
      d = new THREE.Group();
      const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.1, 14), mat(PALETTE.hay));
      hay.rotation.z = Math.PI / 2;
      hay.position.y = 0.8;
      hay.castShadow = true;
      d.add(hay);
    }
    d.position.set(x, 0, z);
    d.rotation.y = rng() * Math.PI * 2;
    g.add(d);
  }

  // The red barn watches over the start of the run: a round barn, a
  // cylinder body under a cone roof, with a white door.
  if (index === 0) {
    const barn = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 3.4, 24), mat(PALETTE.barn));
    body.position.y = 1.7;
    body.castShadow = true;
    barn.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.2, 24), mat(PALETTE.barnRoof));
    roof.position.y = 4.5;
    roof.castShadow = true;
    barn.add(roof);
    const door = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), mat('#FFF8E7'));
    door.position.set(0, 1.2, 3.25);
    barn.add(door);
    const doorTrim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 10, 24), mat(PALETTE.barnRoof));
    doorTrim.position.set(0, 1.2, 3.26);
    barn.add(doorTrim);
    barn.position.set(-15, 0, -25);
    barn.rotation.y = 0.9;
    g.add(barn);
  }
  return g;
}

/** The woods at the end of the run: a wall of dark pines to escape into. */
export function buildWoods(scene) {
  const g = new THREE.Group();
  const pineMat = mat('#2E5B2E', 1);
  const trunkMat = mat('#4E342E');
  for (let i = 0; i < 26; i += 1) {
    const x = -30 + i * 2.5 + (i % 3) * 0.7;
    const h = 7 + (i % 4) * 1.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 8), trunkMat);
    trunk.position.set(x, 1, -1512 - (i % 5));
    g.add(trunk);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, h, 10), pineMat);
    cone.position.set(x, 2 + h / 2, -1512 - (i % 5));
    cone.castShadow = true;
    g.add(cone);
  }
  scene.add(g);
  return g;
}

// ---- Obstacles: tall ones must be dodged by switching lane, low ones by jumping.

export function buildOven() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 1.7, 20), mat(PALETTE.oven, 0.7));
  body.position.y = 0.95;
  body.castShadow = true;
  g.add(body);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(PALETTE.oven, 0.7));
  dome.position.y = 1.8;
  dome.castShadow = true;
  g.add(dome);
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.9, 10), mat('#2A2323', 0.8));
  chimney.position.set(0.3, 2.4, -0.2);
  chimney.castShadow = true;
  g.add(chimney);
  // Glowing oven door: the fire inside.
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), new THREE.MeshStandardMaterial({ color: PALETTE.ovenGlow, emissive: PALETTE.ovenGlow, emissiveIntensity: 1.6, roughness: 0.4 }));
  door.position.set(0, 0.9, 1.0);
  g.add(door);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.06, 10, 24), mat('#1A1515', 0.6));
  rim.position.set(0, 0.9, 1.0);
  g.add(rim);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.25, 8), mat('#1A1515'));
    leg.position.set(s * 0.7, 0.12, 0.5);
    g.add(leg);
  }
  g.userData = { kind: 'oven', tall: true, halfWidth: 0.95 };
  return g;
}

export function buildKnife() {
  const g = new THREE.Group();
  // Giant carving knife stabbed into the dirt, blade up at a steep lean.
  const tilt = new THREE.Group();
  tilt.rotation.z = 0.55;
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1.5, 0.06);
  shape.lineTo(1.95, 0.2);
  shape.lineTo(1.5, 0.34);
  shape.lineTo(0, 0.3);
  shape.closePath();
  const blade = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ color: PALETTE.knifeBlade, roughness: 0.2, metalness: 0.85 }),
  );
  blade.castShadow = true;
  blade.rotation.z = 0.5;
  blade.position.set(-0.4, 0.1, 0);
  tilt.add(blade);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.7, 12), mat(PALETTE.knifeHandle, 0.6));
  handle.rotation.z = Math.PI / 2 + 0.5;
  handle.position.set(-0.75, 1.35, 0);
  handle.castShadow = true;
  tilt.add(handle);
  g.add(tilt);
  g.userData = { kind: 'knife', tall: true, halfWidth: 0.7 };
  return g;
}

export function buildHayBale() {
  const g = new THREE.Group();
  const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.3, 18), mat(PALETTE.hay));
  bale.rotation.z = Math.PI / 2;
  bale.position.y = 0.85;
  bale.castShadow = true;
  g.add(bale);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.04, 8, 24), mat('#B89A00'));
  band.rotation.y = Math.PI / 2;
  band.position.y = 0.85;
  g.add(band);
  g.userData = { kind: 'hay', tall: false, halfWidth: 0.85, height: 1.7 };
  return g;
}

export function buildPumpkinObstacle() {
  const g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.72, 18, 14), mat(PALETTE.pumpkin));
  p.scale.set(1, 0.82, 1);
  p.position.y = 0.58;
  p.castShadow = true;
  g.add(p);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 8), mat('#558B2F'));
  stem.position.y = 1.15;
  stem.rotation.z = 0.25;
  g.add(stem);
  g.userData = { kind: 'pumpkin', tall: false, halfWidth: 0.72, height: 1.2 };
  return g;
}

/** A corn cob pickup: golden cob, green husk, floating and spinning. */
export function buildCorn() {
  const g = new THREE.Group();
  const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.55, 12), mat(PALETTE.corn, 0.5));
  cob.rotation.x = Math.PI / 2;
  cob.castShadow = true;
  g.add(cob);
  for (const s of [-1, 1]) {
    const husk = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.4, 8), mat(PALETTE.cornHusk));
    husk.rotation.x = s > 0 ? Math.PI / 2 + 0.5 : -Math.PI / 2 - 0.5;
    husk.position.set(0, 0, s * 0.3);
    g.add(husk);
  }
  g.userData = { kind: 'corn' };
  return g;
}
