// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
  // interface Locals {}
  // interface PageData {}
  // interface Error {}
  // interface Platform {}
}

/**
 * Taken from markdown plugin. For some reason importing here causes ts errors
 */
interface Metadata<TAttributes extends {} = {}> {
  attributes: TAttributes
  body: string
}
type DocPage = Metadata<{ title: string; published: boolean }>
declare module '*.md' {
  const content: DocPage
  export = content
}
