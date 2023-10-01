import { browser } from '$app/environment'
import { client } from '$src/pocketbase'
import { instance } from '$src/routes/app/instances/[instanceId]/store'
import { globalInstancesStore } from '$util/stores'
import {
  assertExists,
  createCleanupManager,
  logger,
  type InstanceFields,
} from '@pockethost/common'
import { onDestroy, onMount } from 'svelte'

const { error } = logger()
const cm = createCleanupManager()

export const getInstances = async () => {
  onMount(() => {
    if (browser) {
      ;(async () => {
        const { getAllInstancesById } = client()

        const instances = await getAllInstancesById()

        globalInstancesStore.set(instances)

        client()
          .client.collection('instances')
          .subscribe<InstanceFields>('*', (data) => {
            globalInstancesStore.update((instances) => {
              instances[data.record.id] = data.record
              return instances
            })
          })
      })().catch(error)
    }
  })

  // Stop listening to the db if this component unmounts
  onDestroy(() => {
    if (browser) {
      client().client.collection('instances').unsubscribe('*').catch(error)
    }
  })
}

export const getSingleInstance = async (instanceId: string) => {
  // Only run this on the browser
  if (browser) {
    const { dbg, error } = logger().create(`layout.svelte`)

    const { watchInstanceById } = client()

    watchInstanceById(instanceId, (r) => {
      dbg(`Handling instance update`, r)
      const { action, record } = r
      assertExists(record, `Expected instance here`)

      // Update the page state with the instance information
      instance.set(record)
    })
      .then(cm.add)
      .catch(error)
  }
}
