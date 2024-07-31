import fetch from 'node-fetch'
import { InstanceFields_WithUser, mkSingleton } from '../../../../../common'
import { mkEdgeMirrorUrl } from './helpers'

export const EdgeMirrorClient = mkSingleton(() => {
  const getItem = (host: string) =>
    fetch(mkEdgeMirrorUrl(`getItem`, host)).then(
      (res) => res.json() as Promise<InstanceFields_WithUser | null>,
    )

  const setItem = (record: InstanceFields_WithUser) =>
    fetch(mkEdgeMirrorUrl(`setItem`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(record),
    })

  return {
    getItem,
    setItem,
  }
})
