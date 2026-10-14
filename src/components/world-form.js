/**
 * World Form for Ant Colony TTRPG
 * Version: v0.7 - Underground UI Edition
 * Purpose: Drives the world-creation screen. Card buttons, role-split steppers
 *          and the live preview all write into ordinary form inputs (hidden
 *          text/range inputs keyed by id), so MenuManager.createWorld() and
 *          applyPreset() keep reading the form exactly as before.
 * Changelog:
 *   v0.7 - Initial version.
 */

import { drawCells, biomeCells, worldPreviewCells } from './pixel-art.js';

export const ROLE_LIMITS = {
  workerRatio: [30, 80],
  scoutRatio: [10, 40],
  soldierRatio: [5, 30]
};
const ROLE_ORDER = ['workerRatio', 'scoutRatio', 'soldierRatio'];
const STEP = 5;

/**
 * Move STEP percentage points into (delta > 0) or out of (delta < 0) one role,
 * keeping the total at 100 and every role inside ROLE_LIMITS.
 * Raising a role takes from the largest other role that can spare it;
 * lowering a role gives to the first role (workers, then scouts) with room.
 * Returns a new object, or the same one when the move is not allowed.
 */
export function rebalanceRoles(roles, role, delta) {
  const next = { ...roles };
  const others = ROLE_ORDER.filter((k) => k !== role);
  if (delta > 0) {
    if (next[role] + STEP > ROLE_LIMITS[role][1]) return roles;
    const donors = others
      .filter((k) => next[k] - STEP >= ROLE_LIMITS[k][0])
      .sort((a, b) => next[b] - next[a]);
    if (!donors.length) return roles;
    next[role] += STEP;
    next[donors[0]] -= STEP;
  } else {
    if (next[role] - STEP < ROLE_LIMITS[role][0]) return roles;
    const takers = others.filter((k) => next[k] + STEP <= ROLE_LIMITS[k][1]);
    if (!takers.length) return roles;
    next[role] -= STEP;
    next[takers[0]] += STEP;
  }
  return next;
}

const LABELS = {
  worldSize: { small: 'Small · 100 × 75', medium: 'Medium · 200 × 150', large: 'Large · 300 × 200', huge: 'Huge · 500 × 300' },
  biomeType: { forest: 'Forest floor', desert: 'Desert oasis', grassland: 'Grassland', wetland: 'Wetland', mixed: 'Mixed terrain' },
  foodAbundance: { scarce: 'Scarce', normal: 'Normal', abundant: 'Abundant' },
  hazardLevel: { peaceful: 'Peaceful', normal: 'Normal', dangerous: 'Dangerous' },
  startingSeason: { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
  startingTimeScale: { 1: '1 : 1', 60: '1 min / s', 3600: '1 h / s', 86400: '1 day / s', 604800: '1 wk / s', 2628000: '1 mo / s' }
};

/**
 * Wire up the world-creation form. Safe to call on any form: every feature
 * checks that its elements exist first.
 */
export function bindWorldForm(form) {
  if (!form) return { sync() {} };
  const byId = (id) => form.querySelector(`#${id}`);

  // Biome swatches are static; draw them once.
  form.querySelectorAll('canvas[data-biome-swatch]').forEach((c) => {
    drawCells(c, 12, 4, biomeCells(c.dataset.biomeSwatch, 12, 4));
  });

  const setValue = (id, value) => {
    const input = byId(id);
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // Choice groups: <div data-choice-for="worldSize"><button data-value="small">…
  form.querySelectorAll('[data-choice-for]').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-value]');
      if (!btn || !group.contains(btn)) return;
      setValue(group.dataset.choiceFor, btn.dataset.value);
      clearPreset();
    });
  });

  // Role steppers: <button data-role="workerRatio" data-delta="1">
  form.querySelectorAll('button[data-role]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const roles = readRoles();
      const next = rebalanceRoles(roles, btn.dataset.role, Number(btn.dataset.delta));
      if (next === roles) return;
      ROLE_ORDER.forEach((k) => setValue(k, next[k]));
      clearPreset();
    });
  });

  form.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    });
  });

  function clearPreset() {
    form.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  }

  function readRoles() {
    const roles = {};
    ROLE_ORDER.forEach((k) => { roles[k] = parseInt(byId(k)?.value, 10) || 0; });
    return roles;
  }

  function sync() {
    form.querySelectorAll('[data-choice-for]').forEach((group) => {
      const value = byId(group.dataset.choiceFor)?.value;
      group.querySelectorAll('button[data-value]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.value === value));
      });
    });

    const roles = readRoles();
    ROLE_ORDER.forEach((k) => {
      form.querySelectorAll(`[data-role-bar="${k}"]`).forEach((el) => { el.style.width = `${roles[k]}%`; });
      const inc = form.querySelector(`button[data-role="${k}"][data-delta="1"]`);
      const dec = form.querySelector(`button[data-role="${k}"][data-delta="-1"]`);
      if (inc) inc.disabled = rebalanceRoles(roles, k, 1) === roles;
      if (dec) dec.disabled = rebalanceRoles(roles, k, -1) === roles;
    });

    const nests = parseInt(byId('nestCount')?.value, 10) || 1;
    const help = form.querySelector('#nestHelp');
    if (help) {
      help.textContent = nests === 1
        ? 'One colony, no rivals.'
        : `Your colony plus ${nests - 1} ${nests === 2 ? 'rival' : 'rivals'}, competing for food and territory.`;
    }

    updateSummary(roles, nests);
  }

  function updateSummary(roles, nests) {
    const v = (id) => byId(id)?.value;
    const preview = form.querySelector('#worldPreview');
    if (preview) {
      drawCells(preview, 24, 14, worldPreviewCells({ biome: v('biomeType'), nests, food: v('foodAbundance') }));
    }
    const name = form.querySelector('#summaryName');
    if (name) name.textContent = (v('worldName') || '').trim() || 'Unnamed colony';

    const facts = {
      summarySize: LABELS.worldSize[v('worldSize')],
      summaryBiome: LABELS.biomeType[v('biomeType')],
      summaryColonies: nests === 1 ? 'Just yours' : `Yours + ${nests - 1} ${nests === 2 ? 'rival' : 'rivals'}`,
      summaryFood: LABELS.foodAbundance[v('foodAbundance')],
      summaryHazards: LABELS.hazardLevel[v('hazardLevel')],
      summarySeason: LABELS.startingSeason[v('startingSeason')],
      summaryTime: LABELS.startingTimeScale[v('startingTimeScale')],
      summaryCap: `${v('maxPopulation')} ants`
    };
    Object.entries(facts).forEach(([id, text]) => {
      const el = form.querySelector(`#${id}`);
      if (el && text) el.textContent = text;
    });

    const pop = parseInt(v('startingPopulation'), 10) || 0;
    const w = Math.round(pop * roles.workerRatio / 100);
    const s = Math.round(pop * roles.scoutRatio / 100);
    const startLine = form.querySelector('#summaryStart');
    if (startLine) startLine.textContent = `${pop} ants hatch on day one`;
    const split = form.querySelector('#summarySplit');
    if (split) split.textContent = `${w} workers · ${s} scouts · ${Math.max(0, pop - w - s)} soldiers`;
  }

  form.addEventListener('input', sync);
  form.addEventListener('reset', () => setTimeout(() => { clearPreset(); sync(); }, 0));
  sync();

  return { sync };
}
