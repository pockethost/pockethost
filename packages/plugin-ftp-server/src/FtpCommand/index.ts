import { Command } from 'commander'
import { ftp } from '../FtpService/ftp'
import { setFallbackAdmin } from '../plugin'

export const FtpCommand = () => {
  const cmd = new Command(`ftp`)
    .description(`FTP commands`)
    .addCommand(
      new Command(`serve`)
        .description(`Run an edge FTP server`)
        .action(async (options) => {
          await ftp()
        }),
    )
    .addCommand(
      new Command(`admin`).description(`Manage the admin login`).addCommand(
        new Command(`set`)
          .description(`Set the admin login and password`)
          .argument(`<username>`, `The username for the admin login`)
          .argument(`<password>`, `The password for the admin login`)
          .action(async (username, password, options) => {
            setFallbackAdmin(username, password)
          }),
      ),
    )
  return cmd
}
