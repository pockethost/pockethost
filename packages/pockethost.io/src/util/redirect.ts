// TODO: Are we hard reloading on purpose or can we use SvelteKit's `goto` method?
export const redirect = (url: string) => {
  if (typeof window === 'undefined') return
  window.location.href = url
}

