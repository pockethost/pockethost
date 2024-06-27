import { boolean } from 'boolean'

export const IS_DEV = () =>
  `PH_DEV` in process.env
    ? boolean(process.env.PH_DEV)
    : process.env.NODE_ENV === 'development'
export const DEBUG = () =>
  `PH_DEBUG` in process.env ? boolean(process.env.PH_DEBUG) : IS_DEV()
