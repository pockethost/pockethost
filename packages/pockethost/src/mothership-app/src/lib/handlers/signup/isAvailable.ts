export const isAvailable = (slug: string) => {
  try {
    $app.findFirstRecordByData('instances', 'subdomain', slug)
    return false
  } catch {
    return true
  }
}
