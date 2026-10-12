/**
 * Pixel Art helpers for Ant Colony TTRPG
 * Version: v0.7 - Underground UI Edition
 * Purpose: Shared palette, seeded RNG and small cell-grid illustrations
 *          (nest cross-section, biome swatches, world thumbnails) drawn on <canvas>.
 * Changelog:
 *   v0.7 - Initial version, ported from the Claude Design canvas.
 */

export const PALETTE = {
  ground: '#17120E',
  surface: '#1D1712',
  panel: '#221B15',
  raised: '#2D2218',
  line: '#3A2F25',
  lineStrong: '#4A3C2F',
  text: '#F1E7D6',
  textMuted: '#B9A992',
  amber: '#E9A93B',
  amberDark: '#C98E2C',
  worker: '#F1E7D6',
  scout: '#6CB4E0',
  soldier: '#D0583C',
  rival: '#9A8FD0',
  brood: '#9E8F78',
  nest: '#0D0A08',
  tunnel: '#120D0A',
  soil: ['#3B2C20', '#41301F', '#36281D'],
  grass: ['#4A6332', '#56713A'],
  rock: ['#6B655C', '#58534B'],
  water: ['#2F5D73', '#356A82']
};

export const STATE_COLORS = {
  foraging: '#B5D98A',
  exploring: '#6CB4E0',
  returning: '#F1E7D6',
  resting: '#9E8F78',
  defending: '#D0583C',
  patrolling: '#D0583C'
};

export const BIOME_PALETTES = {
  forest: ['#3B2C20', '#433224', '#56713A', '#4A6332', '#6B655C'],
  desert: ['#C9A66B', '#B8935A', '#D8B97E', '#8E7A55', '#2F5D73'],
  grassland: ['#56713A', '#6E8C47', '#4A6332', '#7F9A52', '#3B2C20'],
  wetland: ['#2F5D73', '#3A6E84', '#4A6332', '#56713A', '#3B2C20'],
  mixed: ['#3B2C20', '#56713A', '#C9A66B', '#2F5D73', '#6B655C']
};

const BIOME_SEEDS = { forest: 3, desert: 11, grassland: 19, wetland: 5, mixed: 23 };

/**
 * Seeded PRNG (mulberry32). Same seed, same sequence.
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

/**
 * Turn a string (e.g. a world id) into a stable numeric seed.
 */
export function seedFrom(text = '') {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Weighted pick from a 5-colour biome palette. */
export function pickFrom(palette, n) {
  return palette[n < 0.45 ? 0 : n < 0.7 ? 1 : n < 0.88 ? 2 : n < 0.96 ? 3 : 4];
}

/**
 * Draw a flat array of colours as square cells on a canvas.
 * The canvas is sized to the grid (1px per cell) and scaled up by CSS
 * with `image-rendering: pixelated`, so it stays crisp at any size.
 */
export function drawCells(canvas, cols, rows, colors) {
  if (!canvas || typeof canvas.getContext !== 'function') return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = cols;
  canvas.height = rows;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(i % cols, Math.floor(i / cols), 1, 1);
  }
}

export function biomeCells(biome, cols, rows, seed = BIOME_SEEDS[biome] || 1) {
  const palette = BIOME_PALETTES[biome] || BIOME_PALETTES.forest;
  const r = rng(seed);
  const cells = [];
  for (let i = 0; i < cols * rows; i++) cells.push(pickFrom(palette, r()));
  return cells;
}

/**
 * Small map preview for the world-creation summary: biome ground,
 * food scattered by abundance, and one marker per nest.
 */
export function worldPreviewCells({ biome = 'forest', nests = 1, food = 'normal' }, cols = 24, rows = 14) {
  const seed = (BIOME_SEEDS[biome] || 1) * 7;
  const r = rng(seed);
  const palette = BIOME_PALETTES[biome] || BIOME_PALETTES.forest;
  const cells = [];
  for (let i = 0; i < cols * rows; i++) cells.push(pickFrom(palette, r()));

  const spots = [];
  for (let i = 0; i < 9; i++) spots.push(Math.floor(r() * cols * rows));
  const foodCount = food === 'scarce' ? 2 : food === 'abundant' ? 9 : 5;
  spots.slice(0, foodCount).forEach((i) => { cells[i] = PALETTE.amber; });

  const positions = [[6, 9], [18, 3], [19, 10], [4, 3]];
  positions.slice(0, nests).forEach(([x, y], i) => {
    const ring = i === 0 ? PALETTE.worker : PALETTE.rival;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => { cells[(y + dy) * cols + x + dx] = ring; });
    cells[y * cols + x] = PALETTE.nest;
  });
  return cells;
}

/** Thumbnail for a saved world, stable per world id. */
export function worldThumbCells(world, cols = 10, rows = 6) {
  const cells = biomeCells(world.biomeType || 'forest', cols, rows, seedFrom(world.id || world.worldName || ''));
  cells[3 * cols + 4] = PALETTE.nest;
  return cells;
}

/**
 * Pixel cross-section of a nest for the title screen: surface grass,
 * soil, tunnels, a food store, a nursery and the queen's chamber.
 */
export function nestCrossSectionCells() {
  const r = rng(7);
  const W = 40, H = 26, S = 6;
  const g = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c;
      if (y < S) c = (y < 3 && r() < 0.03) ? '#3A3128' : '#1F1914';
      else if (y === S) c = r() < 0.5 ? '#56713A' : '#4A6332';
      else if (y > 17) c = r() < 0.5 ? '#30241A' : '#2B2018';
      else c = r() < 0.5 ? '#3B2C20' : '#433224';
      g.push(c);
    }
  }
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y * W + x] = c; };
  const T = PALETTE.tunnel;

  for (let x = 0; x < W; x++) {
    if (r() < 0.35) set(x, S - 1, r() < 0.5 ? '#56713A' : '#6E8C47');
    if (r() < 0.12) set(x, S - 2, '#6E8C47');
  }
  [[3, 9], [36, 8], [22, 16], [37, 23], [2, 22], [17, 13]].forEach(([cx, cy]) => {
    set(cx, cy, PALETTE.rock[0]);
    [[1, 0], [0, 1], [1, 1], [-1, 0]].forEach(([dx, dy]) => { if (r() < 0.7) set(cx + dx, cy + dy, r() < 0.5 ? PALETTE.rock[0] : PALETTE.rock[1]); });
  });

  set(11, S - 1, '#433224'); set(12, S - 1, '#4A3726'); set(13, S - 1, '#433224'); set(12, S - 2, '#4A3726');
  for (let y = S - 1; y <= 11; y++) set(12, y, T);
  for (let x = 6; x <= 31; x++) set(x, 11, T);
  const chamber = (cx, cy, rx, ry) => {
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.05) set(cx + dx, cy + dy, T);
    }
  };
  set(30, 12, T);
  chamber(30, 14, 5, 2);
  for (let y = 11; y <= 19; y++) set(8, y, T);
  chamber(13, 20, 6, 2);
  for (let x = 19; x <= 27; x++) set(x, 20, T);
  chamber(31, 21, 4, 2);

  [[27, 14], [28, 15], [29, 13], [31, 15], [32, 14], [33, 14], [28, 14]].forEach(([x, y], i) => set(x, y, i % 3 === 2 ? PALETTE.amberDark : PALETTE.amber));
  [[10, 20], [11, 21], [12, 19], [14, 21], [16, 20], [15, 19]].forEach(([x, y]) => set(x, y, PALETTE.brood));
  set(31, 21, '#B07A3A'); set(32, 21, '#B07A3A'); set(30, 21, '#8E6230');

  [[12, 8], [18, 11], [24, 11], [26, 15], [9, 21], [17, 21], [8, 15], [21, 20]].forEach(([x, y]) => set(x, y, PALETTE.worker));
  [[20, S - 1], [33, S - 1], [6, 11]].forEach(([x, y]) => set(x, y, PALETTE.scout));
  [[12, 10], [29, 20], [34, 21], [14, 11]].forEach(([x, y]) => set(x, y, PALETTE.soldier));

  return { cols: W, rows: H, cells: g };
}
