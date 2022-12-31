import { DEFAULT_PB_DEV_URL } from '$constants'
import { Command } from 'commander'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import pocketbaseEs from 'pocketbase'
import { SessionState } from '../providers/CustomAuthStore'
import { die } from '../util/die'
import { ensureAdminClient } from '../util/ensureAdminClient'
import { getProjectRoot, readSettings } from '../util/project'

export type PublishConfig = {
  session: SessionState
  host: string
  dist: string
}

const migrate = async (client: pocketbaseEs) => {
  {
    // VERSION 1
    const res = await client.collections.getList(1, 1, {
      filter: `name='pbscript'`,
    })
    const [item] = res.items
    if (!item) {
      await client.collections.create({
        name: 'pbscript',
        schema: [
          {
            name: 'type',
            type: 'text',
            required: true,
          },
          {
            name: 'isActive',
            type: 'bool',
          },
          {
            name: 'data',
            type: 'json',
            required: true,
          },
        ],
      })
    }
  }
}

const publish = async (client: pocketbaseEs, fname: string) => {
  const js = readFileSync(fname).toString()
  const url = `${client.baseUrl}/api/pbscript/deploy`
  const res = await client
    .send(`api/pbscript/deploy`, {
      method: 'post',
      body: JSON.stringify({
        source: js,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    .catch((e) => {
      console.error(e)
      throw e
    })
}

export const addPublishCommand = (program: Command) => {
  const _srcDefault = join(getProjectRoot(), './dist/index.js')
  const _hostDefault = DEFAULT_PB_DEV_URL
  program
    .command('publish')
    .description('Publish JS bundle to PBScript-enabled PocketBase instance')
    .option(
      '--dist <src>',
      `Path to dist bundle (default: <project>/dist/index.js)`
    )
    .option('--host <host>', `PocketBase host (default: ${DEFAULT_PB_DEV_URL})`)
    .action(async (options) => {
      const defaultHost = options.host
      const defaultDist = options.dist

      const config: PublishConfig = {
        session: { token: '', model: null },
        host: DEFAULT_PB_DEV_URL,
        dist: join(getProjectRoot(), './dist/index.js'),
        ...readSettings<PublishConfig>('publish'),
      }
      if (defaultHost) config.host = defaultHost
      if (defaultDist) config.dist = defaultDist

      const { host, dist } = config

      if (!existsSync(dist)) {
        die(`${dist} does not exist. Nothing to publish.`)
      }

      const client = await ensureAdminClient('publish', config)
      console.log(`Deploying from ${dist} to ${host}`)
      await migrate(client)
      await publish(client, dist)
    })
}
