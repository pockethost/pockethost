import { map } from '@s-libs/micro-dash'
import { Pb_Any_Record_Db, Pb_QueryParams } from '../schema/base'

export type FieldStruct<TRec extends Pb_Any_Record_Db> = Partial<{
  [_ in keyof TRec]: TRec[_]
}>

export const buildQueryFilter = <TRec extends Pb_Any_Record_Db>(
  fields: FieldStruct<TRec>
): Pb_QueryParams => {
  const filter = map(fields, (v, k) => `${k.toString()} = "${v}"`).join(' and ')
  return { filter }
}
