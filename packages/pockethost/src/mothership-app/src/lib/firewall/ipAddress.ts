/** Keep in sync with packages/pockethost/src/common/ipAddress.ts */

const IPV4_REG =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/

export const isIPv4 = (value: string): boolean => IPV4_REG.test(value.trim())

export const isIPv6 = (value: string): boolean => {
  const trimmed = value.trim()
  if (!trimmed.includes(':')) return false
  if (isIPv4(trimmed)) return false

  const normalized = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed
  const zoneIdx = normalized.indexOf('%')
  const host = zoneIdx >= 0 ? normalized.slice(0, zoneIdx) : normalized

  if (!/^[0-9a-fA-F:.]+$/.test(host)) return false

  const parts = host.split(':')
  if (parts.length < 2 || parts.length > 8) return false
  if (parts.some((part) => part.length > 4)) return false

  if (host.includes('::')) {
    return host.indexOf('::') === host.lastIndexOf('::')
  }

  return parts.length === 8
}
