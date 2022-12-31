import { DEFAULT_PB_DEV_URL } from '$constants'
import { Parcel } from '@parcel/core'
import { debounce } from '@s-libs/micro-dash'
import chokidar from 'chokidar'
import { Command } from 'commander'
import { join } from 'path'
import { cwd } from 'process'
import tmp from 'tmp'
import { SessionState } from '../providers/CustomAuthStore'
import { ensureAdminClient } from '../util/ensureAdminClient'
import { getProjectRoot, readSettings } from '../util/project'

export type DevConfig = {
  session: SessionState
  host: string
  src: string
  dist: string
}
export const addDevCommand = (program: Command) => {
  program
    .command('dev')
    .description('Watch for source code changes in development mode')
    .option(
      '--src <path>',
      `Path to source (default: <project>/src/index.{ts|js})`
    )
    .option('--dist <path>', `Path to dist (default: <project>/dist/index.js)`)
    .option('--host', 'PocketBase host', DEFAULT_PB_DEV_URL)
    .action(async (options) => {
      const defaultSrc = options.src
      const defaultDist = options.dist
      const defaultHost = options.host

      const config: DevConfig = {
        session: { token: '', model: null },
        host: DEFAULT_PB_DEV_URL,
        src: join(getProjectRoot(), './src/index.ts'),
        dist: join(getProjectRoot(), './dist/index.js'),
        ...readSettings('dev'),
      }
      if (defaultDist) config.dist = defaultDist
      if (defaultSrc) config.src = defaultSrc

      const client = await ensureAdminClient('dev', config)

      const distDir = tmp.dirSync().name
      console.log(cwd())

      const bundler = new Parcel({
        entries: './src/index.ts',
        defaultConfig: '@parcel/config-default',
        mode: 'production',
        defaultTargetOptions: {
          distDir: join(cwd(), 'dist'),
          outputFormat: 'global',
          sourceMaps: false,
        },
        shouldDisableCache: true,
        // targets: {
        //   iife: {
        //     distDir: './dist',
        //     source: './src/index.ts',
        //     context: 'browser',
        //     outputFormat: 'global',
        //     sourceMap: {
        //       inline: true,
        //     },
        //   },
        // },
      })

      const build = debounce(() => {
        console.log(`Building...`)
        bundler
          .run()
          .then((e) => {
            console.log(`Build succeeded`, e)
            console.log(e.bundleGraph.getBundles({ includeInline: true }))
            let { bundleGraph } = e
          })
          .catch((e) => {
            console.error(`Build failed with ${e}`)
          })
      }, 100)

      build()
      console.log(join(getProjectRoot(), 'src/**'))
      chokidar
        .watch([
          join(getProjectRoot(), 'src/**'),
          join(getProjectRoot(), 'node_modules/**'),
        ])
        .on('all', (event, path) => {
          build()
        })

      console.log('here')
    })
}
