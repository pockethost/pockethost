import type { ContainerInspectInfo } from 'dockerode'
import { describe, expect, it } from 'vitest'
import { MOTHERSHIP_CONTAINER_NAME } from '../constants'
import {
  containerMatchesBinaryPath,
  getContainerBoundBinaryPath,
  getContainerPortBinding,
  isCustomerInstanceContainerName,
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

describe('isCustomerInstanceContainerName', () => {
  it('excludes mothership container', () => {
    expect(isCustomerInstanceContainerName(MOTHERSHIP_CONTAINER_NAME)).toBe(false)
    expect(isCustomerInstanceContainerName('hf4tiy5no3m0r0t')).toBe(true)
  })
})

describe('resolveInstanceIdFromInspect', () => {
  it('resolves instance id from container name', () => {
    expect(resolveInstanceIdFromInspect(mkInspect({}))).toBe('hf4tiy5no3m0r0t')
  })

  it('returns undefined when name is missing', () => {
    expect(resolveInstanceIdFromInspect(mkInspect({ Name: undefined }))).toBeUndefined()
  })

  it('returns undefined for mothership container', () => {
    expect(resolveInstanceIdFromInspect(mkInspect({ Name: `/${MOTHERSHIP_CONTAINER_NAME}` }))).toBeUndefined()
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
