import { reduce } from '@s-libs/micro-dash'
import produce, { Draft, produceWithPatches } from 'immer'
import { assertExists, assertTruthy } from 'util/assert'
import { client } from '../client'
import {
  Pb_Any_Collection_Name,
  Pb_Any_Record_Db,
  Pb_Untrusted_Db,
  Pb_UserFields,
} from '../schema/base'
import { buildQueryFilter, FieldStruct } from './buildQueryFilter'
import { mergeDeep } from './mergeDeep'

export const upsert = async <TRow extends Pb_Any_Record_Db>(
  collectionName: Pb_Any_Collection_Name,
  filterFields: FieldStruct<TRow>,
  mutate: (draft: Draft<Pb_UserFields<TRow>>) => void,
  defaultRec: Pb_UserFields<TRow>
) => {
  const queryParams = buildQueryFilter(filterFields)
  const recs = await client.records.getList(collectionName, 1, 2, queryParams)
  assertTruthy(recs.totalItems < 2, `Expected exactly 0 or 1 item to upsert`)
  if (recs.totalItems === 0) {
    // Insert
    client.records.create(collectionName, produce(defaultRec, mutate))
  } else {
    // Update
    const [item] = recs.items as unknown as Pb_Untrusted_Db<TRow>[]
    assertExists(item, `Expected item here`)
    const { id } = item
    const safeItem = mergeDeep(item, defaultRec)
    const [rec, patches] = produceWithPatches(safeItem, mutate)
    console.log({ patches })
    const final = reduce(
      patches,
      (carry, patch) => {
        if (patch.op === 'add' || patch.op === 'replace') {
          const [key] = patch.path
          assertExists(key, `Expected key here`)
          const _key = `${key}` as keyof Pb_UserFields<TRow>
          carry[_key] = rec[_key]
        }
        return carry
      },
      {} as Partial<Pb_UserFields<TRow>>
    )
    client.records.update(collectionName, id, final)
  }
}
