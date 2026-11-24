# pockethost (npm): retired

This npm package was the PocketHost CLI. It was retired on Nov 21, 2026 and no longer works: every command prints
how to move to the new CLI and exits with an error.

The new `pockethost` CLI is one executable with nothing else to install. Remove this package first, so the old
command doesn't come first on your `PATH`:

```bash
npm rm -g pockethost phio
```

**macOS or Linux**, with [Homebrew](https://brew.sh):

```bash
brew install pockethost/tap/pockethost
```

**Windows**, with [Scoop](https://scoop.sh), in PowerShell:

```powershell
scoop bucket add pockethost https://github.com/pockethost/scoop-bucket
scoop install pockethost
```

**Install script** (macOS or Linux, no Homebrew):

```bash
curl -fsSL https://pockethost.io/install.sh | sh
```

Your existing token (`ph_pat_` or `pbt_`) works with it:

```bash
pockethost link https://my-instance.pockethost.io <token>
pockethost deploy
```

In CI, install it with the script, put the token in `P1_TOKEN` instead of `POCKETHOST_TOKEN`, and run
`pockethost deploy` instead of `npx pockethost@latest deploy`.

Docs: https://pockethost.io/docs/cli
