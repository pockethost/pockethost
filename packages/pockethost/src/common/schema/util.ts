import { customAlphabet } from 'nanoid'
import { IsoDate } from './BaseFields'

export const newId = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10)
export const pocketNow = () => toPocketDate(new Date())
export const toPocketDate = (date: Date) => date.toISOString()
export const fromPocketDate = (iso: IsoDate) => new Date(iso)
