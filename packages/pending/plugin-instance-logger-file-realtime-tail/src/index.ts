import { PocketHostPlugin, onAppMount } from 'pockethost/core'
import { realtimeLogMiddleware } from './RealtimeLog'
import { dbg } from './log'

const plugin: PocketHostPlugin = async ({ registerAction, registerFilter }) => {
  dbg(`initializing plugin-instance-logger-file-realtime-tail`)
  onAppMount(async (app) => {
    app.use('/logs', realtimeLogMiddleware)
  })
}

export default plugin
