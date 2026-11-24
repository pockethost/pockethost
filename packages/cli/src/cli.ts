import { version } from '../package.json'

// This npm CLI was retired on Nov 21, 2026. Every command prints how to move
// to the new `pockethost` binary and exits non-zero. Only --version and --help work.

const RETIRED = `The pockethost npm CLI was retired on Nov 21, 2026 and no longer works.

Install the new pockethost CLI (https://pockethost.io/docs/cli):

  npm rm -g pockethost phio

  # macOS or Linux (Homebrew)
  brew install pockethost/tap/pockethost

  # Windows (Scoop, in PowerShell)
  scoop bucket add pockethost https://github.com/pockethost/scoop-bucket
  scoop install pockethost

  # macOS or Linux (install script)
  curl -fsSL https://pockethost.io/install.sh | sh

Your existing token (ph_pat_ or pbt_) works with it:

  pockethost link https://<instance>.pockethost.io <token>
  pockethost deploy

In CI, install it with the script above, set P1_TOKEN instead of
POCKETHOST_TOKEN, and run \`pockethost deploy\` instead of
\`npx pockethost@latest deploy\`.`

const args = process.argv.slice(2)

if (args.length === 1 && (args[0] === '-V' || args[0] === '--version')) {
  console.log(version)
  process.exit(0)
}

if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) {
  console.log(`pockethost ${version} (retired)\n\n${RETIRED}`)
  process.exit(0)
}

console.error(RETIRED)
process.exit(1)
