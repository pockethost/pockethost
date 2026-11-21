import type { BaseFields, InstanceId, RecordId, Subdomain, UserId } from '.'

export type VersionId = string

export const INSTANCE_COLLECTION = 'instances'

export enum InstanceStatus {
  Unknown = '',
  Idle = 'idle',
  Port = 'porting',
  Starting = 'starting',
  Running = 'running',
  Vacuuming = 'vacuuming',
  Failed = 'failed',
}

export type InstanceSecretKey = string
export type InstanceSecretValue = string
export type InstanceSecretCollection = {
  [name: InstanceSecretKey]: InstanceSecretValue
}

export type InstanceWebhookEndpoint = string
export type InstanceWebhookValue = string
export type InstanceWebhookCollection = InstanceWebhookItem[]
export type InstanceWebhookItem = {
  endpoint: InstanceWebhookEndpoint
  value: InstanceWebhookValue
  lastFired?: {
    timestamp: number
    response: {
      status: number
      body: string
    }
  }
}

/** Operator-only firewall overrides. Present keys replace the untrusted defaults. */
export type InstanceFirewall = {
  ip_hourly?: number
  instance_hourly?: number
  ip_concurrent?: number
  instance_concurrent?: number
}

export type InstanceFields<TExtra = {}> = BaseFields & {
  subdomain: Subdomain
  status: InstanceStatus
  version: VersionId
  secrets: InstanceSecretCollection | null
  webhooks: InstanceWebhookCollection | null
  power: boolean
  suspension: string
  /** Defaults to true when unset */
  autoVacuum?: boolean
  cname: string
  dev: boolean
  /** @deprecated Will be removed - frontend now handles health checking directly */
  cname_active: boolean
  idleTtl: number
  /** Operator-only. `{ ip_hourly?, instance_hourly?, ip_concurrent?, instance_concurrent? }` via mothership admin. */
  firewall?: InstanceFirewall | null
  /** The one edge that runs this instance (edges record id). Chosen by the mothership; hidden from customers. */
  edge?: string
  /** Set on a copy made with Duplicate: the id of the instance it was copied from. */
  duplicateOf?: string
  /** '' (not a copy), 'copying' (files not copied yet), 'ready' or 'failed' (see duplicateError). */
  duplicateStatus?: '' | 'copying' | 'ready' | 'failed'
  duplicateError?: string
} & TExtra

/** Who owns an instance (the mothership's `instance_owners`; one row per owned instance). */
export type InstanceOwnerFields = BaseFields & {
  instance: InstanceId
  user: UserId
  /** The owner's login is synced into the instance as a superuser ("admin sync"). */
  sync_login: boolean
}

export type InstanceRecordsById = { [_: RecordId]: InstanceFields }
