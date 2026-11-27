// Turkey Escape — autopilot and screenshot staging.
// Written from scratch in this session (27 Nov 2026 rewrite).
// The autopilot is a careful pilot, not a cheater: it only reads the
// world state (nearest row, lanes, corn) and returns the same action a
// player could press. It exists so the game can prove itself winnable
// headlessly and so the four entry screenshots can be staged
// deterministically from one seed.
//
// Lessons baked in from earlier pilot failures:
//  1. Only the nearest row decides anything; further rows are noise.
//  2. Never change lane while still inside a row's collision window —
//     hold the lane until 1.5 m past the row.
//  3. Consider every lane as a candidate, ordered by distance, and allow
//     transiting through the middle lane.
//  4. Chase corn only when the nearest row is far away (> 25 m); in
//     escaped mode never chase corn at all.
//  5. Judge everything by the physical lane (where the turkey's body
//     actually is), never by the target lane.

import { STEP, GOAL_DISTANCE, TALL_KINDS, LANE_X } from './config.js';
import { physicalLane, EVENT_CAUGHT, EVENT_ESCAPED } from './world.js';

const NO_ACTION = Object.freeze({ steer: 0, jump: false, drop: false });

// The nearest row the turkey has not fully passed yet.
function nearestRow(state) {
  for (const row of state.rows) {
    if (row.dist > state.distance - 1.5) return row;
  }
  return null;
}

function rowTimeTo(state, row) {
  return Math.max(0, (row.dist - state.distance) / Math.max(1, state.speed));
}

export function autopilot(state, horizonSeconds = 1.5, chaseCorn = false) {
  const row = nearestRow(state);
  const laneNow = physicalLane(state.x);
  const speed = Math.max(1, state.speed);

  if (row) {
    const timeTo = rowTimeTo(state, row);
    const distTo = row.dist - state.distance;
    const cell = row.cells[laneNow];
    const isTallHere = cell && TALL_KINDS.includes(cell);
    const isLowHere = cell && !TALL_KINDS.includes(cell);

    // Rule 2: inside (or just past) a row's window, hold the lane.
    // Steering now would clip the row's corner.
    if (distTo < 1.5 && distTo > -1.5) {
      if (isLowHere && state.grounded) return { steer: 0, jump: true, drop: false };
      return NO_ACTION;
    }

    if (isTallHere) {
      // Rule 3: every lane is a candidate, nearest first. A lane is
      // safe if it holds no tall obstacle; a low one is fine because
      // we can jump it once we get there.
      const candidates = [0, 1, 2]
        .filter((lane) => lane !== laneNow)
        .sort((a, b) => Math.abs(a - laneNow) - Math.abs(b - laneNow));
      for (const lane of candidates) {
        const kind = row.cells[lane];
        if (!kind || !TALL_KINDS.includes(kind)) {
          return { steer: Math.sign(lane - laneNow), jump: false, drop: false };
        }
      }
      // No safe lane (cannot happen with the spawner's guarantee, but
      // never crash the pilot if it ever does).
      return NO_ACTION;
    }

    if (isLowHere) {
      // Jump so the row arrives while the turkey is high: the jump's
      // high window is roughly 0.08–0.82 s after take-off, so start
      // the jump when the row is about half a second away.
      if (timeTo <= 0.55 && state.grounded) {
        return { steer: 0, jump: true, drop: false };
      }
      return NO_ACTION;
    }

    // Current lane is clear for this row. Corn chasing is allowed only
    // while the row is still far away (rule 4); otherwise drift back
    // toward the centre lane, which keeps the most escape options open.
    if (distTo > 25) {
      if (chaseCorn) return chaseNearestCorn(state, laneNow, speed);
      return driftToCentre(laneNow);
    }
    return NO_ACTION;
  }

  // No row in sight: chase corn if allowed, else hold the centre.
  if (chaseCorn) {
    const cornAction = chaseNearestCorn(state, laneNow, speed);
    if (cornAction !== NO_ACTION) return cornAction;
  }
  return driftToCentre(laneNow);
}

// With no pressing danger, the centre lane is the best place to be:
// either side is one quick switch away.
function driftToCentre(laneNow) {
  if (laneNow === 1) return NO_ACTION;
  return { steer: Math.sign(1 - laneNow), jump: false, drop: false };
}

function chaseNearestCorn(state, laneNow, speed) {
  let best = null;
  for (const cob of state.corns) {
    if (cob.taken) continue;
    const ahead = cob.dist - state.distance;
    if (ahead < 2 || ahead > 40) continue;
    if (!best || ahead < best.dist - state.distance) best = cob;
  }
  if (best && best.lane !== laneNow) {
    return { steer: Math.sign(best.lane - laneNow), jump: false, drop: false };
  }
  return NO_ACTION;
}

// --- Screenshot staging -------------------------------------------------
// Each shot is produced by actually playing the world from the seed,
// then freezing it: the browser loop keeps rendering the frozen frame,
// which is what makes the screenshot deterministic.

export const SHOT_TARGETS = {
  play: { distance: 200 },
  caught: {},
  escaped: {},
};

export function stageShot(world, kind) {
  const maxSteps = Math.floor(600 / STEP);
  const summary = { kind, steps: 0, outcome: 'timeout' };

  if (kind === 'start') {
    world.reset(world.state.seed);
    summary.outcome = 'title';
    summary.distance = 0;
    summary.score = 0;
    summary.corn = 0;
    summary.lives = world.state.lives;
    summary.level = 1;
    return summary;
  }

  world.start();
  let steps = 0;
  let events = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    let action = NO_ACTION;
    if (kind === 'play') action = autopilot(world.state, 1.5, true);
    else if (kind === 'escaped') action = autopilot(world.state, 1.5, false);
    else if (kind === 'caught') action = NO_ACTION; // clumsy: never dodges
    events = world.step(STEP, action);
    steps += 1;
    if (kind === 'play' && world.state.distance >= SHOT_TARGETS.play.distance) {
      summary.outcome = 'staged-play';
      break;
    }
    if (events & EVENT_ESCAPED) {
      summary.outcome = 'escaped';
      break;
    }
    if (events & EVENT_CAUGHT) {
      summary.outcome = 'caught';
      break;
    }
  }
  summary.steps = steps;
  summary.distance = Math.floor(world.state.distance);
  summary.score = world.state.score;
  summary.corn = world.state.corn;
  summary.lives = world.state.lives;
  summary.level = world.state.level;
  summary.goal = GOAL_DISTANCE;
  return summary;
}
