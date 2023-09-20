import { Assert } from './lib'

type Lib = typeof import('./lib')

console.log(`update-usage`)

// fires only for "users" and "articles" collections
onRecordAfterUpdateRequest((e) => {
  const {
    newModel,
    _unsafe_assert,
    startOfMonth,
    endOfMonth,
    queryOne,
    updateInstance,
    getInstance,
    updateUser,
  } = require(`${__hooks}/lib.js`) as Lib
  const assert: Assert = _unsafe_assert
  const { record } = e
  assert(record, `Expected record here`)
  const instanceId = record.getString('instanceId')
  console.log(instanceId)

  const instance = getInstance(instanceId)
  assert(instance)
  const uid = instance.getString('uid')
  assert(uid)

  const now = new Date()
  const startIso = startOfMonth(now)
  const endIso = endOfMonth(now)
  {
    const result = queryOne(
      'SELECT cast(sum(totalSeconds) as int) as t FROM invocations WHERE instanceId={:instanceId} and startedAt>={:startIso} and startedAt<={:endIso}',
      {
        instanceId,
        startIso,
        endIso,
      },
      {
        t: 0,
      },
    )
    const secondsThisMonth = result.t
    console.log(`Instance seconds, ${secondsThisMonth}`)
    updateInstance(instance, { secondsThisMonth })
  }

  {
    const result = queryOne(
      'SELECT cast(sum(totalSeconds) as int) as t FROM invocations WHERE uid={:uid} and startedAt>={:startIso} and startedAt<={:endIso}',
      {
        uid,
        startIso,
        endIso,
      },
      {
        t: 0,
      },
    )
    const secondsThisMonth = result.t
    console.log(`User seconds, ${secondsThisMonth}`)
    updateUser(uid, { secondsThisMonth })
  }
}, 'invocations')
