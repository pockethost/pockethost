export type BlogAuthor = {
  id: string
  name: string
  handle: string
  email: string
  url?: string
}

export const authors: Record<string, BlogAuthor> = {
  capn: {
    id: 'capn',
    name: 'Ben Allfree',
    handle: "@cap'n",
    email: 'ben@benallfree.com',
    url: 'https://discord.gg/nVTxCMEcGT',
  },
}

export const defaultAuthorId = 'capn'

export function getAuthor(id = defaultAuthorId): BlogAuthor {
  return authors[id] ?? authors[defaultAuthorId]
}
