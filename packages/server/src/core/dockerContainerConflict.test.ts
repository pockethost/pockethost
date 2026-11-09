import Docker from 'dockerode'
import { describe, expect, it, vi } from 'vitest'
import {
  DOCKER_CONTAINER_REMOVAL_WAIT_MS,
  removeNamedContainer,
  waitUntilNamedContainerRemoved,
  withDockerContainerConflictRetry,
} from './dockerInstance'
import { isDockerContainerConflict, isDockerContainerStopBenign } from './phError'

describe('isDockerContainerConflict', () => {
  it('matches removal already in progress', () => {
    expect(
      isDockerContainerConflict(
        new Error('(HTTP code 409) unexpected - removal of container lemrirwbhoshwb7 is already in progress')
      )
    ).toBe(true)
  })

  it('matches container name already in use', () => {
    expect(
      isDockerContainerConflict(
        new Error('(HTTP code 409) Conflict: The container name "/abc" is already in use by container "def"')
      )
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isDockerContainerConflict(new Error('(HTTP code 404) no such container'))).toBe(false)
    expect(isDockerContainerConflict(new Error('(HTTP code 409) port already allocated'))).toBe(false)
  })
})

describe('isDockerContainerStopBenign', () => {
  it('matches container not found', () => {
    expect(isDockerContainerStopBenign(new Error('(HTTP code 404) no such container: abc'))).toBe(true)
  })

  it('matches container already stopped', () => {
    expect(isDockerContainerStopBenign(new Error('(HTTP code 304) container already stopped - '))).toBe(true)
  })

  it('matches kill on stopped container', () => {
    expect(
      isDockerContainerStopBenign(
        new Error(
          '(HTTP code 409) unexpected - cannot kill container: e09aee171e5c: container e09aee171e5c is not running'
        )
      )
    ).toBe(true)
  })

  it('ignores unrelated errors', () => {
    expect(isDockerContainerStopBenign(new Error('(HTTP code 409) port already allocated'))).toBe(false)
    expect(isDockerContainerStopBenign(new Error('boom'))).toBe(false)
  })
})

describe('removeNamedContainer', () => {
  it('times out when inspect never settles', async () => {
    vi.useFakeTimers()
    const inspect = vi.fn(() => new Promise(() => {}))
    const docker = {
      getContainer: () => ({
        inspect,
        stop: vi.fn(),
        remove: vi.fn(),
      }),
    } as unknown as Docker

    const pending = removeNamedContainer(docker, 'stuck', 1)
    const rejection = expect(pending).rejects.toThrow(/Timed out waiting for Docker inspect stuck/)
    await vi.advanceTimersByTimeAsync(DOCKER_CONTAINER_REMOVAL_WAIT_MS)
    await rejection
    vi.useRealTimers()
  })
})

describe('waitUntilNamedContainerRemoved', () => {
  it('times out when inspect hangs', async () => {
    vi.useFakeTimers()
    const inspect = vi.fn(() => new Promise(() => {}))
    const docker = { getContainer: () => ({ inspect }) } as unknown as Docker

    const pending = waitUntilNamedContainerRemoved(docker, 'stuck', 200)
    const rejection = expect(pending).rejects.toThrow(/Timed out waiting for Docker inspect stuck/)
    await vi.advanceTimersByTimeAsync(200)
    await rejection
    vi.useRealTimers()
  })

  it('returns once inspect fails with not found', async () => {
    const inspect = vi.fn().mockRejectedValueOnce(new Error('(HTTP code 404) no such container: abc'))
    const docker = { getContainer: () => ({ inspect }) } as unknown as Docker

    await waitUntilNamedContainerRemoved(docker, 'abc', 500)
    expect(inspect).toHaveBeenCalledTimes(1)
  })
})

describe('withDockerContainerConflictRetry', () => {
  it('retries after a container conflict', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('(HTTP code 409) unexpected - removal of container abc is already in progress'))
      .mockResolvedValueOnce('ok')
    const inspect = vi.fn().mockRejectedValueOnce(new Error('(HTTP code 404) no such container: abc'))
    const docker = { getContainer: () => ({ inspect }) } as unknown as Docker

    await expect(withDockerContainerConflictRetry(fn, { docker, name: 'abc', timeoutMs: 500 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('rethrows non-conflict errors immediately', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'))
    const docker = { getContainer: vi.fn() } as unknown as Docker

    await expect(withDockerContainerConflictRetry(fn, { docker, name: 'abc', timeoutMs: 500 })).rejects.toThrow('boom')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
