import { MothershipAdminClientService } from '$services'
import {
  INSTANCE_COLLECTION,
  InstanceFields,
  singletonAsyncExecutionGuard,
} from '$shared'
import Bottleneck from 'bottleneck'

export const deleteInstance = singletonAsyncExecutionGuard(
  async (instance: InstanceFields) => {
    const { client } = await MothershipAdminClientService()
    const { id } = instance

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
    const { client } = await MothershipAdminClientService()
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
