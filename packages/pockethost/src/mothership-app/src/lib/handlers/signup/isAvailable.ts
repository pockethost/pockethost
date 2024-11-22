export const isAvailable = (slug: string) => {
  try {
    const record = $app
      .dao()
      .findFirstRecordByData('instances', 'subdomain', slug)
    return false
  } catch {
    return true
  }
}
