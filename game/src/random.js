// Turkey Escape — small seeded random helpers.
// Written from scratch in this session (27 Nov 2026 rewrite).
// The game world is fully deterministic for a given seed: the same seed
// always spawns the same rows and corn, which is what makes the staged
// screenshots reproducible byte for byte.

// mulberry32: tiny, fast, good-enough PRNG for gameplay randomness.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small wrapper so world code reads like English.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next() {
      return next();
    },
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // True with probability p (0..1).
    chance(p) {
      return next() < p;
    },
    // One element of arr, uniformly.
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    // A shuffled copy of arr (Fisher-Yates).
    shuffle(arr) {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
      return copy;
    },
  };
}

// Deterministic hash of an integer, for scenery that must look random
// but stay stable: the same scenery index always gives the same offset,
// kind and scale, with no stored state at all.
export function hashInt(n) {
  let h = (n | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}
