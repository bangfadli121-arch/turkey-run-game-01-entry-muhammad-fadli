// The screenshot scenes behind ?shot=start|play|caught|escaped. Each one
// plays the real rules forward from a fresh world, steered by an autopilot,
// so every frame is what a short game really looks like and the same seed
// always gives the same frame.
import { EVENT_CAUGHT, EVENT_ESCAPED } from './world.js';
import { LANES, STEP } from './config.js';

const PLAY_SECONDS = 22;
const LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Is `lane` clear of tall blockers in the nearest row ahead? The pilot
 *  plans one row at a time: it must be in a lane with no tall obstacle
 *  when it crosses the next row, then it re-plans for the row after.
 *  (A fixed look-ahead window corners it at level 5, where two rows can
 *  block all three lanes between them while no single lane survives both.) */
function laneSafe(state, lane) {
  const pz = -state.distance;
  let nearest = Infinity;
  for (const o of state.obstacles) {
    if (o.hit || o.passed) continue;
    const dz = pz - o.z;
    if (dz > 0 && dz < nearest) nearest = dz;
  }
  if (nearest === Infinity) return true;
  for (const o of state.obstacles) {
    if (o.hit || o.passed) continue;
    const dz = pz - o.z;
    if (dz <= 0 || dz > nearest + 6) continue;
    if (o.lane !== lane) continue;
    if (o.kind === 'oven' || o.kind === 'knife') return false;
  }
  return true;
}

/** The careful pilot: keep the current lane when safe, else the nearest
 *  safe lane. When `chaseCorn` it also drifts toward the lane with the
 *  most corn — but only while the next row is far away, so it never
 *  oscillates between lanes right before a row. Jump a low obstacle that
 *  is right in front of the turkey, in the lane it is heading for or the
 *  lane its feet are still in. */
function autopilot(state, horizon, chaseCorn) {
  const pz = -state.distance;
  let nearest = Infinity;
  for (const o of state.obstacles) {
    if (o.hit || o.passed) continue;
    const dz = pz - o.z;
    if (dz > 0 && dz < nearest) nearest = dz;
  }
  let physicalLane = 0;
  let bestD = Infinity;
  for (let i = 0; i < 3; i += 1) {
    const d = Math.abs(LANES[i] - state.x);
    if (d < bestD) { bestD = d; physicalLane = i; }
  }
  let lowAhead = false;
  for (const o of state.obstacles) {
    if (o.hit || o.passed) continue;
    const dz = pz - o.z;
    if (dz <= 0 || dz > state.speed * 0.45) continue;
    if (o.lane !== state.lane && o.lane !== physicalLane) continue;
    const tall = o.kind === 'oven' || o.kind === 'knife';
    if (!tall) lowAhead = true;
  }
  // Still crossing a row? Hold the lane until the turkey is 1.5 m past
  // every obstacle in the row — switching while inside the collision
  // window (±1.2 m) clips the corner of an obstacle it just passed.
  for (const o of state.obstacles) {
    if (o.hit || o.passed) continue;
    const dz = pz - o.z;
    if (dz >= -1.2 && dz <= 1.5) return { move: 0, jump: lowAhead };
  }
  // Pick the nearest lane that is safe for the next row. All three lanes
  // are candidates: reaching the far lane means transiting the middle one,
  // which is fine — the turkey only has to be out of a blocked lane by the
  // time it crosses the row, not while it is still metres away from it.
  // (Restricting the choice to adjacent lanes strands the turkey when the
  // only survivable lane is two lanes over.)
  const lanes = [0, 1, 2].sort((a, b) => Math.abs(a - state.lane) - Math.abs(b - state.lane));
  let bestLane = state.lane;
  let bestCorn = -1;
  for (const lane of lanes) {
    if (!laneSafe(state, lane)) continue;
    let corn = 0;
    if (chaseCorn && nearest > 25) {
      for (const c of state.corns) {
        if (!c.taken && c.lane === lane && pz - c.z > 0 && pz - c.z < 30) corn += 1;
      }
    }
    if (corn > bestCorn) {
      bestCorn = corn;
      bestLane = lane;
    }
  }
  // If no lane is safe, stay put (a hit is coming) — the pilot was too late.
  return { move: bestLane - state.lane, jump: lowAhead };
}

/** The careless pilot: never changes lane, never jumps. It gets caught. */
function carelessPilot() {
  return { move: 0, jump: false };
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Names: start | play | caught | escaped.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'caught' && name !== 'escaped') {
    state.screen = 'title';
    return { screen: 'title', best: 0 };
  }
  world.start();
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const act = autopilot(state, 0.9, true);
      const ev = world.step(STEP, act);
      if (ev & (EVENT_CAUGHT | EVENT_ESCAPED)) break;
    }
    // Nudge forward until a row of obstacles sits 12-18 m ahead with a
    // corn line in view, so the frame shows what the run is about instead
    // of empty track.
    for (let i = 0; i < 8 / STEP; i += 1) {
      const pz = -state.distance;
      const near = state.obstacles.some((o) => !o.hit && !o.passed && pz - o.z > 12 && pz - o.z < 18);
      const cornNear = state.corns.some((c) => !c.taken && pz - c.z > 0 && pz - c.z < 40);
      if (near && cornNear) break;
      const ev = world.step(STEP, autopilot(state, 0.9, true));
      if (ev & (EVENT_CAUGHT | EVENT_ESCAPED)) break;
    }
    return { screen: 'play', best: state.score };
  }
  if (name === 'caught') {
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      const ev = world.step(STEP, carelessPilot());
      if (ev & EVENT_CAUGHT) break;
      if (ev & EVENT_ESCAPED) break;
    }
    return { screen: state.screen === 'caught' ? 'caught' : 'play', best: state.score };
  }
  // escaped: run carefully almost to the woods, then keep going to the win.
  // The careful pilot plans one row at a time and holds its lane while it
  // crosses a row, so it never clips the corner of an obstacle just passed.
  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    const act = autopilot(state, 1.5, false);
    const ev = world.step(STEP, act);
    if (ev & EVENT_ESCAPED) break;
    if (ev & EVENT_CAUGHT) break;
  }
  return { screen: state.screen === 'escaped' ? 'escaped' : 'play', best: state.score };
}

export { autopilot, laneSafe };
