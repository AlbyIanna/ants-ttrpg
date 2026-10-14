/**
 * Tests for gliding ants in SimpleRenderer
 * Version: v0.7
 * Changelog: v0.7 - initial tests for trackAnts() / glideProgress()
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { SimpleRenderer } from './simple-renderer.js'

const stateWith = (ants) => ({ ants: ants.map(([id, x, y]) => ({ id, position: { x, y } })) })

describe('SimpleRenderer gliding ants', () => {
  afterEach(() => vi.restoreAllMocks())

  const renderer = () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // no #colonyCanvas in tests
    const r = new SimpleRenderer()
    r.reduceMotion = false
    return r
  }
  const at = (ms) => vi.spyOn(performance, 'now').mockReturnValue(ms)
  const drawn = (r, id, ms) => {
    at(ms)
    const t = r.tracks.get(id)
    const p = r.glideProgress(ms)
    return [t.fx + (t.tx - t.fx) * p, t.fy + (t.ty - t.fy) * p]
  }

  it('glides an ant from its old cell to its new one over one tick', () => {
    const r = renderer()
    at(0); r.trackAnts(stateWith([[1, 10, 10]]))
    at(1000); r.trackAnts(stateWith([[1, 11, 10]]))   // first move: default 800 ms tick
    expect(drawn(r, 1, 1000)).toEqual([10, 10])
    expect(drawn(r, 1, 1400)).toEqual([10.5, 10])
    expect(drawn(r, 1, 1800)).toEqual([11, 10])
    expect(drawn(r, 1, 2500)).toEqual([11, 10])
  })

  it('times the glide to the measured tick length (faster speeds)', () => {
    const r = renderer()
    at(0); r.trackAnts(stateWith([[1, 0, 0]]))
    at(100); r.trackAnts(stateWith([[1, 1, 0]]))
    at(300); r.trackAnts(stateWith([[1, 2, 0]]))      // ticks now 200 ms apart
    expect(r.tickDuration).toBe(200)
    // The new glide starts where the ant was drawn (a quarter of the way to
    // x = 1 at 300 ms), so nothing jumps, and lasts the measured 200 ms
    expect(drawn(r, 1, 300)[0]).toBeCloseTo(0.25, 5)
    expect(drawn(r, 1, 400)[0]).toBeCloseTo(1.125, 5)
    expect(drawn(r, 1, 500)[0]).toBeCloseTo(2, 5)
  })

  it('snaps jumps longer than one cell instead of sliding across the map', () => {
    const r = renderer()
    at(0); r.trackAnts(stateWith([[1, 5, 5]]))
    at(800); r.trackAnts(stateWith([[1, 40, 5]]))
    expect(drawn(r, 1, 800)).toEqual([40, 5])
  })

  it('does not restart glides on renders without movement (pan, zoom, layers)', () => {
    const r = renderer()
    at(0); r.trackAnts(stateWith([[1, 0, 0]]))
    at(800); r.trackAnts(stateWith([[1, 1, 0]]))
    at(1200); r.trackAnts(stateWith([[1, 1, 0]]))     // a redraw mid-glide
    expect(r.tickStart).toBe(800)
    expect(drawn(r, 1, 1200)).toEqual([0.5, 0])
  })

  it('shows ants on their cells straight away under reduced motion', () => {
    const r = renderer()
    r.reduceMotion = true
    at(0); r.trackAnts(stateWith([[1, 0, 0]]))
    at(800); r.trackAnts(stateWith([[1, 1, 0]]))
    expect(drawn(r, 1, 800)).toEqual([1, 0])
  })
})
