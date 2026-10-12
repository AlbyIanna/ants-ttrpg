/**
 * Tests for the world-creation form logic
 * Version: v0.7
 */

import { describe, it, expect } from 'vitest'
import { rebalanceRoles, ROLE_LIMITS } from './world-form.js'

const base = { workerRatio: 60, scoutRatio: 25, soldierRatio: 15 }
const total = (r) => r.workerRatio + r.scoutRatio + r.soldierRatio

describe('rebalanceRoles', () => {
  it('raises a role by taking from the largest other role', () => {
    const next = rebalanceRoles(base, 'soldierRatio', 1)
    expect(next).toEqual({ workerRatio: 55, scoutRatio: 25, soldierRatio: 20 })
  })

  it('lowers a role by giving to workers first', () => {
    const next = rebalanceRoles(base, 'scoutRatio', -1)
    expect(next).toEqual({ workerRatio: 65, scoutRatio: 20, soldierRatio: 15 })
  })

  it('always keeps the total at 100 and every role inside its limits', () => {
    let roles = { ...base }
    const moves = ['workerRatio', 'scoutRatio', 'soldierRatio']
    for (let i = 0; i < 60; i++) {
      roles = rebalanceRoles(roles, moves[i % 3], i % 2 ? 1 : -1)
      expect(total(roles)).toBe(100)
      Object.entries(ROLE_LIMITS).forEach(([k, [min, max]]) => {
        expect(roles[k]).toBeGreaterThanOrEqual(min)
        expect(roles[k]).toBeLessThanOrEqual(max)
      })
    }
  })

  it('returns the same object when a move is not allowed', () => {
    const atMax = { workerRatio: 80, scoutRatio: 10, soldierRatio: 10 }
    expect(rebalanceRoles(atMax, 'workerRatio', 1)).toBe(atMax)
    const atMin = { workerRatio: 60, scoutRatio: 35, soldierRatio: 5 }
    expect(rebalanceRoles(atMin, 'soldierRatio', -1)).toBe(atMin)
  })
})
