import { Command } from 'pockethost/core'
import { ServeCommand } from './ServeCommand'

type Options = {
  debug: boolean
}

export const FirewallCommand = () => {
  const cmd = new Command(`waf`)
    .description(`Web Application Firewall (WAF) commands`)
    .addCommand(ServeCommand())
  return cmd
}
