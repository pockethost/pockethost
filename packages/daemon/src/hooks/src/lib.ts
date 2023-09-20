import { assert } from '$src/util/assert'
import { forEach } from '@s-libs/micro-dash'
export type Assert = typeof assert
export { assert as _unsafe_assert }

export type DynamicModelSchema = { [_: string]: string | number }

export const newModel = <T extends DynamicModelSchema>(schema: T) =>
  new DynamicModel(schema) as T

export function endOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
}

export function startOfMonth(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

const dao = () => {
  const _dao = $app.dao()
  assert(_dao)
  return _dao
}

export const queryOne = <T extends DynamicModelSchema>(
  sql: string,
  bindings: DynamicModelSchema,
  defaultResult: T,
): T => {
  const result = newModel(defaultResult)
  dao().db().newQuery(sql)?.bind(bindings)?.one(result)
  return result
}

export { forEach }

export type DbId = string
export type InstanceId = DbId
export type UserId = DbId
export type InstanceRecord = {
  id: InstanceId
  secondsThisMonth: number
}

export const _getRecord = (name: string, id: DbId) => {
  const record = dao().findRecordById(name, id)
  return record
}

export const getInstance = (instanceId: InstanceId) => {
  return _getRecord('instances', instanceId)
}

export const getUser = (userId: UserId) => {
  return _getRecord('users', userId)
}

function _updateRecord(record: models.Record, fields: DynamicModelSchema) {
  forEach(fields, (v, k) => {
    record.set(k, v)
  })
  dao().saveRecord(record)
}

function _getRecordByIdOrRecord(
  recordOrInstanceId: models.Record | DbId,
  name: string,
): models.Record {
  const record = (() => {
    if (typeof recordOrInstanceId === 'string')
      return _getRecord(name, recordOrInstanceId)
    return recordOrInstanceId
  })()
  assert(record)
  return record
}

function updateInstance(
  instanceId: InstanceId,
  fields: Partial<InstanceRecord>,
): void
function updateInstance(
  record: models.Record,
  fields: Partial<InstanceRecord>,
): void
function updateInstance(
  recordOrInstanceId: models.Record | InstanceId,
  fields: Partial<InstanceRecord>,
): void {
  const record = _getRecordByIdOrRecord(recordOrInstanceId, 'instances')
  _updateRecord(record, fields)
}
export { updateInstance }

function updateUser(userId: InstanceId, fields: Partial<InstanceRecord>): void
function updateUser(
  record: models.Record,
  fields: Partial<InstanceRecord>,
): void
function updateUser(
  recordOrUserId: models.Record | UserId,
  fields: Partial<InstanceRecord>,
): void {
  const record = _getRecordByIdOrRecord(recordOrUserId, 'users')
  _updateRecord(record, fields)
}
export { updateUser }
