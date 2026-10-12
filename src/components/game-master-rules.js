/**
 * GameMaster turn rules for Ant Colony TTRPG
 * Version: v0.7 - GameMaster Edition
 * Purpose: Pure, DOM-free turn logic for the turn-based TTRPG layer: dice
 *          parsing, d100 checks against an action's success_rate, requirement
 *          checks, resource changes, risks, upkeep and goal tracking.
 *          Data comes from narrative/scenario-templates.json and
 *          rules/action-schema.json; randomness comes from a seeded rng() so
 *          every turn can be replayed in tests.
 * Changelog:
 *   v0.7 - Initial version.
 */

import { rng as makeRng } from './pixel-art.js';

export const MAX_ENERGY = 3;

const ROLE_KEYS = { workers: 'worker', scouts: 'scout', soldiers: 'soldier' };
const ROLE_SINGULAR = { workers: 'worker', scouts: 'scout', soldiers: 'soldier' };

/** How each scenario is won. Keyed by opening_scenarios id. */
export const SCENARIO_GOALS = {
  predator_threat: { type: 'grow', target: 15 },
  winter_survival: { type: 'survive', turns: 10, minAnts: 10 }
};

/** The GameMaster's line at the start and end of a turn, per scenario. */
export const SCENARIO_PROMPTS = {
  predator_threat: {
    ask: 'The sparrow is circling. What does the colony do?',
    after: 'The colony holds its breath. What comes next is up to the sparrow.'
  },
  winter_survival: {
    ask: 'The cold is creeping into the tunnels. What does the colony do?',
    after: 'The colony huddles together. Winter does not wait.'
  }
};

const RISK_LABELS = {
  predator_encounter: 'Predator encounter',
  getting_lost: 'Getting lost'
};

/** Odds and effect of a free-text plan that matches no listed action. */
export const OWN_PLAN = {
  description: 'Your own plan',
  requirements: { energy_cost: 1 },
  effects: { morale: '+1' },
  success_rate: 0.5
};

/* ---------- Dice ---------- */

/**
 * Parse a dice/modifier string such as "+1d6+2", "2d4-1", "d8", "-1" or "+2".
 * Returns { sign, count, sides, modifier } or null when it is not a number/dice.
 */
export function parseDice(text) {
  if (typeof text === 'number') return { sign: 1, count: 0, sides: 0, modifier: text };
  if (typeof text !== 'string') return null;
  const s = text.replace(/\s+/g, '');
  const flat = s.match(/^([+-]?)(\d+)$/);
  if (flat) return { sign: 1, count: 0, sides: 0, modifier: Number((flat[1] || '+') + flat[2]) };
  const dice = s.match(/^([+-]?)(\d*)d(\d+)([+-]\d+)?$/i);
  if (!dice) return null;
  return {
    sign: dice[1] === '-' ? -1 : 1,
    count: dice[2] === '' ? 1 : Number(dice[2]),
    sides: Number(dice[3]),
    modifier: dice[4] ? Number(dice[4]) : 0
  };
}

/**
 * Roll a dice expression (string or parsed). Returns { total, rolls, text },
 * where text explains the roll, e.g. "1d6+2: 4 + 2".
 */
export function rollDice(expr, random) {
  const d = typeof expr === 'object' && expr !== null ? expr : parseDice(expr);
  if (!d) throw new Error(`Not a dice expression: ${expr}`);
  const rolls = [];
  for (let i = 0; i < d.count; i++) rolls.push(1 + Math.floor(random() * d.sides));
  const total = d.sign * rolls.reduce((a, b) => a + b, 0) + d.modifier;
  let text = String(total);
  if (d.count > 0) {
    const mod = d.modifier ? `${d.modifier > 0 ? '+' : '-'}${Math.abs(d.modifier)}` : '';
    const parts = rolls.join(' + ') + (d.modifier ? ` ${d.modifier > 0 ? '+' : '−'} ${Math.abs(d.modifier)}` : '');
    text = `${d.count}d${d.sides}${mod}: ${parts}`;
  }
  return { total, rolls, text };
}

/** A d100 roll: 1..100. */
export function rollD100(random) {
  return 1 + Math.floor(random() * 100);
}

/** Roll-under check: succeeds when the d100 roll is at or below the success rate (0..1). */
export function checkSuccess(roll, successRate) {
  return roll <= Math.round(successRate * 100);
}

/* ---------- Session ---------- */

/**
 * Split a population across roles by percentage (largest remainder),
 * so the parts always add up to the total.
 */
export function splitRoles(total, ratios = { worker: 60, scout: 25, soldier: 15 }) {
  const keys = ['worker', 'scout', 'soldier'];
  const sum = keys.reduce((a, k) => a + (ratios[k] || 0), 0) || 1;
  const raw = keys.map((k) => (total * (ratios[k] || 0)) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - Math.floor(v), i])
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return { worker: out[0], scout: out[1], soldier: out[2] };
}

export function totalAnts(colony) {
  return colony.worker + colony.scout + colony.soldier;
}

/**
 * Start a new GameMaster session from a scenario template.
 * options: { seed, worldName, ratios: { worker, scout, soldier } }
 */
export function createSession(templates, scenarioId, options = {}) {
  const scenario = templates.opening_scenarios?.[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`);
  const start = scenario.starting_conditions || {};
  const seed = options.seed ?? 1;
  return {
    scenarioId,
    scenario,
    worldName: options.worldName || 'Your colony',
    random: makeRng(seed),
    turn: 1,
    energy: MAX_ENERGY,
    colony: { food: start.food ?? 10, morale: start.morale ?? 5, ...splitRoles(start.population ?? 10, options.ratios) },
    defence: 0,
    locations: 0,
    lostScouts: false,
    resolved: null,
    status: 'playing',
    story: [{ turn: 1, tag: 'Scenario', kind: 'omen', text: scenario.setup, outcome: '' }]
  };
}

/* ---------- Actions ---------- */

function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Normalise one action-schema entry into the card copy the screen shows. */
export function describeAction(id, action) {
  const req = action.requirements || {};
  const needs = Object.entries(req)
    .filter(([k]) => k !== 'energy_cost')
    .map(([k, n]) => `${n} ${n === 1 ? ROLE_SINGULAR[k] || k : k}`);
  if (req.energy_cost) needs.push(`${req.energy_cost} energy`);
  const effect = Object.entries(action.effects || {})
    .filter(([k]) => k !== 'risk')
    .map(([k, v]) => {
      if (k === 'new_location') return 'new location';
      const label = k === 'defense_bonus' ? 'defence' : k;
      const value = String(v).replace(/^(\d*d\d+)/, '+$1').replace(/^-/, '−');
      return `${label} ${value}`;
    })
    .join(', ');
  const risk = action.effects?.risk;
  return {
    id,
    name: capitalise(id),
    desc: action.description ? `${action.description}.` : '',
    odds: `${Math.round((action.success_rate ?? 1) * 100)}%`,
    needs: needs.length ? needs.join(' · ') : 'Nothing',
    effect: effect || '—',
    risk: risk ? RISK_LABELS[risk] || risk : 'None',
    hasRisk: !!risk
  };
}

/**
 * Check an action's requirements against the session.
 * Returns { ok, missing: [human-readable reasons] }.
 */
export function checkRequirements(session, action) {
  const missing = [];
  Object.entries(action.requirements || {}).forEach(([key, need]) => {
    if (key === 'energy_cost') {
      if (session.energy < need) missing.push(`Needs ${need} energy, ${session.energy} left`);
      return;
    }
    const role = ROLE_KEYS[key];
    if (!role) return;
    if (role === 'scout' && session.lostScouts) {
      missing.push('The scouts are still lost');
      return;
    }
    const have = session.colony[role];
    if (have < need) missing.push(`Needs ${need} ${need === 1 ? ROLE_SINGULAR[key] : key}, have ${have}`);
  });
  return { ok: missing.length === 0, missing };
}

function pick(list, random) {
  if (!list || !list.length) return '';
  return list[Math.floor(random() * list.length)];
}

/** Apply an action's effects on success; pushes human-readable changes. */
function applyEffects(session, effects, random, changes) {
  Object.entries(effects).forEach(([key, value]) => {
    if (key === 'risk') return;
    if (key === 'new_location') {
      session.locations += 1;
      changes.push('A new location is mapped');
      return;
    }
    const roll = rollDice(value, random);
    if (key === 'defense_bonus') {
      session.defence += roll.total;
      changes.push(`Defence +${roll.total} until next turn`);
      return;
    }
    if (key in session.colony) {
      session.colony[key] = Math.max(0, session.colony[key] + roll.total);
      const sign = roll.total >= 0 ? '+' : '−';
      const how = roll.rolls.length ? ` (${roll.text})` : '';
      changes.push(`${capitalise(key)} ${sign}${Math.abs(roll.total)}${how}`);
    }
  });
}

/** Lose n ants, workers first, then scouts, then soldiers. Returns how many were lost. */
export function loseAnts(colony, n) {
  let left = Math.max(0, n);
  ['worker', 'scout', 'soldier'].forEach((role) => {
    const take = Math.min(colony[role], left);
    colony[role] -= take;
    left -= take;
  });
  return Math.max(0, n) - left;
}

/** A predator strikes: 1d2 ants lost, minus the colony's defence this turn. */
function predatorEncounter(session, templates, random) {
  const bite = rollDice('1d2', random).total;
  const lost = loseAnts(session.colony, bite - session.defence);
  const text = pick(templates.event_expansions?.predator_encounter, random);
  const outcome = lost
    ? `${lost === 1 ? 'One ant' : `${lost} ants`} lost.`
    : 'The defences hold. No ants lost.';
  return { tag: 'Event', kind: 'danger', text, outcome };
}

/**
 * Resolve one action for the current turn. actionId is a key of
 * action-schema's actions, or null to put the player's own plan to the GameMaster.
 * Mutates the session and returns { roll, success, title, detail, entries }.
 */
export function resolveAction(session, actionId, actions, templates, plan = '') {
  if (session.status !== 'playing') throw new Error('The game is over');
  if (session.resolved) throw new Error('This turn is already resolved');
  const random = session.random;
  const isOwnPlan = !actionId;
  const def = isOwnPlan ? OWN_PLAN : actions[actionId];
  if (!def) throw new Error(`Unknown action: ${actionId}`);

  const check = checkRequirements(session, def);
  if (!check.ok) throw new Error(`Requirements not met: ${check.missing.join(', ')}`);
  session.energy -= def.requirements?.energy_cost || 0;

  const name = isOwnPlan ? 'Your plan' : capitalise(actionId);
  const rate = def.success_rate ?? 1;
  const roll = rate < 1 ? rollD100(random) : null;
  const success = roll === null ? true : checkSuccess(roll, rate);

  const changes = [];
  const entries = [];
  const flavor = isOwnPlan
    ? `The colony tries something new: “${plan.trim() || 'a plan of its own'}”.`
    : pick(templates.action_flavors?.[actionId], random);

  if (success) {
    applyEffects(session, def.effects || {}, random, changes);
    if (actionId === 'explore') {
      const bonus = rollDice('1d4', random).total;
      session.colony.food += bonus;
      entries.push({
        tag: 'Discovery',
        kind: 'discovery',
        text: pick(templates.event_expansions?.food_discovery, random),
        outcome: `Food +${bonus}.`
      });
    }
    if (actionId === 'forage'
        && session.scenario.special_rules?.includes('increased_predator_encounters')
        && rollD100(random) <= 15) {
      entries.push(predatorEncounter(session, templates, random));
      changes.push('A predator found the foragers on the way home');
    }
  } else if (isOwnPlan) {
    session.colony.morale = Math.max(0, session.colony.morale - 1);
    changes.push('Morale −1');
  } else if (def.effects?.risk === 'predator_encounter') {
    entries.push(predatorEncounter(session, templates, random));
    changes.push('The foragers come back empty-handed');
  } else if (def.effects?.risk === 'getting_lost') {
    session.lostScouts = true;
    changes.push('The scouts are lost and miss next turn');
  } else {
    changes.push('Nothing comes of it');
  }

  const head = roll === null ? 'No roll needed.' : `Rolled ${roll} against ${Math.round(rate * 100)}%.`;
  const detail = `${head} ${changes.join('. ')}.`;
  entries.unshift({ tag: name, kind: success ? 'success' : 'danger', text: flavor, outcome: detail });
  entries.forEach((e) => session.story.push({ turn: session.turn, ...e }));

  const result = { roll, success, title: `${name} ${success ? 'succeeds' : 'fails'}`, detail, entries };
  session.resolved = result;
  updateStatus(session);
  return result;
}

/* ---------- Turn upkeep & goals ---------- */

/** Food eaten at the start of a turn: one per four ants, doubled when a scenario rule says so. */
export function upkeepCost(session) {
  const base = Math.ceil(totalAnts(session.colony) / 4);
  const doubled = session.scenario.special_rules?.includes('double_food_consumption_after_turn_5')
    && session.turn > 5;
  return doubled ? base * 2 : base;
}

/**
 * Advance to the next turn: energy +1, defence fades, lost scouts return,
 * then the colony eats and either starves or grows. Returns the upkeep story beat.
 */
export function nextTurn(session, templates) {
  if (session.status !== 'playing') return null;
  const random = session.random;
  const colony = session.colony;
  session.turn += 1;
  session.resolved = null;
  session.energy = Math.min(MAX_ENERGY, session.energy + 1);
  session.defence = 0;
  const scoutsBack = session.lostScouts;
  session.lostScouts = false;

  const cost = upkeepCost(session);
  colony.food -= cost;
  const notes = [`The colony eats ${cost} food`];
  let kind = 'omen';
  let text;

  if (colony.food < 0) {
    const starved = loseAnts(colony, -colony.food);
    colony.food = 0;
    colony.morale = Math.max(0, colony.morale - 1);
    notes.push(`${starved} ${starved === 1 ? 'ant starves' : 'ants starve'}`, 'Morale −1');
    text = pick(templates.status_messages?.low_food, random);
    kind = 'danger';
  } else if (colony.food >= totalAnts(colony) && colony.morale >= 3) {
    colony.food -= 2;
    colony.worker += 1;
    notes.push('A new worker hatches (food −2)');
    text = pick(templates.status_messages?.[colony.morale >= 6 ? 'high_morale' : 'large_population'], random);
    kind = 'discovery';
  } else if (colony.morale <= 2) {
    text = pick(templates.status_messages?.low_morale, random);
  } else {
    text = pick(templates.status_messages?.low_food, random);
  }
  if (scoutsBack) notes.push('The lost scouts find their way home');

  const entry = { turn: session.turn, tag: 'Colony', kind, text, outcome: `${notes.join('. ')}.` };
  session.story.push(entry);
  updateStatus(session);
  return entry;
}

/** Goal progress for the scenario card: { label, value, target, pct }. */
export function goalProgress(session) {
  const goal = SCENARIO_GOALS[session.scenarioId] || SCENARIO_GOALS.predator_threat;
  if (goal.type === 'survive') {
    const value = Math.min(session.turn - 1, goal.turns);
    return { label: 'Turns survived', value, target: goal.turns, pct: Math.round((value / goal.turns) * 100) };
  }
  const value = totalAnts(session.colony);
  return { label: 'Colony size', value, target: goal.target, pct: Math.min(100, Math.round((value / goal.target) * 100)) };
}

/** Sets and returns session.status: 'won', 'lost' or 'playing'. */
export function updateStatus(session) {
  const goal = SCENARIO_GOALS[session.scenarioId] || SCENARIO_GOALS.predator_threat;
  const ants = totalAnts(session.colony);
  if (ants === 0) session.status = 'lost';
  else if (goal.type === 'grow' && ants >= goal.target) session.status = 'won';
  else if (goal.type === 'survive' && session.turn > goal.turns) {
    session.status = ants >= goal.minAnts ? 'won' : 'lost';
  } else session.status = 'playing';
  return session.status;
}
