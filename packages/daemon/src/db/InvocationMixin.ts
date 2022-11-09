import {
  InstancesRecord,
  InvocationRecord,
  pocketNow,
} from '@pockethost/common'
import { dbg } from '../util/dbg'
import { safeCatch } from '../util/safeAsync'
import { InstanceApi } from './InstanceMIxin'
import { MixinContext } from './PbClient'

export const createInvocationMixin = (
  context: MixinContext,
  instanceApi: InstanceApi
) => {
  const { client } = context

  const createInvocation = safeCatch(
    `createInvocation`,
    async (instance: InstancesRecord, pid: number) => {
      const init: Partial<InvocationRecord> = {
        startedAt: pocketNow(),
        pid,
        instanceId: instance.id,
        totalSeconds: 0,
      }
      const _inv = await client
        .collection('invocations')
        .create<InvocationRecord>(init)
      return _inv
    }
  )

  const pingInvocation = safeCatch(
    `pingInvocation`,
    async (invocation: InvocationRecord) => {
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationRecord> = {
        totalSeconds,
      }
      const _inv = await client
        .collection('invocations')
        .update<InvocationRecord>(invocation.id, toUpdate)
      await instanceApi.updateInstanceSeconds(invocation.instanceId)
      return _inv
    }
  )

  const finalizeInvocation = safeCatch(
    `finalizeInvocation`,
    async (invocation: InvocationRecord) => {
      dbg('finalizing')
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationRecord> = {
        endedAt: pocketNow(),
        totalSeconds,
      }
      dbg({ toUpdate })
      const _inv = await client
        .collection('invocations')
        .update<InvocationRecord>(invocation.id, toUpdate)
      await instanceApi.updateInstanceSeconds(invocation.instanceId)
      return _inv
    }
  )

  return { finalizeInvocation, pingInvocation, createInvocation }
}
