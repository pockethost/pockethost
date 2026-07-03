import { describe, expect, it } from 'vitest'
import { isAtInstanceRoot, POWERED_OFF_ONLY, VirtualFolderNames } from './guards'

const instance = { id: 'inst1' }

describe('InstanceFileAccess guards', () => {
  it('treats pb_data as powered-off-only', () => {
    expect(POWERED_OFF_ONLY).toContain(VirtualFolderNames.Data)
  })

  it('detects instance root path', () => {
    expect(isAtInstanceRoot([], instance)).toBe(true)
    expect(isAtInstanceRoot(['pb_hooks'], instance)).toBe(false)
  })
})
