import { describe, expect, it } from 'vitest'
import {
  INSTANCE_CONTEXT_REQUIRED,
  InstanceVfsUserError,
  assertInstanceContext,
  isExpectedVfsClientError,
  isVfsNotFoundError,
} from './errors'

describe('InstanceFileAccess errors', () => {
  it('throws a user-facing error when instance context is missing', () => {
    expect(() => assertInstanceContext(undefined)).toThrow(InstanceVfsUserError)
    expect(() => assertInstanceContext(undefined)).toThrow(INSTANCE_CONTEXT_REQUIRED)
  })

  it('classifies known client mistakes as expected', () => {
    expect(isExpectedVfsClientError(new InstanceVfsUserError(INSTANCE_CONTEXT_REQUIRED))).toBe(true)
    expect(isExpectedVfsClientError(new Error('Cannot create directories at the instance root.'))).toBe(true)
    expect(isExpectedVfsClientError(new Error('Accessing evil is not allowed.'))).toBe(true)
    expect(isExpectedVfsClientError(new Error('Instance must be powered off first'))).toBe(true)
    expect(isExpectedVfsClientError(new Error('no such file or directory: foo'))).toBe(true)
    expect(
      isExpectedVfsClientError(
        Object.assign(new Error("ENOENT: no such file or directory, unlink '/tmp/foo'"), { code: 'ENOENT' })
      )
    ).toBe(true)
    expect(isVfsNotFoundError(Object.assign(new Error('missing'), { code: 'ENOENT' }))).toBe(true)
  })

  it('does not classify unexpected failures as client errors', () => {
    expect(isExpectedVfsClientError(new Error('ECONNRESET'))).toBe(false)
  })
})
