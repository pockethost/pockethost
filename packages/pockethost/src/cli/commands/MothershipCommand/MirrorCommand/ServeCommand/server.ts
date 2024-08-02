import express from 'express'
import { LoggerService } from '../../../../../common'
import { PH_MOTHERSHIP_MIRROR_PORT } from '../../../../../constants'
import { MothershipAdminClientService } from '../../../../../services'
import { MirrorService } from './EdgeMirror'

export async function startMothershipMirrorServer() {
  const logger = LoggerService().create(`MothershipMirrorServer`)
  const { dbg, error, info, warn } = logger
  info(`Starting`)

  await MothershipAdminClientService({})
  const cache = await MirrorService({})

  const app = express()

  app.get(`/instance/byHost/:host`, (req, res) => {
    const { host } = req.params
    const cached = cache.getInstanceByHost(host)
    if (!cached) {
      info(`Cache miss for ${host}`)
      return res.status(404).json(null)
    }
    res.json(cached)
  })

  app.listen(PH_MOTHERSHIP_MIRROR_PORT(), () => {
    info(`Listening on port ${PH_MOTHERSHIP_MIRROR_PORT()}`)
  })
}
