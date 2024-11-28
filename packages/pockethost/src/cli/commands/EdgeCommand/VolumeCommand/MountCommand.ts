import { exec, spawn } from 'child_process'
import { Command } from 'commander'
import { promisify } from 'util'
import { logger } from '../../../../common'
import {
  DEBUG,
  VOLUME_BUCKET_NAME,
  VOLUME_CACHE_DIR,
  VOLUME_DEBUG,
  VOLUME_DIR_CACHE_TIME,
  VOLUME_MOUNT_POINT,
  VOLUME_REMOTE_NAME,
  VOLUME_VFS_CACHE_MAX_AGE,
  VOLUME_VFS_CACHE_MIN_FREE_SPACE,
  VOLUME_VFS_READ_CHUNK_SIZE,
  VOLUME_VFS_READ_CHUNK_STREAMS,
  VOLUME_VFS_WRITE_BACK,
} from '../../../../core'
import { asyncExitHook, gracefulExit } from '../../../../core/exit'

const execAsync = promisify(exec)

export type MountOptions = {
  mountPoint: string
  cacheDir: string
  vfsCacheMaxAge: string
  vfsCacheMinFreeSpace: string
  vfsReadChunkSize: string
  vfsReadChunkStreams: string
  vfsWriteBack: string
  dirCacheTime: string
}

// Add this helper function to check if path is mounted
const isMounted = async (path: string): Promise<boolean> => {
  try {
    const { stdout } = await execAsync(`mount | grep "${path}"`)
    return stdout.length > 0
  } catch {
    return false
  }
}

// Add cleanup function
const cleanup = async (mountPoint: string) => {
  try {
    await execAsync(`fusermount -u "${mountPoint}"`)
    console.log(`Cleanup successful: ${mountPoint}`)
  } catch (err) {
    console.error(`Cleanup failed: ${mountPoint}: ${err}`)
  }
}

const mount = async (
  remoteName: string,
  bucketName: string,
  optionsIn: Partial<MountOptions> = {},
) => {
  const options: MountOptions = {
    mountPoint: VOLUME_MOUNT_POINT(),
    cacheDir: VOLUME_CACHE_DIR(),
    vfsCacheMaxAge: VOLUME_VFS_CACHE_MAX_AGE(),
    vfsCacheMinFreeSpace: VOLUME_VFS_CACHE_MIN_FREE_SPACE(),
    vfsReadChunkSize: VOLUME_VFS_READ_CHUNK_SIZE(),
    vfsReadChunkStreams: VOLUME_VFS_READ_CHUNK_STREAMS(),
    vfsWriteBack: VOLUME_VFS_WRITE_BACK(),
    dirCacheTime: VOLUME_DIR_CACHE_TIME(),
    ...optionsIn,
  }

  const { dbg, info, error } = logger().child(`MountCommand`)
  await cleanup(options.mountPoint)

  const args = [
    'mount',
    `${remoteName}:${bucketName}`,
    options.mountPoint,
    '--vfs-cache-mode',
    'full',
    '--cache-dir',
    options.cacheDir,
    '--vfs-cache-max-age',
    options.vfsCacheMaxAge,
    '--vfs-cache-min-free-space',
    options.vfsCacheMinFreeSpace,
    '--vfs-fast-fingerprint',
    '--vfs-read-chunk-streams',
    options.vfsReadChunkStreams,
    '--vfs-read-chunk-size',
    options.vfsReadChunkSize,
    '--vfs-write-back',
    options.vfsWriteBack,
    '--dir-cache-time',
    options.dirCacheTime,
    '--allow-non-empty',
  ]

  if (DEBUG() || VOLUME_DEBUG()) {
    args.push('--verbose')
  }

  dbg(`rclone ${args.join(' ')}`)

  const p = new Promise<number>((resolve, reject) => {
    const rclone = spawn('rclone', args)

    // Register cleanup on exit
    asyncExitHook(async () => {
      rclone.kill()
    })

    rclone.stdout.on('data', (data) => {
      info(data.toString().trim())
    })

    rclone.stderr.on('data', (data) => {
      info(data.toString().trim())
    })

    rclone.on('spawn', () => {
      info('rclone process spawned')
    })

    rclone.on('error', async (err) => {
      error('Failed to start rclone process:', err)
      await gracefulExit(1)
      reject(err)
    })

    rclone.on('close', async (code) => {
      dbg(`rclone process exited with code ${code}`)
      await cleanup(options.mountPoint)
      resolve(code || 0)
    })
  })

  asyncExitHook(() => p)

  return p
}

export const MountCommand = () => {
  return new Command(`mount`)
    .description(`Mount a volume`)
    .option(`-r, --remote <remote>`, `The remote name`, VOLUME_REMOTE_NAME())
    .option(`-b, --bucket <bucket>`, `The bucket name`, VOLUME_BUCKET_NAME())
    .action(async (options) => {
      const { dbg, error } = logger().child(`MountCommand`)
      const { remote, bucket } = options
      try {
        await mount(remote, bucket)
      } catch (err) {
        error(err)
        await gracefulExit(1)
      }
    })
}
