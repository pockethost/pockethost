import { boolean } from 'boolean'
import express, { RequestHandler } from 'express'
import {
  doGetOneInstanceByExactCriteriaFilter,
  doGetOrProvisionInstanceUrlFilter,
  doIsInstanceRunningFilter,
  doKillInstanceAction,
} from 'pockethost'
import { PLUGIN_NAME } from './constants'
import { DbService } from './db'
import { dbg, info } from './log'

const getInstanceBySubdomainOrId = async (subdomainOrId: string) => {
  {
    const instance = await doGetOneInstanceByExactCriteriaFilter(undefined, {
      id: subdomainOrId,
    })
    if (instance) return instance
  }
  {
    const instance = await doGetOneInstanceByExactCriteriaFilter(undefined, {
      subdomain: subdomainOrId,
    })
    if (instance) return instance
  }
}

export const InternalApp = (): RequestHandler => {
  const app = express()
  app.get('/start/:subdomainOrInstanceId', async (req, res) => {
    const { subdomainOrInstanceId } = req.params
    dbg(`Got start request for ${subdomainOrInstanceId}`)
    const instance = await getInstanceBySubdomainOrId(subdomainOrInstanceId)

    dbg(`Instance:`, instance)
    if (!instance) {
      res.status(404).send(`Instance not found`)
      return
    }
    const url = await doGetOrProvisionInstanceUrlFilter(undefined, { instance })
    res.send(`Started instance ${subdomainOrInstanceId} at ${url}`)
  })

  app.get('/stop/:subdomainOrInstanceId', async (req, res) => {
    const { subdomainOrInstanceId } = req.params
    dbg(`Got stop request for ${subdomainOrInstanceId}`)
    const instance = await getInstanceBySubdomainOrId(subdomainOrInstanceId)
    dbg(`Instance:`, instance)
    if (!instance) {
      res.status(404).send(`Instance not found`)
      return
    }
    await doKillInstanceAction({ instance })
    res.send(`Stopped instance ${instance.subdomain} (${instance.id})`)
  })

  app.get('/list', async (req, res) => {
    const shouldListAll = boolean(req.query.all)
    dbg(`Got list request. Should list all: ${shouldListAll}`)
    const { getInstancesByExactCriteria } = await DbService()
    const instances = getInstancesByExactCriteria({})
    info(`Listing instances`)
    const final = []
    for (const instance of instances) {
      const { subdomain, id, version } = instance
      const isRunning = await doIsInstanceRunningFilter(false, {
        instance,
      })
      if (!shouldListAll && !isRunning) continue
      final.push({ instance, isRunning })
    }
    res.json(final)
  })

  app.use('*', (req, res) => {
    dbg(`Got request to internal app ${req.url}`)
    res.send(`Got request to internal app ${req.url}`)
  })

  const root = express()
  root.use(`/${PLUGIN_NAME}`, app)
  return root
}
