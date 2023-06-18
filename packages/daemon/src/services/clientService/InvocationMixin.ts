import {
  InstanceFields,
  InvocationFields,
  pocketNow,
  safeCatch,
} from '@pockethost/common'
import { InstanceApi } from './InstanceMIxin'
import { MixinContext } from './PbClient'

export const createInvocationMixin = (
  context: MixinContext,
  instanceApi: InstanceApi
) => {
  const { logger } = context
  const { dbg } = logger.create('InvocationMixin')

  const { client } = context

  const createInvocation = safeCatch(
    `createInvocation`,
    logger,
    async (instance: InstanceFields, pid: number) => {
      const init: Partial<InvocationFields> = {
        startedAt: pocketNow(),
        pid,
        instanceId: instance.id,
        totalSeconds: 0,
      }
      const _inv = await client
        .collection('invocations')
        .create<InvocationFields>(init, {
          $cancelKey: `createInvocation:${instance.id}:${pid}`,
        })
      return _inv
    }
  )

  const pingInvocation = safeCatch(
    `pingInvocation`,
    logger,
    async (invocation: InvocationFields) => {
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationFields> = {
        totalSeconds,
      }
      const _inv = await client
        .collection('invocations')
        .update<InvocationFields>(invocation.id, toUpdate)
      await instanceApi.updateInstanceSeconds(invocation.instanceId)
      return _inv
    }
  )

  const finalizeInvocation = safeCatch(
    `finalizeInvocation`,
    logger,
    async (invocation: InvocationFields) => {
      dbg('finalizing')
      const totalSeconds =
        (+new Date() - Date.parse(invocation.startedAt)) / 1000
      const toUpdate: Partial<InvocationFields> = {
        endedAt: pocketNow(),
        totalSeconds,
      }
      dbg({ toUpdate })
      const _inv = await client
        .collection('invocations')
        .update<InvocationFields>(invocation.id, toUpdate)
      await instanceApi.updateInstanceSeconds(invocation.instanceId)
      return _inv
    }
  )

  return { finalizeInvocation, pingInvocation, createInvocation }
}
