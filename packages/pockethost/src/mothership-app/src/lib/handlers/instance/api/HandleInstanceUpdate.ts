import { mkLog, StringKvLookup } from '$util/Logger'
import { removeEmptyKeys } from '$util/removeEmptyKeys'

export const HandleInstanceUpdate = (c: echo.Context) => {
  const dao = $app.dao()
  const log = mkLog(`PUT:instance`)

  log(`TOP OF PUT`)

  let data = new DynamicModel({
    id: '',
    fields: {
      subdomain: null,
      power: null,
      version: null,
      secrets: null,
      syncAdmin: null,
      dev: null,
      cname: null,
    },
  }) as {
    id: string
    fields: {
      subdomain: string | null
      power: boolean | null
      version: string | null
      secrets: StringKvLookup | null
      syncAdmin: boolean | null
      dev: boolean | null
      cname: string | null
    }
  }

  c.bind(data)
  log(`After bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const id = c.pathParam('id')
  const {
    fields: { subdomain, power, version, secrets, syncAdmin, dev, cname },
  } = data

  log(
    `vars`,
    JSON.stringify({
      id,
      subdomain,
      power,
      version,
      secrets,
      syncAdmin,
      dev,
      cname,
    }),
  )

  const record = dao.findRecordById('instances', id)
  const authRecord = c.get('authRecord') as models.Record | undefined // empty if not authenticated as regular auth record
  log(`authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new Error(`Expected authRecord here`)
  }
  if (record.get('uid') !== authRecord.id) {
    throw new BadRequestError(`Not authorized`)
  }

  const sanitized = removeEmptyKeys({
    subdomain,
    version,
    power,
    secrets,
    syncAdmin,
    dev,
    cname,
  })

  const form = new RecordUpsertForm($app, record)
  form.loadData(sanitized)
  form.submit()

  return c.json(200, { status: 'ok' })
}
