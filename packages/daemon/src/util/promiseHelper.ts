import { createPromiseHelper } from '@pockethost/common'
import { logger } from './logger'

export const promiseHelper = createPromiseHelper({ logger })
export const { safeCatch } = promiseHelper
