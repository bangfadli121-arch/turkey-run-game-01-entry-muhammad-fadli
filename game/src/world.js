// Turkey Escape — pure game logic, no rendering, no DOM.
// Written from scratch in this session (27 Nov 2026 rewrite).
// This module is the whole ruleset: lanes, speed, levels, spawning,
// collisions, corn, lives and the farmer gap. It runs identically in a
// browser and in Node, which is how the headless autopilot and the
// staged screenshots verify the game without a screen.
//
// Coordinates: the turkey runs down +z in world space, but this module
// only tracks distance along the track. The renderer turns a row's
// absolute distance into a relative z (row - distance).

import {
  STEP,
  GOAL_DISTANCE,
  LANE_COUNT,
  LANE_WIDTH,
  LANE_X,
  START_LIVES,
  START_GAP,
  GAP_CLOSE,
  CORN_POINTS,
  COLLISION_HALF,
  LOW_CLEAR_HEIGHT,
  GRAVITY,
  JUMP_SPEED,
  DROP_MULTIPLIER,
  LATERAL_SPEED,
  INVULN_SECONDS,
  SPAWN_AHEAD,
  FIRST_ROW_AT,
  ROW_GAP_MIN,
  ROW_GAP_MAX,
  FIRST_CORN_AT,
  CORN_GAP_MIN,
  CORN_GAP_MAX,
  CORN_LINE_MIN,
  CORN_LINE_MAX,
  CORN_SPACING,
  TALL_KINDS,
  ALL_KINDS,
  speedForLevel,
  levelForDistance,
} from './config.js';
import { makeRng } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_CAUGHT = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_CORN = 8;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAYING = 'playing';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

// The lane the turkey's body is physically closest to. Collisions and
// corn use this, not the target lane, so a mid-switch turkey is judged
// by where it actually is.
export function physicalLane(x) {
  const idx = Math.round(x / LANE_WIDTH) + 1;
  return Math.max(0, Math.min(LANE_COUNT - 1, idx));
}

function freshState(seed) {
  return {
    seed,
    screen: SCREEN_TITLE,
    distance: 0,
    speed: speedForLevel(1),
    level: 1,
    score: 0,
    corn: 0,
    lives: START_LIVES,
    gap: START_GAP,
    lane: 1, // target lane index (starts centre)
    x: LANE_X[1],
    y: 0, // jump height above the track
    vy: 0,
    grounded: true,
    jumpBuffer: 0, // seconds a jump press stays valid before landing
    invuln: 0,
    time: 0,
    rows: [], // { dist, cells: [kind|null, kind|null, kind|null] }
    corns: [], // { dist, lane, taken }
    nextRowAt: FIRST_ROW_AT,
    nextCornAt: FIRST_CORN_AT,
  };
}

export function createWorld(seed = 1) {
  let rng = makeRng(seed);
  const state = freshState(seed);

  function spawnRow(dist) {
    const cells = [null, null, null];
    if (rng.chance(0.5)) {
      // One obstacle in a random lane.
      const lane = rng.int(0, LANE_COUNT - 1);
      cells[lane] = rng.pick(ALL_KINDS);
    } else {
      // Two obstacles in two different lanes. A row never blocks all
      // three lanes with tall obstacles: with two obstacles at most,
      // one lane is always free of tall ones, so the row is always
      // survivable by switching.
      const lanes = rng.shuffle([0, 1, 2]);
      const first = lanes[0];
      const second = lanes[1];
      cells[first] = rng.pick(ALL_KINDS);
      cells[second] = rng.pick(ALL_KINDS);
    }
    state.rows.push({ dist, cells });
  }

  function spawnCornLine(dist) {
    const lane = rng.int(0, LANE_COUNT - 1);
    const count = rng.int(CORN_LINE_MIN, CORN_LINE_MAX);
    for (let i = 0; i < count; i += 1) {
      state.corns.push({ dist: dist + i * CORN_SPACING, lane, taken: false });
    }
  }

  function reset(nextSeed) {
    rng = makeRng(nextSeed);
    Object.assign(state, freshState(nextSeed));
  }

  function start() {
    reset(state.seed);
    state.screen = SCREEN_PLAYING;
  }

  function togglePause() {
    if (state.screen === SCREEN_PLAYING) state.screen = SCREEN_PAUSED;
    else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAYING;
  }

  function step(dt, action) {
    if (state.screen !== SCREEN_PLAYING) return EVENT_NONE;
    let events = EVENT_NONE;
    state.time += dt;

    // Lane change: one lane per steer, clamped to the track.
    if (action && action.steer) {
      state.lane = Math.max(0, Math.min(LANE_COUNT - 1, state.lane + action.steer));
    }
    const targetX = LANE_X[state.lane];
    const dx = targetX - state.x;
    const maxStep = LATERAL_SPEED * dt;
    state.x += Math.max(-maxStep, Math.min(maxStep, dx));

    // Jump and gravity. Dropping multiplies gravity while airborne.
    // A jump pressed just before landing is buffered (0.12 s), so a
    // slightly early press still jumps instead of being swallowed.
    if (action && action.jump) {
      if (state.grounded) {
        state.vy = JUMP_SPEED;
        state.grounded = false;
        state.jumpBuffer = 0;
      } else {
        state.jumpBuffer = 0.12;
      }
    }
    const gravity = GRAVITY * (action && action.drop && !state.grounded ? DROP_MULTIPLIER : 1);
    state.vy -= gravity * dt;
    state.y += state.vy * dt;
    if (state.y <= 0) {
      state.y = 0;
      state.vy = 0;
      state.grounded = true;
      if (state.jumpBuffer > 0) {
        state.vy = JUMP_SPEED;
        state.grounded = false;
        state.jumpBuffer = 0;
      }
    }
    if (state.jumpBuffer > 0) state.jumpBuffer -= dt;

    // Forward motion: speed follows the level, level follows distance.
    state.speed = speedForLevel(state.level);
    state.distance += state.speed * dt;
    state.level = levelForDistance(state.distance);
    if (state.invuln > 0) state.invuln -= dt;

    // Spawn ahead, prune behind.
    while (state.nextRowAt < state.distance + SPAWN_AHEAD) {
      spawnRow(state.nextRowAt);
      state.nextRowAt += ROW_GAP_MIN + rng.next() * (ROW_GAP_MAX - ROW_GAP_MIN);
    }
    while (state.nextCornAt < state.distance + SPAWN_AHEAD) {
      spawnCornLine(state.nextCornAt);
      state.nextCornAt += CORN_GAP_MIN + rng.next() * (CORN_GAP_MAX - CORN_GAP_MIN);
    }
    state.rows = state.rows.filter((row) => row.dist > state.distance - 8);
    state.corns = state.corns.filter((cob) => !cob.taken && cob.dist > state.distance - 8);

    const laneNow = physicalLane(state.x);

    // Collisions: only the row overlapping the turkey this step matters.
    for (const row of state.rows) {
      if (Math.abs(row.dist - state.distance) > COLLISION_HALF) continue;
      for (let lane = 0; lane < LANE_COUNT; lane += 1) {
        const kind = row.cells[lane];
        if (!kind || lane !== laneNow) continue;
        // Low obstacles are cleared by jumping high enough.
        if (!TALL_KINDS.includes(kind) && state.y >= LOW_CLEAR_HEIGHT) continue;
        row.cells[lane] = null;
        if (state.invuln > 0) continue;
        state.lives -= 1;
        state.gap = Math.max(0.4, START_GAP - (START_LIVES - state.lives) * GAP_CLOSE);
        state.invuln = INVULN_SECONDS;
        events |= EVENT_HIT;
        if (state.lives <= 0) {
          state.screen = SCREEN_CAUGHT;
          events |= EVENT_CAUGHT;
        }
      }
    }

    // Corn: close enough, same physical lane, low enough to grab.
    for (const cob of state.corns) {
      if (cob.taken) continue;
      if (Math.abs(cob.dist - state.distance) > 1.1) continue;
      if (cob.lane !== laneNow || state.y > 1.3) continue;
      cob.taken = true;
      state.corn += 1;
      events |= EVENT_CORN;
    }

    state.score = Math.floor(state.distance) + CORN_POINTS * state.corn;

    if (state.distance >= GOAL_DISTANCE) {
      state.distance = GOAL_DISTANCE;
      state.score = Math.floor(state.distance) + CORN_POINTS * state.corn;
      state.screen = SCREEN_ESCAPED;
      events |= EVENT_ESCAPED;
    }

    return events;
  }

  return {
    state,
    start,
    step,
    reset,
    togglePause,
    // Convenience for the browser loop: run one fixed step.
    fixedStep(action) {
      return step(STEP, action);
    },
  };
}
