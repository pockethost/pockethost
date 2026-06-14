# phio: the pockethost.io CLI

From the repo root:

```bash
pnpm --filter phio dev --help
pnpm --filter phio dev login
pnpm --filter phio dev deploy [instance]
```

Or use the root script:

```bash
pnpm dev:phio -- deploy [instance]
```

**Auth**

```bash
phio login
phio logout
phio whoami
```

**List instances**

```bash
phio list
```

**Watch and push local changes instantly**

```bash
phio dev [instance]
```

**Deploy to remote**

```bash
phio deploy [instance]
```

**Tail logs**

```bash
phio logs [instance]
```

## Configuration

Use `pockethost` in your `package.json` to save your instance name so you don't need to keep typing it:

```json
// package.json
{
  "pockethost": {
    "instanceName": "all-your-base"
  }
}
```

-or-

Use `pockethost.json` to save your instance name so you don't need to keep typing it.

```json
{
  "instanceName": "all-your-base"
}
```

## Environment Variables

The following environment variables can be used to override any saved configuration:

- `PHIO_USERNAME` - Override saved username
- `PHIO_PASSWORD` - Override saved password
- `PHIO_INSTANCE_NAME` - Override saved instance name

Environment variables take precedence over configuration in package.json or pockethost.json.
