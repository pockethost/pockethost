import { customAlphabet } from 'nanoid'
import { identity } from 'ts-brand'
import { client } from '../client'
import { Email, Password, PbCreds } from '../schema/base'

export const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz')

export const signInAnonymously = () => {
  const { email, password } = (() => {
    const credsJson = localStorage.getItem('__pb_creds')
    if (credsJson) {
      return JSON.parse(credsJson) as PbCreds
    }
    const email = identity<Email>(`${nanoid()}@harvest.io`)
    const password = identity<Password>(nanoid())
    return { email, password }
  })()

  return client.users.authViaEmail(email, password).catch((e) => {
    console.error(`Couldn't long in anonymously: ${e}`)
  })
}
