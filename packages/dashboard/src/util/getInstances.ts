import { browser } from '$app/environment'
import { client } from '$src/pocketbase'
import { instance } from '$src/routes/app/instances/[instanceId]/store'
import { globalInstancesStore, isUserLoggedIn } from '$util/stores'
import {
  LoggerService,
  assertExists,
  createCleanupManager,
  type InstanceFields,
} from '@pockethost/common'
import { onDestroy, onMount } from 'svelte'

export const getInstances = async () => {
  const { error } = LoggerService()

  const cm = createCleanupManager()
  onMount(async () => {
    const unsub = isUserLoggedIn.subscribe(async (isLoggedIn) => {
      if (!isLoggedIn) return
      const { getAllInstancesById } = client()

      const instances = await getAllInstancesById()

      globalInstancesStore.set(instances)

      const unsub = await client()
        .client.collection('instances')
        .subscribe<InstanceFields>('*', (data) => {
          globalInstancesStore.update((instances) => {
            instances[data.record.id] = data.record
            return instances
          })
        })
      cm.add(unsub)
    })
    cm.add(unsub)
  })

  // Stop listening to the db if this component unmounts
  onDestroy(() => {
    cm.shutdown().catch(console.error)
  })
}

export const getSingleInstance = async (instanceId: string) => {
  const cm = createCleanupManager()
  // Only run this on the browser
  if (browser) {
    const { dbg, error } = LoggerService().create(`layout.svelte`)

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
