// Turkey Escape — tuning constants for the whole game.
// Written from scratch in this session (27 Nov 2026 rewrite).
// Every number here is a design choice, not a copy: the runner is
// balanced so a careful pilot can always reach the woods at 1500 m.

export const STEP = 1 / 60;

export const GOAL_DISTANCE = 1500; // metres to the woods
export const LEVEL_LENGTH = 300; // metres per level
export const MAX_LEVEL = 5;

export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.4;
export const LANE_X = [-2.4, 0, 2.4];

export const BASE_SPEED = 9; // m/s at level 1
export const SPEED_PER_LEVEL = 2; // +2 m/s per level -> 9, 11, 13, 15, 17
export const MAX_SPEED = 17;

export const START_LIVES = 3;
export const START_GAP = 8; // metres the farmer starts behind the turkey
export const GAP_CLOSE = 2.4; // metres the farmer gains on every hit

export const CORN_POINTS = 10;

export const COLLISION_HALF = 1.2; // |row - turkey| inside this is a hit
export const LOW_CLEAR_HEIGHT = 0.75; // jump must clear this to beat hay/pumpkin
export const GRAVITY = 20;
export const JUMP_SPEED = 9; // apex ~2.0 m, airtime ~0.9 s
export const DROP_MULTIPLIER = 2.6; // holding down falls faster
export const LATERAL_SPEED = 11; // m/s across lanes
export const INVULN_SECONDS = 1.5; // grace after a hit

export const SPAWN_AHEAD = 130; // metres ahead that rows/corn are spawned
export const FIRST_ROW_AT = 55; // first obstacle row appears here
export const ROW_GAP_MIN = 16;
export const ROW_GAP_MAX = 26;
export const FIRST_CORN_AT = 25;
export const CORN_GAP_MIN = 20;
export const CORN_GAP_MAX = 32;
export const CORN_LINE_MIN = 4;
export const CORN_LINE_MAX = 5;
export const CORN_SPACING = 1.4;

// Obstacle kinds. Tall ones (oven, knife) can only be dodged by changing
// lane; low ones (hay, pumpkin) can also be jumped over.
export const KIND_OVEN = 'oven';
export const KIND_KNIFE = 'knife';
export const KIND_HAY = 'hay';
export const KIND_PUMPKIN = 'pumpkin';
export const TALL_KINDS = [KIND_OVEN, KIND_KNIFE];
export const LOW_KINDS = [KIND_HAY, KIND_PUMPKIN];
export const ALL_KINDS = [KIND_OVEN, KIND_KNIFE, KIND_HAY, KIND_PUMPKIN];

export function speedForLevel(level) {
  return BASE_SPEED + (Math.min(level, MAX_LEVEL) - 1) * SPEED_PER_LEVEL;
}

export function levelForDistance(distance) {
  return Math.min(MAX_LEVEL, 1 + Math.floor(distance / LEVEL_LENGTH));
}
