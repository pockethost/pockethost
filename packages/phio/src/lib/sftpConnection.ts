export const PHIO_SFTP_HOST = 'ftp.pockethost.io'
export const PHIO_SFTP_PORT = 2222

export type SftpConnection = {
  host: string
  port: number
  username: string
  privateKeyPath: string
  remoteDir: string
}

export const buildSftpTarget = ({ username, host, remoteDir }: SftpConnection) => {
  const userHost = `${username}@${host}`
  return remoteDir ? `${userHost}:${remoteDir}` : userHost
}

export const buildSftpArgs = (connection: SftpConnection) => [
  '-i',
  connection.privateKeyPath,
  '-P',
  String(connection.port),
  buildSftpTarget(connection),
]

const shellQuote = (value: string) => {
  if (/^[a-zA-Z0-9_./:-]+$/.test(value)) {
    return value
  }
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export const formatSftpCommand = (connection: SftpConnection, sftpBin = 'sftp') =>
  [sftpBin, ...buildSftpArgs(connection).map(shellQuote)].join(' ')
