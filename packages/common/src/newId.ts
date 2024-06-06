import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz')
export const newId = (length = 15) => nanoid(length)
