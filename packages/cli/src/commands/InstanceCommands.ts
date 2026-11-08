import { input, password } from '@inquirer/prompts'
import { Command, InvalidArgumentError } from 'commander'
import { INSTANCE_URL } from '../lib/constants'
import { saveInstanceName, savedInstanceName } from '../lib/defaultInstanceId'
import {
  applyInstanceUpdate,
  checkInstanceName,
  createInstance,
  deleteInstance,
  INSTANCE_NAME_PATTERN,
  isCronExpression,
  isFullyOff,
  isWebhookEndpoint,
  listVersions,
  parseSecretAssignment,
  refreshInstance,
  resolveTarget,
  SECRET_KEY_PATTERN,
  updateInstance,
  waitForInstance,
  type InstanceFieldsUpdate,
} from '../lib/instanceApi'
import { resolveDeployCredential, type InstanceSummary } from '../lib/token'

const onOff = (value: string) => {
  const v = value.toLowerCase()
  if (v === 'on' || v === 'true' || v === '1') return true
  if (v === 'off' || v === 'false' || v === '0') return false
  throw new InvalidArgumentError(`Expected 'on' or 'off'.`)
}

const label = (v: boolean | undefined) =>
  v === undefined ? '(unknown)' : v ? 'on' : 'off'

const CYCLE_HELP = `Power the instance off, apply the change, then power it back on`

/** One-line state, e.g. "on (running)" or "off". */
const powerState = (i: InstanceSummary) =>
  i.power ? `on (${(i.status || 'idle').toLowerCase()})` : 'off'

const describe = (i: InstanceSummary) => {
  const url = INSTANCE_URL(i.subdomain)
  const lines = [
    `${i.subdomain} (${i.id})`,
    `  Power:        ${powerState(i)}`,
    `  URL:          ${url}`,
    `  Admin:        ${url}/_/`,
    `  Domain:       ${i.cname || '(none)'}`,
    `  Version:      ${i.version || '(unknown)'}`,
    `  Dev mode:     ${label(i.dev)}`,
    `  Admin sync:   ${label(i.syncAdmin)}`,
    `  Auto-vacuum:  ${label(i.autoVacuum)}`,
  ]
  if (i.secretNames) {
    lines.push(
      `  Secrets:      ${i.secretNames.length ? i.secretNames.join(', ') : '(none)'}`
    )
  }
  if (i.webhooks) {
    lines.push(`  Webhooks:     ${i.webhooks.length ? '' : '(none)'}`)
    for (const w of i.webhooks) lines.push(`    ${w.value}  ${w.endpoint}`)
  }
  return lines.join('\n')
}

export const ShowCommand = () =>
  new Command('show')
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description('Show an instance: power, URLs, domain, version and settings')
    .option('--json', 'Print JSON')
    .action(async (name: string | undefined, opts: { json?: boolean }) => {
      const { instance } = await resolveTarget(name)
      console.log(
        opts.json ? JSON.stringify(instance, null, 2) : describe(instance)
      )
    })

export const PowerCommand = () =>
  new Command('power')
    .argument('<state>', 'on or off', onOff)
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description('Power an instance on or off')
    .option('--wait', 'When powering off, wait until the instance has stopped')
    .action(
      async (
        on: boolean,
        name: string | undefined,
        opts: { wait?: boolean }
      ) => {
        const { cred, instance } = await resolveTarget(name)
        if (instance.power === on && (on || isFullyOff(instance))) {
          console.log(`${instance.subdomain} is already ${on ? 'on' : 'off'}.`)
          return
        }
        await updateInstance(cred, instance.id, { power: on })
        if (on) {
          console.log(
            `⏻ ${instance.subdomain} is on. It starts on the next request: ${INSTANCE_URL(instance.subdomain)}`
          )
          return
        }
        if (opts.wait) {
          await waitForInstance(cred, instance.id, isFullyOff, {
            what: `${instance.subdomain} to stop`,
          })
          console.log(`⏻ ${instance.subdomain} is off.`)
        } else {
          console.log(
            `⏻ ${instance.subdomain} is powering off. Add --wait to wait until it has stopped.`
          )
        }
      }
    )

/** `pockethost <name> <on|off> [instance]` for a boolean setting that needs the instance off. */
const settingToggle = (
  name: string,
  field: 'dev' | 'syncAdmin' | 'autoVacuum',
  title: string,
  description: string
) =>
  new Command(name)
    .argument('<state>', 'on or off', onOff)
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description(description)
    .option('--cycle', CYCLE_HELP)
    .action(
      async (
        on: boolean,
        iname: string | undefined,
        opts: { cycle?: boolean }
      ) => {
        const { cred, instance } = await resolveTarget(iname)
        await applyInstanceUpdate({
          cred,
          instance,
          fields: { [field]: on } as InstanceFieldsUpdate,
          cycle: opts.cycle,
        })
        console.log(
          `✅ ${title} is ${on ? 'on' : 'off'} for ${instance.subdomain}.`
        )
      }
    )

export const DevModeCommand = () =>
  settingToggle(
    'dev-mode',
    'dev',
    'Dev mode',
    'Turn PocketBase dev mode (verbose logging) on or off'
  )

export const AdminSyncCommand = () =>
  settingToggle(
    'admin-sync',
    'syncAdmin',
    'Admin sync',
    'Turn admin sync (your PocketHost login as a PocketBase superuser) on or off'
  )

export const AutoVacuumCommand = () =>
  settingToggle(
    'auto-vacuum',
    'autoVacuum',
    'Auto-vacuum',
    'Turn automatic database vacuuming on or off'
  )

export const RenameCommand = () =>
  new Command('rename')
    .argument('<new-name>', 'New instance name (also its subdomain)')
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description('Rename an instance. Its URL changes to the new name')
    .option('--cycle', CYCLE_HELP)
    .action(
      async (
        newName: string,
        name: string | undefined,
        opts: { cycle?: boolean }
      ) => {
        if (!INSTANCE_NAME_PATTERN.test(newName)) {
          throw new Error(
            `Instance name must begin with a letter, be between 3-40 characters, and can only contain a-z, 0-9, and hyphen (-).`
          )
        }
        const { cred, instance } = await resolveTarget(name)
        if (newName === instance.subdomain) {
          console.log(`${instance.subdomain} already has that name.`)
          return
        }
        await checkInstanceName(newName)
        await applyInstanceUpdate({
          cred,
          instance,
          fields: { subdomain: newName },
          cycle: opts.cycle,
        })
        console.log(
          `✅ Renamed ${instance.subdomain} to ${newName}: ${INSTANCE_URL(newName)}`
        )
        const linked = savedInstanceName()
        if (linked && [instance.subdomain, instance.id].includes(linked)) {
          saveInstanceName(newName)
          console.log(`   Updated the linked instance to ${newName}.`)
        }
      }
    )

export const VersionsCommand = () =>
  new Command('versions')
    .description('List the PocketBase versions you can run (newest first)')
    .action(async () => {
      for (const v of await listVersions()) console.log(v)
    })

export const VersionCommand = () =>
  new Command('version')
    .argument(
      '<version>',
      `PocketBase version, e.g. 0.28.* (see 'pockethost versions')`
    )
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description('Change the PocketBase version an instance runs')
    .option('--cycle', CYCLE_HELP)
    .action(
      async (
        version: string,
        name: string | undefined,
        opts: { cycle?: boolean }
      ) => {
        const versions = await listVersions()
        if (versions.length && !versions.includes(version)) {
          throw new Error(
            `Unknown version ${version}. Choose one of: ${versions.join(', ')}`
          )
        }
        const { cred, instance } = await resolveTarget(name)
        await applyInstanceUpdate({
          cred,
          instance,
          fields: { version },
          cycle: opts.cycle,
        })
        console.log(`✅ ${instance.subdomain} now runs PocketBase ${version}.`)
      }
    )

export const DomainCommand = () => {
  const cmd = new Command('domain').description(
    'Set or remove an instance custom domain'
  )
  cmd
    .command('set')
    .argument('<host>', 'Custom domain, e.g. api.example.com')
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description(
      'Use a custom domain. Point a CNAME record for it at <instance>.pockethost.io first'
    )
    .option('--cycle', CYCLE_HELP)
    .action(
      async (
        host: string,
        name: string | undefined,
        opts: { cycle?: boolean }
      ) => {
        const cname = host.trim().toLowerCase()
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cname)) {
          throw new Error(`${host} doesn't look like a domain name.`)
        }
        const { cred, instance } = await resolveTarget(name)
        await applyInstanceUpdate({
          cred,
          instance,
          fields: { cname },
          cycle: opts.cycle,
        })
        console.log(
          `✅ ${instance.subdomain} uses https://${cname}. The certificate can take a few minutes after DNS is in place.`
        )
      }
    )
  cmd
    .command('clear')
    .argument('[instance]', 'Instance name (defaults to the linked instance)')
    .description('Stop using a custom domain')
    .option('--cycle', CYCLE_HELP)
    .action(async (name: string | undefined, opts: { cycle?: boolean }) => {
      const { cred, instance } = await resolveTarget(name)
      if (!instance.cname) {
        console.log(`${instance.subdomain} has no custom domain.`)
        return
      }
      await applyInstanceUpdate({
        cred,
        instance,
        fields: { cname: '' },
        cycle: opts.cycle,
      })
      console.log(`✅ ${instance.subdomain} no longer uses ${instance.cname}.`)
    })
  return cmd
}

const INSTANCE_OPTION = [
  '-I, --instance <name>',
  'Instance name (defaults to the linked instance)',
] as const

const SECRETS_NOTE = `Secrets reach the instance as environment variables the next time it starts.`

export const SecretsCommand = () => {
  const cmd = new Command('secrets').description(
    'Manage instance secrets (environment variables)'
  )
  cmd
    .command('list')
    .description('List secret names (values are never shown)')
    .option(...INSTANCE_OPTION)
    .action(async (opts: { instance?: string }) => {
      const { instance } = await resolveTarget(opts.instance)
      const names = instance.secretNames ?? []
      if (names.length === 0)
        console.log(`${instance.subdomain} has no secrets.`)
      for (const n of names) console.log(n)
    })
  cmd
    .command('set')
    .argument(
      '<assignments...>',
      'KEY=value pairs. Give just KEY to type the value without it landing in your shell history'
    )
    .description('Add or change secrets. Other secrets are left as they are')
    .option(...INSTANCE_OPTION)
    .action(async (assignments: string[], opts: { instance?: string }) => {
      const patch: Record<string, string> = {}
      for (const a of assignments) {
        const [key, value] = parseSecretAssignment(a)
        if (!SECRET_KEY_PATTERN.test(key)) {
          throw new Error(
            `Invalid secret name ${key}: use A-Z, 0-9 and _, starting with a letter.`
          )
        }
        patch[key] =
          value ?? (await password({ message: `Value for ${key}`, mask: '*' }))
      }
      const { cred, instance } = await resolveTarget(opts.instance)
      await updateInstance(cred, instance.id, { secretsPatch: patch })
      console.log(
        `✅ Set ${Object.keys(patch).join(', ')} on ${instance.subdomain}. ${SECRETS_NOTE}`
      )
    })
  cmd
    .command('unset')
    .argument('<keys...>', 'Secret names to remove')
    .description('Remove secrets')
    .option(...INSTANCE_OPTION)
    .action(async (keys: string[], opts: { instance?: string }) => {
      const { cred, instance } = await resolveTarget(opts.instance)
      const existing = new Set(instance.secretNames ?? [])
      const missing = keys.filter((k) => !existing.has(k))
      if (instance.secretNames && missing.length === keys.length) {
        console.log(
          `${instance.subdomain} has no secret named ${missing.join(', ')}.`
        )
        return
      }
      await updateInstance(cred, instance.id, {
        secretsPatch: Object.fromEntries(keys.map((k) => [k, null])),
      })
      console.log(
        `✅ Removed ${keys.join(', ')} from ${instance.subdomain}. ${SECRETS_NOTE}`
      )
    })
  return cmd
}

export const WebhooksCommand = () => {
  const cmd = new Command('webhooks').description(
    'Manage scheduled webhooks (cron jobs that call a path on your instance)'
  )
  const current = async (iname?: string) => {
    const { cred, instance } = await resolveTarget(iname)
    if (!instance.webhooks) {
      throw new Error(
        `PocketHost didn't return this instance's webhooks. Try again after the next PocketHost update.`
      )
    }
    return { cred, instance, webhooks: instance.webhooks }
  }
  cmd
    .command('list')
    .description('List webhooks')
    .option(...INSTANCE_OPTION)
    .action(async (opts: { instance?: string }) => {
      const { instance, webhooks } = await current(opts.instance)
      if (webhooks.length === 0)
        console.log(`${instance.subdomain} has no webhooks.`)
      for (const w of webhooks) console.log(`${w.value}  ${w.endpoint}`)
    })
  cmd
    .command('add')
    .argument('<endpoint>', 'Path on your instance, e.g. /api/cron')
    .argument('<schedule>', `Cron schedule in quotes, e.g. "*/5 * * * *"`)
    .description(
      'Add a webhook, or change the schedule of an existing endpoint'
    )
    .option(...INSTANCE_OPTION)
    .action(
      async (
        endpoint: string,
        schedule: string,
        opts: { instance?: string }
      ) => {
        if (!isWebhookEndpoint(endpoint)) {
          throw new Error(
            `Endpoint must be a path on your instance starting with /, e.g. /api/cron.`
          )
        }
        if (!isCronExpression(schedule)) {
          throw new Error(
            `"${schedule}" isn't a cron schedule. Use five fields, e.g. "*/5 * * * *".`
          )
        }
        const { cred, instance, webhooks } = await current(opts.instance)
        const next = [
          ...webhooks.filter((w) => w.endpoint !== endpoint),
          { endpoint, value: schedule.trim() },
        ]
        await updateInstance(cred, instance.id, { webhooks: next })
        console.log(
          `✅ ${instance.subdomain} calls ${endpoint} on "${schedule.trim()}".`
        )
      }
    )
  cmd
    .command('rm')
    .argument('<endpoint>', 'Endpoint of the webhook to remove')
    .description('Remove a webhook')
    .option(...INSTANCE_OPTION)
    .action(async (endpoint: string, opts: { instance?: string }) => {
      const { cred, instance, webhooks } = await current(opts.instance)
      const next = webhooks.filter((w) => w.endpoint !== endpoint)
      if (next.length === webhooks.length) {
        console.log(`${instance.subdomain} has no webhook for ${endpoint}.`)
        return
      }
      await updateInstance(cred, instance.id, { webhooks: next })
      console.log(
        `✅ Removed the ${endpoint} webhook from ${instance.subdomain}.`
      )
    })
  return cmd
}

export const CreateCommand = () =>
  new Command('create')
    .argument('[name]', 'Instance name (default: a random available name)')
    .description(
      'Create an instance. Needs a token for all instances with write access'
    )
    .option('--version <version>', 'PocketBase version (default: the newest)')
    .option('--link', 'Link this folder to the new instance')
    .action(
      async (
        name: string | undefined,
        opts: { version?: string; link?: boolean }
      ) => {
        const cred = await resolveDeployCredential()
        const subdomain = await checkInstanceName(name)
        if (opts.version) {
          const versions = await listVersions()
          if (versions.length && !versions.includes(opts.version)) {
            throw new Error(
              `Unknown version ${opts.version}. Choose one of: ${versions.join(', ')}`
            )
          }
        }
        const { instance } = await createInstance(cred, subdomain, opts.version)
        console.log(
          `✅ Created ${instance.subdomain} (${instance.id}): ${INSTANCE_URL(instance.subdomain)}`
        )
        if (opts.link) {
          saveInstanceName(instance.subdomain)
          console.log(`   Linked this folder to ${instance.subdomain}.`)
        }
      }
    )

export const DeleteCommand = () =>
  new Command('delete')
    .argument('<instance>', 'Instance to delete')
    .description(
      'Delete an instance and all its data. It must be powered off first'
    )
    .option('--yes', `Don't ask for confirmation`)
    .action(async (name: string, opts: { yes?: boolean }) => {
      const { cred, instance } = await resolveTarget(name)
      const fresh = await refreshInstance(cred, instance.id)
      if (!isFullyOff(fresh)) {
        throw new Error(
          `${fresh.subdomain} must be powered off first. Run 'pockethost power off ${fresh.subdomain} --wait'.`
        )
      }
      if (!opts.yes) {
        if (!process.stdin.isTTY) {
          throw new Error(
            `Refusing to delete ${fresh.subdomain} without confirmation. Add --yes.`
          )
        }
        const typed = await input({
          message: `This permanently deletes ${fresh.subdomain} and its data. Type its name to confirm:`,
        })
        if (typed.trim() !== fresh.subdomain) {
          console.log(`Names don't match. Nothing was deleted.`)
          return
        }
      }
      await deleteInstance(cred, fresh.id)
      console.log(`🗑️  Deleted ${fresh.subdomain}.`)
    })

export const instanceCommands = () => [
  ShowCommand(),
  PowerCommand(),
  RenameCommand(),
  VersionCommand(),
  VersionsCommand(),
  DomainCommand(),
  DevModeCommand(),
  AdminSyncCommand(),
  AutoVacuumCommand(),
  SecretsCommand(),
  WebhooksCommand(),
  CreateCommand(),
  DeleteCommand(),
]
