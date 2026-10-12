/**
 * GameMaster turn screen for Ant Colony TTRPG
 * Version: v0.7 - GameMaster Edition
 * Purpose: The turn-based TTRPG layer on top of the live colony. Shows the
 *          scenario card and goal, colony resources, the story so far, the four
 *          action cards from rules/action-schema.json and a free-text plan, and
 *          resolves the chosen action with a visible d100 roll.
 *          All rules live in game-master-rules.js; this module only renders.
 * Changelog:
 *   v0.7 - Initial version, ported from the Claude Design canvas (GameMaster artboard).
 */

import templates from '../../narrative/scenario-templates.json';
import actionSchema from '../../rules/action-schema.json';
import { seedFrom } from './pixel-art.js';
import {
  MAX_ENERGY, SCENARIO_PROMPTS, OWN_PLAN, createSession, describeAction, checkRequirements,
  resolveAction, nextTurn, goalProgress, totalAnts
} from './game-master-rules.js';

const ACTIONS = actionSchema.actions;

const KIND_COLORS = {
  omen: 'var(--scout)',
  danger: 'var(--soldier)',
  discovery: 'var(--amber)',
  success: 'var(--leaf)'
};

const RULE_LABELS = {
  increased_predator_encounters: 'Increased predator encounters',
  double_food_consumption_after_turn_5: 'Double food use after turn 5'
};

/** Pick the opening scenario that fits the world's starting season. */
export function scenarioFor(config = {}) {
  return config.startingSeason === 'winter' || config.startingSeason === 'autumn'
    ? 'winter_survival'
    : 'predator_threat';
}

export class GameMasterScreen {
  /**
   * @param {object} options
   * @param {() => object|null} options.getWorldConfig  current world config (name, season, ratios)
   * @param {() => void} options.onBack  return to the live colony
   */
  constructor({ getWorldConfig = () => null, onBack = () => {} } = {}) {
    this.getWorldConfig = getWorldConfig;
    this.onBack = onBack;
    this.session = null;
    this.sessionKey = null;
    this.plays = 0;
    this.picked = null;

    this.root = document.getElementById('gameMasterScreen');
    if (!this.root) return;
    const $ = (id) => document.getElementById(id);
    this.el = {
      worldLine: $('gmWorldLine'), title: $('gmScenarioTitle'), turn: $('gmTurn'),
      setup: $('gmSetup'), goal: $('gmGoal'), goalLabel: $('gmGoalLabel'), goalValue: $('gmGoalValue'),
      goalBar: $('gmGoalBar'), rules: $('gmRules'),
      food: $('gmFood'), ants: $('gmAnts'), morale: $('gmMorale'),
      workers: $('gmWorkers'), scouts: $('gmScouts'), soldiers: $('gmSoldiers'), energy: $('gmEnergy'),
      story: $('gmStory'), prompt: $('gmPrompt'),
      choose: $('gmChoose'), actions: $('gmActions'), plan: $('gmOwnPlan'),
      commit: $('gmCommitBtn'), commitLabel: $('gmCommitLabel'),
      result: $('gmResult'), roll: $('gmRoll'), resultTitle: $('gmResultTitle'),
      resultDetail: $('gmResultDetail'), next: $('gmNextBtn')
    };

    $('gmBackBtn')?.addEventListener('click', () => this.close());
    $('gmWatchBtn')?.addEventListener('click', () => this.close());
    this.el.actions.addEventListener('click', (e) => {
      const card = e.target.closest('button[data-action]');
      if (!card || card.disabled) return;
      this.picked = this.picked === card.dataset.action ? null : card.dataset.action;
      if (this.picked) this.el.plan.value = '';
      this.render();
    });
    this.el.plan.addEventListener('input', () => {
      if (this.el.plan.value.trim()) this.picked = null;
      this.render();
    });
    this.el.plan.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || this.el.commit.disabled) return;
      // Focus moves to "Next turn" on commit; without this the same Enter would press it
      e.preventDefault();
      this.commit();
    });
    this.el.commit.addEventListener('click', () => this.commit());
    this.el.next.addEventListener('click', () => this.advance());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen() && e.target !== this.el.plan) this.close();
    });
  }

  isOpen() {
    return !!this.root && !this.root.classList.contains('hidden');
  }

  /** Show the screen; starts a new session the first time, or when the world changed. */
  open() {
    if (!this.root) return;
    const config = this.getWorldConfig() || {};
    const key = config.id || config.worldName || 'default';
    if (!this.session || this.sessionKey !== key) this.startSession(config, key);
    document.getElementById('simulationInterface')?.classList.add('hidden');
    this.root.classList.remove('hidden');
    this.render();
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
    this.root.querySelector('#gmBackBtn')?.focus();
  }

  close() {
    if (!this.root) return;
    this.root.classList.add('hidden');
    document.getElementById('simulationInterface')?.classList.remove('hidden');
    this.onBack();
  }

  startSession(config, key) {
    const ratios = config.workerRatio
      ? { worker: config.workerRatio, scout: config.scoutRatio, soldier: config.soldierRatio }
      : undefined;
    this.session = createSession(templates, scenarioFor(config), {
      // Same world + same play number = same dice, so a session can be replayed
      seed: seedFrom(`${key}:gm:${this.plays++}`),
      worldName: config.worldName,
      ratios
    });
    this.sessionKey = key;
    this.picked = null;
    if (this.el?.plan) this.el.plan.value = '';
  }

  commit() {
    const s = this.session;
    const plan = this.el.plan.value.trim();
    if (!s || s.resolved || (!this.picked && !plan)) return;
    resolveAction(s, this.picked, ACTIONS, templates, plan);
    this.render();
    this.el.next.focus();
  }

  advance() {
    const s = this.session;
    if (!s) return;
    if (s.status !== 'playing') {
      this.startSession(this.getWorldConfig() || {}, this.sessionKey);
    } else {
      nextTurn(s, templates);
    }
    this.picked = null;
    this.el.plan.value = '';
    this.render();
    if (this.session.status === 'playing') this.el.plan.focus({ preventScroll: true });
  }

  /* ---------- Rendering ---------- */

  render() {
    const s = this.session;
    if (!s || !this.el) return;
    const { el } = this;
    const c = s.colony;

    el.worldLine.textContent = `GameMaster · ${s.worldName}`;
    el.title.textContent = s.scenario.title;
    el.turn.textContent = s.turn;

    el.setup.textContent = s.scenario.setup;
    el.goal.textContent = s.scenario.goal;
    const goal = goalProgress(s);
    el.goalLabel.textContent = goal.label;
    el.goalValue.textContent = `${goal.value} / ${goal.target}`;
    el.goalBar.style.width = `${goal.pct}%`;
    el.rules.replaceChildren(...(s.scenario.special_rules || []).map((r) => {
      const li = document.createElement('li');
      li.textContent = RULE_LABELS[r] || r.replace(/_/g, ' ');
      return li;
    }));

    el.food.textContent = c.food;
    el.ants.textContent = totalAnts(c);
    el.morale.textContent = c.morale;
    el.workers.textContent = c.worker;
    el.scouts.textContent = s.lostScouts ? `${c.scout} (lost)` : c.scout;
    el.soldiers.textContent = c.soldier;
    el.energy.replaceChildren(...Array.from({ length: MAX_ENERGY }, (_, i) => {
      const pip = document.createElement('span');
      if (i < s.energy) pip.className = 'on';
      return pip;
    }));
    el.energy.setAttribute('aria-label', `${s.energy} of ${MAX_ENERGY} energy left`);

    this.renderStory();
    el.prompt.textContent = this.promptText();

    const choosing = s.status === 'playing' && !s.resolved;
    el.choose.classList.toggle('hidden', !choosing);
    el.result.classList.toggle('hidden', choosing);
    if (choosing) this.renderActions();
    else this.renderResult();
  }

  promptText() {
    const s = this.session;
    const lines = SCENARIO_PROMPTS[s.scenarioId] || SCENARIO_PROMPTS.predator_threat;
    if (s.status === 'won') return `${s.worldName} has done it. The GameMaster tips an antenna to you.`;
    if (s.status === 'lost') return 'The tunnels fall silent. This colony’s story ends here.';
    return s.resolved ? lines.after : lines.ask;
  }

  renderStory() {
    const list = this.el.story;
    list.replaceChildren(...this.session.story.map((beat) => {
      const li = document.createElement('li');
      li.className = 'gm-beat';
      li.style.setProperty('--c', KIND_COLORS[beat.kind] || 'var(--text-muted)');
      li.innerHTML = `
        <span class="mono gm-when"></span>
        <div class="gm-beat-body">
          <span class="gm-tag"></span>
          <p class="gm-beat-text"></p>
        </div>`;
      li.querySelector('.gm-when').textContent = `Turn ${beat.turn}`;
      li.querySelector('.gm-tag').textContent = beat.tag;
      li.querySelector('.gm-beat-text').textContent = beat.text;
      if (beat.outcome) {
        const out = document.createElement('p');
        out.className = 'gm-beat-outcome';
        out.textContent = beat.outcome;
        li.querySelector('.gm-beat-body').append(out);
      }
      return li;
    }));
    list.scrollTop = list.scrollHeight;
  }

  renderActions() {
    const s = this.session;
    const cards = Object.entries(ACTIONS).map(([id, action]) => {
      const info = describeAction(id, action);
      const check = checkRequirements(s, action);
      if (!check.ok && this.picked === id) this.picked = null;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gm-action';
      btn.dataset.action = id;
      btn.disabled = !check.ok;
      btn.setAttribute('aria-pressed', String(this.picked === id));
      btn.innerHTML = `
        <span class="gm-action-head"><span class="gm-action-name"></span><span class="gm-action-odds"></span></span>
        <span class="gm-action-desc"></span>
        <dl class="gm-action-facts">
          <dt>Needs</dt><dd data-f="needs"></dd>
          <dt>Effect</dt><dd data-f="effect" class="mono"></dd>
          <dt>Risk</dt><dd data-f="risk"></dd>
        </dl>`;
      btn.querySelector('.gm-action-name').textContent = info.name;
      btn.querySelector('.gm-action-odds').textContent = info.odds;
      btn.querySelector('.gm-action-desc').textContent = info.desc;
      btn.querySelector('[data-f="needs"]').textContent = info.needs;
      btn.querySelector('[data-f="effect"]').textContent = info.effect;
      const risk = btn.querySelector('[data-f="risk"]');
      risk.textContent = info.risk;
      risk.className = info.hasRisk ? 'risky' : 'safe';
      if (!check.ok) {
        const why = document.createElement('span');
        why.className = 'gm-action-blocked';
        why.textContent = check.missing.join('. ');
        btn.append(why);
      }
      return btn;
    });
    this.el.actions.replaceChildren(...cards);

    const plan = this.el.plan.value.trim();
    const planOk = checkRequirements(s, OWN_PLAN).ok;
    this.el.commit.disabled = !(this.picked || (plan && planOk));
    this.el.commitLabel.textContent = this.picked
      ? (ACTIONS[this.picked].success_rate >= 1 ? `Commit to ${this.picked}` : `Roll for ${this.picked}`)
      : plan
        ? (planOk ? 'Put it to the GameMaster' : 'No energy for a plan')
        : 'Pick an action';
  }

  renderResult() {
    const s = this.session;
    const r = s.resolved;
    const { el } = this;
    const won = s.status === 'won';
    const color = r ? (r.success ? 'var(--leaf)' : 'var(--soldier)') : (won ? 'var(--leaf)' : 'var(--soldier)');
    el.result.style.setProperty('--c', color);
    el.roll.textContent = r && r.roll !== null ? r.roll : '—';
    el.resultTitle.textContent = r ? r.title : (won ? 'Goal reached' : 'The colony is lost');
    let detail = r ? r.detail : '';
    if (s.status === 'won') detail += ` ${s.scenario.goal}: done.`;
    if (s.status === 'lost') detail += ' No ants remain.';
    el.resultDetail.textContent = detail.trim();
    el.next.textContent = s.status === 'playing' ? 'Next turn' : 'Play again';
  }
}
