/// <reference types="../../../../types/types.d.ts" />

import { mkLog } from '$util/Logger'
import { versions } from '$util/versions'

type TigrisBucketMeta = {
  AWS_ACCESS_KEY_ID: string
  AWS_ENDPOINT_URL_S3: string
  AWS_REGION: string
  AWS_SECRET_ACCESS_KEY: string
  BUCKET_NAME: string
}

const isValidTigrisBucketMeta = (meta: TigrisBucketMeta) => {
  return Object.values(meta).every((value) => value !== '')
}

const exec = (command: string[]) => {
  const log = mkLog('exec')
  const cmd = $os.exec(command[0]!, ...command.slice(1))
  const output = (() => {
    try {
      return toString(cmd.output())
    } catch (err) {
      return `${err}: ${toString(err.value.stderr)}`
    }
  })()
  log(`output is`, { output })
  return output
}

const createBucket = (instanceId: string, type: 'storage' | 'backup') => {
  const log = mkLog('fly-storage')

  const bucketName = `pockethost-${instanceId}-${type}`

  const command = [
    'fly',
    'storage',
    'create',
    '-opockethost',
    `-n${bucketName}`,
  ]

  log(`Creating bucket ${bucketName}: ${command.join(' ')}`)
  // Execute the fly storage create command
  const output = exec(command)

  // Parse the output to extract secrets
  const secrets: TigrisBucketMeta = {
    AWS_ACCESS_KEY_ID: '',
    AWS_ENDPOINT_URL_S3: '',
    AWS_REGION: '',
    AWS_SECRET_ACCESS_KEY: '',
    BUCKET_NAME: '',
  }

  // Extract secrets using regex
  const lines = output.split('\n')
  for (const line of lines) {
    log({ line })
    const match = line.match(/(.+?):\s+(.+)$/)
    log({ match })
    if (match) {
      const [junk, key, value] = match
      if (key && key in secrets) {
        secrets[key] = value.trim()
      }
    }
  }

  log(`secrets`, secrets)

  return secrets
}

export const HandleInstanceCreate = (c: echo.Context) => {
  const dao = $app.dao()

  const log = mkLog(`POST:instance`)
  const authRecord = c.get('authRecord') as models.Record | undefined // empty if not authenticated as regular auth record
  log(`***authRecord`, JSON.stringify(authRecord))

  if (!authRecord) {
    throw new Error(`Expected authRecord here`)
  }

  log(`***TOP OF POST`)
  let data = new DynamicModel({
    subdomain: '',
    version: versions[0],
    region: 'sfo-2',
  }) as { subdomain?: string; version?: string; region?: string }

  log(`***before bind`)

  c.bind(data)

  log(`***after bind`)

  // This is necessary for destructuring to work correctly
  data = JSON.parse(JSON.stringify(data))

  const { subdomain, version, region } = data

  log(`***vars`, JSON.stringify({ subdomain, region }))

  if (!subdomain) {
    throw new BadRequestError(
      `Subdomain is required when creating an instance.`,
    )
  }

  let record
  $app.dao().runInTransaction((txDao) => {
    const collection = txDao.findCollectionByNameOrId('instances')
    record = new Record(collection, {
      uid: authRecord.getId(),
      region: region || `sfo-2`,
      subdomain,
      status: 'idle',
      version: version,
      dev: true,
      syncAdmin: true,
    })

    txDao.save(record)

    const storageSecrets = createBucket(record.getId(), 'storage')
    if (!isValidTigrisBucketMeta(storageSecrets)) {
      throw new BadRequestError(`Failed to create storage bucket`)
    }
    const backupSecrets = createBucket(record.getId(), 'backup')
    if (!isValidTigrisBucketMeta(backupSecrets)) {
      throw new BadRequestError(`Failed to create backup bucket`)
    }

    throw new BadRequestError(`Hello`)
  })

  return c.json(200, { instance: record })
}
