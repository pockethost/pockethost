import type { ContainerInspectInfo } from 'dockerode'
import { describe, expect, it } from 'vitest'
import {
  containerMatchesBinaryPath,
  getContainerBoundBinaryPath,
  getContainerPortBinding,
  resolveInstanceIdFromInspect,
} from './dockerInstance'

const mkInspect = (overrides: Partial<ContainerInspectInfo>): ContainerInspectInfo =>
  ({
    Name: '/hf4tiy5no3m0r0t',
    State: { Running: true },
    Mounts: [],
    NetworkSettings: { Ports: { '8090/tcp': [{ HostPort: '33525' }] } },
    ...overrides,
  }) as ContainerInspectInfo

describe('resolveInstanceIdFromInspect', () => {
  it('resolves instance id from container name', () => {
    expect(resolveInstanceIdFromInspect(mkInspect({}))).toBe('hf4tiy5no3m0r0t')
  })

  it('returns undefined when name is missing', () => {
    expect(resolveInstanceIdFromInspect(mkInspect({ Name: undefined }))).toBeUndefined()
  })
})

describe('getContainerPortBinding', () => {
  it('reads host port from inspect', () => {
    expect(getContainerPortBinding(mkInspect({}))).toBe(33525)
  })
})

describe('containerMatchesBinaryPath', () => {
  it('matches pocketbase bind mount source', () => {
    const info = mkInspect({
      Mounts: [{ Source: '/opt/pb/0.39.0/linux_amd64/pocketbase', Destination: '/home/pockethost/pocketbase' }],
    })
    expect(getContainerBoundBinaryPath(info)).toBe('/opt/pb/0.39.0/linux_amd64/pocketbase')
    expect(containerMatchesBinaryPath(info, '/opt/pb/0.39.0/linux_amd64/pocketbase')).toBe(true)
    expect(containerMatchesBinaryPath(info, '/opt/pb/0.38.0/linux_amd64/pocketbase')).toBe(false)
  })
})
