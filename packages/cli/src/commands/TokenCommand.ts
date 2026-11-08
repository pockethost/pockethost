import { password } from '@inquirer/prompts'
import { Command } from 'commander'
import { config } from '../lib/config'
import { TOKEN } from '../lib/constants'
import {
  describeToken,
  isPat,
  maskToken,
  legacyLoginHint,
  savedToken,
  tokenWhoami,
  TOKENS_URL,
} from '../lib/token'

/** Verifies a token with PocketHost and saves it to the config folder. */
export const saveToken = async (raw?: string) => {
  const token = (
    raw ??
    (await password({
      message: `Paste your PocketHost token (create one at ${TOKENS_URL})`,
      mask: true,
    }))
  ).trim()
  if (!isPat(token)) {
    throw new Error(
      `That doesn't look like a PocketHost token (expected ph_pat_…). Create one at ${TOKENS_URL}`
    )
  }
  const who = await tokenWhoami(token)
  config('token', token)
  config('pb_auth', '')
  console.log(`Saved token ${describeToken(who)}`)
  if (TOKEN() && TOKEN().trim() !== token) {
    console.log(
      `Note: POCKETHOST_TOKEN is set in your environment and takes precedence over the saved token.`
    )
  }
}

export const showTokenStatus = async () => {
  const env = TOKEN()
  const token = env || savedToken()
  if (!token) {
    console.log(
      `Not logged in. Run 'pockethost login', or set POCKETHOST_TOKEN in CI. Create a token at ${TOKENS_URL}.${legacyLoginHint()}`
    )
    return
  }
  console.log(
    `Using ${maskToken(token)} from ${env ? 'POCKETHOST_TOKEN' : 'saved config'}`
  )
  try {
    console.log(describeToken(await tokenWhoami(token)))
  } catch (e) {
    console.log(`Token check failed: ${(e as Error).message}`)
    process.exitCode = 1
  }
}

export const TokenCommand = () =>
  new Command('token')
    .description(`Show, save or remove the personal access token the CLI uses`)
    .addCommand(
      new Command('set')
        .argument('[token]', 'Token (ph_pat_…); prompts when omitted')
        .description('Verify and save a token')
        .action((token?: string) => saveToken(token))
    )
    .addCommand(
      new Command('clear').description('Remove the saved token').action(() => {
        config('token', '')
        console.log('Saved token removed.')
      })
    )
    .addCommand(
      new Command('status')
        .description('Show which token is in use')
        .action(showTokenStatus)
    )
    .action(showTokenStatus)
