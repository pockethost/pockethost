import { forEach } from '@s-libs/micro-dash'
import {
  EDGE_APEX_DOMAIN,
  INSTANCE_COLLECTION,
  InstanceFields_WithUser,
  InstanceId,
  LoggerService,
  PocketBase,
  UserFields,
  UserId,
} from '../../../core'

export const mkInstanceCache = (client: PocketBase) => {
  const { dbg } = LoggerService().create(`InstanceCache`)

  const cache: { [_: InstanceId]: InstanceFields_WithUser | undefined } = {}
  const byUid: {
    [_: UserId]: { [_: InstanceId]: InstanceFields_WithUser }
  } = {}

  client.collection(`users`).subscribe<UserFields>(`*`, (e) => {
    const { action, record } = e
    if ([`create`, `update`].includes(action)) {
      dbg({ action, record })
      updateUser(record)
    }
  })

  client.collection(INSTANCE_COLLECTION).subscribe<InstanceFields_WithUser>(
    `*`,
    (e) => {
      const { action, record } = e
      if ([`create`, `update`].includes(action)) {
        setItem(record)
        dbg({ action, record })
      }
    },
    { expand: 'uid' },
  )

  function blankItem(host: string) {
    cache[host] = undefined
  }

  function updateUser(record: UserFields) {
    forEach(byUid[record.id], (extendedInstance) => {
      extendedInstance.expand.uid = record
    })
  }

  function setItem(record: InstanceFields_WithUser) {
    if (record.cname) {
      cache[record.cname] = record
    }
    cache[`${record.subdomain}.${EDGE_APEX_DOMAIN()}`] = record
    cache[`${record.id}.${EDGE_APEX_DOMAIN()}`] = record
    byUid[record.uid] = {
      ...byUid[record.uid],
      [record.id]: record,
    }
    updateUser(record.expand.uid)
  }

  function getItem(host: string) {
    return cache[host]
  }

  function hasItem(host: string) {
    return host in cache
  }

  return { setItem, getItem, blankItem, hasItem }
}
