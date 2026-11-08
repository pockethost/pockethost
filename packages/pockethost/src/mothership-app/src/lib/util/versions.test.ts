import { describe, expect, it } from 'vitest'
import { isSelectableVersion, selectableVersionError } from './versions'

describe('isSelectableVersion', () => {
  it('accepts 0.23 and later', () => {
    expect(isSelectableVersion('0.23.*')).toBe(true)
    expect(isSelectableVersion('0.41.*')).toBe(true)
    expect(isSelectableVersion('0.23.12')).toBe(true)
    expect(isSelectableVersion('1.0.*')).toBe(true)
  })

  it('rejects 0.22 and older', () => {
    expect(isSelectableVersion('0.22.*')).toBe(false)
    expect(isSelectableVersion('0.22.58')).toBe(false)
    expect(isSelectableVersion('0.7.*')).toBe(false)
  })

  it('rejects malformed values', () => {
    expect(isSelectableVersion('')).toBe(false)
    expect(isSelectableVersion('~0.23.1')).toBe(false)
    expect(isSelectableVersion('latest')).toBe(false)
  })
})

describe('selectableVersionError', () => {
  const selectable = ['0.41.*', '0.40.*', '0.23.*']

  it('allows a listed selectable version', () => {
    expect(selectableVersionError('0.40.*', selectable)).toBeNull()
  })

  it('requires a version', () => {
    expect(selectableVersionError('', selectable)).toMatch(/required/)
    expect(selectableVersionError(undefined, selectable)).toMatch(/required/)
  })

  it('explains the legacy cutoff for 0.22 and older', () => {
    expect(selectableVersionError('0.22.*', selectable)).toMatch(/no longer supported/)
  })

  it('rejects a 0.23+ version missing from the catalog', () => {
    expect(selectableVersionError('0.24.*', selectable)).toMatch(/Invalid version/)
  })

  it('only applies the floor when the catalog is empty', () => {
    expect(selectableVersionError('0.24.*', [])).toBeNull()
    expect(selectableVersionError('0.22.*', [])).toMatch(/no longer supported/)
  })
})
