import { forEach, reduce } from '@s-libs/micro-dash'
import {
  INSTANCE_COLLECTION,
  InstanceFields,
  InstanceId,
  LoggerService,
  UserFields,
  UserId,
  WithCredentials,
  WithUser,
  mkInstanceCanonicalHostname,
  mkInstanceHostname,
  mkSingleton,
} from '../../../../../../core'
import { MothershipAdminClientService } from '../../../../../services'

export const EdgeMirror = mkSingleton(async () => {
  const { dbg, info, error } = LoggerService().create(`EdgeMirror`)

  info(`Initializing edge mirror`)
  const adminSvc = await MothershipAdminClientService()
  const { client } = adminSvc.client

  type MirrorUserFields = UserFields<WithCredentials>
  type MirrorInstanceFields = InstanceFields<WithUser<MirrorUserFields>>

  const instanceCleanupsById: { [_: InstanceId]: () => void } = {}
  const instancesById: { [_: InstanceId]: InstanceFields | undefined } = {}
  const instancesByHostName: { [_: string]: InstanceFields | undefined } = {}
  const usersById: {
    [_: UserId]: MirrorUserFields
  } = {}

  client
    .collection(`users`)
    .subscribe<UserFields>(`*`, (e) => {
      const { action, record } = e
      if ([`create`, `update`].includes(action)) {
        client
          .collection(`verified_users`)
          .getOne<MirrorUserFields>(record.id)
          .then((v) => {
            updateUser(v)
          })
          .catch(error)
      }
    })
    .catch((e) => {
      error(`Failed to subscribe to users`, e)
    })

  client
    .collection(INSTANCE_COLLECTION)
    .subscribe<InstanceFields>(`*`, (e) => {
      const { action, record } = e
      if ([`create`, `update`].includes(action)) {
        setItem(record)
      }
    })
    .catch((e) => {
      error(`Failed to subscribe to instances`, e)
    })

  info(`Loading mirror data`)
  await client
    .send(`/api/mirror`, { method: `GET` })
    .then(({ instances, users }) => {
      const usersById: { [_: UserId]: MirrorUserFields } = reduce(
        users,
        (acc, user) => ({ ...acc, [user.id]: user }),
        {},
      )
      forEach(instances, (record) => {
        record.expand = { uid: usersById[record.uid] }
        setItem(record, true)
      })
      info(`Mirror data loaded`)
    })
    .catch(error)

  function updateUser(record: MirrorUserFields) {
    dbg(`Updating user ${record.email} (${record.id})`, { record })
    usersById[record.id] = record
  }

  function setItem(record: InstanceFields, safe = false) {
    if (safe && instancesById[record.id]) {
      dbg(`Skipping instance update ${record.subdomain} (${record.id})`)
      return
    }
    instanceCleanupsById[record.id]?.()
    instancesById[record.id] = record
    if (record.cname) {
      instancesByHostName[record.cname] = record
    }
    instancesByHostName[mkInstanceHostname(record)] = record
    instancesByHostName[mkInstanceCanonicalHostname(record)] = record
    instanceCleanupsById[record.id] = () => {
      dbg(`Cleaning up instance ${record.subdomain} (${record.id})`)
      delete instancesById[record.id]
      delete instancesByHostName[mkInstanceHostname(record)]
      delete instancesByHostName[mkInstanceCanonicalHostname(record)]
      if (record.cname) {
        delete instancesByHostName[record.cname]
      }
    }
    dbg(`Updating instance ${record.subdomain} (${record.id})`)
  }

  function getItem(host: string): MirrorInstanceFields | null {
    const instance = instancesByHostName[host]
    if (!instance) return null
    const user = usersById[instance.uid]
    if (!user) {
      throw new Error(
        `User ${instance.uid} not found for instance ${instance.subdomain} (${instance.uid})`,
      )
    }
    return { ...instance, expand: { uid: user } }
  }

  return { getItem }
})
