// Turkey Escape — three.js renderer: scene, camera, and per-frame sync.
// Written from scratch in this session (27 Nov 2026 rewrite).
// The world owns the rules; this module only shows them. The turkey
// stays near z = 0 while rows, corn and scenery stream past it: a row's
// on-screen z is its absolute distance minus the turkey's distance.
// That keeps the camera fixed and the scene cheap to update.
//
// IMPORTANT: the jump height comes from state.y and is passed straight
// to animateTurkey, so a jump is always visible on screen.

import * as THREE from 'three';
import {
  LANE_X,
  GOAL_DISTANCE,
} from './config.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED } from './world.js';
import { hashInt } from './random.js';
import { buildTurkey, animateTurkey } from './turkey.js';
import { buildFarmer, animateFarmer } from './farmer.js';
import {
  buildGround,
  buildTrack,
  buildSun,
  buildCloud,
  buildBarn,
  buildAutumnTree,
  buildPine,
  buildFencePost,
  buildFenceRail,
  buildOven,
  buildKnife,
  buildHay,
  buildPumpkin,
  buildCorn,
} from './environment.js';

const SKY = 0xf5521e;
const FOG_COLOR = 0xe86a24;

const OBSTACLE_BUILDERS = {
  oven: buildOven,
  knife: buildKnife,
  hay: buildHay,
  pumpkin: buildPumpkin,
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(FOG_COLOR, 45, 155);

  const camera = new THREE.PerspectiveCamera(58, 1280 / 720, 0.1, 400);
  camera.position.set(0, 3.4, -7.6);

  // Golden-hour light: warm sun from the front-left, soft sky fill.
  const sun = new THREE.DirectionalLight(0xffe0b3, 2.4);
  sun.position.set(-10, 16, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -25;
  sun.shadow.camera.right = 25;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 70;
  scene.add(sun);
  sun.target.position.set(0, 0, 12);
  scene.add(sun.target);
  scene.add(new THREE.HemisphereLight(0xffd9a0, 0x3f5a2e, 0.9));

  // Static ground and track: the turkey never moves in z, so a long
  // plane centred ahead of the camera covers the whole visible run.
  const ground = buildGround();
  ground.position.z = 60;
  scene.add(ground);
  const track = buildTrack();
  track.position.z = 60;
  scene.add(track);

  // Sun disc and clouds sit far ahead and never move with distance.
  scene.add(buildSun());
  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    const cloud = buildCloud(-30 + i * 13, 20 + (i % 3) * 5, 45 + i * 16, 1.4 + (i % 2) * 0.7);
    cloud.userData.baseX = cloud.position.x;
    scene.add(cloud);
    clouds.push(cloud);
  }

  // The red barn marks the start of the run, on the left of the screen
  // (screen-left is +x for a camera looking down +z).
  const barn = buildBarn();
  barn.position.set(14, 0, 0);
  scene.add(barn);

  // Fence rails are continuous along the track; only the posts recycle.
  for (const side of [-1, 1]) {
    for (const h of [0.55, 0.95]) {
      const rail = buildFenceRail(170);
      rail.position.set(side * 4.6, h, 65);
      scene.add(rail);
    }
  }
  const fencePosts = [];
  for (let i = 0; i < 42; i += 1) {
    for (const side of [-1, 1]) {
      const post = buildFencePost();
      post.position.x = side * 4.6;
      scene.add(post);
      fencePosts.push({ mesh: post, index: i * 2 + (side < 0 ? 0 : 1) });
    }
  }

  // Tree pools: autumn trees along the whole run, pines near the woods.
  const treePool = [];
  for (let i = 0; i < 26; i += 1) {
    const tree = buildAutumnTree(i);
    scene.add(tree);
    treePool.push(tree);
  }
  const pinePool = [];
  for (let i = 0; i < 18; i += 1) {
    const pine = buildPine(i);
    scene.add(pine);
    pinePool.push(pine);
  }

  const turkey = buildTurkey();
  scene.add(turkey);
  const farmer = buildFarmer();
  scene.add(farmer);

  // Live obstacles and corn, keyed by the world object they belong to.
  const rowGroups = new Map();
  const cornGroups = new Map();

  function buildRowGroup(row) {
    const group = new THREE.Group();
    row.cells.forEach((kind, lane) => {
      if (!kind) return;
      const mesh = OBSTACLE_BUILDERS[kind]();
      mesh.position.x = LANE_X[lane];
      group.add(mesh);
    });
    return group;
  }

  function syncObstacles(state) {
    for (const row of state.rows) {
      const relZ = row.dist - state.distance;
      if (relZ < -5 || relZ > 135) {
        const old = rowGroups.get(row);
        if (old) {
          scene.remove(old);
          rowGroups.delete(row);
        }
        continue;
      }
      let group = rowGroups.get(row);
      if (!group) {
        group = buildRowGroup(row);
        scene.add(group);
        rowGroups.set(row, group);
      }
      group.position.z = relZ;
    }
    // Drop groups whose rows were pruned from the state.
    for (const [row, group] of rowGroups) {
      if (!state.rows.includes(row)) {
        scene.remove(group);
        rowGroups.delete(row);
      }
    }
  }

  function syncCorn(state, time) {
    for (const cob of state.corns) {
      if (cob.taken) {
        const old = cornGroups.get(cob);
        if (old) {
          scene.remove(old);
          cornGroups.delete(cob);
        }
        continue;
      }
      const relZ = cob.dist - state.distance;
      if (relZ < -4 || relZ > 135) {
        const old = cornGroups.get(cob);
        if (old) {
          scene.remove(old);
          cornGroups.delete(cob);
        }
        continue;
      }
      let group = cornGroups.get(cob);
      if (!group) {
        group = buildCorn();
        scene.add(group);
        cornGroups.set(cob, group);
      }
      group.position.set(LANE_X[cob.lane], 0, relZ);
      group.rotation.y = time * 2 + cob.dist;
    }
    for (const [cob, group] of cornGroups) {
      if (!state.corns.includes(cob)) {
        scene.remove(group);
        cornGroups.delete(cob);
      }
    }
  }

  function syncScenery(state, time) {
    const d = state.distance;
    // Fence posts recycle every 4 m.
    const base = Math.floor((d - 12) / 4) * 4;
    for (const { mesh, index } of fencePosts) {
      const absDist = base + index * 2;
      mesh.position.z = absDist - d;
      mesh.visible = absDist - d > -14 && absDist - d < 150;
    }
    // Autumn trees recycle every 26 m, alternating sides.
    const treeBase = Math.floor((d - 10) / 26) * 26;
    treePool.forEach((tree, j) => {
      const absDist = treeBase + j * 26 + hashInt(j * 3 + 1) * 10;
      const side = j % 2 === 0 ? -1 : 1;
      tree.position.set(side * (9 + hashInt(j * 3 + 2) * 8), 0, absDist - d);
      tree.visible = absDist - d > -14 && absDist - d < 150;
    });
    // Pines only once the woods are near (and on the escaped screen).
    // Tight spacing and close to the track so the final stretch really
    // feels like running into a pine forest.
    const pineBase = Math.floor((d - 10) / 18) * 18;
    pinePool.forEach((pine, j) => {
      const absDist = pineBase + j * 18 + hashInt(j * 5 + 4) * 8;
      const side = j % 2 === 0 ? -1 : 1;
      pine.position.set(side * (5.5 + hashInt(j * 5 + 6) * 4.5), 0, absDist - d);
      pine.visible = absDist > 1150 && absDist - d > -14 && absDist - d < 150;
    });
    // Barn sits at the start line and slides away behind the camera.
    barn.position.z = 10 - d;
    barn.visible = barn.position.z > -20 && barn.position.z < 150;
    // Clouds drift slowly sideways — a pure function of time, so a
    // frozen frame (screenshot mode) renders identically every time.
    clouds.forEach((cloud, i) => {
      cloud.position.x = cloud.userData.baseX + Math.sin(time * 0.05 + i * 1.7) * 1.2;
    });
  }

  function sync(state, time) {
    // Chase camera: behind and above the turkey, looking down the track.
    // Far enough back that the farmer (8 m behind at the start) shows
    // at the bottom of the frame on the title screen.
    camera.position.set(state.x * 0.55, 3.4, -10.5);
    camera.lookAt(state.x * 0.7, 1.0, 14);
    sun.position.set(state.x - 10, 16, 6);
    sun.target.position.set(state.x, 0, 12);

    const lean = clamp((LANE_X[state.lane] - state.x) / 2.4, -1, 1);
    turkey.position.set(state.x, 0, 0);
    if (state.screen === SCREEN_CAUGHT) {
      // Dinner time: the turkey lies on its back, the farmer over it.
      animateTurkey(turkey, time, 0, 0, true, 0);
      turkey.position.y = 0.42;
      turkey.rotation.set(0.4, 0, Math.PI * 0.88);
      farmer.visible = true;
      farmer.position.set(state.x, 0, 1.1);
      farmer.rotation.y = Math.PI;
      animateFarmer(farmer, time, 0, false, 0.4);
    } else if (state.screen === SCREEN_ESCAPED) {
      animateTurkey(turkey, time, state.y, 0, state.grounded, 0);
      turkey.position.y = state.y + 0.05;
      // The farmer is left far behind in the fields: hide him so the
      // woods belong to the turkey alone on this screen.
      farmer.visible = false;
    } else {
      farmer.visible = true;
      animateTurkey(turkey, time, state.y, state.speed, state.grounded, lean);
      farmer.position.set(state.x * 0.9, 0, -state.gap);
      farmer.rotation.y = 0;
      animateFarmer(farmer, time, state.speed, true, state.gap);
    }

    syncObstacles(state);
    syncCorn(state, time);
    syncScenery(state, time);
    renderer.render(scene, camera);
  }

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function reset() {
    for (const [, group] of rowGroups) scene.remove(group);
    for (const [, group] of cornGroups) scene.remove(group);
    rowGroups.clear();
    cornGroups.clear();
  }

  return { sync, resize, reset, renderer, scene, camera };
}
