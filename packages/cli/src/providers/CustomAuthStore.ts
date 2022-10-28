import { Admin, BaseAuthStore, User } from 'pocketbase'

export interface SerializeOptions {
  encode?: (val: string | number | boolean) => string
  maxAge?: number
  domain?: string
  path?: string
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  priority?: string
  sameSite?: boolean | string
}

export type SessionState = { token: string; model: User | Admin | null }
export type SessionStateSaver = (state: SessionState) => void

export class CustomAuthStore extends BaseAuthStore {
  _save: SessionStateSaver

  constructor(state: SessionState, _save: SessionStateSaver) {
    super()
    const { token, model } = state
    this.baseToken = token
    this.baseModel = model
    this._save = _save
  }
  get get() {
    // console.log(`Get token`)
    return this.baseToken
  }
  get model(): User | Admin | null {
    // console.log(`get model`)
    return this.baseModel
  }
  get isValid(): boolean {
    // console.log(`isValid`)
    return !!this.baseToken
  }
  save(token: string, model: User | Admin | null) {
    this._save({ token, model })
    this.baseModel = model
    this.baseToken = token
  }
  clear(): void {
    throw new Error(`Unsupported clear()`)
  }
  loadFromCookie(cookie: string, key?: string | undefined): void {
    throw new Error(`Unsupported loadFromCookie()`)
  }
  exportToCookie(
    options?: SerializeOptions | undefined,
    key?: string | undefined
  ): string {
    throw new Error(`Unsupported exportToCookie()`)
  }
}
