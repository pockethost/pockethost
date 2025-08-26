export const isAvailable = (slug: string) => {
  try {
    const record = $app.findFirstRecordByData('instances', 'subdomain', slug)
    return false
  } catch {
    return true
  }
}
