// The 3D view: renderer, golden-hour lights, chase camera, and the sync
// from world state to meshes. HUD and title/end screens are DOM over the
// canvas, so their text stays crisp in screenshots.
import * as THREE from 'three';
import { ESCAPE_DISTANCE, LANES, PALETTE } from './config.js';
import { createRandom } from './random.js';
import { buildTurkey, animateTurkey } from './turkey.js';
import { buildFarmer, animateFarmer } from './farmer.js';
import {
  buildSky, buildClouds, buildSegment, buildWoods,
  buildOven, buildKnife, buildHayBale, buildPumpkinObstacle, buildCorn,
} from './environment.js';

const OBSTACLE_BUILDERS = {
  oven: buildOven,
  knife: buildKnife,
  hay: buildHayBale,
  pumpkin: buildPumpkinObstacle,
};

export function createRenderer(container, hud) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(new THREE.Color(PALETTE.fog), 35, 130);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);

  // Golden-hour sun, low from the left, warm; plus a soft sky fill.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.1);
  sun.position.set(-30, 26, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -40;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xffc98a, 0x5a7a3a, 0.9));

  const skyGroup = buildSky(scene);
  const clouds = buildClouds(scene, createRandom(20261127));
  buildWoods(scene);

  const turkey = buildTurkey();
  scene.add(turkey.group);
  const farmer = buildFarmer();
  scene.add(farmer.group);

  const segments = new Map(); // index -> Group
  const obstacles = new Map(); // id -> Group
  const corns = new Map(); // id -> Group

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.isMesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else if (m) m.dispose();
      }
    });
    scene.remove(g);
  }

  function syncSegments(wanted) {
    for (const [i, g] of [...segments]) {
      if (!wanted.has(i)) {
        disposeGroup(g);
        segments.delete(i);
      }
    }
    for (const i of wanted) {
      if (segments.has(i)) continue;
      // Segment decorations are seeded by index: same world every run.
      let seed = (i * 2654435761) >>> 0;
      const rng = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const seg = buildSegment(i, rng);
      scene.add(seg);
      segments.set(i, seg);
    }
  }

  function syncObstacles(list, playerZ) {
    const alive = new Set();
    for (const o of list) {
      alive.add(o.id);
      if (!obstacles.has(o.id)) {
        const mesh = OBSTACLE_BUILDERS[o.kind]();
        mesh.position.set(LANES[o.lane], 0, o.z);
        scene.add(mesh);
        obstacles.set(o.id, mesh);
      }
      const mesh = obstacles.get(o.id);
      if (o.hit) {
        mesh.rotation.z = 0.35;
        mesh.position.y = -0.15;
      }
    }
    for (const [id, mesh] of [...obstacles]) {
      // Gone once it is behind the turkey and out of the camera's view:
      // a passed oven must not sit in the foreground blocking the shot.
      if (!alive.has(id) || mesh.position.z > playerZ + 8) {
        disposeGroup(mesh);
        obstacles.delete(id);
      }
    }
  }

  function syncCorns(list, playerZ, t) {
    const alive = new Set();
    for (const c of list) {
      if (c.taken) continue;
      alive.add(c.id);
      if (!corns.has(c.id)) {
        const mesh = buildCorn();
        mesh.position.set(LANES[c.lane], 1.05, c.z);
        scene.add(mesh);
        corns.set(c.id, mesh);
      }
      const mesh = corns.get(c.id);
      mesh.rotation.y = t * 2.2;
      mesh.position.y = 1.05 + Math.sin(t * 3 + c.id) * 0.12;
    }
    for (const [id, mesh] of [...corns]) {
      if (!alive.has(id) || mesh.position.z > playerZ + 20) {
        disposeGroup(mesh);
        corns.delete(id);
      }
    }
  }

  function setOverlay(which, data) {
    for (const [name, el] of Object.entries(hud.overlays)) {
      el.classList.toggle('show', name === which);
    }
    if (which === 'caught') {
      hud.caughtScore.textContent = `Score ${data.score}  ·  ${Math.floor(data.distance)} m  ·  ${data.corn} corn`;
    }
    if (which === 'escaped') {
      hud.escapedScore.textContent = `Score ${data.score}  ·  ${Math.floor(data.distance)} m  ·  ${data.corn} corn`;
    }
    if (which === 'title') {
      hud.bestLine.textContent = data.best > 0 ? `Best score: ${data.best}` : 'Your first run — the farmer is hungry.';
    }
  }

  function draw(state, t) {
    const pz = -state.distance;
    // Turkey.
    turkey.group.position.set(state.x, state.y, pz);
    const lean = (state.x - LANES[state.lane]) * -0.12;
    animateTurkey(turkey, t, state.speed / 17, lean, state.airborne, state.vy, state.y);
    turkey.group.visible = !(state.invulnerable > 0 && Math.floor(t * 12) % 2 === 0);
    if (state.screen === 'caught') {
      turkey.group.rotation.z = 1.35;
      turkey.group.position.y = 0.25;
      turkey.group.visible = true;
    }
    if (state.screen === 'escaped') {
      turkey.group.rotation.z = 0;
      turkey.group.rotation.x = 0;
      turkey.group.position.y = Math.abs(Math.sin(t * 6)) * 0.25;
    }

    // Farmer: always a few metres behind, looming.
    const gap = state.screen === 'caught' ? 1.4 : state.screen === 'escaped' ? 18 : state.farmerGap;
    farmer.group.position.set(state.x * 0.85, 0, pz + gap);
    farmer.group.visible = true;
    animateFarmer(farmer, t, state.speed / 17);

    // Chase camera. The framing depends on the screen: on the title the
    // camera sits back so the farmer reads as a whole figure at the bottom
    // instead of a hat filling the frame; in play it sits higher, so the
    // farmer (near) reads below the turkey (far).
    const screen = state.screen;
    const camY = screen === 'title' ? 4.0 : screen === 'caught' ? 3.8 : 4.6;
    const camZ = screen === 'title' ? pz + 13 : screen === 'caught' ? pz + 10 : pz + 12;
    const lookY = screen === 'title' ? 1.0 : screen === 'caught' ? 1.0 : 0.8;
    const camX = state.x * 0.5;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(state.x * 0.8, lookY, pz - 16);
    skyGroup.position.set(0, 0, pz);
    sun.position.set(state.x - 30, 26, pz + 18);
    sun.target.position.set(state.x, 0, pz - 10);
    sun.target.updateMatrixWorld();

    clouds.position.z = pz * 0.02;
    clouds.rotation.y = t * 0.002;

    syncSegments(state.segments);
    syncObstacles(state.obstacles, pz);
    syncCorns(state.corns, pz, t);

    // HUD.
    const progress = Math.min(1, state.distance / ESCAPE_DISTANCE);
    hud.score.textContent = String(state.score);
    hud.distance.textContent = `${Math.floor(state.distance)} m`;
    hud.corn.textContent = `CORN ${state.corn}`;
    hud.lives.textContent = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 3 - state.lives));
    hud.level.textContent = `LEVEL ${state.level}`;
    hud.progress.style.width = `${(progress * 100).toFixed(1)}%`;
    const farmerNear = state.farmerGap <= 4 && state.screen === 'play';
    hud.warning.classList.toggle('show', farmerNear);
    if (farmerNear) hud.warning.textContent = `THE FARMER IS ${state.farmerGap.toFixed(1)} m BEHIND YOU!`;

    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', resize);

  return { draw, setOverlay, resize };
}
