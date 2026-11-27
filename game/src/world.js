// The game rules, pure logic: no rendering here. The world advances in
// fixed 1/60 s steps. The turkey runs down three lanes toward the woods
// 1500 m away; the farmer closes in after every hit; three hits and the
// turkey is caught. Ovens and carving knives are tall — switch lane.
// Hay bales and pumpkins are low — jump them. Corn is +10.
import { createRandom } from './random.js';
import {
  ESCAPE_DISTANCE, FARMER, LANES, LIVES, PLAYER, RUN, SPAWN, STEP,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_ESCAPED = 8;
export const EVENT_LEVEL = 16;

const OBSTACLE_KINDS = ['oven', 'knife', 'hay', 'pumpkin'];
const SPAWN_AHEAD = 150; // metres ahead of the turkey that rows are planned
const DESPAWN_BEHIND = 20;

export function createWorld(seed) {
  const rng = createRandom(seed);
  let rngFn = rng;
  const state = freshState();

  function freshState() {
    return {
      screen: 'title',
      time: 0,
      distance: 0,
      score: 0,
      corn: 0,
      lives: LIVES,
      level: 1,
      speed: RUN.baseSpeed,
      farmerGap: FARMER.startGap,
      lane: 1, // target lane index
      x: 0,
      y: 0,
      vy: 0,
      airborne: false,
      invulnerable: 0,
      hitSlow: 0,
      nextRowAt: 40, // first obstacle row, metres ahead
      obstacles: [],
      corns: [],
      segments: new Set(),
      nextId: 1,
    };
  }

  function reset() {
    const s = freshState();
    Object.assign(state, s);
    rngFn = createRandom(seed);
    state.screen = 'title';
    ensureSpawn();
  }

  function levelFor(distance) {
    return Math.min(RUN.maxLevel, 1 + Math.floor(distance / RUN.levelEvery));
  }

  function rowGap() {
    const t = (state.level - 1) / (RUN.maxLevel - 1);
    return SPAWN.rowGap - (SPAWN.rowGap - SPAWN.rowGapMin) * t;
  }

  function planRow(z) {
    // Choose which lanes hold tall blockers (never all three), which hold
    // low jumpables, and where a corn line goes.
    const lanes = [0, 1, 2].sort(() => rngFn() - 0.5);
    const tallCount = state.level >= 3 && rngFn() < 0.4 ? 2 : 1;
    const row = [];
    for (let i = 0; i < tallCount; i += 1) {
      const kind = OBSTACLE_KINDS[Math.floor(rngFn() * 2)]; // oven | knife
      row.push({ kind, lane: lanes[i] });
    }
    // A low obstacle in another lane, sometimes.
    if (rngFn() < 0.55) {
      const kind = OBSTACLE_KINDS[2 + Math.floor(rngFn() * 2)]; // hay | pumpkin
      row.push({ kind, lane: lanes[tallCount] });
    }
    for (const o of row) {
      const id = state.nextId;
      state.nextId += 1;
      state.obstacles.push({
        id,
        kind: o.kind, lane: o.lane, z,
        hit: false, passed: false,
      });
    }
    // Corn line in a lane the row left open, sometimes.
    if (rngFn() < SPAWN.cornRowChance) {
      const free = [0, 1, 2].find((l) => !row.some((o) => o.lane === l));
      const cornLane = free ?? lanes[2];
      for (let i = 0; i < SPAWN.cornPerRow; i += 1) {
        const id = state.nextId;
        state.nextId += 1;
        state.corns.push({ id, lane: cornLane, z: z - 3 - i * 2.2, taken: false });
      }
    }
  }

  function ensureSpawn() {
    const ahead = state.distance + SPAWN_AHEAD;
    while (state.nextRowAt < ahead) {
      planRow(-state.nextRowAt);
      state.nextRowAt += rowGap();
    }
    // Ground segments the renderer needs.
    const seg = Math.floor(state.distance / 30);
    for (let i = Math.max(0, seg - 1); i <= seg + 5; i += 1) state.segments.add(i);
  }

  function prune() {
    // Drop only what is well behind the turkey; everything ahead stays.
    const behind = -state.distance + DESPAWN_BEHIND;
    state.obstacles = state.obstacles.filter((o) => o.z < behind);
    state.corns = state.corns.filter((c) => !c.taken && c.z < behind);
    const seg = Math.floor(state.distance / 30);
    for (const i of [...state.segments]) {
      if (i < seg - 1 || i > seg + 6) state.segments.delete(i);
    }
  }

  /** Advance one fixed step. `act` is { move: -1|0|1, jump: bool, drop: bool }. */
  function step(dt, act) {
    if (state.screen !== 'play') return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;

    // Level + speed.
    const level = levelFor(state.distance);
    if (level !== state.level) {
      state.level = level;
      events |= EVENT_LEVEL;
    }
    const targetSpeed = RUN.baseSpeed + ((RUN.maxSpeed - RUN.baseSpeed) * (state.level - 1)) / (RUN.maxLevel - 1);
    state.speed = state.hitSlow > 0 ? targetSpeed * 0.55 : targetSpeed;
    if (state.hitSlow > 0) state.hitSlow -= dt;
    if (state.invulnerable > 0) state.invulnerable -= dt;

    // Lane + jump.
    if (act.move !== 0) {
      state.lane = Math.max(0, Math.min(2, state.lane + act.move));
    }
    const targetX = LANES[state.lane];
    const dx = targetX - state.x;
    const stepX = PLAYER.laneSwitch * dt;
    state.x += Math.abs(dx) <= stepX ? dx : Math.sign(dx) * stepX;
    if (act.jump && !state.airborne) {
      state.vy = 9.5;
      state.airborne = true;
    }
    if (act.drop && state.airborne) state.vy = Math.min(state.vy, -16);
    if (state.airborne) {
      state.y += state.vy * dt;
      state.vy -= 24 * dt;
      if (state.y <= 0) {
        state.y = 0;
        state.vy = 0;
        state.airborne = false;
      }
    }

    state.distance += state.speed * dt;
    state.score = Math.floor(state.distance) + state.corn * 10;
    ensureSpawn();

    const pz = -state.distance;
    // Collisions.
    for (const o of state.obstacles) {
      if (o.hit || o.passed) continue;
      const dz = o.z - pz;
      if (dz < -1.2) continue; // still ahead of the turkey
      if (dz > 1.2) { o.passed = true; continue; } // already behind
      const half = o.kind === 'oven' ? 0.95 : o.kind === 'knife' ? 0.7 : o.kind === 'hay' ? 0.85 : 0.72;
      const top = o.kind === 'oven' || o.kind === 'knife' ? 2.6 : o.kind === 'hay' ? 1.7 : 1.2;
      if (Math.abs(LANES[o.lane] - state.x) < half + 0.42) {
        if (state.y > top) { o.passed = true; continue; } // jumped clear
        if (state.invulnerable <= 0) {
          o.hit = true;
          state.lives -= 1;
          state.farmerGap -= FARMER.closePerHit;
          state.invulnerable = PLAYER.invulnerable;
          state.hitSlow = 0.7;
          events |= EVENT_HIT;
          if (state.lives <= 0 || state.farmerGap <= FARMER.catchGap) {
            state.screen = 'caught';
            events |= EVENT_CAUGHT;
            return events;
          }
        } else {
          o.passed = true;
        }
      }
    }
    // Corn.
    for (const c of state.corns) {
      if (c.taken) continue;
      const dz = c.z - pz;
      if (Math.abs(dz) < 1.1 && Math.abs(LANES[c.lane] - state.x) < 0.85 && state.y < 1.8) {
        c.taken = true;
        state.corn += 1;
        events |= EVENT_CORN;
      }
    }
    if (state.distance >= ESCAPE_DISTANCE) {
      state.screen = 'escaped';
      events |= EVENT_ESCAPED;
      return events;
    }
    prune();
    return events;
  }

  function start() {
    reset();
    state.screen = 'play';
  }

  return { state, reset, start, step, STEP };
}
