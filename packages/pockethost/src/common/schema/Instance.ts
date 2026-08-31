import type { BaseFields, RecordId, Subdomain, UserFields, UserId } from '.'

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

/** Operator-only firewall overrides. Present keys replace the untrusted hourly defaults. */
export type InstanceFirewall = {
  ip_hourly?: number
  instance_hourly?: number
}

export type InstanceFields<TExtra = {}> = BaseFields & {
  subdomain: Subdomain
  uid: UserId
  status: InstanceStatus
  version: VersionId
  secrets: InstanceSecretCollection | null
  webhooks: InstanceWebhookCollection | null
  power: boolean
  suspension: string
  syncAdmin: boolean
  /** Defaults to true when unset */
  autoVacuum?: boolean
  cname: string
  dev: boolean
  /** @deprecated Will be removed - frontend now handles health checking directly */
  cname_active: boolean
  idleTtl: number
  /** Operator-only. `{ ip_hourly?, instance_hourly? }` via mothership admin. */
  firewall?: InstanceFirewall | null
} & TExtra

export type WithUser<TUser = UserFields> = {
  expand: { uid: TUser }
}

export type InstanceFields_WithUser = InstanceFields<WithUser>

export type InstanceFields_Create = Omit<InstanceFields, keyof BaseFields>

export type InstanceRecordsById = { [_: RecordId]: InstanceFields }
