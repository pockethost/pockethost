import { default as PocketBase, default as pocketbaseEs } from 'pocketbase'
import {
  CustomAuthStore,
  SessionStateSaver,
} from '../providers/CustomAuthStore'
import { assertExists } from './assert'
import { die } from './die'
import { ConnectionConfig } from './ensureAdminClient'

export const pbClient = (
  config: ConnectionConfig,
  saver: SessionStateSaver
) => {
  const { host, session } = config
  const client = new PocketBase(
    host,
    'en-US',
    new CustomAuthStore(session, saver)
  )
  return client
}

export const isAdmin = async (client: pocketbaseEs) => {
  if (!client.authStore.isValid) return false
  const { model } = client.authStore
  if (!model) return false
  const res = await client.admins.getOne(model.id)
  if (!res) return false
  return true
}

export const adminPbClient = async (
  config: ConnectionConfig,
  saver: SessionStateSaver
) => {
  const client = pbClient(config, saver)
  if (!client.authStore.isValid) {
    die(`Must be logged in to PocketBase as an admin.`)
  }
  const { model } = client.authStore
  assertExists(model, `Expected a valid model here`)
  const res = await client.admins.getOne(model.id)
  if (!res) {
    die(`User must be an admin user.`)
  }
  return client
}
