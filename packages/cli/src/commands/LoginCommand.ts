import { spawn } from 'child_process'
import { Command } from 'commander'
import { TOKENS_URL } from '../lib/token'
import { saveToken } from './TokenCommand'

/** Best effort: open the tokens page in the default browser. Silent when there is no desktop (SSH, CI). */
const openBrowser = (url: string) => {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  try {
    const child = spawn(cmd, args as string[], {
      stdio: 'ignore',
      detached: true,
    })
    child.on('error', () => {})
    child.unref()
  } catch {
    // ignore
  }
}

export const loginWithUserInput = async () => {
  console.log(`The PocketHost CLI signs in with a personal access token.`)
  console.log(
    `Create one at ${TOKENS_URL} (opening it in your browser), then paste it here.`
  )
  openBrowser(TOKENS_URL)
  await saveToken()
}

export const LoginCommand = () =>
  new Command('login')
    .description(`Save a personal access token for this computer`)
    .argument('[token]', 'Token (ph_pat_…); prompts when omitted')
    .option(`--token <token>`, `Same as passing the token as an argument`)
    .action(async (token: string | undefined, opts: { token?: string }) => {
      const given = token ?? opts.token
      if (given) {
        await saveToken(given)
        return
      }
      await loginWithUserInput()
    })
