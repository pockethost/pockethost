// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
  // interface Locals {}
  // interface PageData {}
  // interface Error {}
  // interface Platform {}
}

type DocPage = Metadata<{ title: string }>
declare module '*.md' {
  const content: DocPage
  export = content
}
