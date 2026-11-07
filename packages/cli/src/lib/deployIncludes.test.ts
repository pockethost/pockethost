import { describe, expect, it } from 'vitest'
import multimatch from 'multimatch'
import {
  DEFAULT_EXCLUDES,
  DEFAULT_INCLUDES,
  mergeDeployExcludes,
  shouldSyncFile,
} from './deployIncludes'

describe('deployIncludes', () => {
  it('includes pb_* and excludes pb_data', () => {
    expect(DEFAULT_INCLUDES.some((p) => p.startsWith('pb_'))).toBe(true)
    expect(DEFAULT_EXCLUDES).toContain('pb_data')
    expect(DEFAULT_EXCLUDES.some((p) => p.includes('pb_data'))).toBe(true)
  })

  it('merges vendor exclude defaults with user excludes', () => {
    expect(mergeDeployExcludes(['**/.git/**'], ['pb_data'])).toEqual([
      '**/.git/**',
      'pb_data',
    ])
  })

  it('shouldSyncFile respects include and exclude globs', () => {
    const match = (paths: string[], patterns: string[]) =>
      multimatch(paths, patterns)
    expect(
      shouldSyncFile(
        'pb_hooks/main.js',
        DEFAULT_INCLUDES,
        DEFAULT_EXCLUDES,
        match
      )
    ).toBe(true)
    expect(
      shouldSyncFile(
        'pb_data/data.db',
        DEFAULT_INCLUDES,
        DEFAULT_EXCLUDES,
        match
      )
    ).toBe(false)
  })
})
