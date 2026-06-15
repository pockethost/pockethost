import { InstanceFields, Logger } from '@'
import { open, stat } from 'fs/promises'
import ssh2 from 'ssh2'
import { checkBun } from '../../../../services/InstanceFileAccess'
import { InstanceVfs, VfsEntry } from '../../../../services/InstanceFileAccess/InstanceVfs'

type SFTPWrapper = ssh2.SFTPWrapper

const { OPEN_MODE, STATUS_CODE, flagsToString } = ssh2.utils.sftp

type FileHandleState = {
  type: 'file'
  fh: Awaited<ReturnType<typeof open>>
  fsPath: string
  virtualPath: string
  isWrite: boolean
  instance?: InstanceFields
}

type DirHandleState = {
  type: 'dir'
  entries: VfsEntry[]
  index: number
}

type HandleState = FileHandleState | DirHandleState

const entryToAttrs = (entry: VfsEntry) => {
  const fileType = entry.isDirectory ? 0o040000 : 0o100000
  return {
    mode: fileType | (entry.mode & 0o777),
    uid: 0,
    gid: 0,
    size: entry.size,
    atime: Math.floor(entry.mtime / 1000),
    mtime: Math.floor(entry.mtime / 1000),
  }
}

const formatLongname = (entry: VfsEntry) => {
  const type = entry.isDirectory ? 'd' : '-'
  const mode = entry.mode & 0o777
  const perm = [
    mode & 0o400 ? 'r' : '-',
    mode & 0o200 ? 'w' : '-',
    mode & 0o100 ? 'x' : '-',
    mode & 0o040 ? 'r' : '-',
    mode & 0o020 ? 'w' : '-',
    mode & 0o010 ? 'x' : '-',
    mode & 0o004 ? 'r' : '-',
    mode & 0o002 ? 'w' : '-',
    mode & 0o001 ? 'x' : '-',
  ].join('')
  return `${type}${perm}   1 0 0 ${entry.size} Jan  1 1970 ${entry.name}`
}

const statusForError = (err: unknown) => {
  const message = err instanceof Error ? err.message : `${err}`
  if (message.includes('powered off') || message.includes('not allowed') || message.includes('Cannot ')) {
    return STATUS_CODE.PERMISSION_DENIED
  }
  if (message.includes('not found') || message.includes('no such file')) return STATUS_CODE.NO_SUCH_FILE
  return STATUS_CODE.FAILURE
}

const flagsToFsMode = (flags: number): string => {
  const mode = flagsToString(flags)
  if (mode) return mode
  if (flags & OPEN_MODE.WRITE) {
    if (flags & OPEN_MODE.READ) return 'r+'
    return flags & OPEN_MODE.APPEND ? 'a' : 'w'
  }
  return 'r'
}

/** Relative paths must stay relative so InstanceVfs joins them with session cwd (FTPS CWD equivalent). */
const toVfsPath = (path: string) => {
  if (!path || path === '.') return '.'
  return path
}

export const attachSftpSession = (sftp: SFTPWrapper, vfs: InstanceVfs, logger: Logger) => {
  const handles = new Map<number, HandleState>()
  let handleCount = 0

  const allocHandle = (state: HandleState) => {
    const id = handleCount++
    handles.set(id, state)
    const handle = Buffer.alloc(4)
    handle.writeUInt32BE(id, 0)
    return handle
  }

  const getHandle = (handle: Buffer) => {
    if (handle.length !== 4) return
    return handles.get(handle.readUInt32BE(0))
  }

  sftp
    .on('REALPATH', (reqid, path) => {
      const vfsPath = toVfsPath(path)
      vfs
        .resolvePath(vfsPath)
        .then(async ({ clientPath, fsPath }) => {
          try {
            const fileStat = await stat(fsPath)
            if (fileStat.isDirectory()) {
              await vfs.chdir(vfsPath)
            }
          } catch {
            // Still return canonical path when stat fails (symlinks, virtual roots, etc.)
          }
          sftp.name(reqid, [
            {
              filename: clientPath,
              longname: clientPath,
              attrs: entryToAttrs({
                name: clientPath,
                isDirectory: true,
                mode: 0o755,
                size: 0,
                mtime: Date.now(),
              }),
            },
          ])
        })
        .catch((err) => {
          logger.dbg(`REALPATH failed`, err)
          sftp.status(reqid, statusForError(err))
        })
    })
    .on('STAT', (reqid, path) => {
      vfs
        .stat(toVfsPath(path))
        .then((entry) => sftp.attrs(reqid, entryToAttrs(entry)))
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('LSTAT', (reqid, path) => {
      vfs
        .stat(toVfsPath(path))
        .then((entry) => sftp.attrs(reqid, entryToAttrs(entry)))
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('OPENDIR', (reqid, path) => {
      vfs
        .list(toVfsPath(path))
        .then((entries) => {
          const handle = allocHandle({ type: 'dir', entries, index: 0 })
          sftp.handle(reqid, handle)
        })
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('READDIR', (reqid, handleBuf) => {
      const state = getHandle(handleBuf)
      if (!state || state.type !== 'dir') {
        return sftp.status(reqid, STATUS_CODE.FAILURE)
      }
      if (state.index >= state.entries.length) {
        return sftp.status(reqid, STATUS_CODE.EOF)
      }
      const batch = state.entries.slice(state.index, state.index + 32)
      state.index += batch.length
      sftp.name(
        reqid,
        batch.map((entry) => ({
          filename: entry.name,
          longname: formatLongname(entry),
          attrs: entryToAttrs(entry),
        }))
      )
    })
    .on('OPEN', (reqid, path, flags) => {
      const vfsPath = toVfsPath(path)
      const mode = flagsToFsMode(flags)
      const isWrite = mode.includes('w') || mode.includes('a') || mode.includes('+')

      vfs
        .resolvePath(vfsPath)
        .then(async ({ fsPath, clientPath, instance, restOfVirtualPath }) => {
          if (isWrite) {
            vfs.assertMutablePath(restOfVirtualPath, instance, 'write')
          }
          const fh = await open(fsPath, mode)
          const handle = allocHandle({
            type: 'file',
            fh,
            fsPath,
            virtualPath: clientPath,
            isWrite,
            instance,
          })
          sftp.handle(reqid, handle)
        })
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('READ', (reqid, handleBuf, offset, length) => {
      const state = getHandle(handleBuf)
      if (!state || state.type !== 'file') {
        return sftp.status(reqid, STATUS_CODE.FAILURE)
      }
      const buffer = Buffer.alloc(length)
      state.fh
        .read(buffer, 0, length, offset)
        .then(({ bytesRead }: { bytesRead: number }) => {
          if (bytesRead === 0) {
            return sftp.status(reqid, STATUS_CODE.EOF)
          }
          sftp.data(reqid, buffer.subarray(0, bytesRead))
        })
        .catch((err: unknown) => {
          logger.error(err)
          sftp.status(reqid, STATUS_CODE.FAILURE)
        })
    })
    .on('WRITE', (reqid, handleBuf, offset, data) => {
      const state = getHandle(handleBuf)
      if (!state || state.type !== 'file' || !state.isWrite) {
        return sftp.status(reqid, STATUS_CODE.FAILURE)
      }
      state.fh
        .write(data, 0, data.length, offset)
        .then(() => sftp.status(reqid, STATUS_CODE.OK))
        .catch((err: unknown) => {
          logger.error(err)
          sftp.status(reqid, STATUS_CODE.FAILURE)
        })
    })
    .on('CLOSE', (reqid, handleBuf) => {
      const id = handleBuf.length === 4 ? handleBuf.readUInt32BE(0) : undefined
      const state = id === undefined ? undefined : handles.get(id)
      if (!state) {
        return sftp.status(reqid, STATUS_CODE.FAILURE)
      }
      handles.delete(id!)

      if (state.type === 'dir') {
        return sftp.status(reqid, STATUS_CODE.OK)
      }

      state.fh
        .close()
        .then(() => {
          if (state.isWrite && state.instance) {
            checkBun(state.instance, state.virtualPath, state.fsPath, logger)
          }
          sftp.status(reqid, STATUS_CODE.OK)
        })
        .catch((err) => {
          logger.error(err)
          sftp.status(reqid, STATUS_CODE.FAILURE)
        })
    })
    .on('FSTAT', (reqid, handleBuf) => {
      const state = getHandle(handleBuf)
      if (!state) {
        return sftp.status(reqid, STATUS_CODE.FAILURE)
      }
      if (state.type === 'dir') {
        return sftp.attrs(
          reqid,
          entryToAttrs({ name: '.', isDirectory: true, mode: 0o755, size: 0, mtime: Date.now() })
        )
      }
      stat(state.fsPath)
        .then((fileStat) =>
          sftp.attrs(
            reqid,
            entryToAttrs({
              name: state.virtualPath.split('/').pop() || state.virtualPath,
              isDirectory: fileStat.isDirectory(),
              mode: fileStat.mode,
              size: fileStat.size,
              mtime: fileStat.mtimeMs,
            })
          )
        )
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('MKDIR', (reqid, path) => {
      vfs
        .mkdir(toVfsPath(path))
        .then(() => sftp.status(reqid, STATUS_CODE.OK))
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('RMDIR', (reqid, path) => {
      vfs
        .delete(toVfsPath(path))
        .then(() => sftp.status(reqid, STATUS_CODE.OK))
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('REMOVE', (reqid, path) => {
      vfs
        .delete(toVfsPath(path))
        .then(() => sftp.status(reqid, STATUS_CODE.OK))
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('RENAME', (reqid, oldPath, newPath) => {
      vfs
        .rename(toVfsPath(oldPath), toVfsPath(newPath))
        .then(() => sftp.status(reqid, STATUS_CODE.OK))
        .catch((err) => sftp.status(reqid, statusForError(err)))
    })
    .on('SETSTAT', (reqid) => {
      sftp.status(reqid, STATUS_CODE.OK)
    })
    .on('FSETSTAT', (reqid) => {
      sftp.status(reqid, STATUS_CODE.OK)
    })
}
