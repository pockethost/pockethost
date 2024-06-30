import { Command } from 'commander'
import {
  INTERNAL_APP_AUTH_HEADER,
  INTERNAL_APP_SECRET,
  INTERNAL_APP_URL,
  PUBLIC_INSTANCE_URL,
  tryFetch,
} from 'pockethost/core'
import { PLUGIN_NAME } from './constants'
import { dbg, error, info } from './log'

export const LauncherCommand = () =>
  new Command(`spawn`)
    .description(`Spawn launcher commands`)
    .addCommand(
      new Command(`start`)
        .argument(`<subdomain|id>`)
        .description(`Start an instance`)
        .action(async (subdomainOrId: string) => {
          const internalRequestUrl = INTERNAL_APP_URL(
            PLUGIN_NAME,
            `start/${subdomainOrId}`,
          )
          dbg(
            `Starting instance ${subdomainOrId} by sending request to ${internalRequestUrl}`,
          )
          const res = await fetch(internalRequestUrl, {
            headers: { [INTERNAL_APP_AUTH_HEADER]: INTERNAL_APP_SECRET() },
          })
          if (!res.ok) {
            error(
              `Failed to start instance ${subdomainOrId}: ${res.status} ${
                res.statusText
              } - ${await res.text()}`,
            )
          } else {
            info(`Started instance ${subdomainOrId}: ${await res.text()}`)
          }
        }),
    )
    .addCommand(
      new Command(`stop`)
        .argument(`<instance>`)
        .description(`Stop an instance`)
        .action(async (subdomainOrId) => {
          const internalRequestUrl = INTERNAL_APP_URL(
            PLUGIN_NAME,
            `stop/${subdomainOrId}`,
          )
          dbg(
            `Stopping instance ${subdomainOrId} by sending request to ${internalRequestUrl}`,
          )
          const res = await tryFetch(internalRequestUrl, {
            headers: { [INTERNAL_APP_AUTH_HEADER]: INTERNAL_APP_SECRET() },
          })
          const text = await res.text()
          if (!res.ok) {
            error(
              `Failed to start instance ${subdomainOrId}: ${res.status} ${res.statusText} - ${text}`,
            )
          } else {
            info(`Stopped instance ${subdomainOrId}: ${text}`)
          }
        }),
    )
    .addCommand(
      new Command(`list`)
        .alias(`ls`)
        .description(`List instances`)
        .option(`-a, --all`, `List all instances (not just running instances)`)
        .action(async (options) => {
          const internalRequestUrl = INTERNAL_APP_URL(
            PLUGIN_NAME,
            `list?all=${!!options.all}`,
          )
          dbg(`Listing instances by sending request to ${internalRequestUrl}`)
          const res = await tryFetch(internalRequestUrl, {
            headers: { [INTERNAL_APP_AUTH_HEADER]: INTERNAL_APP_SECRET() },
          })
          const text = await res.text()
          if (!res.ok) {
            error(
              `Failed to list instances: ${res.status} ${res.statusText} - ${text}`,
            )
          } else {
            const instances = JSON.parse(text) as {
              instance: any
              isRunning: boolean
            }[]
            if (!instances.length) {
              info(`No instances found. Try --all`)
              return
            }
            for (const {
              instance,
              instance: { subdomain, id, version },
              isRunning,
            } of instances) {
              info(
                `${PUBLIC_INSTANCE_URL(instance)} [${id}|${version}|${
                  isRunning ? 'running' : 'stopped'
                }]`,
              )
            }
          }
        }),
    )
