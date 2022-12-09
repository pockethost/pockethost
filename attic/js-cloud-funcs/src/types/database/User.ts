import { IsoDate, RecordId, Url } from '.'

export type ProfileId = RecordId
export type Email = string
export type UserId = RecordId
export type Token = string
export type PasswordHash = string

export type User = {
  baseAccount: {
    baseModel: {
      id: UserId
      created: IsoDate
      updated: IsoDate
    }
    id: UserId
    created: IsoDate
    updated: IsoDate
    email: Email
    tokenKey: Token
    passwordHash: PasswordHash
    lastResetSentAt: IsoDate
  }
  baseModel: {
    id: UserId
    created: IsoDate
    updated: IsoDate
  }
  id: UserId
  created: IsoDate
  updated: IsoDate
  email: Email
  tokenKey: Token
  passwordHash: PasswordHash
  lastResetSentAt: IsoDate
  verified: boolean
  lastVerificationSentAt: IsoDate
  profile: {
    avatar: Url
    created: IsoDate

    id: ProfileId
    name: string
    updated: IsoDate
    userId: UserId
  }
}
