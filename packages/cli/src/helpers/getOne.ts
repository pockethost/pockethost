import { assertTruthy } from 'util/assert'
import { client } from '../client'
import {
  Pb_Any_Collection_Name,
  Pb_Any_Record_Db,
  Pb_Untrusted_Db,
} from '../schema/base'
import { buildQueryFilter, FieldStruct } from './buildQueryFilter'

export const getOne = async <
  TRec extends Pb_Any_Record_Db,
  TFields extends FieldStruct<TRec> = FieldStruct<TRec>
>(
  collectionName: Pb_Any_Collection_Name,
  fields: TFields
) => {
  const queryParams = buildQueryFilter(fields)
  const recs = await client.records.getList(collectionName, 1, 2, queryParams)
  assertTruthy(recs.totalItems < 2, `Expected exactly 0 or 1 items here`)
  const [item] = recs.items
  return item ? (recs.items[0] as unknown as Pb_Untrusted_Db<TRec>) : null
}
