import {
  InstanceFields,
  InvocationFields,
  InvocationPid,
  pocketNow,
} from '$shared'
import { InstanceApi } from './InstanceMIxin'
import { MixinContext } from './PbClient'

export const createInvocationMixin = (
  context: MixinContext,
  instanceApi: InstanceApi,
) => {
  const { logger } = context
  const { dbg } = logger.create('InvocationMixin')

  const { client } = context

  const createInvocation = async (
    instance: InstanceFields,
    pid: InvocationPid,
  ) => {
    const init: Partial<InvocationFields> = {
      uid: instance.uid,
      startedAt: pocketNow(),
      instanceId: instance.id,
      totalSeconds: 0,
    }
    const _inv = await client
      .collection('invocations')
      .create<InvocationFields>(init)
    return _inv
  }

  const pingInvocation = async (invocation: InvocationFields) => {
    const totalSeconds = (+new Date() - Date.parse(invocation.startedAt)) / 1000
    const toUpdate: Partial<InvocationFields> = {
      totalSeconds,
    }
    const _inv = await client
      .collection('invocations')
      .update<InvocationFields>(invocation.id, toUpdate)
    return _inv
  }

  const finalizeInvocation = async (invocation: InvocationFields) => {
    dbg('finalizing')
    const totalSeconds = (+new Date() - Date.parse(invocation.startedAt)) / 1000
    const toUpdate: Partial<InvocationFields> = {
      endedAt: pocketNow(),
      totalSeconds,
    }
    dbg({ toUpdate })
    const _inv = await client
      .collection('invocations')
      .update<InvocationFields>(invocation.id, toUpdate)
    return _inv
  }

  return { finalizeInvocation, pingInvocation, createInvocation }
}
