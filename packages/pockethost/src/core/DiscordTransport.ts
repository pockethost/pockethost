import TransportStream from 'winston-transport'
import { discordAlert } from '..'

export type DiscordTransportType = {
  webhookUrl: string
} & TransportStream.TransportStreamOptions

export class DiscordTransport extends TransportStream {
  private url: string
  constructor(opts: DiscordTransportType) {
    super(opts)
    this.url = opts.webhookUrl
  }

  log(info: any, callback: any) {
    discordAlert(info)
    callback()
  }
}
