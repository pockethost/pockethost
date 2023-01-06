import cloud_functions from './cloud_functions.md'
import ftp from './ftp.md'
import instances from './instances.md'
import introduction from './introduction.md'

export type PageName = keyof typeof pages
export const pages = { introduction, instances, cloud_functions, ftp }
