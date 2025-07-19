import { PUBLIC_DEBUG } from '$src/env'
import { client } from '$src/pocketbase-client'
import {
  ConsoleLogger,
  LogLevelName,
  SubscriptionType,
  ioc,
  type InstanceFields,
  type InstanceId,
  type UnsubscribeFunc,
  type UserFields,
} from 'pockethost/common'
import { writable } from 'svelte/store'

try {
  ioc(
    `logger`,
    ConsoleLogger({
      level: PUBLIC_DEBUG ? LogLevelName.Debug : LogLevelName.Info,
    })
  )
} catch (e) {
  console.warn(e)
}

export const versions = writable<string[]>([])
export const is23Available = writable(false)
export const isMothershipReachable = writable(true)
export const isUserLegacy = writable(false)
export const userSubscriptionType = writable(SubscriptionType.Legacy)
export const isUserPaid = writable(false)
export const isUserLoggedIn = writable(false)
export const isUserVerified = writable(false)
export const isAuthStateInitialized = writable(false)
export const userStore = writable<UserFields | undefined>()
export const globalInstancesStore = writable<{
  [_: InstanceId]: InstanceFields
}>({})
export const globalInstancesStoreReady = writable(false)
export const stats = writable<{
  total_flounder_subscribers: number
}>({
  total_flounder_subscribers: 0,
})

const checkStats = () => {
  client()
    .client.send(`/api/stats`, {})
    .then((res) => {
      stats.set(res)
      isMothershipReachable.set(true)
      // setTimeout(checkStats, 1000 * 60 * 5)
    })
    .catch(() => {
      // isMothershipReachable.set(false)
      // setTimeout(checkStats, 1000)
    })
}

const continuouslyCheckMothershipReachability = () => {
  setInterval(() => {
    client()
      .client.send(`/api/health`, {})
      .then((res) => {
        isMothershipReachable.set(true)
      })
  }, 5000)
}

async function fetchVersions(): Promise<string[]> {
  const { versions } = await client().client.send<{ versions: string[] }>(`/api/versions`, {})

  return versions
}

export const init = () => {
  const periodicallyFetchVersions = () => {
    fetchVersions()
      .then((versionList) => {
        versions.set(versionList)
        is23Available.set(versionList.includes('0.23.*'))
        console.log('Fetched versions', versionList)
      })
      .finally(() => {
        setTimeout(periodicallyFetchVersions, 1000 * 60 * 5)
      })
  }
  periodicallyFetchVersions()
  const { onAuthChange } = client()

  checkStats()

  onAuthChange((authStoreProps) => {
    const isLoggedIn = authStoreProps.isValid
    console.log(`onAuthChange update`, { isLoggedIn, authStoreProps })
    const user = authStoreProps.model as UserFields
    userStore.set(isLoggedIn ? user : undefined)
    isAuthStateInitialized.set(true)
    isUserLoggedIn.set(isLoggedIn)
    tryUserSubscribe(user?.id)
  })

  userStore.subscribe((user) => {
    console.log(`userStore.subscribe update`, { user })
    const isPaid = [SubscriptionType.Founder, SubscriptionType.Premium, SubscriptionType.Flounder].includes(
      user?.subscription || SubscriptionType.Free
    )
    isUserPaid.set(isPaid)
    isUserLegacy.set(!!user?.isLegacy)
    userSubscriptionType.set(user?.subscription || SubscriptionType.Free)
    isUserVerified.set(!!user?.verified)
  })

  // This holds an array of all the user's instances and their data

  /** Listen for instances */
  let unsubInstanceWatch: UnsubscribeFunc | undefined
  isUserLoggedIn.subscribe(async (isLoggedIn) => {
    console.log(`isUserLoggedIn.subscribe update`, { isLoggedIn })
    if (!isLoggedIn) {
      userStore.set(undefined)
      globalInstancesStore.set({})
      globalInstancesStoreReady.set(false)
      unsubInstanceWatch?.()
        .then(() => {
          unsubInstanceWatch = undefined
        })
        .catch(console.error)
      return
    }
    const { getAllInstancesById } = client()

    console.log('Getting all instances by ID')
    const instances = await getAllInstancesById()
    console.log('Instances', instances)

    globalInstancesStore.set(instances)
    globalInstancesStoreReady.set(true)

    const tryInstanceSubscribe = () => {
      client()
        .client.collection('instances')
        .subscribe<InstanceFields>('*', (data) => {
          console.log('Instance subscribe update', data)
          globalInstancesStore.update((instances) => {
            instances[data.record.id] = data.record
            return instances
          })
        })
        .then((u) => {
          unsubInstanceWatch = u
        })
        .catch(() => {
          console.error('Failed to subscribe to instances')
          isMothershipReachable.set(false)
          setTimeout(tryInstanceSubscribe, 1000)
        })
    }
    tryInstanceSubscribe()
  })
}

const tryUserSubscribe = (() => {
  let unsub: UnsubscribeFunc | undefined
  let tid: NodeJS.Timeout | undefined

  const _trySubscribe = async (id?: string) => {
    clearTimeout(tid)
    await unsub?.()
    if (!id) return
    console.log('Subscribing to user', id)
    client()
      .client.collection('users')
      .subscribe<UserFields>(id, (data) => {
        console.log('User subscribed update', data)
        client().client.collection('users').authRefresh().catch(console.error)
      })
      .then((u) => {
        console.log('Subscribed to user', id)
        unsub = async () => {
          console.log('Unsubscribing from user', id)
          await u()
          unsub = undefined
        }
      })
      .catch(() => {
        console.error('Failed to subscribe to user')
        tid = setTimeout(_trySubscribe, 1000)
      })
  }

  return _trySubscribe
})()
