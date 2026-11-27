// TURKEY ESCAPE — tuning numbers, palette and rules in one place.
// A 3D endless runner: a turkey flees the farmer across a golden-hour farm,
// dodging ovens and carving knives, grabbing corn, until it reaches the
// woods 1500 m away — or the farmer catches it after 3 hits.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const LANES = [-2.3, 0, 2.3];
export const ESCAPE_DISTANCE = 1500; // metres to the woods: reach it and win
export const LIVES = 3;

export const PLAYER = {
  laneSwitch: 11, // m/s sideways
  jumpSpeed: 8.4, // m/s up
  gravity: 24, // m/s^2
  invulnerable: 1.6, // s after a hit
};

export const RUN = {
  baseSpeed: 9, // m/s at the start
  maxSpeed: 17, // m/s at the last level
  levelEvery: 300, // metres per level
  maxLevel: 5,
};

export const SPAWN = {
  rowGap: 26, // metres between obstacle rows at level 1
  rowGapMin: 15,
  cornRowChance: 0.45,
  cornPerRow: 5,
};

export const FARMER = {
  startGap: 8, // metres behind the turkey
  closePerHit: 2.4, // metres closer after each hit
  catchGap: 1.6, // metres: closer than this and the turkey is caught
};

export const PALETTE = {
  skyTop: '#7B2D8B',
  skyMid: '#FF5A1F',
  skyLow: '#FFB347',
  sun: '#FFD54F',
  fog: '#F2A65A',
  grass: '#7CB342',
  grassDark: '#558B2F',
  dirt: '#A9743F',
  dirtDark: '#8D5A2B',
  fence: '#C89B6A',
  barn: '#B3392E',
  barnRoof: '#7E2A22',
  tree: '#E67E22',
  treeDark: '#D35400',
  leaf: '#F39C12',
  turkey: '#8D5A2B',
  turkeyDark: '#6D4520',
  turkeyBelly: '#F5E6C8',
  turkeyTail: ['#D2691E', '#E8A33C', '#A0522D'],
  wattle: '#E5534B',
  beak: '#F39C12',
  farmerShirt: '#C0392B',
  farmerDenim: '#2E4A6B',
  farmerHat: '#D9A441',
  farmerSkin: '#E8B98A',
  knifeBlade: '#D7DEE8',
  knifeHandle: '#4E342E',
  oven: '#3B2F2F',
  ovenGlow: '#FF7A1A',
  hay: '#E3B505',
  pumpkin: '#E67E22',
  corn: '#F2C94C',
  cornHusk: '#7CB342',
  hudPanel: 'rgba(11, 27, 51, 0.72)',
  hudText: '#FFF8E7',
  hudGold: '#FFC93C',
  hudDanger: '#FF5A3C',
};

export const FONT = '"Trebuchet MS", Verdana, sans-serif';
export const BEST_KEY = 'turkey-escape.best';
