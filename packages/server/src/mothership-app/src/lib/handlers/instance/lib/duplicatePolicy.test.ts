import { describe, expect, it } from 'vitest'
import { duplicatePowerOnError, duplicateSourceError, type DuplicateSource } from './duplicatePolicy'

const off: DuplicateSource = { power: false, status: 'idle', suspension: '', duplicateStatus: '', edge: 'e1' }

describe('duplicateSourceError', () => {
  it('allows a powered-off, idle, placed instance', () => {
    expect(duplicateSourceError(off)).toBeNull()
    expect(duplicateSourceError({ ...off, duplicateStatus: 'ready' })).toBeNull()
  })

  it('refuses a running or stopping instance', () => {
    expect(duplicateSourceError({ ...off, power: true })).toMatch(/Power this instance off/)
    expect(duplicateSourceError({ ...off, status: 'running' })).toMatch(/Power this instance off/)
  })

  it('refuses suspended, unfinished or unplaced instances', () => {
    expect(duplicateSourceError({ ...off, suspension: 'x' })).toMatch(/suspended/)
    expect(duplicateSourceError({ ...off, duplicateStatus: 'copying' })).toMatch(/still being copied/)
    expect(duplicateSourceError({ ...off, duplicateStatus: 'failed' })).toMatch(/failed/)
    expect(duplicateSourceError({ ...off, edge: '' })).toMatch(/placed/)
  })
})

describe('duplicatePowerOnError', () => {
  it('blocks a copy until it is ready', () => {
    expect(duplicatePowerOnError('', '')).toBeNull()
    expect(duplicatePowerOnError('ready', '')).toBeNull()
    expect(duplicatePowerOnError('copying', '')).toMatch(/still being made/)
    expect(duplicatePowerOnError('failed', 'disk full')).toMatch(/failed: disk full/)
  })
})
