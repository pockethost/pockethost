export const parseBoolean = (value: string | boolean): boolean => {
  if (typeof value === 'boolean') return value
  const normalized = value.toLowerCase().trim()
  return ['true', '1', 'yes', 'on'].includes(normalized)
}
