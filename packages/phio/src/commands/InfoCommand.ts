import { Command } from 'commander'
import { PHIO_HOME } from '../lib/constants'
import { savedInstanceName } from '../lib/defaultInstanceId'

export const InfoCommand = () => {
  return new Command(`info`).description(`Get config info`).action(() => {
    console.log(`Config root: ${PHIO_HOME()}`)
    console.log(`Instance: ${savedInstanceName()}`)
  })
}
