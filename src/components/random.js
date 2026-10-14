/**
 * Seeded random numbers for Ant Colony TTRPG
 * Version: v0.7
 * Purpose: One reproducible source of randomness. The same seed always
 *          produces the same sequence, so a world can be rebuilt from its
 *          seed and simulation tests can be deterministic.
 * Changelog:
 *   v0.7 - Initial version; mulberry32 moved here from pixel-art.js.
 */

/**
 * mulberry32: small, fast 32-bit PRNG. Returns a function giving floats in [0, 1).
 */
export function rng(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh, unpredictable 32-bit seed (for new worlds). */
export function randomSeed() {
  return Math.floor(Math.random() * 4294967296) >>> 0;
}

/**
 * Create a seeded generator with the same helpers as Utils
 * (randomInt, randomFloat, randomChoice, shuffle) so call sites map 1:1.
 */
export function createRandom(seed = randomSeed()) {
  const next = rng(seed);
  return {
    seed: seed >>> 0,
    /** Float in [0, 1), the drop-in for Math.random(). */
    next,
    /** Integer in [min, max], inclusive (same formula as Utils.randomInt). */
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    /** Float in [min, max). */
    float(min, max) {
      return next() * (max - min) + min;
    },
    /** One element of a non-empty array. */
    choice(array) {
      return array[Math.floor(next() * array.length)];
    },
    /** Fisher-Yates shuffle, in place; returns the array. */
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
  };
}
