import { describe, expect, it } from 'vitest'
import {
  assertNotInstanceRootDelete,
  assertNotInstanceRootMkdir,
  assertNotInstanceRootMutation,
  INSTANCE_ROOT_ALLOWED_FILE_NAMES,
  isAllowedInstanceRootFile,
  isAtInstanceRoot,
  POWERED_OFF_ONLY,
  VirtualFolderNames,
} from './guards'

const instance = { id: 'inst1' }

describe('InstanceFileAccess guards', () => {
  it('allows deploy sync state file at instance root', () => {
    expect(isAllowedInstanceRootFile('.ftp-deploy-sync-state.json')).toBe(true)
    expect(INSTANCE_ROOT_ALLOWED_FILE_NAMES).toContain('.ftp-deploy-sync-state.json')
    expect(() => assertNotInstanceRootDelete(['.ftp-deploy-sync-state.json'], instance)).not.toThrow()
  })

  it('blocks arbitrary files at instance root', () => {
    expect(() => assertNotInstanceRootMutation(['evil.txt'], instance)).toThrow('not allowed')
    expect(() => assertNotInstanceRootDelete(['evil.txt'], instance)).toThrow('Cannot remove')
  })

  it('treats pb_data as powered-off-only', () => {
    expect(POWERED_OFF_ONLY).toContain(VirtualFolderNames.Data)
  })

  it('detects instance root path', () => {
    expect(isAtInstanceRoot([], instance)).toBe(true)
    expect(isAtInstanceRoot(['pb_hooks'], instance)).toBe(false)
  })

  it('allows mkdir on standard instance root folders', () => {
    expect(() => assertNotInstanceRootMkdir(['pb_public'], instance)).not.toThrow()
    expect(() => assertNotInstanceRootMkdir(['pb_hooks'], instance)).not.toThrow()
  })

  it('blocks mkdir for custom top-level folders', () => {
    expect(() => assertNotInstanceRootMkdir(['custom'], instance)).toThrow('Cannot create directories')
  })
})
