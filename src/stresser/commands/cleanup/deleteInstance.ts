import { clientService } from '$services'
import {
  INSTANCE_COLLECTION,
  INVOCATION_COLLECTION,
  InstanceFields,
  InvocationFields,
  LoggerService,
  singletonAsyncExecutionGuard,
} from '$shared'
import Bottleneck from 'bottleneck'
import { ClientResponseError } from 'pocketbase'

export const deleteInvocation = singletonAsyncExecutionGuard(
  async (invocation: InvocationFields) => {
    const { client } = await clientService()
    await client.client.collection(INVOCATION_COLLECTION).delete(invocation.id)
  },
  (invocation) => `deleteInvocation:${invocation.id}`,
)

export const deleteInvocationsForInstance = singletonAsyncExecutionGuard(
  async (instance: InstanceFields) => {
    const { client } = await clientService()
    const { dbg, error } = LoggerService()
      .create(`deleteInvocationsForInstance`)
      .breadcrumb(instance.id)
    const { id } = instance
    while (true) {
      try {
        console.log(`Deleting invocations for ${id}`)
        const invocation = await client.client
          .collection(INVOCATION_COLLECTION)
          .getFirstListItem<InvocationFields>(`instanceId = '${id}'`)
        console.log(`Deleting invocation ${invocation.id}`)
        await client.client
          .collection(INVOCATION_COLLECTION)
          .delete(invocation.id)
        console.log(`Invocation deleted ${id}`)
      } catch (e) {
        if (e instanceof ClientResponseError) {
          if (e.status === 404) {
            dbg(`No more invocations`)
            return
          }
        }
        error(e)
        break
      }
    }
  },
  (instance) => `deleteInvocationsForInstance:${instance.id}`,
)

export const deleteInstance = singletonAsyncExecutionGuard(
  async (instance: InstanceFields) => {
    const { client } = await clientService()
    const { id } = instance
    await deleteInvocationsForInstance(instance).catch((e) => {
      console.error(
        `deleteInvocationsForInstance error`,
        JSON.stringify(e, null, 2),
      )
      throw e
    })
    console.log(`Invocations deleted for ${id}`)

    await client.client
      .collection(INSTANCE_COLLECTION)
      .delete(id)
      .catch((e) => {
        console.error(`deelte instance erorr`, JSON.stringify(e, null, 2))
        throw e
      })
    console.log(`Instance deleted ${id}`)
  },
  (instance) => `deleteInstance:${instance.id}`,
)

export const deleteInstancesByFilter = singletonAsyncExecutionGuard(
  async (filter: string) => {
    const { client } = await clientService()
    const instances = await client.client
      .collection(INSTANCE_COLLECTION)
      .getFullList<InstanceFields>(0, { filter })
    const limiter = new Bottleneck({ maxConcurrent: 50 })
    await Promise.all(
      instances.map((instance) =>
        limiter.schedule(() => deleteInstance(instance)),
      ),
    )
  },
  (filter) => `deleteInstancesByFilter:${filter}`,
)
