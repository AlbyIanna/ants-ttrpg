/**
 * Tests for the GameMaster turn rules
 * Version: v0.7
 */

import { describe, it, expect } from 'vitest'
import templates from '../../narrative/scenario-templates.json'
import actionSchema from '../../rules/action-schema.json'
import {
  parseDice, rollDice, rollD100, checkSuccess, splitRoles, totalAnts,
  createSession, describeAction, checkRequirements, resolveAction,
  nextTurn, upkeepCost, goalProgress, updateStatus, loseAnts, MAX_ENERGY
} from './game-master-rules.js'

const actions = actionSchema.actions

/** A fake random source that returns the given values in order. */
const seq = (...values) => { let i = 0; return () => values[i++ % values.length] }

const session = (overrides = {}) => {
  const s = createSession(templates, 'predator_threat', { seed: 42, worldName: 'Mossbank Hollow' })
  return Object.assign(s, overrides)
}

describe('parseDice', () => {
  it('parses dice with a modifier', () => {
    expect(parseDice('+1d6+2')).toEqual({ sign: 1, count: 1, sides: 6, modifier: 2 })
    expect(parseDice('2d4-1')).toEqual({ sign: 1, count: 2, sides: 4, modifier: -1 })
    expect(parseDice('d8')).toEqual({ sign: 1, count: 1, sides: 8, modifier: 0 })
    expect(parseDice('-1d4')).toEqual({ sign: -1, count: 1, sides: 4, modifier: 0 })
  })

  it('parses flat modifiers', () => {
    expect(parseDice('+2')).toEqual({ sign: 1, count: 0, sides: 0, modifier: 2 })
    expect(parseDice('-1')).toEqual({ sign: 1, count: 0, sides: 0, modifier: -1 })
    expect(parseDice(3)).toEqual({ sign: 1, count: 0, sides: 0, modifier: 3 })
  })

  it('rejects things that are not dice', () => {
    expect(parseDice('random')).toBeNull()
    expect(parseDice('1d')).toBeNull()
    expect(parseDice(undefined)).toBeNull()
  })
})

describe('rollDice', () => {
  it('rolls each die from the random source and adds the modifier', () => {
    // 0.5 * 6 -> 3, +1 = 4
    const r = rollDice('+1d6+2', seq(0.5))
    expect(r.total).toBe(6)
    expect(r.rolls).toEqual([4])
    expect(r.text).toBe('1d6+2: 4 + 2')
  })

  it('keeps every result within the dice range', () => {
    const random = createSession(templates, 'predator_threat', { seed: 7 }).random
    for (let i = 0; i < 200; i++) {
      const { total } = rollDice('2d4-1', random)
      expect(total).toBeGreaterThanOrEqual(1)
      expect(total).toBeLessThanOrEqual(7)
    }
  })

  it('returns flat modifiers unchanged', () => {
    expect(rollDice('-1', seq(0.9)).total).toBe(-1)
  })
})

describe('d100 against success_rate', () => {
  it('rolls 1..100', () => {
    expect(rollD100(seq(0))).toBe(1)
    expect(rollD100(seq(0.999))).toBe(100)
  })

  it('succeeds at or under the success rate', () => {
    expect(checkSuccess(80, 0.8)).toBe(true)
    expect(checkSuccess(81, 0.8)).toBe(false)
    expect(checkSuccess(1, 0.7)).toBe(true)
    expect(checkSuccess(100, 1)).toBe(true)
  })
})

describe('createSession', () => {
  it('starts from the scenario conditions with roles that add up', () => {
    const s = session()
    expect(s.turn).toBe(1)
    expect(s.energy).toBe(MAX_ENERGY)
    expect(s.colony.food).toBe(20)
    expect(s.colony.morale).toBe(4)
    expect(totalAnts(s.colony)).toBe(8)
    expect(s.story[0].text).toMatch(/large bird/)
  })

  it('splits by the world ratios', () => {
    expect(splitRoles(10, { worker: 60, scout: 25, soldier: 15 })).toEqual({ worker: 6, scout: 3, soldier: 1 })
    expect(splitRoles(8)).toEqual({ worker: 5, scout: 2, soldier: 1 })
  })

  it('is deterministic for a seed', () => {
    const a = session(); const b = session()
    expect(resolveAction(a, 'forage', actions, templates)).toEqual(resolveAction(b, 'forage', actions, templates))
  })
})

describe('describeAction', () => {
  it('turns the schema into card copy', () => {
    expect(describeAction('forage', actions.forage)).toMatchObject({
      name: 'Forage', odds: '80%', needs: '3 workers · 1 energy', effect: 'food +1d6+2', risk: 'Predator encounter'
    })
    expect(describeAction('rest', actions.rest)).toMatchObject({
      odds: '100%', needs: 'Nothing', effect: 'morale +1, food −1', risk: 'None'
    })
    expect(describeAction('defend', actions.defend).needs).toBe('1 soldier · 1 energy')
  })
})

describe('checkRequirements', () => {
  it('passes when the colony has the ants and energy', () => {
    expect(checkRequirements(session(), actions.forage)).toEqual({ ok: true, missing: [] })
  })

  it('lists what is missing', () => {
    const s = session()
    s.colony.worker = 2
    s.energy = 0
    const r = checkRequirements(s, actions.forage)
    expect(r.ok).toBe(false)
    expect(r.missing).toEqual(['Needs 3 workers, have 2', 'Needs 1 energy, 0 left'])
  })

  it('blocks scouts while they are lost', () => {
    const s = session({ lostScouts: true })
    expect(checkRequirements(s, actions.explore).missing).toContain('The scouts are still lost')
  })

  it('has no requirements for rest', () => {
    expect(checkRequirements(session({ energy: 0 }), actions.rest).ok).toBe(true)
  })
})

describe('resolveAction', () => {
  it('applies forage dice on success and spends energy', () => {
    // d100 -> 34 (success), flavour pick, 1d6 -> 4, then the predator check -> 90 (no predator)
    const s = session({ random: seq(0.33, 0, 0.5, 0.89) })
    const r = resolveAction(s, 'forage', actions, templates)
    expect(r.roll).toBe(34)
    expect(r.success).toBe(true)
    expect(r.detail).toBe('Rolled 34 against 80%. Food +6 (1d6+2: 4 + 2).')
    expect(s.colony.food).toBe(26)
    expect(s.energy).toBe(2)
    expect(s.story.at(-1)).toMatchObject({ turn: 1, tag: 'Forage', kind: 'success' })
  })

  it('a failed forage triggers a predator encounter', () => {
    // d100 -> 90 (fail), flavour, 1d2 -> 2 bite, event text
    const s = session({ random: seq(0.89, 0, 0.9, 0) })
    const r = resolveAction(s, 'forage', actions, templates)
    expect(r.success).toBe(false)
    expect(r.title).toBe('Forage fails')
    expect(totalAnts(s.colony)).toBe(6)
    expect(s.colony.food).toBe(20)
    expect(r.entries.map((e) => e.tag)).toEqual(['Forage', 'Event'])
  })

  it('defence soaks predator losses', () => {
    const s = session({ random: seq(0.89, 0, 0.9, 0), defence: 2 })
    resolveAction(s, 'forage', actions, templates)
    expect(totalAnts(s.colony)).toBe(8)
  })

  it('lost scouts miss the next turn', () => {
    const s = session({ random: seq(0.95, 0) })
    const r = resolveAction(s, 'explore', actions, templates)
    expect(r.detail).toBe('Rolled 96 against 70%. The scouts are lost and miss next turn.')
    expect(s.lostScouts).toBe(true)
    expect(s.energy).toBe(1)
  })

  it('rest needs no roll', () => {
    const s = session()
    const r = resolveAction(s, 'rest', actions, templates)
    expect(r.roll).toBeNull()
    expect(r.detail).toBe('No roll needed. Morale +1. Food −1.')
    expect(s.colony).toMatchObject({ morale: 5, food: 19 })
  })

  it('defend raises defence and morale', () => {
    const s = session({ random: seq(0.1, 0) })
    resolveAction(s, 'defend', actions, templates)
    expect(s.defence).toBe(2)
    expect(s.colony.morale).toBe(5)
  })

  it('puts your own plan to a 50% roll', () => {
    const s = session({ random: seq(0.7) })
    const r = resolveAction(s, null, actions, templates, 'Lure the bird away')
    expect(r.title).toBe('Your plan fails')
    expect(r.entries[0].text).toContain('Lure the bird away')
    expect(s.colony.morale).toBe(3)
  })

  it('refuses an action whose requirements are not met', () => {
    const s = session({ energy: 1 })
    expect(() => resolveAction(s, 'explore', actions, templates)).toThrow(/Requirements not met/)
    expect(s.energy).toBe(1)
  })

  it('allows only one action per turn', () => {
    const s = session()
    resolveAction(s, 'rest', actions, templates)
    expect(() => resolveAction(s, 'rest', actions, templates)).toThrow(/already resolved/)
  })
})

describe('nextTurn', () => {
  it('advances the turn, restores energy and returns lost scouts', () => {
    const s = session({ energy: 1, lostScouts: true, defence: 2 })
    const entry = nextTurn(s, templates)
    expect(s.turn).toBe(2)
    expect(s.energy).toBe(2)
    expect(s.defence).toBe(0)
    expect(s.lostScouts).toBe(false)
    expect(entry.outcome).toContain('lost scouts find their way home')
  })

  it('feeds the colony and hatches a worker when food is plentiful', () => {
    const s = session()
    nextTurn(s, templates)
    // 8 ants eat 2, then a worker hatches for 2 more
    expect(s.colony.food).toBe(16)
    expect(totalAnts(s.colony)).toBe(9)
  })

  it('starves ants when food runs out', () => {
    const s = session()
    s.colony.food = 0
    nextTurn(s, templates)
    expect(s.colony.food).toBe(0)
    expect(totalAnts(s.colony)).toBe(6)
    expect(s.colony.morale).toBe(3)
  })

  it('doubles upkeep after turn 5 in winter', () => {
    const s = createSession(templates, 'winter_survival', { seed: 1 })
    expect(upkeepCost(s)).toBe(3)
    s.turn = 6
    expect(upkeepCost(s)).toBe(6)
  })
})

describe('goals', () => {
  it('tracks growth towards 15 ants and wins there', () => {
    const s = session()
    expect(goalProgress(s)).toEqual({ label: 'Colony size', value: 8, target: 15, pct: 53 })
    s.colony.worker += 7
    expect(updateStatus(s)).toBe('won')
  })

  it('loses when the last ant is gone', () => {
    const s = session()
    loseAnts(s.colony, 99)
    expect(updateStatus(s)).toBe('lost')
  })

  it('winter is won by lasting 10 turns with 10 ants', () => {
    const s = createSession(templates, 'winter_survival', { seed: 1 })
    s.turn = 11
    expect(updateStatus(s)).toBe('won')
    s.colony.worker = 0
    expect(updateStatus(s)).toBe('lost')
  })
})
