export const redirect = (url: string) => {
  if (typeof window === 'undefined') return
  window.location.href = url
}
