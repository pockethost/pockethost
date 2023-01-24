import cloud_functions from './cloud_functions.md'
import faq from './faq.md'
import ftp from './ftp.md'
import instances from './instances.md'
import introduction from './introduction.md'

console.log(JSON.stringify(faq, null, 2))
export type PageName = keyof typeof pages
export const pages = { introduction, instances, cloud_functions, ftp, faq }
export { faq, ftp, instances, introduction }
