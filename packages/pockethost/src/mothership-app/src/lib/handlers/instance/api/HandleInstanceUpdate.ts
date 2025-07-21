import { type InstanceWebhookCollection } from '$common'
import { mkLog, StringKvLookup } from '$util/Logger'
import { removeEmptyKeys } from '$util/removeEmptyKeys'

// Helper function to make Cloudflare API calls
const callCloudflareAPI = (endpoint: string, method: string, body?: any, log?: any) => {
  const apiToken = $os.getenv('MOTHERSHIP_CLOUDFLARE_API_TOKEN')
  const zoneId = $os.getenv('MOTHERSHIP_CLOUDFLARE_ZONE_ID')

  if (!apiToken || !zoneId) {
    if (log) log('Cloudflare API credentials not configured - skipping Cloudflare operations')
    return null
  }

  const url = `https://api.cloudflare.com/client/v4/zones/${zoneId}/${endpoint}`

  try {
    const config: any = {
      url: url,
      method: method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30,
    }

    if (body) {
      config.body = JSON.stringify(body)
    }

    if (log) log(`Making Cloudflare API call: ${method} ${url}`, config)

    const response = $http.send(config)

    if (log) log(`Cloudflare API response:`, response)

    return response
  } catch (error) {
    if (log) log(`Cloudflare API error:`, error)
    return null
  }
}

// Helper to create custom hostname in Cloudflare
const createCloudflareCustomHostname = (hostname: string, log: any) => {
  return callCloudflareAPI(
    'custom_hostnames',
    'POST',
    {
      hostname: hostname,
      ssl: {
        method: 'http',
        type: 'dv',
      },
    },
    log
  )
}

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
      webhooks: null,
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
      webhooks: InstanceWebhookCollection | null
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
    fields: { subdomain, power, version, secrets, webhooks, syncAdmin, dev, cname },
  } = data

  log(
    `vars`,
    JSON.stringify({
      id,
      subdomain,
      power,
      version,
      secrets,
      webhooks,
      syncAdmin,
      dev,
      cname,
    })
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

  // Check if CNAME changed and handle Cloudflare
  const oldCname = record.getString('cname').trim()
  const newCname = cname ? cname.trim() : ''
  const cnameChanged = oldCname !== newCname

  if (cnameChanged && newCname) {
    log(`CNAME changed from "${oldCname}" to "${newCname}" - adding to Cloudflare`)

    // Blindly add to Cloudflare
    const createResponse = createCloudflareCustomHostname(newCname, log)
    if (createResponse) {
      log(`Cloudflare API call completed for "${newCname}" - frontend will poll for health`)
    }
  }

  const sanitized = removeEmptyKeys({
    subdomain,
    version,
    power,
    secrets,
    webhooks,
    syncAdmin,
    dev,
    cname,
  })

  const form = new RecordUpsertForm($app, record)
  form.loadData(sanitized)
  form.submit()

  return c.json(200, { status: 'ok' })
}
