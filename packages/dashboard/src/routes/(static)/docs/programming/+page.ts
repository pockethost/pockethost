import { redirect } from '@sveltejs/kit'

export const prerender = true

export const load = () => {
  redirect(301, '/docs/js')
}
