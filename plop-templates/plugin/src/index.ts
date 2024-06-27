import { PocketHostPlugin } from 'pockethost'
import { PLUGIN_NAME } from './constants'
import { dbg } from './log'

const plugin: PocketHostPlugin = async ({}) => {
  dbg(`initializing ${PLUGIN_NAME}`)
}

export default plugin
