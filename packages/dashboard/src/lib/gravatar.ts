import md5 from 'js-md5'

export function gravatarUrl(email: string, size = 32): string {
  const normalized = email.trim().toLowerCase()
  const hash = md5(normalized)
  return `https://www.gravatar.com/avatar/${hash}?d=mp&s=${Math.max(size * 2, 80)}`
}
