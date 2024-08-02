import fetch from 'node-fetch'
import { InstanceFields_WithUser, mkSingleton } from '../../../../../common'
import { mkMothershipMirrorUrl } from './helpers'

export const EdgeMirrorClient = mkSingleton(() => {
  const getInstanceByHost = (host: string) =>
    fetch(mkMothershipMirrorUrl(`instance`, `byHost`, host)).then(
      (res) => res.json() as Promise<InstanceFields_WithUser | null>,
    )

  return {
    getInstanceByHost,
  }
})
