import { Command, program } from 'commander'
import { BuildOptions, build, context } from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import ncp from 'ncp'

export const main = async () => {
  program.name('buildtool').description('CLI build and watch ')

  const args: BuildOptions = {
    entryPoints: ['src/cli/index.ts'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: 'dist/index.mjs',
    plugins: [nodeExternalsPlugin()],
  }

  program.addCommand(
    new Command(`build`).description(`Build CLI`).action(async () => {
      console.log(`Building CLI`)
      await build(args)

      console.log(`Building mothership app`)
      await new Promise<void>((resolve) => {
        ncp(`src/mothership-app`, './dist/mothership-app', (e) => {
          if (e) {
            console.error(e)
          }
          resolve()
        })
      })

      console.log(`Building instance app`)
      await new Promise<void>((resolve) => {
        ncp(`src/instance-app`, './dist/instance-app', (e) => {
          if (e) {
            console.error(e)
          }
          resolve()
        })
      })
    }),
  )

  program.addCommand(
    new Command(`watch`).description(`Watch CLI`).action(async () => {
      console.log(`Watching`)
      const ctx = await context(args)
      await ctx.watch()
    }),
  )

  await program.parseAsync()
}

main()
