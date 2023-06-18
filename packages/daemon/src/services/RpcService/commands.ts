import {
  CreateInstancePayload,
  CreateInstancePayloadSchema,
  CreateInstanceResult,
  InstanceStatus,
  Logger,
  RenameInstancePayloadSchema,
  RpcCommands,
  SaveSecretsPayload,
  SaveSecretsPayloadSchema,
  SaveSecretsResult,
  SaveVersionPayload,
  SaveVersionPayloadSchema,
  // gen:import
  SaveVersionResult,
  SetInstanceMaintenancePayloadSchema,
  type RenameInstancePayload,
  type RenameInstanceResult,
  type SetInstanceMaintenancePayload,
  type SetInstanceMaintenanceResult,
} from '@pockethost/common'
import { valid, validRange } from 'semver'
import { clientService } from '../clientService/clientService'
import { instanceService } from '../InstanceService/InstanceService'
import { pocketbase } from '../PocketBaseService'
import { rpcService } from './RpcService'

export const registerRpcCommands = async (logger: Logger) => {
  const { client } = await clientService()
  const _rpcCommandLogger = logger.create(`RpcCommands`)
  const { dbg, warn } = _rpcCommandLogger

  const { registerCommand } = await rpcService()

  registerCommand<CreateInstancePayload, CreateInstanceResult>(
    RpcCommands.CreateInstance,
    CreateInstancePayloadSchema,
    async (rpc) => {
      const { payload } = rpc
      const { subdomain } = payload
      const instance = await client.createInstance({
        subdomain,
        uid: rpc.userId,
        version: (await pocketbase()).getLatestVersion(),
        status: InstanceStatus.Idle,
        secondsThisMonth: 0,
        secrets: {},
        maintenance: false,
      })
      return { instance }
    }
  )

  registerCommand<SaveVersionPayload, SaveVersionResult>(
    RpcCommands.SaveVersion,
    SaveVersionPayloadSchema,
    async (rpc) => {
      const { payload } = rpc
      const { instanceId, version } = payload
      if (valid(version) === null && validRange(version) === null) {
        return {
          status: `error`,
          message: `Version must be a valid semver or semver range`,
        }
      }
      await client.updateInstance(instanceId, { version })
      return { status: 'ok' }
    }
  )

  registerCommand<SaveSecretsPayload, SaveSecretsResult>(
    RpcCommands.SaveSecrets,
    SaveSecretsPayloadSchema,
    async (job) => {
      const { payload } = job
      const { instanceId, secrets } = payload
      await client.updateInstance(instanceId, { secrets })
      return { status: 'ok' }
    }
  )

  registerCommand<RenameInstancePayload, RenameInstanceResult>(
    RpcCommands.RenameInstance,
    RenameInstancePayloadSchema,
    async (job) => {
      const { payload } = job
      const { instanceId, subdomain } = payload
      try {
        await client.updateInstance(instanceId, { subdomain })
        return { status: 'ok' }
      } catch (e) {
        return { status: 'error', message: `${e}` }
      }
    }
  )

  registerCommand<SetInstanceMaintenancePayload, SetInstanceMaintenanceResult>(
    RpcCommands.SetInstanceMaintenance,
    SetInstanceMaintenancePayloadSchema,
    async (job) => {
      const { payload } = job
      const { instanceId, maintenance } = payload
      try {
        dbg(`Updating to maintenance mode ${instanceId}`)
        await client.updateInstance(instanceId, { maintenance })
        if (maintenance) {
          try {
            dbg(`Shutting down instance ${instanceId}`)
            const is = await instanceService()
            const api = is.getInstanceApiIfExistsById(instanceId)
            await api?.shutdown()
          } catch (e) {
            warn(e)
          }
        }
        return { status: 'ok' }
      } catch (e) {
        return { status: 'error', message: `${e}` }
      }
    }
  )

  // gen:command
}
