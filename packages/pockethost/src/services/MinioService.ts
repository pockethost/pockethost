import { exec } from 'child_process'
import * as Minio from 'minio'
import { PH_HOME } from '../core'

interface MinioServiceConfig {
  policiesDir: string
  endPoint: string
  port: number
  useSSL: boolean
  accessKey: string
  secretKey: string
}

const execp = async (cmd: string) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr })
    })
  })
}

export type MinioAPI = ReturnType<typeof MinioService>

const MINIO_POLICIES_DIR = () =>
  process.env.MINIO_POLICIES_DIR || PH_HOME(`minio`, `policies`)
const MINIO_ENDPOINT = () => process.env.MINIO_ENDPOINT || 'localhost'
const MINIO_PORT = () => parseInt(process.env.MINIO_PORT || '9000')
const MINIO_USE_SSL = () => process.env.MINIO_USE_SSL === 'true'
const MINIO_ACCESS_KEY = () => process.env.MINIO_ACCESS_KEY || 'minio'
const MINIO_SECRET_KEY = () => process.env.MINIO_SECRET_KEY || 'minio123'

export function MinioService(configIn: Partial<MinioServiceConfig> = {}) {
  const config = {
    policiesDir: MINIO_POLICIES_DIR(),
    endPoint: MINIO_ENDPOINT(),
    port: MINIO_PORT(),
    useSSL: MINIO_USE_SSL(),
    accessKey: MINIO_ACCESS_KEY(),
    secretKey: MINIO_SECRET_KEY(),
    ...configIn,
  }

  const getBucketNames = (instanceId: string) => ({
    storage: `${instanceId}-storage`,
    backup: `${instanceId}-backup`,
  })

  const addUser = async (userId: string): Promise<{ secret: string }> => {
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(40)))
      .map((n) => n % 62)
      .map((n) =>
        n < 26
          ? String.fromCharCode(65 + n)
          : n < 52
            ? String.fromCharCode(71 + n)
            : String.fromCharCode(n - 4),
      )
      .join('')

    await execp(`mc admin user add myminio ${userId} ${secret}`)
    return { secret }
  }

  const addInstance = async (
    accessKey: string,
    secretKey: string,
    instanceId: string,
    maxSize: number = 1,
  ): Promise<void> => {
    const client = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    })

    const { storage, backup } = getBucketNames(instanceId)

    await client.makeBucket(storage)
    await client.makeBucket(backup)
  }

  const deleteInstance = async (
    accessKey: string,
    secretKey: string,
    instanceId: string,
  ): Promise<void> => {
    const client = new Minio.Client({
      endPoint: config.endPoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    })

    const { storage, backup } = getBucketNames(instanceId)

    await client.removeBucket(storage)
    await client.removeBucket(backup)
  }

  const deleteUser = async (
    accessKey: string,
    secretKey: string,
    instanceIds: string[],
  ): Promise<void> => {
    for (const instanceId of instanceIds) {
      await deleteInstance(accessKey, secretKey, instanceId)
    }

    await execp(`mc admin user remove myminio ${accessKey}`)
  }

  return {
    addUser,
    addInstance,
    deleteInstance,
    deleteUser,
  }
}
